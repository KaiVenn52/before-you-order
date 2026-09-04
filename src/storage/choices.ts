import * as SQLite from 'expo-sqlite';
import type { CuisineId, EatingMode, FeedbackAction, Language, MealFeedback, Preferences, UserSettings } from '../domain/types';

export const defaultPreferences: Preferences = {
  diet: 'all', eggFree: false, porkFree: false, beefFree: false, seafoodFree: false, budget: 'flexible',
};
const db = SQLite.openDatabaseSync('before-you-order.db');

export function initializeStorage() {
  db.execSync(`
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
  `);
}

export function getLanguage(): Language | null {
  return db.getFirstSync<{ language: Language }>('SELECT language FROM app_settings WHERE id = 1')?.language ?? null;
}

export function saveLanguage(language: Language) {
  db.runSync(
    `INSERT INTO app_settings (id, language) VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET language=excluded.language`,
    language,
  );
}

export function getUserSettings(): UserSettings {
  const row = db.getFirstSync<{
    diet: Preferences['diet']; egg_free: number; pork_free: number; beef_free: number; seafood_free: number;
    budget: Preferences['budget']; last_mode: EatingMode; last_cuisine: CuisineId | null;
  }>('SELECT diet, egg_free, pork_free, beef_free, seafood_free, budget, last_mode, last_cuisine FROM user_settings_v2 WHERE id = 1');
  if (!row) return { preferences: defaultPreferences, lastMode: 'dine-out', lastCuisine: null };
  return {
    preferences: {
      diet: row.diet, eggFree: row.egg_free === 1, porkFree: row.pork_free === 1,
      beefFree: row.beef_free === 1, seafoodFree: row.seafood_free === 1, budget: row.budget,
    },
    lastMode: row.last_mode, lastCuisine: row.last_cuisine,
  };
}

export function saveUserSettings(preferences: Preferences, lastMode: EatingMode, lastCuisine: CuisineId | null) {
  db.runSync(
    `INSERT INTO user_settings_v2 (id, diet, egg_free, pork_free, beef_free, seafood_free, budget, last_mode, last_cuisine)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET diet=excluded.diet, egg_free=excluded.egg_free,
       pork_free=excluded.pork_free, beef_free=excluded.beef_free, seafood_free=excluded.seafood_free,
       budget=excluded.budget, last_mode=excluded.last_mode, last_cuisine=excluded.last_cuisine`,
    preferences.diet, Number(preferences.eggFree), Number(preferences.porkFree), Number(preferences.beefFree),
    Number(preferences.seafoodFree), preferences.budget, lastMode, lastCuisine,
  );
}

export function recordFeedback(mealId: string, action: FeedbackAction, createdAt = new Date().toISOString()) {
  db.runSync('INSERT INTO meal_feedback (meal_id, action, created_at) VALUES (?, ?, ?)', mealId, action, createdAt);
}

export function getFeedback(limit = 100): MealFeedback[] {
  return db.getAllSync<{ meal_id: string; action: FeedbackAction; created_at: string }>(
    'SELECT meal_id, action, created_at FROM meal_feedback ORDER BY id DESC LIMIT ?', limit,
  ).map((row) => ({ mealId: row.meal_id, action: row.action, createdAt: row.created_at }));
}

export function blacklistMeal(mealId: string, createdAt = new Date().toISOString()) {
  db.runSync('INSERT OR REPLACE INTO meal_blacklist (meal_id, created_at) VALUES (?, ?)', mealId, createdAt);
}

export function restoreMeal(mealId: string) {
  db.runSync('DELETE FROM meal_blacklist WHERE meal_id = ?', mealId);
}

export function getBlacklistedMealIds(): string[] {
  return db.getAllSync<{ meal_id: string }>('SELECT meal_id FROM meal_blacklist ORDER BY created_at DESC')
    .map((row) => row.meal_id);
}
