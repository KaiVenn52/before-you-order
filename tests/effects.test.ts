import assert from 'node:assert/strict';
import test from 'node:test';
import { ignoreFailure, openExternalUrl, openFirstExternalUrl } from '../src/domain/effects';
import { androidMapsSearchUrl, buildMealSubject, buildNearbyQuery, googleMapsSearchUrl } from '../src/domain/places';
import { meals } from '../src/data/meals';
import credits from '../src/data/imageCredits.json';
import { auditCredits } from '../src/domain/catalogAudit';
import { imageReview, needsNeutralImage } from '../src/data/imageReview';

test('Maps success and failure use the same recoverable external-opening adapter', async () => {
  const url = googleMapsSearchUrl('chicken rice 鸡饭 Malaysia');
  let opened = ''; let errors = 0;
  assert.equal(await openExternalUrl(url, async value => { opened = value; }, () => errors++), true);
  assert.equal(opened, url); assert.equal(errors, 0);
  assert.equal(await openExternalUrl(url, async () => { throw new Error('no handler'); }, () => errors++), false);
  assert.equal(errors, 1);
  assert.equal(await openExternalUrl('', async () => assert.fail('empty URL must not open'), () => errors++), false);
  assert.equal(await openExternalUrl(url, async () => {}, () => errors++), true);
});

test('haptics rejects or throws without failing the caller', async () => {
  await assert.doesNotReject(() => ignoreFailure(async () => { throw new Error('not supported'); }));
  await assert.doesNotReject(() => ignoreFailure(() => { throw new Error('native failure'); }));
});

test('English and Chinese Maps searches retain both dish names and Malaysian aliases in all modes', () => {
  const meal = meals.find(m => m.id === 'hokkien-mee')!;
  for (const language of ['en', 'zh']) for (const mode of ['dine-out', 'takeaway', 'delivery'] as const) {
    // Language changes display, never removes the multilingual search aliases.
    const query = buildNearbyQuery(buildMealSubject(meal), 'nearby', mode);
    const decoded = new URL(googleMapsSearchUrl(query)).searchParams.get('query')!;
    assert.ok(decoded.includes(meal.name), language);
    assert.ok(decoded.includes(meal.localName!), language);
    assert.match(decoded, /Malaysia/);
    if (mode !== 'dine-out') assert.ok(decoded.includes(mode));
  }
});

test('244 credits have clean authors and valid attribution, with no quarantined images', () => {
  assert.equal(credits.length, 244);
  const audit = auditCredits(credits, meals.map(meal => meal.id));
  assert.deepEqual(audit.errors, []);
  assert.ok(audit.duplicates.length > 0, 'shared sources must appear in the review report');
  for (const id of Object.keys(imageReview)) {
    assert.ok(meals.some(meal => meal.id === id)); assert.equal(needsNeutralImage(id), true);
  }
  assert.equal(Object.keys(imageReview).length, 0);
  assert.equal(needsNeutralImage('chilli-pan-mee'), false, 'the corrected dish image should be displayed');
  const bad = [{ ...credits[0], artist: '<b>author</b>', licenseUrl: '' }];
  assert.equal(auditCredits(bad, [bad[0].mealId]).errors.length, 2);
  const missingChanges = [{ ...credits[0], modifications: [] }];
  assert.match(auditCredits(missingChanges, [credits[0].mealId]).errors.join(), /processing record/);
  const assumed = [{ ...credits[0], attributionStatus: 'source-assumed' }];
  assert.match(auditCredits(assumed, [credits[0].mealId]).errors.join(), /qualification missing/);
});

test('Android Maps falls back to the browser when no app handles the geo URL', async () => {
  const query = 'chicken rice 鸡饭 Malaysia near me';
  const attempted: string[] = [];
  const success = await openFirstExternalUrl(
    [androidMapsSearchUrl(query), googleMapsSearchUrl(query)],
    async url => { attempted.push(url); if (url.startsWith('geo:')) throw new Error('No maps app'); },
    () => assert.fail('the HTTPS fallback should open'),
  );
  assert.equal(success, true);
  assert.deepEqual(attempted, [androidMapsSearchUrl(query), googleMapsSearchUrl(query)]);
});
