# Before You Order — Project Status

## Implemented through V1.8 locally

- Expo SDK 57 / React Native Android application.
- One-recommendation decision flow for dine-out, takeaway, or delivery.
- Two first-class decision paths: a specific dish or a type of place.
- Random cuisine selection that avoids repeating the currently selected cuisine.
- Ten Malaysian venue formats with bilingual discovery terms: kopitiam, cafe/brunch, zi char/dai chow, mamak, hawker centre, Malay warung, banana leaf restaurant, steamboat/BBQ, bakery/dessert, and vegetarian restaurant.
- Nearby, best-rated, and budget-friendly Google Maps searches for both dishes and venue formats.
- 244 dishes across 12 cuisine groups; Malay, Malaysian Chinese, Indian/Mamak, Nyonya, and East Malaysian dishes make up the majority.
- Explicit per-dish food-form metadata, bilingual names and descriptions, Malaysia-aware search aliases, price guidance, and reusable image attribution.
- Dedicated Nyonya and East Malaysian groups, plus separate Thai, Indonesian, Vietnamese, and Middle Eastern collections.
- A catalog validator that rejects duplicate IDs or names, missing bilingual metadata, missing assets, and unsupported image licenses.
- Optimized local meal photos with Wikimedia licensing and in-app attribution.
- Full visual and attribution re-audit with direct Commons file mappings for corrected images.
- Direct Google Maps nearby search for each recommendation.
- Full-catalog “Another” action instead of cycling only three cards.
- “Not today” and “I chose this” feedback that changes later ranking.
- Long-term favourite weighting with a 20-hour recently-chosen cooldown and 72-hour “Not today” cooldown.
- Permanent meal blacklist with in-app restore controls.
- Randomized cuisine refresh that avoids showing the same meal twice in a row.
- Bilingual English/Chinese names and map search terms for Malaysian Chinese dishes.
- A persisted English/中文 interface toggle, defaulting to the device language on first launch.
- Separate food-form filter for rice, noodles, bread and wraps, soup, main plates, and light bites.
- A post-meal shop picker for nearby, best-rated, or budget-friendly Google Maps searches.
- Actionable recent-choice history with one-tap nearby search.
- Removed the low-signal dietary/budget settings panel and its always-visible header icon; it affected too few meals, was invisible in venue mode, and risked implying unreliable outlet-level guarantees.
- Kept vegetarian restaurants as an explicit venue type and kept permanent meal hiding as the only preference-like control.
- Hidden-food management appears contextually at the bottom only when the user has blacklisted at least one meal.
- SQLite persistence with WAL mode; no login or cloud account required.
- Explicit outlet-level warning for prices, ingredients, allergens, and halal certification.
- Unused payment dependencies removed until there is a credible paid feature and real demand.
- Production Android builds now use R8 code minification and resource shrinking, with retrace mappings retained for readable crash diagnostics.

## Still requires device validation

- Confirm image crops and text wrapping across common Android screen sizes, including Chinese text.
- Confirm Google Maps/browser handoff on the user's phone.
- Gather feedback from at least 5–10 Malaysian users on recommendation relevance.
- Tune dish metadata and rankings based on observed choices rather than assumptions.
- Review any neutral image placeholders and replace them only when an exact, reusable photo is available.

## Distribution status and remaining boundaries

- V1.7.0 (version code 12) remains the Google Play internal-testing build. V1.8.0 is local source work only until a separately approved store build and upload.
- No public production release or subscription setup.
- No location permission or precise location collection; nearby discovery is delegated to Google Maps.
