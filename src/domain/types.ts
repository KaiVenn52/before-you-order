export type EatingMode = 'dine-out' | 'takeaway' | 'delivery';
export type DecisionMode = 'dish' | 'venue';
export type Language = 'en' | 'zh';
export const cuisineIds = [
  'malay',
  'chinese',
  'indian',
  'nyonya',
  'east-malaysian',
  'japanese',
  'korean',
  'thai',
  'indonesian',
  'vietnamese',
  'western',
  'middle-eastern',
] as const;
export type CuisineId = typeof cuisineIds[number];

export function isCuisineId(value: unknown): value is CuisineId {
  return typeof value === 'string' && (cuisineIds as readonly string[]).includes(value);
}
export type Budget = 'value' | 'standard' | 'flexible';
export type Diet = 'all' | 'vegetarian';
export type SpiceLevel = 'none' | 'mild' | 'hot';
export type FeedbackAction = 'chosen' | 'not-today';
export type FoodType = 'rice' | 'noodles' | 'bread' | 'soup' | 'plate' | 'light';
export type VenueTypeId =
  | 'kopitiam'
  | 'cafe-brunch'
  | 'zi-char'
  | 'mamak'
  | 'hawker-centre'
  | 'malay-warung'
  | 'banana-leaf'
  | 'steamboat-bbq'
  | 'bakery-dessert'
  | 'vegetarian-restaurant';

export interface Preferences {
  diet: Diet;
  eggFree: boolean;
  porkFree: boolean;
  beefFree: boolean;
  seafoodFree: boolean;
  budget: Budget;
}

export interface UserSettings {
  preferences: Preferences;
  lastMode: EatingMode;
  lastCuisine: CuisineId | null;
}

export interface Meal {
  id: string;
  name: string;
  localName?: string;
  cuisine: CuisineId;
  description: string;
  descriptionZh: string;
  searchQuery: string;
  foodTypes: FoodType[];
  modes: EatingMode[];
  tags: string[];
  vegetarian: boolean;
  vegetarianAvailable: boolean;
  containsEgg: boolean;
  containsPork: boolean;
  containsBeef: boolean;
  containsSeafood: boolean;
  spice: SpiceLevel;
  budget: Budget;
  priceLabel: string;
  imageKey: string;
  rank: number;
}

export interface MealFeedback {
  mealId: string;
  action: FeedbackAction;
  createdAt: string;
}

export interface VenueType {
  id: VenueTypeId;
  name: Record<Language, string>;
  description: Record<Language, string>;
  searchQuery: string;
  tags: Record<Language, string[]>;
}
