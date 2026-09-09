import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import review from '../docs/V1.8_CATALOG_REVIEW.json';
import { auditCredits } from '../src/domain/catalogAudit';
import { imageReview } from '../src/data/imageReview';
import { foodTypeLabels, meals } from '../src/data/meals';
import credits from '../src/data/imageCredits.json';

const root = path.resolve(import.meta.dirname, '..');
const audit = auditCredits(credits, meals.map(meal => meal.id));
const errors: string[] = [...audit.errors];
const imageMap = fs.readFileSync(path.join(root, 'src/data/mealImages.ts'), 'utf8');
const duplicateValues = (values: string[]) => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
const requiredLocal = new Set(['malay', 'chinese', 'indian', 'nyonya', 'east-malaysian']);
const ids = meals.map((meal) => meal.id);
const images = meals.map((meal) => meal.imageKey);
const creditById = new Map(credits.map((credit) => [credit.mealId, credit]));
const reviewById = new Map(review.items.map(item => [item.mealId, item]));
if (review.items.length !== meals.length || reviewById.size !== meals.length) errors.push('Review ledger coverage is incomplete or duplicated.');

if (meals.length < 220 || meals.length > 250) errors.push(`Catalog size ${meals.length} is outside 220-250.`);
for (const id of duplicateValues(ids)) errors.push(`Duplicate meal id: ${id}`);
for (const key of duplicateValues(images)) errors.push(`Duplicate image key: ${key}`);
for (const name of duplicateValues(meals.map((meal) => meal.name.trim().toLocaleLowerCase()))) errors.push(`Duplicate English name: ${name}`);
for (const name of duplicateValues(meals.map((meal) => (meal.localName ?? '').trim()))) errors.push(`Duplicate Chinese name: ${name}`);
if (meals.filter((meal) => requiredLocal.has(meal.cuisine)).length <= meals.length / 2) errors.push('Malaysian core cuisines are not a majority.');

for (const meal of meals) {
  const reviewed = reviewById.get(meal.id);
  const imagePath = path.join(root, 'assets', 'meals', `${meal.imageKey}.webp`);
  if (!reviewed) errors.push(`${meal.id}: visual/semantic review missing.`);
  else {
    if (JSON.stringify(reviewed.foodTypes) !== JSON.stringify(meal.foodTypes) || reviewed.name !== meal.name || reviewed.localName !== meal.localName || reviewed.description !== meal.description || reviewed.descriptionZh !== meal.descriptionZh) errors.push(`${meal.id}: semantic review is stale.`);
    if (fs.existsSync(imagePath) && createHash('sha256').update(fs.readFileSync(imagePath)).digest('hex') !== reviewed.imageSha256) errors.push(`${meal.id}: image changed after visual review.`);
    const expectedDisplay = creditById.get(meal.id)?.isPlaceholder ? 'original-placeholder' : imageReview[meal.id] ? 'withheld' : 'photo';
    if (reviewed.display !== expectedDisplay) errors.push(`${meal.id}: display review is stale.`);
    if (imageReview[meal.id] && reviewed.imageDecision !== imageReview[meal.id]) errors.push(`${meal.id}: withholding reason changed after review.`);
  }
  if (!meal.name.trim() || !meal.localName?.trim()) errors.push(`${meal.id}: missing bilingual name.`);
  if (!meal.description.trim() || !meal.descriptionZh.trim()) errors.push(`${meal.id}: missing bilingual description.`);
  if (!meal.searchQuery.includes('Malaysia')) errors.push(`${meal.id}: Maps query lacks Malaysia context.`);
  if (meal.foodTypes.some(type => !(type in foodTypeLabels))) errors.push(`${meal.id}: invalid food type.`);
  if (!imageMap.includes(`'${meal.imageKey}': require(`)) errors.push(`${meal.id}: missing static image mapping.`);
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
console.log(JSON.stringify({
  sourcePhotos: credits.filter(c => c.license !== 'Original artwork').length,
  generatedOriginals: credits.filter(c => c.license === 'Original artwork' && !c.isPlaceholder).length,
  originalPlaceholders: credits.filter(c => c.isPlaceholder).length,
  withheldPhotos: Object.keys(imageReview).length,
  duplicateExternalImages: audit.duplicates,
  manualReview: imageReview,
}, null, 2));
if (errors.length) {
  console.error(`\nCatalog validation failed with ${errors.length} issue(s):\n${errors.slice(0, 80).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('\nCatalog validation passed.');
}
