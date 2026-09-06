import assert from 'node:assert/strict';
import test from 'node:test';
import { cuisineLabels, foodTypeLabels, meals } from '../src/data/meals';
import imageCredits from '../src/data/imageCredits.json';
import { copy } from '../src/i18n';
import { venueTypes } from '../src/data/venues';
import { buildNearbyQuery, googleMapsSearchUrl } from '../src/domain/places';
import { mealWeight, pickMeal, sampleWeighted, pickDifferentItem, pickRefreshedPosition, recommendMeals } from '../src/domain/recommend';
import type { CuisineId, Meal, Preferences } from '../src/domain/types';

const base: Omit<Meal, 'id' | 'name' | 'rank'> = {
  cuisine: 'malay', description: '', descriptionZh: '', searchQuery: '', foodTypes: ['plate'], modes: ['dine-out'], tags: ['test'], vegetarian: false, vegetarianAvailable: false,
  containsEgg: false, containsPork: false, containsBeef: false, containsSeafood: false,
  spice: 'none', budget: 'standard', priceLabel: '', imageKey: 'test',
};
const catalog: Meal[] = [
  { ...base, id: 'a', name: 'First', rank: 100, vegetarian: true, containsEgg: true, budget: 'value' },
  { ...base, id: 'b', name: 'Second', rank: 90, containsPork: true },
  { ...base, id: 'c', name: 'Third', rank: 80, vegetarian: true },
  { ...base, id: 'd', name: 'Delivery', rank: 200, modes: ['delivery'] },
];
const defaults: Preferences = { diet: 'all', eggFree: false, porkFree: false, beefFree: false, seafoodFree: false, budget: 'standard' };

test('ranks only meals matching the eating mode', () => {
  assert.deepEqual(recommendMeals(catalog, 'dine-out', null, null, defaults).map((meal) => meal.id), ['a', 'b', 'c']);
});

test('cuisine is an optional hard filter', () => {
  assert.equal(recommendMeals(meals, 'dine-out', 'korean', null, defaults).every((meal) => meal.cuisine === 'korean'), true);
  assert.ok(recommendMeals(meals, 'dine-out', null, null, defaults).length > 8);
});

test('food form is independent from cuisine and filters across cuisines', () => {
  const noodles = recommendMeals(meals, 'dine-out', null, 'noodles', defaults);
  assert.ok(noodles.length > 8);
  assert.equal(noodles.every((meal) => meal.foodTypes.includes('noodles')), true);
  const chineseRice = recommendMeals(meals, 'dine-out', 'chinese', 'rice', defaults);
  assert.equal(chineseRice.every((meal) => meal.cuisine === 'chinese' && meal.foodTypes.includes('rice')), true);
});

const now = Date.parse('2026-09-05T12:00:00Z');
const chosen = (id: string, count: number) => Array.from({ length: count }, () => ({ mealId: id, action: 'chosen' as const, createdAt: '2026-01-01T00:00:00Z' }));

test('weighted sampler uses exact cumulative boundaries, ignores zero weights and validates rng', () => {
  const weights = { a: 1, b: 3, c: 0 };
  for (const [rng, expected] of [[0, 'a'], [0.249999, 'a'], [0.25, 'b'], [0.999999, 'b']] as const) {
    assert.equal(sampleWeighted(['a', 'b', 'c'] as const, id => weights[id], () => rng), expected);
  }
  assert.equal(sampleWeighted(['a'], () => 0, () => 0), null);
  assert.equal(sampleWeighted([], () => 1, () => 0), null);
  assert.throws(() => sampleWeighted(['a'], () => 1, () => 1), RangeError);
  assert.throws(() => sampleWeighted(['a'], () => 1, () => NaN), RangeError);
});

test('long-term choice affinity is capped while new meals retain baseline weight', () => {
  assert.equal(mealWeight('a', [], now), 1);
  assert.ok(mealWeight('a', chosen('a', 1), now) > 1);
  assert.ok(Math.abs(mealWeight('a', chosen('a', 100), now) - 2.6) < 1e-10);
  assert.equal(mealWeight('a', chosen('a', 8), now), mealWeight('a', chosen('a', 100), now));
  assert.equal(pickMeal(catalog.slice(0, 3), chosen('a', 100), [], null, now, () => 0.999)?.id, 'c');
});

test('Not today lasts exactly 72 hours, including with later choices and unsorted history', () => {
  const event = { mealId: 'a', action: 'not-today' as const, createdAt: new Date(now).toISOString() };
  assert.equal(mealWeight('a', [event], now), 0.1);
  assert.equal(mealWeight('a', [event], now + 72 * 3600000 - 1), 0.1);
  assert.equal(mealWeight('a', [event], now + 72 * 3600000), 1);
  assert.equal(mealWeight('a', [event], now - 1), 1);
  assert.ok(mealWeight('a', [...chosen('a', 100), event], now) < 0.27);
});

test('selection excludes current and blacklist; single and empty pools remain safe', () => {
  const pool = catalog.slice(0, 3);
  for (const rng of [0, 0.5, 0.999]) {
    assert.notEqual(pickMeal(pool, [], [], 'a', now, () => rng)?.id, 'a');
    assert.equal(pickMeal(pool, [], ['a', 'c'], 'a', now, () => rng)?.id, 'b');
    assert.equal(pickMeal(pool, [], ['a', 'b', 'c'], null, now, () => rng), null);
  }
  assert.equal(pickMeal([catalog[0]], [], [], 'a', now, () => 0)?.id, 'a');
});

test('candidate filtering and Another do not mutate preferences or feedback, independent of rank', () => {
  const history = chosen('c', 5); const snapshot = JSON.stringify({ history, defaults, catalog });
  const pool = recommendMeals(catalog, 'dine-out', null, null, defaults, history);
  pickMeal(pool, history, [], 'a', now, () => 0.6);
  assert.equal(JSON.stringify({ history, defaults, catalog }), snapshot);
  const reversed = recommendMeals([...catalog].reverse(), 'dine-out', null, null, defaults);
  assert.deepEqual(reversed.map(m => m.id), ['c', 'b', 'a']);
  assert.equal(pickMeal(pool, [], [], null, now, () => 0.9)?.id, 'c');
  assert.equal(pickMeal(reversed, [], [], null, now, () => 0)?.id, 'c');
});

test('switching eating mode samples the new candidate set rather than selecting its first entry', () => {
  const pool = recommendMeals(meals, 'delivery', null, null, { ...defaults, budget: 'flexible' });
  const picked = pickMeal(pool, [], [], null, now, () => 0.999);
  assert.equal(picked?.id, pool.at(-1)?.id);
  assert.notEqual(picked?.id, pool[0].id);
});

test('blacklisted meals never appear', () => {
  assert.deepEqual(recommendMeals(catalog, 'dine-out', null, null, defaults, [], ['a', 'c']).map((meal) => meal.id), ['b']);
});

test('refresh avoids returning the same position when alternatives exist', () => {
  assert.equal(pickRefreshedPosition(8, 0, () => 0), 1);
});

test('random selectors avoid repeating the current option when alternatives exist', () => {
  assert.equal(pickDifferentItem(['malay', 'chinese', 'korean'], 'malay', () => 0), 'chinese');
  assert.equal(pickDifferentItem(['kopitiam'], 'kopitiam', () => 0), 'kopitiam');
  assert.equal(pickDifferentItem([], null, () => 0), null);
});

test('venue catalog covers common Malaysian dining formats with bilingual searches', () => {
  assert.equal(venueTypes.length, 10);
  assert.equal(new Set(venueTypes.map((venue) => venue.id)).size, venueTypes.length);
  assert.match(venueTypes.find((venue) => venue.id === 'kopitiam')?.searchQuery ?? '', /kopitiam.*咖啡店/i);
  assert.match(venueTypes.find((venue) => venue.id === 'zi-char')?.searchQuery ?? '', /zi char.*煮炒/i);
  assert.match(venueTypes.find((venue) => venue.id === 'cafe-brunch')?.searchQuery ?? '', /cafe.*咖啡馆/i);
});

test('place searches respect strategy, eating mode and vegetarian preference', () => {
  const query = buildNearbyQuery('kopitiam 咖啡店 Malaysia', 'best', 'delivery', true);
  assert.match(query, /best rated/);
  assert.match(query, /vegetarian 素食/);
  assert.match(query, /delivery near me$/);
  assert.match(googleMapsSearchUrl(query), /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
  assert.match(googleMapsSearchUrl(query), /%E7%B4%A0%E9%A3%9F/);
});

test('dietary and budget settings are hard filters', () => {
  const result = recommendMeals(catalog, 'dine-out', null, null, { ...defaults, diet: 'vegetarian', eggFree: true, porkFree: true, budget: 'value' });
  assert.deepEqual(result, []);
});

test('the production catalog has 244 unique meals and twelve cuisines', () => {
  assert.equal(meals.length, 244);
  assert.equal(new Set(meals.map((meal) => meal.id)).size, 244);
  assert.equal(new Set(meals.map((meal) => meal.imageKey)).size, 244);
  assert.equal(meals.every((meal) => meal.foodTypes.length > 0), true);
  assert.equal(meals.every((meal) => Boolean(meal.localName && meal.descriptionZh)), true);
  assert.equal('vegetarian' in cuisineLabels, false);
  assert.deepEqual(foodTypeLabels.rice, { en: 'Rice', zh: '饭' });
  assert.deepEqual(foodTypeLabels.noodles, { en: 'Noodles', zh: '面' });
  const cuisines = new Set(meals.map((meal) => meal.cuisine));
  assert.equal(cuisines.size, 12);
  assert.deepEqual(Object.fromEntries([...cuisines].map((id) => [id, meals.filter((meal) => meal.cuisine === id).length])), {
    malay: 29, chinese: 43, indian: 31, western: 26, japanese: 18, korean: 16,
    thai: 16, vietnamese: 10, indonesian: 14, 'middle-eastern': 11, nyonya: 15, 'east-malaysian': 15,
  });
  assert.ok(meals.filter((meal) => ['malay', 'chinese', 'indian', 'nyonya', 'east-malaysian'].includes(meal.cuisine)).length > meals.length / 2);
  assert.ok(recommendMeals(meals, 'delivery', null, null, defaults).length < recommendMeals(meals, 'dine-out', null, null, defaults).length);
  const hokkienMee = meals.find((meal) => meal.id === 'hokkien-mee');
  assert.equal(hokkienMee?.localName, '吉隆坡福建面（大碌面）');
  assert.match(hokkienMee?.searchQuery ?? '', /KL Hokkien mee.*吉隆坡福建面/);
  assert.deepEqual(hokkienMee?.foodTypes, ['noodles']);
  assert.deepEqual(meals.find((meal) => meal.id === 'katsudon')?.foodTypes, ['rice']);
  assert.ok(meals.find((meal) => meal.id === 'lei-cha')?.foodTypes.includes('rice'));
  const vegetarianChoices = recommendMeals(meals, 'dine-out', null, null, { ...defaults, diet: 'vegetarian' });
  assert.ok(vegetarianChoices.some((meal) => meal.id === 'char-kway-teow'));
  assert.ok(vegetarianChoices.some((meal) => meal.id === 'chinese-fried-rice'));
  assert.equal(vegetarianChoices.every((meal) => meal.vegetarian || meal.vegetarianAvailable), true);
});

test('every credited image is direct and uses an accepted reusable license', () => {
  assert.equal(new Set(imageCredits.map((credit) => credit.mealId)).size, imageCredits.length);
  assert.equal(imageCredits.some((credit) => /\.(pdf|djvu)(?:$|\?)/i.test(credit.sourceUrl)), false);
  assert.equal(imageCredits.every((credit) => /^(CC0|CC BY(?:-SA)?|Public domain|Original artwork)/i.test(credit.license)), true);
  assert.match(imageCredits.find((credit) => credit.mealId === 'hokkien-mee')?.sourceUrl ?? '', /KL_hokkien_mee/i);
  assert.match(imageCredits.find((credit) => credit.mealId === 'yong-tau-foo')?.sourceUrl ?? '', /Malaysian_Yong_Tau_Foo/i);
  assert.match(imageCredits.find((credit) => credit.mealId === 'korean-fried-chicken')?.sourceUrl ?? '', /Korean_fried_chicken/i);
});

test('removed preference controls are not referenced by active empty and blacklist guidance', () => {
  assert.doesNotMatch(copy.en.noMatchBody, /diet|budget|preference/i);
  assert.doesNotMatch(copy.en.neverBody, /food preferences/i);
  assert.doesNotMatch(copy.zh.noMatchBody, /饮食限制|预算|偏好/);
  assert.doesNotMatch(copy.zh.neverBody, /饮食偏好/);
  assert.match(copy.en.neverBody, /Manage hidden foods/);
  assert.match(copy.zh.neverBody, /管理隐藏食物/);
});

test('all 244 explicit food types and the five named classification regressions are valid', () => {
  for (const meal of meals) {
    assert.ok(meal.foodTypes.length > 0);
    for (const type of meal.foodTypes) assert.ok(type in foodTypeLabels, meal.id);
  }
  for (const id of ['katsudon', 'chicken-katsu-curry', 'pad-kra-pao', 'ayam-penyet']) {
    assert.deepEqual(meals.find(meal => meal.id === id)?.foodTypes, ['rice']);
  }
  assert.deepEqual(meals.find(meal => meal.id === 'char-kway-teow')?.foodTypes, ['noodles']);
  assert.doesNotMatch(meals.find(meal => meal.id === 'club-sandwich')?.localName ?? '', /公司/);
});
