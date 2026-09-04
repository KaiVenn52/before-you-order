# Security and privacy notes

- Meal feedback and the hidden-food list stay in the app's local SQLite database.
- No account, analytics SDK, advertising SDK, payment SDK, or custom backend is used.
- The app does not request precise location. “Find nearby” hands a text query to Google Maps or the browser, which then follows that service's own permissions and privacy terms.
- All SQL writes use bound parameters.
- Suggestions are not medical or religious certification claims. Users are told to verify allergens, ingredients, and halal certification with the specific outlet.
- Wikimedia source URLs and license details are bundled for attribution; no image is fetched at runtime.
