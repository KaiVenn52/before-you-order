// Source-title conflicts found during V1.8 stabilization. Preserve original assets
// and attribution for review, but do not display these photographs as the dish.
export const imageReview: Record<string, string> = {
  'nasi-campur-malay': 'Source is Indonesian nasi campur; Malaysian dish needs confirmation.',
  'ikan-patin-tempoyak': 'Source title describes an exhibition replica.',
  'sambal-sotong': 'Source title describes nasi lemak rather than squid.',
  'penang-hokkien-mee': 'Source describes shrimp and artichoke in Acre, not prawn noodles.',
  'chilli-pan-mee': 'Source describes mushroom lo mein.',
  'fish-head-noodles': 'Source describes Shanghai smoked fish and lions head noodles.',
  'penang-chee-cheong-fun': 'Shared Chaoshan rice roll image does not establish Penang preparation.',
  'ipoh-hor-fun': 'Source describes Thai rat na noodles.',
  'kampar-curry-chicken-bread': 'Source describes Japanese curry bun.',
  'sweet-sour-pork': 'Source describes a nose-to-tail pork plate; preparation unclear.',
  'salted-egg-chicken': 'Source describes honey chicken.',
  'butter-prawns': 'Source describes shrimp and artichoke in Acre.',
  'kam-heong-lala': 'Source describes general Bulacan fish cuisine; clams unconfirmed.',
  'claypot-tofu': 'Source describes olive rice.',
  'mutton-biryani': 'Source describes jackfruit biryani.',
  'mutton-curry': 'Source describes Bengali kosha; intended South Indian preparation unconfirmed.',
  'rasam': 'Source describes lime soup.',
  'vegetarian-thali': 'Source explicitly describes a non-vegetarian thali.',
  'udang-lemak-nenas': 'Source describes Bengali prawn malai curry; pineapple unconfirmed.',
  'sambal-petai-prawns': 'Source describes fermented shrimp condiment cencalok.',
  'babi-pongteh': 'Shared source describes chicken, not pork.',
  'tomato-crispy-mee': 'Source describes tomato and egg noodles; Sarawak crispy form unconfirmed.',
  'nasi-lalap': 'Source describes general Sundanese food.',
  'ngiu-chap': 'Source describes tripe in satay sauce with rice, not Sabah soup.',
  'oyakodon': 'Source includes beef and grilled chicken, not the described simmered chicken bowl.',
  'tempura-set': 'Source describes tempura udon and oden, not rice set.',
  'okonomiyaki': 'Source describes Hiroshima preparation; Chinese name specifies Osaka.',
  'omurice': 'Source title describes cheese decoration; egg-wrapped rice unconfirmed.',
  'thai-red-curry': 'Source describes dry prik khing stir fry, not coconut curry.',
  'tom-yum-noodles': 'Source describes hot and spicy leftovers.',
  'ayam-geprek': 'Source describes penyet; geprek preparation unconfirmed.',
  'vietnamese-chicken-rice': 'Source describes Egyptian koshary.',
  'bo-kho': 'Source describes generic kho; beef stew unconfirmed.',
  'chicken-shawarma': 'Source describes a generic MyPlate graphic, not a dish photo.',
  'shish-kebab': 'Source describes shrimp skewers, not the catalog meat dish.',
  'middle-eastern-mixed-grill': 'Source describes American skewers; mixed grill unconfirmed.',
};

export function needsNeutralImage(mealId: string): boolean {
  return Object.hasOwn(imageReview, mealId);
}
