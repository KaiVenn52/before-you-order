// Source-title and local-pixel conflicts found during V1.8 review. Preserve original assets
// and attribution for review, but do not display these photographs as the dish.
export const imageReview: Record<string, string> = {
  "ginger-scallion-fish": "Whole fish shown; catalog describes stir-fried fish slices.",
  "linopot-set": "Closed leaf parcels hide the rice; the described Sabah meal sides are not shown.",

  'nasi-campur-malay': 'Source is Indonesian nasi campur; Malaysian dish needs confirmation.',
  'chilli-pan-mee': 'Source describes mushroom lo mein.',
  'penang-chee-cheong-fun': 'Shared Chaoshan rice roll image does not establish Penang preparation.',
  'udang-lemak-nenas': 'Source describes Bengali prawn malai curry; pineapple unconfirmed.',
  'babi-pongteh': 'Shared source describes chicken, not pork.',
  'nasi-lalap': 'Source describes general Sundanese food.',
  'middle-eastern-mixed-grill': 'Source describes American skewers; mixed grill unconfirmed.',
};

export function needsNeutralImage(mealId: string): boolean {
  return Object.hasOwn(imageReview, mealId);
}
