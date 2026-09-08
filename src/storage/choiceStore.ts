import { isCuisineId, type CuisineId, type EatingMode, type FeedbackAction, type Language, type MealFeedback, type Preferences, type UserSettings } from '../domain/types';

export const defaultPreferences: Preferences = {
  diet: 'all', eggFree: false, porkFree: false, beefFree: false, seafoodFree: false, budget: 'flexible',
};
export interface ChoiceDatabase {
  execSync(sql: string): void;
  runSync(sql: string, ...params: (string | number | null)[]): unknown;
  getFirstSync<T>(sql: string, ...params: (string | number | null)[]): T | null;
  getAllSync<T>(sql: string, ...params: (string | number | null)[]): T[];
}

// Lazy open prevents native database failures from crashing module import.
export function createChoiceStorage(open: () => ChoiceDatabase) {
  let db: ChoiceDatabase;
  let degraded = false;
  let blacklistLoaded = false;
  let memoryLanguage: Language | null = null;
  let memorySettings: UserSettings = { preferences: defaultPreferences, lastMode: 'dine-out', lastCuisine: null };
  let memoryFeedback: MealFeedback[] = [];
  let memoryHidden: string[] = [];
  const safely = <T>(operation: () => T, fallback: T): T => {
    if (degraded) return fallback;
    try { return operation(); } catch { degraded = true; return fallback; }
  };
  const isStorageDegraded = () => degraded;
  const hasLoadedBlacklist = () => blacklistLoaded;

  function initializeStorage() {
    safely(() => { db = open(); db.execSync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS meal_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meal_id TEXT NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('chosen', 'not-today')),
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_meal_feedback_created ON meal_feedback(created_at DESC);
      CREATE TABLE IF NOT EXISTS meal_blacklist (
        meal_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS user_settings_v2 (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        diet TEXT NOT NULL,
        egg_free INTEGER NOT NULL,
        pork_free INTEGER NOT NULL,
        beef_free INTEGER NOT NULL,
        seafood_free INTEGER NOT NULL,
        budget TEXT NOT NULL,
        last_mode TEXT NOT NULL,
        last_cuisine TEXT
      );
      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        language TEXT NOT NULL CHECK(language IN ('en', 'zh'))
      );
    `); }, undefined);
    // Cache each successful read so later failures preserve this session's state.
    getLanguage(); getUserSettings(); getFeedback(); getBlacklistedMealIds();
  }

  function getLanguage(): Language | null {
    memoryLanguage = safely(() => db.getFirstSync<{ language: Language }>('SELECT language FROM app_settings WHERE id = 1')?.language ?? null, memoryLanguage);
    return memoryLanguage;
  }

  function saveLanguage(language: Language) {
    memoryLanguage = language;
    safely(() => db.runSync(
      `INSERT INTO app_settings (id, language) VALUES (1, ?)
       ON CONFLICT(id) DO UPDATE SET language=excluded.language`,
      language,
    ), undefined);
  }

  function getUserSettings(): UserSettings {
    return memorySettings = safely(() => {
    const row = db.getFirstSync<{
      diet: Preferences['diet']; egg_free: number; pork_free: number; beef_free: number; seafood_free: number;
      budget: Preferences['budget']; last_mode: EatingMode; last_cuisine: string | null;
    }>('SELECT diet, egg_free, pork_free, beef_free, seafood_free, budget, last_mode, last_cuisine FROM user_settings_v2 WHERE id = 1');
    if (!row) return { preferences: defaultPreferences, lastMode: 'dine-out', lastCuisine: null };
    return {
      preferences: {
        diet: row.diet, eggFree: row.egg_free === 1, porkFree: row.pork_free === 1,
        beefFree: row.beef_free === 1, seafoodFree: row.seafood_free === 1, budget: row.budget,
      },
      lastMode: ['dine-out', 'takeaway', 'delivery'].includes(row.last_mode) ? row.last_mode : 'dine-out', lastCuisine: isCuisineId(row.last_cuisine) ? row.last_cuisine : null,
    };
    }, memorySettings);
  }

  function saveUserSettings(preferences: Preferences, lastMode: EatingMode, lastCuisine: CuisineId | null) {
    memorySettings = { preferences, lastMode, lastCuisine };
    safely(() => db.runSync(
      `INSERT INTO user_settings_v2 (id, diet, egg_free, pork_free, beef_free, seafood_free, budget, last_mode, last_cuisine)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET diet=excluded.diet, egg_free=excluded.egg_free,
         pork_free=excluded.pork_free, beef_free=excluded.beef_free, seafood_free=excluded.seafood_free,
         budget=excluded.budget, last_mode=excluded.last_mode, last_cuisine=excluded.last_cuisine`,
      preferences.diet, Number(preferences.eggFree), Number(preferences.porkFree), Number(preferences.beefFree),
      Number(preferences.seafoodFree), preferences.budget, lastMode, lastCuisine,
    ), undefined);
  }

  function recordFeedback(mealId: string, action: FeedbackAction, createdAt = new Date().toISOString()) {
    memoryFeedback = [{ mealId, action, createdAt }, ...memoryFeedback];
    safely(() => db.runSync('INSERT INTO meal_feedback (meal_id, action, created_at) VALUES (?, ?, ?)', mealId, action, createdAt), undefined);
  }

  function getFeedback(limit = Number.POSITIVE_INFINITY): MealFeedback[] {
    memoryFeedback = safely(() => db.getAllSync<{ meal_id: string; action: FeedbackAction; created_at: string }>(
      'SELECT meal_id, action, created_at FROM meal_feedback ORDER BY id DESC',
    ).map((row) => ({ mealId: row.meal_id, action: row.action, createdAt: row.created_at })), memoryFeedback);
    return memoryFeedback.slice(0, limit);
  }

  function clearFeedbackHistory() {
    memoryFeedback = [];
    safely(() => db.runSync('DELETE FROM meal_feedback'), undefined);
  }

  function blacklistMeal(mealId: string, createdAt = new Date().toISOString()) {
    memoryHidden = [mealId, ...memoryHidden.filter(id => id !== mealId)];
    safely(() => db.runSync('INSERT OR REPLACE INTO meal_blacklist (meal_id, created_at) VALUES (?, ?)', mealId, createdAt), undefined);
  }

  function restoreMeal(mealId: string) {
    memoryHidden = memoryHidden.filter(id => id !== mealId);
    safely(() => db.runSync('DELETE FROM meal_blacklist WHERE meal_id = ?', mealId), undefined);
  }

  function getBlacklistedMealIds(): string[] {
    memoryHidden = safely(() => {
      const ids = db.getAllSync<{ meal_id: string }>('SELECT meal_id FROM meal_blacklist ORDER BY created_at DESC').map(row => row.meal_id);
      blacklistLoaded = true;
      return ids;
    }, memoryHidden);
    return [...memoryHidden];
  }

  function restoreAllMeals() {
    memoryHidden = [];
    safely(() => db.runSync('DELETE FROM meal_blacklist'), undefined);
  }
  return { initializeStorage, getLanguage, saveLanguage, getUserSettings, saveUserSettings,
    recordFeedback, getFeedback, clearFeedbackHistory, blacklistMeal, restoreMeal, restoreAllMeals, getBlacklistedMealIds, isStorageDegraded, hasLoadedBlacklist };
}
