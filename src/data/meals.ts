import type { Budget, CuisineId, FoodType, Meal, SpiceLevel } from '../domain/types';
import { mealZh } from './mealZh';

export const cuisineLabels: Record<CuisineId, { en: string; zh: string }> = {
  malay: { en: 'Malay', zh: '马来餐' }, chinese: { en: 'Chinese', zh: '中餐' },
  indian: { en: 'Indian & Mamak', zh: '印度餐与嘛嘛档' }, western: { en: 'Western', zh: '西餐' },
  japanese: { en: 'Japanese', zh: '日本餐' }, korean: { en: 'Korean', zh: '韩国餐' },
  'southeast-asian': { en: 'Southeast Asian', zh: '东南亚餐' },
};
export const foodTypeLabels: Record<FoodType, { en: string; zh: string }> = {
  rice: { en: 'Rice', zh: '饭' }, noodles: { en: 'Noodles', zh: '面' },
  bread: { en: 'Bread & wraps', zh: '饼与面包' }, soup: { en: 'Soup', zh: '汤类' },
  plate: { en: 'Main plate', zh: '主餐' }, light: { en: 'Light bites', zh: '轻食与小吃' },
};

type Seed = [id: string, name: string, cuisine: CuisineId, description: string, tags: string, flags: string, budget: Budget, price: string, spice?: SpiceLevel];
const takeawayExceptions = new Set(['bak-kut-teh', 'yakitori', 'bulgogi', 'kimchi-jjigae']);
const deliveryExceptions = new Set([
  'roti-canai', 'thosai', 'fish-and-chips', 'caesar-salad', 'sushi-set', 'yakitori', 'soba',
  'som-tam', 'caprese-salad', 'greek-salad', 'fresh-spring-rolls',
]);
const suitableModes = (id: string): Meal['modes'] => [
  'dine-out',
  ...(!takeawayExceptions.has(id) ? ['takeaway' as const] : []),
  ...(!deliveryExceptions.has(id) ? ['delivery' as const] : []),
];
const foodTypesFor = (id: string, name: string): FoodType[] => {
  const value = `${id} ${name}`.toLowerCase();
  const types: FoodType[] = [];
  if (/nasi|rice|biryani|donburi|katsudon|bibimbap|onigiri|gimbap|lei-cha|bubur|congee/.test(value)) types.push('rice');
  if (/mee|noodle|ramen|udon|soba|spaghetti|pad-thai|japchae|pho|laksa|chee-cheong-fun|aglio-olio|jjajangmyeon|carbonara|lasagna|bun-cha/.test(value)) types.push('noodles');
  if (/roti|thosai|chapati|sandwich|burger|banh-mi|toast|appam|pizza|naan|murtabak/.test(value)) types.push('bread');
  if (/soup|soto|bak-kut-teh|tom-yum|kimchi-jjigae|sundubu|yong-tau-foo|mee-rebus|curry-mee|pan-mee|ramen|udon|pho|laksa|lontong|bubur|congee/.test(value)) types.push('soup');
  if (/salad|sushi|onigiri|som-tam|acai|spring-rolls|gimbap|falafel|vadai|chee-cheong-fun|dim-sum|takoyaki|mango-sticky-rice/.test(value)) types.push('light');
  if (types.length === 0) types.push('plate');
  return types;
};
const seed = (...row: Seed): Meal => {
  const [id, name, cuisine, description, tags, flags, budget, priceLabel, spice = 'mild'] = row;
  const translation = mealZh[id];
  const localName = translation?.name;
  return {
    id, name, localName, cuisine, description, descriptionZh: translation?.description ?? description,
    searchQuery: [name, localName, 'Malaysia', 'restaurant'].filter(Boolean).join(' '),
    foodTypes: foodTypesFor(id, name),
    modes: suitableModes(id),
    tags: tags.split('|'), vegetarian: flags.includes('v'), vegetarianAvailable: flags.includes('V'), containsEgg: flags.includes('e'),
    containsPork: flags.includes('p'), containsBeef: flags.includes('b'), containsSeafood: flags.includes('s'),
    spice, budget, priceLabel, imageKey: id, rank: 80,
  };
};

export const meals: Meal[] = [
  seed('nasi-lemak', 'Nasi lemak', 'malay', 'Coconut rice with sambal and classic sides—the Malaysian default when nothing else wins.', 'iconic|rice', 'es', 'value', 'Usually RM4–12', 'hot'),
  seed('beef-rendang', 'Beef rendang', 'malay', 'Slow-cooked, deeply spiced beef for a richer, more substantial meal.', 'slow-cooked|rich', 'b', 'standard', 'Usually RM12–25', 'hot'),
  seed('nasi-kerabu', 'Nasi kerabu', 'malay', 'Herbed blue rice with vegetables and a protein; fresh, aromatic and full of texture.', 'herby|rice', 's', 'standard', 'Usually RM8–18', 'hot'),
  seed('nasi-dagang', 'Nasi dagang', 'malay', 'Fragrant rice traditionally served with fish curry, especially good for breakfast or lunch.', 'east-coast|rice', 's', 'standard', 'Usually RM7–16', 'hot'),
  seed('mee-rebus', 'Mee rebus', 'malay', 'Yellow noodles in a thick sweet-savoury gravy when you want comfort in a bowl.', 'noodles|comfort', 'es', 'value', 'Usually RM6–12', 'mild'),
  seed('ayam-percik', 'Ayam percik', 'malay', 'Charred chicken in a coconut-spice sauce: smoky, savoury and satisfying.', 'grilled|chicken', '', 'standard', 'Usually RM10–20', 'hot'),
  seed('soto-ayam', 'Soto ayam', 'malay', 'A warming chicken soup with rice cakes or noodles that feels lighter than fried food.', 'soup|chicken', 'e', 'value', 'Usually RM7–14', 'mild'),
  seed('asam-pedas', 'Asam pedas', 'malay', 'A sour-spicy fish stew for days when you want bold flavour with rice.', 'tangy|fish', 's', 'standard', 'Usually RM12–25', 'hot'),
  seed('nasi-goreng-kampung', 'Nasi goreng kampung', 'malay', 'Village-style fried rice with anchovies, chilli and greens for a smoky, punchy plate.', 'wok-fried|rice', 'es', 'value', 'Usually RM7–15', 'hot'),
  seed('lontong', 'Lontong', 'malay', 'Rice cakes in coconut vegetable gravy with sambal, popular for breakfast and brunch.', 'breakfast|coconut', 've', 'value', 'Usually RM6–14', 'mild'),
  seed('laksa-johor', 'Laksa Johor', 'malay', 'Spaghetti with a thick fish-based laksa gravy and fresh herbs—the Johor signature.', 'johor|noodles', 's', 'standard', 'Usually RM9–20', 'hot'),
  seed('ayam-goreng-berempah', 'Ayam goreng berempah', 'malay', 'Crisp fried chicken covered in fragrant fried spices, made to pair with rice.', 'fried|chicken', '', 'standard', 'Usually RM9–20', 'hot'),
  seed('nasi-minyak', 'Nasi minyak', 'malay', 'Fragrant ghee rice with warm spices, usually paired with curry or celebratory dishes.', 'fragrant|rice', 'V', 'standard', 'Usually RM8–20', 'mild'),
  seed('ikan-bakar', 'Ikan bakar', 'malay', 'Charcoal-grilled fish with sambal and lime for a smoky, punchy meal with rice.', 'grilled|fish', 's', 'standard', 'Usually RM15–35', 'hot'),
  seed('bubur-lambuk', 'Bubur lambuk', 'malay', 'Spiced rice porridge with herbs and savoury toppings when you want something soft and warming.', 'porridge|comfort', 'bV', 'value', 'Usually RM5–12', 'mild'),

  seed('chicken-rice', 'Hainanese chicken rice', 'chinese', 'Tender chicken and fragrant rice: quick, familiar and easy to find almost anywhere.', 'quick|rice', '', 'value', 'Usually RM6–14', 'none'),
  seed('char-kway-teow', 'Char kway teow', 'chinese', 'Smoky flat noodles with wok hei when you want something indulgent and fast.', 'wok-fried|noodles', 'esV', 'standard', 'Usually RM8–16', 'mild'),
  seed('bak-kut-teh', 'Bak kut teh', 'chinese', 'Peppery herbal pork rib soup, best when you have time for a sit-down meal.', 'herbal|soup', 'p', 'flexible', 'Usually RM18–40', 'none'),
  seed('wonton-noodles', 'Wonton noodles', 'chinese', 'Springy noodles with dumplings; available dry or in soup for an easy lunch.', 'dumplings|noodles', 'epsV', 'value', 'Usually RM7–15', 'none'),
  seed('hokkien-mee', 'Hokkien mee', 'chinese', 'Dark, savoury braised noodles built for a hearty dinner.', 'braised|noodles', 'psV', 'standard', 'Usually RM10–20', 'mild'),
  seed('curry-mee', 'Curry mee', 'chinese', 'Creamy curry noodles with tofu puffs and toppings for a bold, warming bowl.', 'curry|noodles', 'epsV', 'standard', 'Usually RM8–17', 'hot'),
  seed('pan-mee', 'Pan mee', 'chinese', 'Hand-torn noodles with greens; choose soup for comfort or dry for stronger flavour.', 'handmade|noodles', 'espV', 'value', 'Usually RM7–15', 'mild'),
  seed('yong-tau-foo', 'Yong tau foo', 'chinese', 'Pick your own tofu and vegetables, then choose clear soup or dry sauce.', 'customisable|soup', 'sV', 'standard', 'Usually RM8–20', 'none'),
  seed('chee-cheong-fun', 'Chee cheong fun', 'chinese', 'Silky rice rolls served with sweet sauce, curry or yong tau foo pieces.', 'rice-rolls|breakfast', 'v', 'value', 'Usually RM4–12', 'none'),
  seed('claypot-chicken-rice', 'Claypot chicken rice', 'chinese', 'Soy-marinated chicken and rice cooked in claypot for a fragrant crispy base.', 'claypot|rice', 'p', 'standard', 'Usually RM10–22', 'none'),
  seed('lei-cha', 'Lei cha rice', 'chinese', 'Rice, chopped vegetables and beans served with a fragrant herb tea broth.', 'hakka|vegetables', 'v', 'standard', 'Usually RM8–18', 'none'),
  seed('chinese-fried-rice', 'Chinese fried rice', 'chinese', 'Familiar wok-fried rice that vegetarian shops can prepare without meat.', 'wok-fried|rice', 'eV', 'value', 'Usually RM7–15', 'mild'),
  seed('dim-sum', 'Dim sum', 'chinese', 'A mix of steamed and fried bite-size dishes, ideal when the table wants variety.', 'sharing|steamed', 'epsV', 'flexible', 'Usually RM15–40', 'none'),
  seed('congee', 'Chinese congee', 'chinese', 'Gentle rice porridge with your choice of egg, fish, chicken or preserved vegetables.', 'porridge|comfort', 'epsV', 'value', 'Usually RM6–15', 'none'),
  seed('roast-duck-rice', 'Roast duck rice', 'chinese', 'Cantonese roast duck over rice with savoury sauce for a rich, dependable lunch.', 'roasted|rice', '', 'standard', 'Usually RM10–22', 'none'),
  seed('fish-ball-noodles', 'Fish ball noodles', 'chinese', 'Springy fish balls with noodles served dry or in a clear broth.', 'fish|noodles', 's', 'value', 'Usually RM7–15', 'none'),

  seed('roti-canai', 'Roti canai', 'indian', 'Crisp, flaky flatbread with dhal—the dependable mamak choice at almost any hour.', 'mamak|flatbread', 'v', 'value', 'Usually RM2–6', 'mild'),
  seed('thosai', 'Thosai', 'indian', 'A crisp fermented rice-lentil crepe with dhal and chutney; light but satisfying.', 'fermented|vegetarian', 'v', 'value', 'Usually RM3–8', 'mild'),
  seed('nasi-kandar', 'Nasi kandar', 'indian', 'Rice, curries and your choice of sides when you want full control over the plate.', 'customisable|rice', 'esbV', 'standard', 'Usually RM10–30', 'hot'),
  seed('mee-goreng-mamak', 'Mee goreng mamak', 'indian', 'Tangy, spicy fried noodles with tofu and vegetables for a fast comfort meal.', 'mamak|noodles', 'esV', 'value', 'Usually RM6–12', 'hot'),
  seed('tandoori-chicken', 'Tandoori chicken', 'indian', 'Yogurt-spiced grilled chicken that pairs well with naan or a lighter salad.', 'grilled|protein', '', 'standard', 'Usually RM10–22', 'hot'),
  seed('chapati-dhal', 'Chapati with dhal', 'indian', 'Whole-wheat flatbread and lentil curry: simple, filling and meat-free.', 'lentils|vegetarian', 'v', 'value', 'Usually RM5–10', 'mild'),
  seed('chicken-biryani', 'Chicken biryani', 'indian', 'Aromatic spiced rice and chicken for a substantial one-plate meal.', 'aromatic|rice', '', 'standard', 'Usually RM10–22', 'hot'),
  seed('idli-sambar', 'Idli with sambar', 'indian', 'Soft steamed rice cakes with lentil stew; gentle, light and traditionally vegetarian.', 'steamed|vegetarian', 'v', 'value', 'Usually RM4–10', 'mild'),
  seed('banana-leaf-rice', 'Banana leaf rice', 'indian', 'Rice, curries, vegetables and optional protein served across a banana leaf.', 'south-indian|rice', 'v', 'standard', 'Usually RM10–28', 'hot'),
  seed('masala-thosai', 'Masala thosai', 'indian', 'A crisp thosai filled with spiced potato for a more complete vegetarian meal.', 'potato|vegetarian', 'v', 'value', 'Usually RM5–12', 'mild'),
  seed('appam', 'Appam', 'indian', 'A fermented rice pancake with crisp edges and a soft centre, served sweet or savoury.', 'breakfast|rice-pancake', 'v', 'value', 'Usually RM3–9', 'none'),
  seed('vadai', 'Vadai', 'indian', 'Crisp savoury lentil fritters for breakfast, a snack or a small extra side.', 'lentils|snack', 'v', 'value', 'Usually RM1–5', 'mild'),
  seed('butter-chicken', 'Butter chicken', 'indian', 'Creamy tomato-spice chicken curry that works especially well with rice or naan.', 'curry|chicken', '', 'standard', 'Usually RM14–30', 'mild'),
  seed('naan', 'Naan with curry', 'indian', 'Soft tandoor-baked bread with dhal or curry for an easy shareable meal.', 'bread|curry', 'v', 'value', 'Usually RM5–15', 'mild'),
  seed('murtabak', 'Murtabak', 'indian', 'Pan-fried stuffed flatbread with egg, onion and meat, served with curry.', 'mamak|stuffed', 'eb', 'standard', 'Usually RM7–18', 'mild'),

  seed('chicken-chop', 'Chicken chop', 'western', 'Grilled or fried chicken with sauce and sides—the local kopitiam Western staple.', 'kopitiam|chicken', '', 'standard', 'Usually RM14–28', 'none'),
  seed('fish-and-chips', 'Fish and chips', 'western', 'Crisp battered fish and fries for an uncomplicated comfort-food choice.', 'fried|fish', 'es', 'flexible', 'Usually RM18–40', 'none'),
  seed('spaghetti-bolognese', 'Spaghetti bolognese', 'western', 'Tomato meat sauce and pasta: familiar, filling and widely available.', 'pasta|comfort', 'b', 'standard', 'Usually RM15–30', 'none'),
  seed('caesar-salad', 'Caesar salad', 'western', 'Crunchy greens with a creamy dressing; add chicken when you want a lighter main.', 'salad|light', 'es', 'standard', 'Usually RM14–28', 'none'),
  seed('cheeseburger', 'Cheeseburger', 'western', 'A straightforward burger choice when speed and satisfaction matter more than novelty.', 'burger|beef', 'be', 'standard', 'Usually RM12–30', 'none'),
  seed('grilled-chicken', 'Grilled chicken', 'western', 'Lean grilled chicken with vegetables or mash for a balanced, reliable plate.', 'grilled|protein', '', 'standard', 'Usually RM15–32', 'none'),
  seed('mushroom-soup', 'Mushroom soup', 'western', 'Creamy and warming; pair with bread when you only want a small meal.', 'soup|light', 'v', 'value', 'Usually RM7–18', 'none'),
  seed('club-sandwich', 'Club sandwich', 'western', 'A layered, portable meal that works well for takeaway or a quick café lunch.', 'sandwich|portable', 'ep', 'standard', 'Usually RM14–28', 'none'),
  seed('aglio-olio', 'Aglio olio', 'western', 'Pasta with garlic, olive oil and chilli for a lighter, direct flavour.', 'pasta|garlic', 'v', 'standard', 'Usually RM14–28', 'mild'),
  seed('pizza', 'Pizza', 'western', 'Flexible toppings, easy sharing and widely available vegetarian combinations.', 'sharing|baked', 'V', 'standard', 'Usually RM18–45', 'none'),
  seed('carbonara', 'Spaghetti carbonara', 'western', 'Creamy, savoury pasta for days when you want a richer café meal.', 'pasta|creamy', 'ep', 'standard', 'Usually RM16–32', 'none'),
  seed('lasagna', 'Lasagna', 'western', 'Baked pasta layered with sauce, cheese and meat for a substantial sit-down meal.', 'baked|pasta', 'b', 'standard', 'Usually RM18–35', 'none'),

  seed('sushi-set', 'Sushi set', 'japanese', 'A varied set of rice and seafood bites when you want variety without a heavy sauce.', 'seafood|variety', 'es', 'flexible', 'Usually RM18–50', 'none'),
  seed('ramen', 'Ramen', 'japanese', 'A rich noodle soup built for comfort; broth and toppings vary greatly by shop.', 'soup|noodles', 'epb', 'flexible', 'Usually RM18–38', 'mild'),
  seed('donburi', 'Donburi', 'japanese', 'Protein and vegetables over rice—a convenient, complete one-bowl meal.', 'rice-bowl|quick', 'e', 'standard', 'Usually RM14–30', 'none'),
  seed('udon', 'Udon', 'japanese', 'Thick, chewy noodles served in broth or dry; comforting without being complicated.', 'noodles|gentle', 'es', 'standard', 'Usually RM13–28', 'none'),
  seed('japanese-curry', 'Japanese curry rice', 'japanese', 'Mild, savoury curry over rice with chicken, beef or vegetables.', 'curry|rice', 'bV', 'standard', 'Usually RM15–30', 'mild'),
  seed('yakitori', 'Yakitori', 'japanese', 'Charcoal-grilled chicken skewers, best for sharing or pairing with rice.', 'grilled|skewers', '', 'flexible', 'Usually RM15–40', 'none'),
  seed('soba', 'Soba noodles', 'japanese', 'Buckwheat noodles served hot or chilled for a lighter Japanese option.', 'buckwheat|light', 'es', 'standard', 'Usually RM14–28', 'none'),
  seed('onigiri', 'Onigiri', 'japanese', 'A portable rice snack with simple fillings, ideal for a quick small meal.', 'rice|portable', 's', 'value', 'Usually RM4–10', 'none'),
  seed('chicken-katsu-curry', 'Chicken katsu curry', 'japanese', 'Crisp chicken cutlet with mild Japanese curry and rice for a filling plate.', 'fried|rice', '', 'standard', 'Usually RM18–35', 'mild'),
  seed('katsudon', 'Katsudon', 'japanese', 'Crisp cutlet simmered with egg and onion over rice for a hearty one-bowl meal.', 'rice-bowl|cutlet', 'e', 'standard', 'Usually RM16–32', 'none'),
  seed('takoyaki', 'Takoyaki', 'japanese', 'Hot octopus-filled batter bites, best as a snack or a shared extra.', 'snack|seafood', 'es', 'value', 'Usually RM8–18', 'none'),

  seed('bibimbap', 'Bibimbap', 'korean', 'Rice, vegetables, egg and sauce mixed together for colour, texture and balance.', 'rice-bowl|vegetables', 'ebV', 'standard', 'Usually RM16–32', 'hot'),
  seed('korean-fried-chicken', 'Korean fried chicken', 'korean', 'Crisp chicken with a sweet-spicy glaze when you want something made for sharing.', 'fried|sharing', '', 'flexible', 'Usually RM20–55', 'hot'),
  seed('kimchi-fried-rice', 'Kimchi fried rice', 'korean', 'Tangy, savoury fried rice—often topped with egg—for a fast, punchy meal.', 'rice|tangy', 'ep', 'standard', 'Usually RM14–28', 'hot'),
  seed('tteokbokki', 'Tteokbokki', 'korean', 'Chewy rice cakes in spicy sauce; better as a snack or shared side than a balanced main.', 'rice-cakes|spicy', 'es', 'standard', 'Usually RM12–25', 'hot'),
  seed('bulgogi', 'Bulgogi', 'korean', 'Sweet-savoury grilled beef with rice and side dishes.', 'grilled|beef', 'b', 'flexible', 'Usually RM22–45', 'mild'),
  seed('japchae', 'Japchae', 'korean', 'Springy glass noodles with vegetables and often beef; savoury but not very spicy.', 'glass-noodles|vegetables', 'bV', 'standard', 'Usually RM15–30', 'none'),
  seed('kimchi-jjigae', 'Kimchi jjigae', 'korean', 'Hot, sour kimchi stew with tofu and often pork for a warming sit-down meal.', 'stew|tangy', 'p', 'standard', 'Usually RM16–32', 'hot'),
  seed('gimbap', 'Gimbap', 'korean', 'Rolled rice with vegetables and fillings; portable, shareable and easy to eat.', 'rice-roll|portable', 'ebV', 'standard', 'Usually RM10–22', 'none'),
  seed('jjajangmyeon', 'Jjajangmyeon', 'korean', 'Thick noodles in a savoury black bean sauce, a Korean takeaway classic.', 'black-bean|noodles', 'p', 'standard', 'Usually RM16–30', 'none'),
  seed('sundubu-jjigae', 'Sundubu jjigae', 'korean', 'Bubbling soft-tofu stew with egg and your choice of seafood or meat.', 'stew|tofu', 'esV', 'standard', 'Usually RM18–35', 'hot'),
  seed('dak-galbi', 'Dak-galbi', 'korean', 'Spicy stir-fried chicken with cabbage and rice cakes, made for sharing.', 'stir-fried|chicken', '', 'flexible', 'Usually RM22–50', 'hot'),

  seed('pad-thai', 'Pad Thai', 'southeast-asian', 'Sweet-sour stir-fried rice noodles with peanuts and a choice of protein.', 'thai|noodles', 'esV', 'standard', 'Usually RM12–25', 'mild'),
  seed('tom-yum', 'Tom yum', 'southeast-asian', 'Hot and sour Thai soup with seafood or chicken when you want a sharp flavour reset.', 'thai|soup', 's', 'standard', 'Usually RM14–30', 'hot'),
  seed('thai-green-curry', 'Thai green curry', 'southeast-asian', 'Fragrant coconut curry with herbs, vegetables and your choice of protein.', 'thai|curry', 'sV', 'standard', 'Usually RM15–30', 'hot'),
  seed('pineapple-fried-rice', 'Pineapple fried rice', 'southeast-asian', 'Sweet-savoury fried rice with fruit, nuts and often seafood.', 'thai|rice', 'esV', 'standard', 'Usually RM13–26', 'mild'),
  seed('pho', 'Pho', 'southeast-asian', 'Vietnamese rice noodles in aromatic broth with herbs; restorative and not too heavy.', 'vietnamese|soup', 'bV', 'standard', 'Usually RM15–30', 'none'),
  seed('banh-mi', 'Banh mi', 'southeast-asian', 'Crisp Vietnamese baguette with pickles and savoury fillings; ideal for takeaway.', 'vietnamese|sandwich', 'epV', 'standard', 'Usually RM10–22', 'mild'),
  seed('pad-kra-pao', 'Pad kra pao', 'southeast-asian', 'Thai basil stir-fry over rice, usually topped with a fried egg.', 'thai|rice', 'epV', 'standard', 'Usually RM13–27', 'hot'),
  seed('som-tam', 'Som tam', 'southeast-asian', 'Crunchy green papaya salad with lime and chilli; fresh, fiery and best with a side.', 'thai|salad', 'sV', 'standard', 'Usually RM10–20', 'hot'),
  seed('ayam-penyet', 'Ayam penyet', 'southeast-asian', 'Indonesian smashed fried chicken with sambal, tofu and tempeh for a bold rice meal.', 'indonesian|chicken', '', 'standard', 'Usually RM10–22', 'hot'),
  seed('nasi-padang', 'Nasi Padang', 'southeast-asian', 'Steamed rice with a choose-your-own spread of Indonesian curries, vegetables and proteins.', 'indonesian|customisable', 'esbV', 'flexible', 'Usually RM12–30', 'hot'),
  seed('bun-cha', 'Bún chả', 'southeast-asian', 'Vietnamese grilled pork with rice noodles, herbs and a bright dipping broth.', 'vietnamese|grilled', 'p', 'standard', 'Usually RM15–30', 'mild'),
  seed('mango-sticky-rice', 'Mango sticky rice', 'southeast-asian', 'Sweet coconut sticky rice with ripe mango for a light meal or dessert-sized choice.', 'thai|sweet', 'v', 'standard', 'Usually RM10–20', 'none'),

  seed('buddhas-delight', "Buddha's delight", 'chinese', 'A mixed vegetable and tofu stir-fry that is substantial enough to pair with rice.', 'tofu|vegetables', 'v', 'standard', 'Usually RM12–25', 'none'),
  seed('caprese-salad', 'Caprese salad', 'western', 'Tomato, mozzarella and basil for a fresh, simple café meal.', 'salad|fresh', 'v', 'flexible', 'Usually RM16–32', 'none'),
  seed('greek-salad', 'Greek salad', 'western', 'Crisp vegetables, olives and feta—refreshing when a cooked meal feels too heavy.', 'salad|fresh', 'v', 'standard', 'Usually RM14–28', 'none'),
  seed('falafel-bowl', 'Falafel bowl', 'western', 'Chickpea patties, grains and vegetables with sauce for a complete meat-free bowl.', 'chickpeas|bowl', 'v', 'standard', 'Usually RM15–30', 'mild'),
  seed('tempeh-bowl', 'Tempeh rice plate', 'southeast-asian', 'Nutty tempeh with rice and vegetable sides: filling, local-friendly plant protein.', 'tempeh|rice-plate', 'v', 'standard', 'Usually RM12–26', 'mild'),
  seed('acai-bowl', 'Açaí bowl', 'western', 'Cold fruit puree with toppings; suited to breakfast or a light meal, not every appetite.', 'fruit|cold', 'v', 'flexible', 'Usually RM18–35', 'none'),
  seed('avocado-toast', 'Avocado toast', 'western', 'Creamy avocado on toast, often with egg; a familiar café breakfast or brunch.', 'toast|brunch', 've', 'flexible', 'Usually RM16–32', 'none'),
  seed('fresh-spring-rolls', 'Fresh spring rolls', 'southeast-asian', 'Rice-paper rolls packed with herbs, vegetables and tofu for a light, portable meal.', 'fresh|portable', 'v', 'standard', 'Usually RM10–22', 'none'),
];
