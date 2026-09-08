import * as SQLite from 'expo-sqlite';
import { createChoiceStorage } from './choiceStore';
export { defaultPreferences } from './choiceStore';
export const { initializeStorage, getLanguage, saveLanguage, getUserSettings, saveUserSettings,
  recordFeedback, getFeedback, clearFeedbackHistory, blacklistMeal, restoreMeal, restoreAllMeals, getBlacklistedMealIds, isStorageDegraded, hasLoadedBlacklist
} = createChoiceStorage(() => SQLite.openDatabaseSync('before-you-order.db'));
