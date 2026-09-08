# Before You Order — Project Status

## Implemented through V1.9; V1.8 is the current Google Play Alpha release

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
- All 244 meal image mappings and bilingual category descriptions reviewed. The current catalog displays 216 verified reusable photos and 28 translated neutral cards: 19 original placeholders plus 9 withheld mismatches. Per-image processing records and a hash-bound review ledger are in docs/V1.8_IMAGE_REVIEW.md. Native-device crops are not fully verified.
- Direct Google Maps nearby search for each recommendation.
- Full-catalog “Another” action instead of cycling only three cards.
- “Not today” and “I chose this” feedback that changes later sampling weights.
- Bounded long-term choice weighting, explicit exploration, and a 72-hour “Not today” reduction. Sampling is independent of catalog rank and order.
- Permanent meal blacklist with in-app restore controls.
- Randomized cuisine refresh that avoids showing the same meal twice in a row.
- Bilingual English/Chinese names and map search terms for Malaysian Chinese dishes.
- A persisted English/中文 interface toggle, defaulting to the device language on first launch.
- Separate food-form filter for rice, noodles, bread and wraps, soup, main plates, and light bites.
- A post-meal shop picker for nearby, best-rated, or budget-friendly Google Maps searches.
- Actionable recent-choice history with one-tap nearby search.
- Removed the low-signal dietary/budget settings panel and its always-visible header icon; it affected too few meals, was invisible in venue mode, and risked implying unreliable outlet-level guarantees.
- Kept vegetarian restaurants as an explicit venue type and kept permanent meal hiding as the only preference-like control.
- Hidden-food management is always available near the main action; hiding supports undo, individual restore and restore all.
- SQLite persistence with WAL mode; no login or cloud account required.
- Explicit outlet-level warning for prices, ingredients, allergens, and halal certification.
- Unused payment dependencies removed until there is a credible paid feature and real demand.
- Production Android builds now use R8 code minification and resource shrinking, with retrace mappings retained for readable crash diagnostics.
- V1.9 disables cuisine/food-type combinations that cannot return a meal, normalizes invalid filters when the eating mode changes, prevents duplicate rapid feedback, and lets users reset recommendation history without restoring hidden foods.

## Still requires device validation

- Confirm image crops and text wrapping across common Android screen sizes, including Chinese text.
- Confirm Google Maps/browser handoff on the user's phone.
- Gather feedback from at least 5–10 Malaysian users on recommendation relevance.
- Tune dish metadata and rankings based on observed choices rather than assumptions.
- Review any neutral image placeholders and replace them only when an exact, reusable photo is available.

## Distribution status and remaining boundaries

- V1.8.0 (version code 13) was published to the closed-testing Alpha track at 100% rollout on 8 September 2026 after Google approved the initial 13 changes. V1.9.0 source is newer and requires a fresh production AAB/versionCode before testers receive it. The active geographic scope remains 7 countries/regions while expansion to every Play-supported location (169 additional named locations plus `其他国家/地区`) is under review. Self-managed publishing remains enabled, so the geographic expansion must be published after approval.
- No public production release or subscription setup.
- No location permission or precise location collection; nearby discovery is delegated to Google Maps.

## V1.8 core stabilization (local source)

The home screen offers Pick for me, collapsed optional cuisine/food filters, and a persistent saved-choice state with Find a nearby place and Pick again. Another samples a different eligible dish without writing preferences. Not today reduces a dish weight to 10% for exactly 72 hours. Choice affinity caps at 3; the blended weight is 0.2 + 0.8 × affinity (1–2.6 before cooldown). New dishes retain a positive baseline.

SQLite is opened lazily with guarded reads/writes and session memory fallback. If the persisted blacklist cannot be read at startup, dish picks pause and venue selection remains available; restart retries storage. Failures after a successful load retain the cached blacklist and disclose temporary storage. Optional haptics never block an action. External links report errors with retry.

EAS uses remote version management with autoIncrement for preview/production. No local versionCode is set. The V1.8 production build received code 13. Any future build must use a fresh remote code; uploading the existing code-13 artifact does not require rebuilding.

See docs/V1.8_STABILIZATION.md for source verification, device QA limits and V1.9 backlog. BUILD_RECORD.md records the completed V1.8 cloud build, Alpha publication, and pending global-scope review. Tester opt-in and the 14-day closed-test requirement remain separate.
