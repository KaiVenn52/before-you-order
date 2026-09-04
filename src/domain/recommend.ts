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
  const chosenCount = new Map<string, number>();
  const cuisineAffinity = new Map<CuisineId, number>();
  const latestFeedback = new Map<string, MealFeedback>();

  feedback.forEach((item) => {
    if (!latestFeedback.has(item.mealId)) latestFeedback.set(item.mealId, item);
    if (item.action !== 'chosen') return;
    chosenCount.set(item.mealId, (chosenCount.get(item.mealId) ?? 0) + 1);
    const picked = catalog.find((meal) => meal.id === item.mealId);
    if (picked) cuisineAffinity.set(picked.cuisine, (cuisineAffinity.get(picked.cuisine) ?? 0) + 1);
  });

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
    .map((meal) => {
      const historyBoost = Math.min(36, (chosenCount.get(meal.id) ?? 0) * 6);
      const cuisineBoost = Math.min(12, (cuisineAffinity.get(meal.cuisine) ?? 0) * 2);
      const latest = latestFeedback.get(meal.id);
      const age = latest ? now - Date.parse(latest.createdAt) : Number.POSITIVE_INFINITY;
      const justChosenPenalty = latest?.action === 'chosen' && age < 20 * HOUR ? 45 : 0;
      const notTodayPenalty = latest?.action === 'not-today' && age < 72 * HOUR ? 60 : 0;
      return { meal, score: meal.rank + historyBoost + cuisineBoost - justChosenPenalty - notTodayPenalty };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ meal }) => meal);
}

export function pickRefreshedPosition(length: number, previousPosition = -1, random = Math.random): number {
  if (length <= 1) return 0;
  let next = Math.floor(random() ** 2 * length);
  if (next === previousPosition % length) next = (next + 1) % length;
  return next;
}

export function pickDifferentItem<T>(items: readonly T[], current: T | null, random = Math.random): T | null {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];
  let nextIndex = Math.floor(random() * items.length);
  if (items[nextIndex] === current) nextIndex = (nextIndex + 1) % items.length;
  return items[nextIndex];
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
  if (chosenTimes > 1) return `You have chosen this ${chosenTimes} times, so it is becoming one of your favourites.`;
  if (preferences.diet === 'vegetarian') return meal.vegetarian
    ? 'Naturally vegetarian and within your current budget.'
    : 'Vegetarian restaurants commonly offer a meat-free version of this dish.';
  if (cuisine) return `A practical ${meal.tags[0]} pick in the cuisine you chose.`;
  if (meal.budget === 'value') return 'Easy to find and friendly to your current budget.';
  return `A versatile ${meal.tags[0]} choice for right now.`;
}
