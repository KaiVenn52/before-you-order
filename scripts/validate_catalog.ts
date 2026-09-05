import fs from 'node:fs';
import path from 'node:path';
import { meals } from '../src/data/meals';
import credits from '../src/data/imageCredits.json';

const root = path.resolve(import.meta.dirname, '..');
const errors: string[] = [];
const duplicateValues = (values: string[]) => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
const requiredLocal = new Set(['malay', 'chinese', 'indian', 'nyonya', 'east-malaysian']);
const ids = meals.map((meal) => meal.id);
const images = meals.map((meal) => meal.imageKey);
const creditById = new Map(credits.map((credit) => [credit.mealId, credit]));

if (meals.length < 220 || meals.length > 250) errors.push(`Catalog size ${meals.length} is outside 220-250.`);
for (const id of duplicateValues(ids)) errors.push(`Duplicate meal id: ${id}`);
for (const key of duplicateValues(images)) errors.push(`Duplicate image key: ${key}`);
for (const name of duplicateValues(meals.map((meal) => meal.name.trim().toLocaleLowerCase()))) errors.push(`Duplicate English name: ${name}`);
for (const name of duplicateValues(meals.map((meal) => (meal.localName ?? '').trim()))) errors.push(`Duplicate Chinese name: ${name}`);
if (meals.filter((meal) => requiredLocal.has(meal.cuisine)).length <= meals.length / 2) errors.push('Malaysian core cuisines are not a majority.');

for (const meal of meals) {
  if (!meal.name.trim() || !meal.localName?.trim()) errors.push(`${meal.id}: missing bilingual name.`);
  if (!meal.description.trim() || !meal.descriptionZh.trim()) errors.push(`${meal.id}: missing bilingual description.`);
  if (!meal.searchQuery.includes('Malaysia')) errors.push(`${meal.id}: Maps query lacks Malaysia context.`);
  if (!meal.foodTypes.length) errors.push(`${meal.id}: no explicit food type.`);
  if (!meal.priceLabel.trim()) errors.push(`${meal.id}: missing price range.`);
  if (!fs.existsSync(path.join(root, 'assets', 'meals', `${meal.imageKey}.webp`))) errors.push(`${meal.id}: missing image file.`);
  const credit = creditById.get(meal.id);
  if (!credit) errors.push(`${meal.id}: missing image credit.`);
  else if (!/^(CC0|CC BY(?:-SA)?|Public domain|Original artwork)/i.test(credit.license)) errors.push(`${meal.id}: unsupported image license ${credit.license}.`);
  else if (credit.artist.length > 180 || /<[^>]+>/.test(credit.artist)) errors.push(`${meal.id}: image artist credit is not clean plain text.`);
}

const counts = Object.fromEntries(Object.keys(Object.groupBy(meals, (meal) => meal.cuisine)).map((cuisine) => [cuisine, meals.filter((meal) => meal.cuisine === cuisine).length]));
console.log(JSON.stringify({ meals: meals.length, localMeals: meals.filter((meal) => requiredLocal.has(meal.cuisine)).length, cuisines: counts, credits: credits.length }, null, 2));
if (errors.length) {
  console.error(`\nCatalog validation failed with ${errors.length} issue(s):\n${errors.slice(0, 80).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('\nCatalog validation passed.');
}
