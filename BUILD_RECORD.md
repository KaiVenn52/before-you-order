# Android Build Record

## V1.8 core stabilization — 6 September 2026 — local verification only

- Status: `LOCAL SOURCE CHECKED — READY FOR AN APPROVED TEST BUILD; NO NATIVE BUILD OR UPLOAD`
- Starting commit: `4a6b642d36c4e8f12acb2fa3eb0c59845d5829ff`; local branch `codex/v1.8-core-stabilization`.
- App/package version: `1.8.0`. EAS uses remote version management and autoIncrement; no local versionCode was invented. The next code must be new and greater than previously used codes (recorded Play V1.7: 12); live remote counter remains unverified.
- New local results: `npm.cmd run typecheck` exit 0; `npm.cmd test` exit 0 (33/33); `npm.cmd run validate:catalog` exit 0; `npx.cmd expo-doctor` exit 0 (21/21); `npx.cmd expo export --platform android --output-dir artifacts/v1.8-final-20260906/android-export` exit 0; `npm.cmd audit --omit=dev` exit 1 (10 moderate, 0 high, 0 critical).
- Final typecheck and tests were repeated successfully after the contrast adjustment; logs `typecheck-final.txt` and `test-final.txt`.
- Audit chain: uuid <11.1.1 through xcode/Expo tooling. The proposed `audit fix --force` would downgrade Expo to 46; it was not run.
- Android Hermes export: `artifacts/v1.8-final-20260906/android-export/_expo/static/js/android/index-71f01b104ab3ef38c119290f2ee52f49.hbc`, `8234613` bytes, SHA-256 `5bba53bdff676e7c52805175750ea764df5141f1211f2e58f17f53df659db92d`.
- Export metadata SHA-256: `6e3ea27e80d710bc74c96f51e6a7ae574e10dcbd93da9d2a46156785bb1a2ade`.
- Raw command evidence: `artifacts/v1.8-final-20260906/results.jsonl` and corresponding logs. Baseline git identity/check logs: `artifacts/v1.8-baseline-20260905/`.
- Catalog: 244 meals, 133 Malaysian-core dishes, 12 cuisines; all food types structurally valid, five named category regressions tested.
- Photos: 244 original WebP files unchanged (191 source photos + 53 original placeholders). 54 questionable source or local-image mappings are withheld via runtime neutral views; effective display 137 photos / 107 neutral displays. Three duplicate-source groups remain recorded; four generic author entries were resolved and one assumed author remains explicitly qualified and withheld.
- Color checks: eight representative text/background pairs all >=4.76:1; YOUR PICK ink/gold 5.33:1.
- No phone, emulator, TalkBack, native persistence, actual Maps handoff or system-large-font verification was performed. React App interaction tests substitute native modules; Node SQLite tests verify the SQL and disk reopen behavior.
- No push, EAS build, AAB, Play upload or store submission. Earlier release entries below are preserved historical records and are not evidence of a V1.8 native build.
- Detailed handoff: `docs/V1.8_STABILIZATION.md`; image review: `docs/V1.8_IMAGE_REVIEW.md`.

## V1.8 catalog expansion — local validation only — 2026-09-05

- Status: `LOCAL SOURCE VALIDATED — NOT BUILT OR UPLOADED TO GOOGLE PLAY`
- App version: `1.8.0`
- Scope: expanded the catalog from 100 to 244 dishes across 12 cuisine groups; added dedicated Nyonya and East Malaysian groups, explicit food-form metadata, bilingual descriptions, Malaysia-aware Maps aliases, and wrapped cuisine controls.
- Malaysia focus: 133 of 244 dishes belong to Malay, Malaysian Chinese, Indian/Mamak, Nyonya, or East Malaysian groups.
- Image integrity: 244 local WebP assets and 244 credit records; 191 use visually reviewed reusable photos and 53 deliberately use neutral original placeholders after ambiguous or incorrect search results were rejected.
- Validation: Expo Doctor passed 21/21 checks; TypeScript passed; 15/15 tests passed; catalog validation passed; local Android Hermes export completed with 240 deduplicated bundled assets and an 8.2 MB JavaScript bundle.
- Boundaries: no EAS build, AAB generation, Google Play upload, or track change was performed for V1.8.

## Google Play internal testing release V1.7 — 2026-08-31

- Status: `PUBLISHED TO INTERNAL TESTING`
- App version: `1.7.0`
- Version code: `12`
- EAS build ID: `0750eea0-4934-4963-bf15-3e5efb2a746a`
- Scope: enabled R8 code minification and Android resource shrinking for production builds; added the R8 mapping file to retained EAS build artifacts.
- Validation: `npm.cmd run validate` passed (TypeScript, 15/15 tests, Android Hermes export with 100 assets); Expo Doctor passed 21/21 checks; the EAS build log executed `:app:minifyReleaseWithR8`.
- Local AAB: `artifacts/Before-You-Order-v1.7.0-production-v12.aab`
- AAB size: `64,536,514` bytes (`61.55 MB`)
- AAB SHA-256: `6214E80DC51772D1AA134F0EEC524D707C54A2879AA01247EFCCEA472DF6D270`
- Local R8 mapping: `artifacts/Before-You-Order-v1.7.0-mapping-v12.txt` (`25,511,810` bytes)
- EAS build page: https://expo.dev/accounts/kaivenns-team/projects/before-you-order/builds/0750eea0-4934-4963-bf15-3e5efb2a746a
- AAB artifact: https://expo.dev/artifacts/eas/8gH5fDBSO2WXSeKHR4UZ7kyGRydkRkIX0Yx_Xv1i9lo.aab
- Play Console release page: https://play.google.com/console/u/0/developers/4657272712655016267/app/4972749863108430086/tracks/4701755993793379324?tab=releases
- Play result: the internal-testing track shows `12 (1.7.0)` as published to internal testers, and the expanded release summary confirms actual version code `12` across 19,180 supported devices.
- Play artifact validation: Google Play identifies both a ReTrace mapping file and native debug symbols on the version 12 bundle; no supported devices were lost.

## Google Play internal testing release V1.6 — 2026-08-31

- Status: `PUBLISHED TO INTERNAL TESTING`
- App version: `1.6.0`
- Version code: `11`
- EAS build ID: `26bd3812-d3a3-4f55-ac85-eff6f855acbb`
- Scope: expanded the catalogue from 80 to 100 dishes with bilingual metadata across all seven cuisine groups; added 20 matching Wikimedia images and credits; corrected the asset fetcher's MIME and Windows UTF-8 handling path.
- Asset integrity: 100 optimized WebP images and 100 direct Wikimedia Commons credits; four false-match images and two additional weak matches were manually replaced with exact dish files.
- Release-review fix: corrected stale English and Chinese guidance that still referenced removed dietary/budget controls and added a regression test.
- Validation: `npm.cmd run validate` passed (TypeScript, 15/15 tests, Android Hermes export with 100 assets); Expo Doctor passed 21/21; Expo dependency alignment check passed.
- Local file: `artifacts/Before-You-Order-v1.6.0-production-v11.aab`
- Size: `67,340,673` bytes (`64.22 MB`)
- SHA-256: `DFB83CE0F934EF77DA6422FE7C093E38F68EE6C39A436484AF5930D9404A5032`
- EAS build page: https://expo.dev/accounts/kaivenns-team/projects/before-you-order/builds/26bd3812-d3a3-4f55-ac85-eff6f855acbb
- AAB artifact: https://expo.dev/artifacts/eas/cKXnLGie9plmXZlSe-Dk446CGTfnG8w9F7LzgLzUYyQ.aab
- Play Console release page: https://play.google.com/console/u/0/developers/4657272712655016267/app/4972749863108430086/tracks/4701755993793379324?tab=releases
- Play result: `11 (1.6.0)` is shown as published to internal testers on 2026-08-31; Google Play currently labels the release `尚未审核` (not yet reviewed).
- Play validation: no blocking errors and no reduction in supported devices; one non-blocking reminder reported that no R8/ProGuard deobfuscation file is associated with the bundle.

## Google Play internal testing release V1.5 — 2026-08-30

- Status: `PUBLISHED TO INTERNAL TESTING`
- EAS project: `@kaivenns-team/before-you-order`
- Build ID: `df905ba3-445c-48cc-9554-855c51ccf8be`
- Package: `com.kaivenn.beforeyouorder`
- App version: `1.5.0`
- Version code: `9`
- Distribution: Google Play internal testing track
- Scope: removed the low-impact dietary/budget settings and header icon, disabled previously stored preference filters, made the full budget range available by default, and retained contextual hidden-food restore controls.
- Local file: `artifacts/Before-You-Order-v1.5.0-production.aab`
- Size: `67,340,697` bytes (`64.22 MB`)
- SHA-256: `8E72D28891EF307E35317FABA3DF5F19D28E1577340577E5B159B8C763F98457`
- EAS build page: https://expo.dev/accounts/kaivenns-team/projects/before-you-order/builds/df905ba3-445c-48cc-9554-855c51ccf8be
- AAB artifact: https://expo.dev/artifacts/eas/4aoy2x0xCOjs0d2TENl4zskusBd1SKk173ZKmkGz7Dg.aab
- Play Console release page: https://play.google.com/console/u/0/developers/4657272712655016267/app/4972749863108430086/tracks/4701755993793379324?tab=releases
- Play result: `9 (1.5.0)` is shown as published to internal testers; Google Play currently labels the release `尚未审核` (not yet reviewed).
- Play validation: no blocking errors; one non-blocking reminder reported that no R8/ProGuard deobfuscation file is associated with the bundle. Supported-device counts did not decrease.
- Validation: `npm.cmd run validate` passed (TypeScript, 14/14 tests, Android Hermes export with 80 assets); `npx.cmd expo-doctor` passed 21/21 checks.

## Google Play internal testing release V1.4 — 2026-08-29

- Status: `PUBLISHED TO INTERNAL TESTING`
- EAS project: `@kaivenns-team/before-you-order`
- Build ID: `ad8fb784-ad2f-466e-beea-7abc02f6c656`
- Package: `com.kaivenn.beforeyouorder`
- App version: `1.4.0`
- Version code: `8`
- Distribution: Google Play internal testing track
- Local file: `artifacts/Before-You-Order-v1.4.0-production.aab`
- Size: `66,009,735` bytes (`62.95 MB`)
- SHA-256: `7A8DEFD4FB577C8AD6B6C233B7441B441A4ED312F2EA06BBD74EDB5C9672908F`
- EAS build page: https://expo.dev/accounts/kaivenns-team/projects/before-you-order/builds/ad8fb784-ad2f-466e-beea-7abc02f6c656
- AAB artifact: https://expo.dev/artifacts/eas/pGbX857RfLanCpvp3t9yrTqvTAiQs0to-ARtz9Czars.aab
- Play Console release page: https://play.google.com/console/u/0/developers/4657272712655016267/app/4972749863108430086/tracks/4701755993793379324?tab=releases
- Play result: `8 (1.4.0)` is shown as published to internal testers; Google Play currently labels the release `尚未审核` (not yet reviewed).
- Validation: `npm.cmd run validate` passed (TypeScript, 14/14 tests, Android Hermes export with 80 assets); `npx.cmd expo-doctor` passed 21/21 checks.

## Google Play internal testing release V1.3 — 2026-08-29

- Status: `PUBLISHED TO INTERNAL TESTING`
- EAS project: `@kaivenns-team/before-you-order`
- Build ID: `b871d661-295d-4dd7-a29a-902764b17468`
- Package: `com.kaivenn.beforeyouorder`
- App version: `1.3.0`
- Version code: `7`
- Distribution: Google Play internal testing track
- Local file: `artifacts/Before-You-Order-v1.3.0-production.aab`
- Size: `66,003,800` bytes (`62.94 MB`)
- SHA-256: `6F6A95081215FC4C172EB154A3D55750777077BF77BC2DD41DD29A20B04119AC`
- EAS build page: https://expo.dev/accounts/kaivenns-team/projects/before-you-order/builds/b871d661-295d-4dd7-a29a-902764b17468
- AAB artifact: https://expo.dev/artifacts/eas/JLTR3lsFyvfctWSD1wpzXkTo8SFrIept11us3FIhblg.aab
- Play Console release page: https://play.google.com/console/u/3/developers/4657272712655016267/app/4972749863108430086/tracks/4701755993793379324?tab=releases
- Play result: `7 (1.3.0)` is shown as published to internal testers; Google Play currently labels the track `尚未审核` (not yet reviewed).

## V1.3 local validation — 2026-08-28 (not uploaded)

- Status: `VALIDATED LOCALLY`
- App version: `1.3.0`
- Scope: English/中文 interface toggle, 80-meal catalogue, corrected Malaysian dish image coverage, food-form filters, and vegetarian restaurant-first Google Maps search.
- Asset integrity: 80 optimized WebP images and 80 direct Wikimedia Commons credits; no PDF/DJVU sources.
- Validation: `npm.cmd run validate` passed (TypeScript, 11/11 tests, Android export with 80 assets); `npx.cmd expo-doctor` passed 21/21 checks.
- Distribution at this validation checkpoint: no EAS build or Google Play upload had yet been performed.

## Google Play AAB V1.2 — 2026-08-27 (ready to upload)

- Status: `FINISHED`
- EAS project: `@kaivenns-team/before-you-order`
- Build ID: `fa6ea6af-fd5f-42f8-a874-fb93e3153322`
- Package: `com.kaivenn.beforeyouorder`
- App version: `1.2.0`
- Version code: `5`
- Distribution: Google Play store AAB
- Local file: `artifacts/Before-You-Order-v1.2.0-production.aab`
- Size: `64,719,669` bytes (`61.72 MB`)
- SHA-256: `7F5E4D1BDE1D4073F408AF77A6463F6A002C5262DBCC63396EB186C84D29E628`
- EAS build page: https://expo.dev/accounts/kaivenns-team/projects/before-you-order/builds/fa6ea6af-fd5f-42f8-a874-fb93e3153322

This signed build includes the V1.2 feature set and the new meal-choice spinner identity. Google Play upload is pending developer-account enrollment and two-step verification for the signed-in Google account.

## Preview APK V1.2 — 2026-08-27 (current)

- Status: `FINISHED`
- EAS project: `@kaivenns-team/before-you-order`
- Build ID: `1dd738e7-fa0b-410b-a317-5ddf7be0a205`
- Package: `com.kaivenn.beforeyouorder`
- App version: `1.2.0`
- Version code: `4`
- Distribution: internal preview APK
- Local file: `artifacts/Before-You-Order-v1.2.0-preview.apk`
- Size: `100,680,056` bytes (`96.02 MB`)
- SHA-256: `1BD193D1F453D382CE18D224F8132ACBB6BAB0AA57CF08CE20BECA2B051409D9`
- Archive validation: ZIP structure valid; Android manifest, DEX files, resources, and four ABI directories present.
- EAS build page: https://expo.dev/accounts/kaivenns-team/projects/before-you-order/builds/1dd738e7-fa0b-410b-a317-5ddf7be0a205

This is the current private test build. It includes bilingual Chinese-dish search, cuisine refresh, food-form filters, long-term preference learning with short-term cooldowns, a permanent blacklist, corrected meal images and credits, and the nearby shop-comparison flow.

Build `b45059d9-ec50-4bcd-a9ff-359696bb618d` (version code 3) was an intermediate V1.2 build superseded before delivery and should not be tested.

## Preview APK V1.1 — 2026-08-25

- Status: `FINISHED`
- EAS project: `@kaivenns-team/before-you-order`
- Build ID: `8ef2b573-feb3-4eef-9bce-6a9422518948`
- Package: `com.kaivenn.beforeyouorder`
- App version: `1.1.0`
- Version code: `2`
- Distribution: internal preview APK
- Local file: `artifacts/Before-You-Order-v1.1.0-preview.apk`
- Size: `100,564,148` bytes (`95.91 MB`)
- SHA-256: `1D117DDBC9E93BD3D6962A3C83AF8866ABBA7FCAB3E563A2C3FF47A4AA067280`
- Archive validation: ZIP structure valid; Android manifest, DEX files, resources, and four ABI directories present.
- EAS build page: https://expo.dev/accounts/kaivenns-team/projects/before-you-order/builds/8ef2b573-feb3-4eef-9bce-6a9422518948

This is a private test build, not a Google Play submission. V1.1 replaces the venue-card prototype with an actionable meal-to-nearby-place loop and local feedback learning.

## Preview APK — 2026-08-25

- Status: `FINISHED`
- EAS project: `@kaivenns-team/before-you-order`
- Build ID: `d6dbec78-dc35-4113-9896-5b34b7c2bb1c`
- Package: `com.kaivenn.beforeyouorder`
- App version: `1.0.0`
- Version code: `1`
- Distribution: internal preview APK
- Local file: `artifacts/Before-You-Order-v1.0.0-preview.apk`
- Size: `114,216,659` bytes (`108.93 MB`)
- SHA-256: `FF9BC6C6500B56DEB80D432EF8DCCDC994338285ADF1169D5B48DB9CDFABEB15`
- Archive validation: ZIP structure valid; Android manifest, DEX, resources and four ABI directories present.
- EAS build page: https://expo.dev/accounts/kaivenns-team/projects/before-you-order/builds/d6dbec78-dc35-4113-9896-5b34b7c2bb1c

This was the original V1 test build and has been superseded by V1.1.


## V1.8 additional local acceptance — 7 September 2026

- Continues local commit `e8372810ce9b473d518bfca19f2ae4369cddd97f` on `codex/v1.8-core-stabilization`; no push or cloud build.
- All 244 current local assets and bilingual category descriptions reviewed. The hash-bound ledger is `docs/V1.8_CATALOG_REVIEW.json`; full decisions and source evidence are in `docs/V1.8_IMAGE_REVIEW.md`.
- 18 additional suspect photos withheld, 54 total. Effective display is 137 photos / 107 native translated placeholders. All 244 bundled original WebP files remain unchanged.
- Per-image processing records added to all 244 credits and image-generation metadata helpers. Five generic author entries investigated: three source-page author checks, one uploader/self-publication attribution, and one explicitly assumed author whose photo remains withheld. Other source-photo authors remain imported metadata.
- Idli with sambar moves from bread/soup to light/soup. Carbonara uses the broader Pasta carbonara name. Source-link errors and retry are localized separately from Maps errors. Original placeholders now use localized native content.
- `npm.cmd run typecheck`: exit 0; `npm.cmd test`: 35 passed, 0 failed; `npm.cmd run validate:catalog`: exit 0; `npx.cmd expo-doctor`: 21/21, exit 0.
- `npx.cmd expo export --platform android --output-dir artifacts/v1.8-final-local/android-export`: exit 0, with 4096 MB Node heap. Bundle `index-30e2b13ae987479c311289c0b46ddcd4.hbc`: 8,242,083 bytes; SHA-256 `cee49df789f658f71469e84c54d7e1b3188c7dad8c0f954f399fe62c5a615d41`.
- Twenty-one contact sheets regenerated from the hash-bound ledger with `py -3 scripts/render_catalog_contact_sheets.py`. Both Python image helpers pass `py_compile`; Git asset diff is empty.
- No dependency versions changed. `npm.cmd audit --omit=dev` reports 10 moderate, 0 high and 0 critical advisories in the Expo tooling chain. The offered automatic fix downgrades Expo to 46, so no unsafe forced fix was applied.
- This is a JavaScript/Hermes export, not an APK/AAB. Native screen sizes, system fonts, TalkBack, Expo SQLite restarts and real OS handoffs still require device acceptance. No release or remote version-code claim.
