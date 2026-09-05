import assert from 'node:assert/strict';
import test from 'node:test';
import { cuisineLabels, foodTypeLabels, meals } from '../src/data/meals';
import imageCredits from '../src/data/imageCredits.json';
import { copy } from '../src/i18n';
import { venueTypes } from '../src/data/venues';
import { buildNearbyQuery, googleMapsSearchUrl } from '../src/domain/places';
import { pickDifferentItem, pickRefreshedPosition, recommendMeals } from '../src/domain/recommend';
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

test('a meal chosen just now cools down instead of repeating immediately', () => {
  const now = Date.parse('2026-08-27T12:00:00Z');
  const ranked = recommendMeals(catalog, 'dine-out', null, null, defaults, [{ mealId: 'a', action: 'chosen', createdAt: '2026-08-27T12:00:00Z' }], [], now);
  assert.deepEqual(ranked.map((meal) => meal.id), ['b', 'c', 'a']);
});

test('repeated old choices increase a meal long-term', () => {
  const feedback = Array.from({ length: 4 }, (_, index) => ({ mealId: 'c', action: 'chosen' as const, createdAt: `2026-08-${20 + index}T12:00:00Z` }));
  const ranked = recommendMeals(catalog, 'dine-out', null, null, defaults, feedback, [], Date.parse('2026-08-27T12:00:00Z'));
  assert.equal(ranked[0].id, 'c');
});

test('not-today feedback strongly lowers the rejected meal', () => {
  const now = Date.parse('2026-08-27T12:00:00Z');
  const ranked = recommendMeals(catalog, 'dine-out', null, null, defaults, [{ mealId: 'a', action: 'not-today', createdAt: '2026-08-27T12:00:00Z' }], [], now);
  assert.deepEqual(ranked.map((meal) => meal.id), ['b', 'c', 'a']);
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
