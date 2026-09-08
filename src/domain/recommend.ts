import type { CuisineId, EatingMode, FoodType, Language, Meal, MealFeedback, Preferences } from './types';

const budgetWeight = { value: 0, standard: 1, flexible: 2 } as const;
const HOUR = 60 * 60 * 1000;

export function recommendMeals(
  catalog: Meal[],
  mode: EatingMode,
  cuisine: CuisineId | null,
  foodType: FoodType | null,
  preferences: Preferences,
  feedback: MealFeedback[] = [],
  blacklistedMealIds: string[] = [],
  now = Date.now(),
): Meal[] {
  const maxBudget = budgetWeight[preferences.budget];
  const blacklist = new Set(blacklistedMealIds);
  return catalog
    .filter((meal) => !blacklist.has(meal.id))
    .filter((meal) => meal.modes.includes(mode) && (!cuisine || meal.cuisine === cuisine))
    .filter((meal) => !foodType || meal.foodTypes.includes(foodType))
    .filter((meal) => preferences.diet !== 'vegetarian' || meal.vegetarian || meal.vegetarianAvailable)
    .filter((meal) => !preferences.eggFree || !meal.containsEgg)
    .filter((meal) => !preferences.porkFree || !meal.containsPork)
    .filter((meal) => !preferences.beefFree || !meal.containsBeef)
    .filter((meal) => !preferences.seafoodFree || !meal.containsSeafood)
    .filter((meal) => budgetWeight[meal.budget] <= maxBudget)
    ;
}

// 20% baseline exploration; choice affinity saturates at 3x. Legacy rank is ignored.
export function mealWeight(mealId: string, feedback: readonly MealFeedback[], now: number): number {
  const choices = feedback.filter(item => item.mealId === mealId && item.action === 'chosen').length;
  const rejected = feedback.some(item => item.mealId === mealId && item.action === 'not-today'
    && now - Date.parse(item.createdAt) >= 0 && now - Date.parse(item.createdAt) < 72 * HOUR);
  return (0.2 + 0.8 * Math.min(3, 1 + choices * 0.25)) * (rejected ? 0.1 : 1);
}

export function sampleWeighted<T>(items: readonly T[], weight: (item: T) => number, rng: () => number): T | null {
  const weighted = items.map(item => ({ item, weight: weight(item) })).filter(x => Number.isFinite(x.weight) && x.weight > 0);
  const total = weighted.reduce((sum, x) => sum + x.weight, 0);
  if (!weighted.length) return null;
  const value = rng();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('rng must return a number in [0, 1)');
  let cursor = value * total;
  for (const entry of weighted) {
    if (cursor < entry.weight) return entry.item;
    cursor -= entry.weight;
  }
  return weighted[weighted.length - 1].item;
}

export function pickMeal(candidates: readonly Meal[], feedback: readonly MealFeedback[], blacklistedIds: readonly string[],
  currentId: string | null, now: number, rng: () => number): Meal | null {
  const allowed = candidates.filter(meal => !blacklistedIds.includes(meal.id));
  const pool = allowed.length > 1 ? allowed.filter(meal => meal.id !== currentId) : allowed;
  const chosenIds = new Set(feedback.filter(item => item.action === 'chosen').map(item => item.mealId));
  const familiar = pool.filter(meal => chosenIds.has(meal.id));
  // Make learning visible without trapping the user: 30% familiar picks, 70% full-pool exploration.
  if (familiar.length && rng() < 0.3) return sampleWeighted(familiar, meal => mealWeight(meal.id, feedback, now), rng);
  return sampleWeighted(pool, meal => mealWeight(meal.id, feedback, now), rng);
}

export function pickRefreshedPosition(length: number, previousPosition = -1, random = Math.random): number {
  return pickDifferentItem(Array.from({ length }, (_, index) => index), previousPosition, random) ?? 0;
}

export function pickDifferentItem<T>(items: readonly T[], current: T | null, random = Math.random): T | null {
  const pool = items.length > 1 ? items.filter(item => item !== current) : items;
  return sampleWeighted(pool, () => 1, random);
}

export function recommendationReason(meal: Meal, cuisine: CuisineId | null, preferences: Preferences, chosenTimes = 0, language: Language = 'en'): string {
  if (language === 'zh') {
    if (chosenTimes > 1) return `你已经选择过 ${chosenTimes} 次，它正在成为你的常选。`;
    if (preferences.diet === 'vegetarian') return meal.vegetarian
      ? '本身是素食，也符合你目前的预算。'
      : '素食餐馆通常能提供这道菜的素食版本。';
    if (cuisine) return '符合你刚选择的菜系，也适合现在这一餐。';
    if (meal.budget === 'value') return '容易找到，也符合你目前的预算。';
    return '口味和份量都比较灵活，适合现在选择。';
  }
  if (chosenTimes > 1) return `You have chosen this ${chosenTimes} times before.`;
  if (preferences.diet === 'vegetarian') return meal.vegetarian
    ? 'Naturally vegetarian and within your current budget.'
    : 'Vegetarian restaurants commonly offer a meat-free version of this dish.';
  if (cuisine) return `A practical ${meal.tags[0]} pick in the cuisine you chose.`;
  if (meal.budget === 'value') return 'Easy to find and friendly to your current budget.';
  return `A versatile ${meal.tags[0]} choice for right now.`;
}
