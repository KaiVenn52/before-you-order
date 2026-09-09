// Any future source-title or local-pixel conflict must be listed here so the app
// quarantines it. The September 2026 completion pass replaced every prior conflict.
export const imageReview: Record<string, string> = {};

export function needsNeutralImage(mealId: string): boolean {
  return Object.hasOwn(imageReview, mealId);
}
