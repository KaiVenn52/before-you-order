import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createChoiceStorage, defaultPreferences, type ChoiceDatabase } from '../src/storage/choiceStore';

function adapter(db: DatabaseSync): ChoiceDatabase {
  return {
    execSync: sql => db.exec(sql),
    runSync: (sql, ...params) => db.prepare(sql).run(...params),
    getFirstSync: <T>(sql: string, ...params: (string | number | null)[]) => (db.prepare(sql).get(...params) ?? null) as T | null,
    getAllSync: <T>(sql: string, ...params: (string | number | null)[]) => db.prepare(sql).all(...params) as T[],
  };
}

test('SQLite survives close/reopen: hide, undo, restore all, feedback and language', () => {
  const dir = mkdtempSync(join(tmpdir(), 'byo-storage-test-'));
  let db = new DatabaseSync(join(dir, 'choices.db'));
  try {
    let store = createChoiceStorage(() => adapter(db)); store.initializeStorage();
    store.blacklistMeal('a'); store.blacklistMeal('b'); store.restoreMeal('b');
    store.recordFeedback('a', 'chosen', '2026-09-05T00:00:00Z');
    store.saveLanguage('zh'); store.saveUserSettings(defaultPreferences, 'delivery', 'nyonya');
    db.close(); db = new DatabaseSync(join(dir, 'choices.db'));
    store = createChoiceStorage(() => adapter(db)); store.initializeStorage();
    assert.deepEqual(store.getBlacklistedMealIds(), ['a']);
    assert.equal(store.getLanguage(), 'zh');
    assert.equal(store.getFeedback()[0].mealId, 'a');
    assert.equal(store.getUserSettings().lastCuisine, 'nyonya');
    assert.equal(store.getUserSettings().lastMode, 'delivery');
    store.blacklistMeal('b'); store.restoreAllMeals();
    db.close(); db = new DatabaseSync(join(dir, 'choices.db'));
    store = createChoiceStorage(() => adapter(db)); store.initializeStorage();
    assert.deepEqual(store.getBlacklistedMealIds(), []);
  } finally { db.close(); rmSync(dir, { recursive: true }); }
});

test('legacy cuisine and corrupt eating-mode values reset safely', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const store = createChoiceStorage(() => adapter(db)); store.initializeStorage();
    store.saveUserSettings(defaultPreferences, 'dine-out', null);
    db.exec("UPDATE user_settings_v2 SET last_cuisine='southeast-asian', last_mode='invalid'");
    assert.equal(store.getUserSettings().lastCuisine, null);
    assert.equal(store.getUserSettings().lastMode, 'dine-out');
  } finally { db.close(); }
});

test('open and schema failure use a usable, explicitly temporary memory store', () => {
  for (const open of [() => { throw new Error('unavailable'); }, () => ({ execSync: () => { throw new Error('schema'); } } as unknown as ChoiceDatabase)]) {
    const store = createChoiceStorage(open);
    assert.doesNotThrow(() => store.initializeStorage());
    assert.equal(store.isStorageDegraded(), true);
    store.blacklistMeal('a'); store.blacklistMeal('b'); store.restoreMeal('b');
    assert.deepEqual(store.getBlacklistedMealIds(), ['a']);
    store.restoreAllMeals(); assert.deepEqual(store.getBlacklistedMealIds(), []);
    store.recordFeedback('a', 'chosen'); assert.equal(store.getFeedback().length, 1);
    store.saveLanguage('zh'); assert.equal(store.getLanguage(), 'zh');
  }
});

test('read/write failures preserve cached blacklist and retain new feedback in memory', () => {
  for (const failure of ['read', 'write']) {
    const db = new DatabaseSync(':memory:');
    try {
      let fail = false;
      const native = adapter(db);
      const store = createChoiceStorage(() => ({ ...native,
        getAllSync: <T>(sql: string, ...params: (string | number | null)[]) => {
          if (fail && failure === 'read') throw new Error('read');
          return native.getAllSync<T>(sql, ...params);
        },
        runSync: (sql, ...params) => {
          if (fail && failure === 'write') throw new Error('disk full');
          return native.runSync(sql, ...params);
        },
      }));
      store.initializeStorage(); store.blacklistMeal('old'); store.getBlacklistedMealIds();
      fail = true;
      if (failure === 'read') assert.deepEqual(store.getBlacklistedMealIds(), ['old']);
      store.recordFeedback('a', 'chosen');
      assert.equal(store.getFeedback()[0].mealId, 'a');
      assert.equal(store.isStorageDegraded(), true);
      assert.deepEqual(store.getBlacklistedMealIds(), ['old']);
      store.blacklistMeal('new'); assert.deepEqual(store.getBlacklistedMealIds(), ['new', 'old']);
    } finally { db.close(); }
  }
});
