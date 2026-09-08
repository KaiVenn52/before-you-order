import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import type { ChoiceDatabase } from '../src/storage/choiceStore';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { createRequire } from 'node:module';
import { createChoiceStorage, defaultPreferences } from '../src/storage/choiceStore';
import { meals } from '../src/data/meals';
import { recommendMeals } from '../src/domain/recommend';

// Render the actual App and event handlers. Only native modules are substituted;
// native layout, TalkBack and OS intents still require device QA.
const require = createRequire(import.meta.url);
const Module = require('node:module');
const originalLoad = Module._load;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).React = React;
let storage = createChoiceStorage(() => { throw new Error('test memory mode'); });
let db: DatabaseSync | undefined;
after(() => db?.close());
let locale = 'en';
let mapsFail = false;
const opened: string[] = [];
const alerts: any[][] = [];
const loadingLabels: string[] = [];
const native = {
  Text: 'Text', View: 'View', Pressable: 'Pressable',
  ScrollView: React.forwardRef((props: any, ref) => React.createElement('ScrollView', { ...props, ref })),
  FlatList: ({ data, renderItem, keyExtractor, ListEmptyComponent, ...props }: any) => React.createElement('FlatList', props, data.length ? data.map((item: any, index: number) => React.createElement(React.Fragment, { key: keyExtractor(item, index) }, renderItem({ item, index }))) : ListEmptyComponent),
  TextInput: 'TextInput',
  Modal: ({ visible, children }: any) => visible ? React.createElement('Modal', {}, children) : null,
  ActivityIndicator: (props: any) => { loadingLabels.push(props.accessibilityLabel); return React.createElement('ActivityIndicator', props); },
  Platform: { OS: 'android' }, StyleSheet: { create: (styles: any) => styles },
  Linking: { openURL: async (url: string) => { if (mapsFail) throw new Error('No handler'); opened.push(url); } },
  Alert: { alert: (...args: any[]) => alerts.push(args) },
};
Module._load = function (id: string, ...args: any[]) {
  if (id === 'react-native') return native;
  if (id === 'expo-status-bar') return { StatusBar: 'StatusBar' };
  if (id === 'expo-image') return { Image: 'Image' };
  if (id === 'expo-localization') return { getLocales: () => [{ languageCode: locale }] };
  if (id === 'expo-haptics') return { selectionAsync: async () => { throw new Error('haptics unavailable'); }, notificationAsync: async () => { throw new Error('haptics unavailable'); }, NotificationFeedbackType: { Success: 'success' } };
  if (id === 'react-native-safe-area-context') return { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' };
  if (id === 'phosphor-react-native') return new Proxy({}, { get: (_, name) => typeof name === 'string' ? `Icon${name}` : undefined });
  if (id.endsWith('/storage/choices')) return new Proxy({ defaultPreferences }, { get: (_, key) => key === 'defaultPreferences' ? defaultPreferences : (...values: any[]) => (storage as any)[key](...values) });
  if (id.endsWith('.webp')) return 1;
  return originalLoad.call(this, id, ...args);
};
const App = require('../App').default;
Module._load = originalLoad;

const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(text).join('');
const button = (app: ReactTestRenderer, label: string) => {
  const found = app.root.findAll(node => String(node.type) === 'Pressable' && (node.props.accessibilityLabel === label || text(node) === label));
  assert.ok(found.length, `button not found: ${label}`); return found[0];
};
const press = async (app: ReactTestRenderer, label: string) => { await act(async () => { button(app, label).props.onPress(); }); };
const currentName = (app: ReactTestRenderer) => {
  const node = app.root.findAll(node => String(node.type) === 'Text' && node.props.accessibilityLiveRegion === 'polite' && node.props.style?.fontSize === 28)[0];
  return node ? text(node) : null;
};
async function mount() { let app!: ReactTestRenderer; await act(async () => { app = create(React.createElement(App), { createNodeMock: () => ({ scrollTo() {} }) }); }); return app; }
function reset() {
  db?.close(); db = new DatabaseSync(':memory:');
  const nativeDb: ChoiceDatabase = {
    execSync: sql => db!.exec(sql),
    runSync: (sql, ...params) => db!.prepare(sql).run(...params),
    getFirstSync: <T>(sql: string, ...params: (string | number | null)[]) => (db!.prepare(sql).get(...params) ?? null) as T | null,
    getAllSync: <T>(sql: string, ...params: (string | number | null)[]) => db!.prepare(sql).all(...params) as T[],
  };
  storage = createChoiceStorage(() => nativeDb); storage.initializeStorage();
  locale = 'en'; mapsFail = false; opened.length = 0; alerts.length = 0; loadingLabels.length = 0;
}

test('App: Another preserves preferences, saving retains card, haptics failures do not block, and Maps can retry', async t => {
  reset(); t.mock.method(Math, 'random', () => 0.95);
  const app = await mount();
  try {
    assert.equal(app.root.findAll(node => String(node.type) === 'Pressable' && text(node) === 'Rice').length, 0);
    const previous = currentName(app); const settings = storage.getUserSettings();
    await press(app, 'Another'); assert.notEqual(currentName(app), previous);
    assert.deepEqual(storage.getFeedback(), []); assert.deepEqual(storage.getUserSettings(), settings);
    const picked = currentName(app);
    const choose = button(app, 'I chose this').props.onPress;
    await act(async () => { choose(); choose(); }); assert.equal(currentName(app), picked);
    assert.equal(storage.getFeedback().length, 1); button(app, 'Find a nearby place'); button(app, 'Pick again');
    assert.match(text(app.root), /Saved to your recent choices/);
    await press(app, 'Find a nearby place');
    mapsFail = true; await press(app, 'Nearby search'); assert.equal(alerts.length, 1);
    mapsFail = false; await act(async () => { alerts[0][2][1].onPress(); }); assert.equal(opened.length, 1);
    await press(app, 'Pick again'); assert.notEqual(currentName(app), picked);
    assert.equal(storage.getFeedback().length, 1);
  } finally { await act(async () => app.unmount()); }
});

test('App: mode and filters resample, random cuisine changes, and hidden meals stay out of history and picks', async t => {
  reset(); t.mock.method(Math, 'random', () => 0.999);
  const app = await mount();
  try {
    await press(app, 'Delivery'); assert.notEqual(currentName(app), meals[0].name);
    await press(app, 'Narrow it down'); await press(app, 'Rice');
    assert.ok(meals.find(m => m.name === currentName(app))?.foodTypes.includes('rice'));
    const surprise = app.root.findAll(node => String(node.type) === 'Pressable' && text(node).includes('Surprise me with a cuisine'))[0];
    await act(async () => surprise.props.onPress()); const cuisine = storage.getUserSettings().lastCuisine;
    await act(async () => surprise.props.onPress()); assert.notEqual(storage.getUserSettings().lastCuisine, cuisine);
    await press(app, 'I chose this'); const hiddenName = currentName(app);
    await press(app, 'Never recommend this food'); assert.notEqual(currentName(app), hiddenName);
    assert.equal(storage.getBlacklistedMealIds().length, 1);
    assert.equal(app.root.findAll(node => String(node.type) === 'Pressable' && node.props.accessibilityLabel?.startsWith(`${hiddenName}:`)).length, 0);
    await press(app, 'Undo hide'); assert.deepEqual(storage.getBlacklistedMealIds(), []);
  } finally { await act(async () => app.unmount()); }
});

test('App: Narrow it down starts collapsed and resets after switching decision modes', async () => {
  reset();
  const app = await mount();
  try {
    assert.equal(button(app, 'Narrow it down').props.accessibilityState.expanded, false);
    assert.equal(app.root.findAll(node => String(node.type) === 'Pressable' && text(node) === 'Rice').length, 0);
    await press(app, 'Narrow it down');
    assert.equal(button(app, 'Narrow it down').props.accessibilityState.expanded, true);
    assert.equal(app.root.findAll(node => String(node.type) === 'Pressable' && text(node) === 'Rice').length, 1);
    await press(app, 'A place type');
    await press(app, 'A specific dish');
    assert.equal(button(app, 'Narrow it down').props.accessibilityState.expanded, false);
    assert.equal(app.root.findAll(node => String(node.type) === 'Pressable' && text(node) === 'Rice').length, 0);
  } finally { await act(async () => app.unmount()); }
});

test('App: Chinese cold start, all hidden explanation, restore all and single-candidate behavior', async t => {
  reset(); locale = 'zh'; t.mock.method(Math, 'random', () => 0.5);
  meals.forEach(meal => storage.blacklistMeal(meal.id));
  let app = await mount();
  try {
    assert.deepEqual(loadingLabels, ['正在读取你的选择']);
    assert.equal(currentName(app), null); assert.match(text(app.root), /符合条件的食物已全部隐藏/);
    await press(app, '恢复全部'); assert.ok(currentName(app)); assert.deepEqual(storage.getBlacklistedMealIds(), []);
  } finally { await act(async () => app.unmount()); }
  reset(); meals.slice(1).forEach(meal => storage.blacklistMeal(meal.id));
  app = await mount();
  try {
    assert.equal(currentName(app), meals[0].name); await press(app, 'Another'); assert.equal(currentName(app), meals[0].name);
    const reject = button(app, 'Not today').props.onPress;
    await act(async () => { reject(); reject(); }); assert.equal(storage.getFeedback().length, 1);
    assert.equal(storage.getFeedback()[0].action, 'not-today');
    assert.match(text(app.root), /Less often for the next three days/);
    await press(app, 'Never recommend this food'); assert.equal(currentName(app), null);
    await press(app, 'Undo hide'); assert.equal(currentName(app), meals[0].name);
  } finally { await act(async () => app.unmount()); }
});

test('App: venue flow, credits links and image error fallback remain accessible', async t => {
  reset(); t.mock.method(Math, 'random', () => 0);
  const app = await mount();
  try {
    const photo = app.root.findAll(node => String(node.type) === 'Image')[0];
    await act(async () => photo.props.onError());
    assert.match(text(app.root), /Photo coming soon/);
    assert.ok(app.root.findAll(node => String(node.type) === 'Text' && /[🍚🍜🥙🍲🥗🍽]/u.test(text(node))).length > 0);
    await press(app, 'A place type'); await press(app, 'Pick for me'); await press(app, 'Find this nearby');
    await press(app, 'Budget-friendly search'); assert.match(decodeURIComponent(opened[0]), /affordable budget/);
    await press(app, 'Photo credits');
    const search = app.root.findAll(node => String(node.type) === 'TextInput' && node.props.accessibilityLabel === 'Search dishes or sources')[0];
    await act(async () => search.props.onChangeText('no-credit-can-match-this'));
    assert.match(text(app.root), /No photo credits match this search/);
    await act(async () => search.props.onChangeText(''));
    const links = app.root.findAll(node => String(node.type) === 'Pressable' && node.props.accessibilityRole === 'link');
    assert.ok(links.some(node => text(node) === 'License'));
    for (const node of app.root.findAll(node => String(node.type) === 'Pressable')) { assert.ok(node.props.accessibilityRole); assert.ok(node.props.accessibilityLabel); }
    await act(async () => links[0].props.onPress()); assert.equal(opened.length, 2);
    await press(app, 'Report a problem or suggestion'); assert.match(opened.at(-1) ?? '', /github\.com\/KaiVenn52\/before-you-order\/issues\/new/);
    assert.ok(recommendMeals(meals, 'dine-out', null, null, defaultPreferences).length === 244);
  } finally { await act(async () => app.unmount()); }
});

test('App: attribution links have translated errors and a working retry', async () => {
  for (const language of ['en', 'zh']) {
    reset(); locale = language;
    const app = await mount();
    try {
      await press(app, language === 'en' ? 'Photo credits' : '图片来源');
      assert.match(text(app.root), language === 'en' ? /Converted to WebP/ : /已转换为 WebP/);
      const link = app.root.findAll(node => String(node.type) === 'Pressable' && node.props.accessibilityRole === 'link')[0];
      mapsFail = true;
      await act(async () => link.props.onPress());
      assert.equal(alerts[0][0], language === 'en' ? 'Could not open this link' : '无法打开此链接');
      mapsFail = false;
      await act(async () => alerts[0][2][1].onPress());
      assert.equal(opened.length, 1);
    } finally { await act(async () => app.unmount()); }
  }
});

test('App: original placeholders use translated native content rather than baked English labels', async () => {
  reset(); locale = 'zh';
  meals.filter(meal => meal.id !== 'roti-bawang').forEach(meal => storage.blacklistMeal(meal.id));
  const app = await mount();
  try {
    assert.equal(app.root.findAll(node => String(node.type) === 'Image').length, 0);
    assert.match(text(app.root), /照片/);
  } finally { await act(async () => app.unmount()); }
});

test('App: unreadable blacklist pauses dish recommendations while venue mode remains usable', async t => {
  reset(); t.mock.method(Math, 'random', () => 0.5);
  storage = createChoiceStorage(() => { throw new Error('database unavailable'); });
  const app = await mount();
  try {
    assert.equal(currentName(app), null);
    assert.match(text(app.root), /Saved hidden foods could not be loaded/);
    assert.equal(button(app, 'Pick for me').props.disabled, true);
    await press(app, 'A place type'); await press(app, 'Pick for me');
    button(app, 'Find this nearby');
  } finally { await act(async () => app.unmount()); }
});

test('App: impossible filters are disabled and language switching translates saved confirmation', async t => {
  reset(); t.mock.method(Math, 'random', () => 0.5);
  const app = await mount();
  try {
    await press(app, 'Narrow it down'); await press(app, 'Korean');
    assert.equal(button(app, 'Bread & wraps').props.disabled, true);
    assert.equal(button(app, 'Noodles').props.disabled, false);
    await press(app, 'I chose this');
    await press(app, 'Switch to Chinese'); assert.match(text(app.root), /已加入你的选择记录/);
    assert.doesNotMatch(text(app.root), /Saved to your recent choices/);
    assert.equal(storage.getLanguage(), 'zh');
  } finally { await act(async () => app.unmount()); }
});

test('App: recommendation history can be reset without restoring hidden foods', async () => {
  reset();
  const app = await mount();
  try {
    await press(app, 'I chose this');
    await press(app, 'Never recommend this food');
    assert.equal(storage.getFeedback().length, 1);
    assert.equal(storage.getBlacklistedMealIds().length, 1);
    await press(app, 'Manage hidden foods');
    await press(app, 'Reset recommendation history');
    assert.match(alerts[0][0], /Reset recommendation history/);
    await act(async () => alerts[0][2][1].onPress());
    assert.deepEqual(storage.getFeedback(), []);
    assert.equal(storage.getBlacklistedMealIds().length, 1);
  } finally { await act(async () => app.unmount()); }
});
