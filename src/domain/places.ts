import type { EatingMode, Meal } from './types';

export function buildMealSubject(meal: Meal): string {
  return [...new Set([meal.name, meal.localName, meal.searchQuery].filter(Boolean))].join(' ');
}

export type SearchStrategy = 'nearby' | 'best' | 'budget';

export function buildNearbyQuery(
  subject: string,
  strategy: SearchStrategy,
  mode: EatingMode,
  vegetarian = false,
): string {
  const rating = strategy === 'best' ? 'best rated' : '';
  const price = strategy === 'budget' ? 'affordable budget' : '';
  const fulfilment = mode === 'takeaway' ? 'takeaway' : mode === 'delivery' ? 'delivery' : '';
  const diet = vegetarian ? 'vegetarian 素食' : '';
  return [rating, price, diet, subject, fulfilment, 'near me'].filter(Boolean).join(' ');
}

export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
