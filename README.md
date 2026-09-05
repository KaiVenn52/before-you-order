# Before You Order

An Android-first food decision app built for Malaysia. It can recommend either one practical dish or a familiar dining format, then opens a nearby Google Maps search so the suggestion can turn into a real meal.

## What it does

- Supports dine-out, takeaway, and delivery decisions.
- Offers two clear paths: decide a specific dish, or decide what type of place to visit.
- Randomly chooses a different cuisine on demand while preserving manual cuisine and food-form filters.
- Covers 10 Malaysian dining formats, including kopitiam, cafe/brunch, zi char/dai chow, mamak, hawker centres, Malay warung, banana leaf restaurants, steamboat/BBQ, bakeries/dessert shops, and vegetarian restaurants.
- Includes 244 dishes across 12 cuisine groups, with a majority drawn from Malay, Malaysian Chinese, Indian/Mamak, Nyonya, Sabah, and Sarawak food.
- Learns locally from “I chose this” and “Not today” feedback without requiring an account.
- Builds long-term favourites from repeated choices while cooling down meals chosen in the last 20 hours.
- Treats “Not today” as a 72-hour signal and supports a separate permanent blacklist with restore controls.
- Refreshes cuisine picks on every tap and uses bilingual English/Chinese search terms for Malaysian Chinese dishes.
- Supports an English/中文 interface toggle that is remembered on the device.
- Includes a dedicated vegetarian-restaurant place type instead of making unreliable ingredient guarantees for individual outlets.
- Filters independently by food form: rice, noodles, bread and wraps, soup, main plate, or light bites.
- Offers nearby, best-rated, and budget-friendly Google Maps search paths after a meal is chosen.
- Applies those same map-search strategies to place types with bilingual local search terms.
- Keeps chosen meals in actionable history so they can be found again.
- Keeps the permanent food blacklist, with a restore link shown only after something has been hidden.
- Bundles optimized, licensed Wikimedia Commons images with in-app credits.

Prices, ingredients, allergens, and halal certification vary by outlet; the app tells users to verify these with the specific restaurant.

## Run locally

Requires Node.js 22.13 or newer.

```powershell
npm.cmd install
npm.cmd start
```

## Validate

```powershell
npm.cmd run validate
npm.cmd run validate:catalog
npx.cmd expo-doctor
```

`validate` runs strict TypeScript checks, recommendation tests, and an Android Hermes export.

## Build profiles

- `development`: internal APK with Expo developer tools.
- `preview`: shareable APK for device testing.
- `production`: Google Play AAB.

Store submission and public release are intentionally separate, user-approved actions. Test-build details are recorded in `BUILD_RECORD.md`.
