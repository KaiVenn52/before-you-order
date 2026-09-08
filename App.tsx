import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import { getLocales } from 'expo-localization';
import * as WebBrowser from 'expo-web-browser';
import {
  ArrowClockwise, ChatCircleDots, Check, EyeSlash, ForkKnife, Handbag, MapPin, Moped, NavigationArrow,
  Sparkle, Star, Storefront, ThumbsDown, Wallet, X,
} from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import imageCredits from './src/data/imageCredits.json';
import { cuisineLabels, foodTypeLabels, meals } from './src/data/meals';
import { needsNeutralImage } from './src/data/imageReview';
import { mealImages } from './src/data/mealImages';
import { venueTypes } from './src/data/venues';
import { ignoreFailure, openExternalUrl, openFirstExternalUrl } from './src/domain/effects';
import { androidMapsSearchUrl, buildMealSubject, buildNearbyQuery, googleMapsSearchUrl, googleSearchUrl, type SearchStrategy } from './src/domain/places';
import { pickDifferentItem, pickMeal, recommendationReason, recommendMeals } from './src/domain/recommend';
import type { CuisineId, DecisionMode, EatingMode, FoodType, Language, Meal, MealFeedback, VenueTypeId } from './src/domain/types';
import { priceLabel, tr, type CopyKey } from './src/i18n';
import {
  blacklistMeal, clearFeedbackHistory, defaultPreferences, getBlacklistedMealIds, getFeedback, getLanguage, getUserSettings, hasLoadedBlacklist,
  initializeStorage, isStorageDegraded, recordFeedback, restoreAllMeals, restoreMeal, saveLanguage, saveUserSettings,
} from './src/storage/choices';

const C = {
  cream: '#FFF8EA', paper: '#FFFEFA', ink: '#123C2A', green: '#17623B', greenSoft: '#E6F0E9',
  gold: '#E99A14', line: '#E7DCC9', text: '#20241F', muted: '#62675F', red: '#A34236',
};
const modeOptions: Array<{ id: EatingMode; labelKey: 'dineOut' | 'takeaway' | 'delivery'; icon: typeof Storefront }> = [
  { id: 'dine-out', labelKey: 'dineOut', icon: Storefront },
  { id: 'takeaway', labelKey: 'takeaway', icon: Handbag },
  { id: 'delivery', labelKey: 'delivery', icon: Moped },
];
const cuisines = Object.keys(cuisineLabels) as CuisineId[];
const foodTypes = Object.keys(foodTypeLabels) as FoodType[];
const originalImageIds = new Set(imageCredits.filter(credit => credit.license === 'Original artwork').map(credit => credit.mealId));
const mealById = new Map(meals.map(meal => [meal.id, meal]));
const appVersion = Constants.expoConfig?.version ?? 'unknown';
type ShopTarget = { kind: 'meal'; id: string } | { kind: 'venue'; id: VenueTypeId } | null;

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

function AppContent() {
  const [language, setLanguage] = useState<Language>(() => getLocales()[0]?.languageCode?.startsWith('zh') ? 'zh' : 'en');
  const [canRecommend, setCanRecommend] = useState(false);
  const [ready, setReady] = useState(false);
  const [narrow, setNarrow] = useState(true);
  const feedbackGuard = useRef<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [undoId, setUndoId] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const resultY = useRef(0);
  const [scrollRequest, requestScroll] = useState(0);
  const [mode, setMode] = useState<EatingMode>('dine-out');
  const [decisionMode, setDecisionMode] = useState<DecisionMode>('dish');
  const [cuisine, setCuisine] = useState<CuisineId | null>(null);
  const [foodType, setFoodType] = useState<FoodType | null>(null);
  const [venueTypeId, setVenueTypeId] = useState<VenueTypeId | null>(null);
  const [feedback, setFeedback] = useState<MealFeedback[]>([]);
  const [blacklistedIds, setBlacklistedIds] = useState<string[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [hiddenFoodsVisible, setHiddenFoodsVisible] = useState(false);
  const [creditsVisible, setCreditsVisible] = useState(false);
  const [shopTarget, setShopTarget] = useState<ShopTarget>(null);
  const [confirmation, setConfirmation] = useState<CopyKey | null>(null);

  useEffect(() => {
    initializeStorage();
    const storedLanguage = getLanguage();
    const deviceLanguage: Language = getLocales()[0]?.languageCode?.startsWith('zh') ? 'zh' : 'en';
    setLanguage(storedLanguage ?? deviceLanguage);
    const saved = getUserSettings();
    setMode(saved.lastMode);
    setCuisine(saved.lastCuisine);
    saveUserSettings(defaultPreferences, saved.lastMode, saved.lastCuisine);
    setFeedback(getFeedback());
    const hidden = getBlacklistedMealIds();
    setBlacklistedIds(hidden);
    setCanRecommend(hasLoadedBlacklist());
    const pool = recommendMeals(meals, saved.lastMode, saved.lastCuisine, null, defaultPreferences, getFeedback(), hidden);
    setCurrentId(hasLoadedBlacklist() ? pickMeal(pool, getFeedback(), hidden, null, Date.now(), Math.random)?.id ?? null : null);
    setReady(true);
  }, []);

  useEffect(() => { feedbackGuard.current = null; }, [currentId]);

  useEffect(() => {
    if (!scrollRequest) return;
    const timer = setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, resultY.current - 12), animated: true }), 120);
    return () => clearTimeout(timer);
  }, [scrollRequest]);

  const recommendations = useMemo(
    () => canRecommend ? recommendMeals(meals, mode, cuisine, foodType, defaultPreferences, feedback, blacklistedIds) : [],
    [mode, cuisine, foodType, feedback, blacklistedIds, canRecommend],
  );
  const cuisineIsAvailable = (candidate: CuisineId) => recommendMeals(meals, mode, candidate, foodType, defaultPreferences).length > 0;
  const foodTypeIsAvailable = (candidate: FoodType) => recommendMeals(meals, mode, cuisine, candidate, defaultPreferences).length > 0;
  const current = recommendations.find(meal => meal.id === currentId);
  const allHidden = canRecommend && recommendations.length === 0 && recommendMeals(meals, mode, cuisine, foodType, defaultPreferences).length > 0;
  const currentVenue = venueTypeId ? venueTypes.find((venue) => venue.id === venueTypeId) ?? null : null;
  const shopMeal = shopTarget?.kind === 'meal' ? meals.find((meal) => meal.id === shopTarget.id) ?? null : null;
  const shopVenue = shopTarget?.kind === 'venue' ? venueTypes.find((venue) => venue.id === shopTarget.id) ?? null : null;
  const shopSubject = shopMeal
    ? (language === 'zh' ? `${shopMeal.localName ?? shopMeal.name} · ${shopMeal.name}` : `${shopMeal.name}${shopMeal.localName ? ` · ${shopMeal.localName}` : ''}`)
    : shopVenue?.name[language] ?? '';
  const currentChosenTimes = current ? feedback.filter((item) => item.mealId === current.id && item.action === 'chosen').length : 0;
  const blacklistedMeals = useMemo(
    () => blacklistedIds.flatMap((id) => { const meal = meals.find((candidate) => candidate.id === id); return meal ? [meal] : []; }),
    [blacklistedIds],
  );
  const recentChoices = useMemo(() => {
    const seen = new Set<string>();
    return feedback.filter((item) => item.action === 'chosen').flatMap((item) => {
      if (seen.has(item.mealId) || blacklistedIds.includes(item.mealId)) return [];
      seen.add(item.mealId);
      const meal = meals.find((candidate) => candidate.id === item.mealId);
      return meal ? [{ ...item, meal }] : [];
    }).slice(0, 4);
  }, [feedback, blacklistedIds]);

  const haptic = (success = false) => {
    if (Platform.OS === 'web') return;
    void ignoreFailure(() => success ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : Haptics.selectionAsync());
  };
  const refresh = (nextMode = mode, nextCuisine = cuisine, nextFood = foodType, nextFeedback = feedback, hidden = blacklistedIds) => {
    if (!canRecommend) return;
    const pool = recommendMeals(meals, nextMode, nextCuisine, nextFood, defaultPreferences, nextFeedback, hidden);
    const nextId = pickMeal(pool, nextFeedback, hidden, currentId, Date.now(), Math.random)?.id ?? null;
    setCurrentId(nextId);
    setSavedId(null); setConfirmation(null);
    if (nextId !== currentId) requestScroll(value => value + 1);
  };
  const changeLanguage = () => {
    haptic(); const next = language === 'en' ? 'zh' : 'en';
    setLanguage(next); saveLanguage(next);
  };
  const changeMode = (next: EatingMode) => {
    haptic();
    const exactMatch = recommendMeals(meals, next, cuisine, foodType, defaultPreferences).length > 0;
    const cuisineMatch = recommendMeals(meals, next, cuisine, null, defaultPreferences).length > 0;
    const nextCuisine = cuisineMatch ? cuisine : null;
    const nextFoodType = exactMatch ? foodType : null;
    setMode(next); setCuisine(nextCuisine); setFoodType(nextFoodType); refresh(next, nextCuisine, nextFoodType);
    saveUserSettings(defaultPreferences, next, nextCuisine);
  };
  const changeDecisionMode = (next: DecisionMode) => {
    haptic(); setDecisionMode(next); setNarrow(true); setConfirmation(null);
    if (next === 'venue' && !venueTypeId) setVenueTypeId(pickDifferentItem(venueTypes.map(venue => venue.id), null));
  };
  const changeCuisine = (next: CuisineId | null) => {
    haptic(); setCuisine(next); refresh(mode, next);
    saveUserSettings(defaultPreferences, mode, next);
  };
  const surpriseCuisine = () => {
    haptic();
    const eligible = cuisines.filter(candidate => recommendMeals(meals, mode, candidate, null, defaultPreferences, feedback, blacklistedIds).length > 0);
    const next = pickDifferentItem(eligible, cuisine);
    if (!next) return;
    setCuisine(next); setFoodType(null); refresh(mode, next, null);
    saveUserSettings(defaultPreferences, mode, next);
  };
  const changeFoodType = (next: FoodType | null) => {
    haptic(); setFoodType(next); refresh(mode, cuisine, next);
  };
  const changeVenueType = (next: VenueTypeId) => {
    haptic(); setVenueTypeId(next); setConfirmation(null); requestScroll(value => value + 1);
  };
  const surpriseVenue = () => {
    const next = pickDifferentItem(venueTypes.map(venue => venue.id), venueTypeId);
    if (next) changeVenueType(next);
  };
  const another = () => {
    if (!canRecommend || recommendations.length === 0) return;
    haptic(); refresh();
    setConfirmation(recommendations.length > 1 ? 'anotherConfirmation' : 'onlyOne');
  };
  const reactToMeal = (action: 'chosen' | 'not-today') => {
    if (!current || feedbackGuard.current === `${current.id}:${action}`) return;
    feedbackGuard.current = `${current.id}:${action}`;
    recordFeedback(current.id, action);
    const nextFeedback = getFeedback(); setFeedback(nextFeedback);
    if (action === 'chosen') {
      setSavedId(current.id);
      setConfirmation(isStorageDegraded() ? 'savedTemporary' : 'chosenConfirmation');
    } else {
      refresh(mode, cuisine, foodType, nextFeedback);
      setConfirmation('notTodayConfirmation');
    }
    haptic(action === 'chosen');
  };
  const permanentlyHideCurrent = () => {
    if (!current) return;
    blacklistMeal(current.id); const hidden = getBlacklistedMealIds();
    setUndoId(current.id); setBlacklistedIds(hidden); refresh(mode, cuisine, foodType, feedback, hidden);
    setConfirmation('hiddenConfirmation'); haptic();
  };
  const restoreBlacklistedMeal = (mealId: string) => {
    restoreMeal(mealId); const hidden = getBlacklistedMealIds(); setBlacklistedIds(hidden);
    setUndoId(null); refresh(mode, cuisine, foodType, feedback, hidden);
    setConfirmation('restored');
  };
  const restoreAll = () => {
    if (!canRecommend) return;
    restoreAllMeals(); setBlacklistedIds([]); setUndoId(null); refresh(mode, cuisine, foodType, feedback, []);
    setConfirmation('restored'); setHiddenFoodsVisible(false);
  };
  const openMapSearch = async (subject: string, strategy: SearchStrategy, vegetarian = false) => {
    const query = buildNearbyQuery(subject, strategy, mode, vegetarian);
    const webMapsUrl = googleMapsSearchUrl(query);
    if (Platform.OS === 'android') {
      const nativeOpened = await openFirstExternalUrl([androidMapsSearchUrl(query)], Linking.openURL, () => {});
      if (nativeOpened) return;
    }
    try {
      await WebBrowser.openBrowserAsync(webMapsUrl);
      return;
    } catch { /* Try ordinary HTTPS handlers and a generic browser search below. */ }
    await openFirstExternalUrl([webMapsUrl, googleSearchUrl(query)], Linking.openURL, () => Alert.alert(tr(language, 'mapsError'), `${tr(language, 'mapsErrorBody')} ${tr(language, 'mapsFallback')}`, [{ text: tr(language, 'cancel') }, { text: tr(language, 'retry'), onPress: () => { void openMapSearch(subject, strategy, vegetarian); } }]));
  };
  const openFeedback = () => {
    const url = 'https://github.com/KaiVenn52/before-you-order/issues/new?title=App%20feedback&body=What%20happened%3F%0A%0AWhat%20did%20you%20expect%3F%0A%0ADevice%20and%20Android%20version%3A';
    void openExternalUrl(url, Linking.openURL, () => Alert.alert(tr(language, 'linkError'), tr(language, 'linkErrorBody'), [{ text: tr(language, 'cancel') }, { text: tr(language, 'retry'), onPress: openFeedback }]));
  };
  const resetRecommendationHistory = () => {
    Alert.alert(tr(language, 'clearHistoryTitle'), tr(language, 'clearHistoryBody'), [
      { text: tr(language, 'cancel') },
      { text: tr(language, 'clearHistory'), onPress: () => {
        clearFeedbackHistory(); setFeedback([]); setSavedId(null); refresh(mode, cuisine, foodType, []);
        setConfirmation('historyCleared'); setHiddenFoodsVisible(false);
      } },
    ]);
  };
  const findMeal = async (meal: Meal, strategy: SearchStrategy) => {
    await openMapSearch(buildMealSubject(meal), strategy);
  };
  const findVenue = async (venueId: VenueTypeId, strategy: SearchStrategy) => {
    const venue = venueTypes.find((candidate) => candidate.id === venueId);
    if (venue) await openMapSearch(venue.searchQuery, strategy);
  };
  const openShopPicker = (meal = current) => { if (meal) setShopTarget({ kind: 'meal', id: meal.id }); };
  const openVenuePicker = () => { if (currentVenue) setShopTarget({ kind: 'venue', id: currentVenue.id }); };
  const resetDishFilters = () => {
    setCuisine(null); setFoodType(null); refresh(mode, null, null);
    saveUserSettings(defaultPreferences, mode, null);
  };

  if (!ready) return <SafeAreaView style={styles.safe}><ActivityIndicator accessibilityLabel={tr(language, 'loading')} style={{ flex: 1 }} color={C.green} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView ref={scroll} contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logo}><ForkKnife size={21} weight="bold" color="#fff" /></View>
          <View style={styles.headerCopy}>
            <Text style={styles.brand}>Before You Order</Text>
            <Text style={styles.tagline}>{tr(language, 'tagline')}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityRole="button" accessibilityLabel={language === 'en' ? 'Switch to Chinese' : '切换到英文'} onPress={changeLanguage} style={styles.languageButton}>
              <Text style={styles.languageText}>{tr(language, 'language')}</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.question}>{tr(language, 'how')}</Text>
        <View style={styles.modeRow}>
          {modeOptions.map(({ id, labelKey, icon: Icon }) => {
            const active = mode === id;
            return (
              <Pressable accessibilityLabel={tr(language, labelKey)} key={id} onPress={() => changeMode(id)} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.mode, active && styles.modeActive]}>
                <Icon size={22} color={active ? '#fff' : C.green} weight={active ? 'fill' : 'regular'} />
                <Text style={[styles.modeText, active && styles.modeTextActive]}>{tr(language, labelKey)}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.questionRow}><Text style={styles.question}>{tr(language, 'decideQuestion')}</Text></View>
        <View style={styles.decisionTabs}>
          <Pressable accessibilityLabel={tr(language, 'decideDish')} onPress={() => changeDecisionMode('dish')} accessibilityRole="button" accessibilityState={{ selected: decisionMode === 'dish' }} style={[styles.decisionTab, decisionMode === 'dish' && styles.decisionTabActive]}>
            <ForkKnife size={19} weight="bold" color={C.green} />
            <Text style={[styles.decisionTabText, decisionMode === 'dish' && styles.decisionTabTextActive]}>{tr(language, 'decideDish')}</Text>
          </Pressable>
          <Pressable accessibilityLabel={tr(language, 'decideVenue')} onPress={() => changeDecisionMode('venue')} accessibilityRole="button" accessibilityState={{ selected: decisionMode === 'venue' }} style={[styles.decisionTab, decisionMode === 'venue' && styles.decisionTabActive]}>
            <Storefront size={19} weight="bold" color={C.green} />
            <Text style={[styles.decisionTabText, decisionMode === 'venue' && styles.decisionTabTextActive]}>{tr(language, 'decideVenue')}</Text>
          </Pressable>
        </View>

        {isStorageDegraded() && <Text accessibilityLiveRegion="polite" style={styles.emptyBody}>{tr(language, 'storageWarning')}</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'pickForMe')} accessibilityState={{ disabled: decisionMode === 'dish' && !recommendations.length }} disabled={decisionMode === 'dish' && !recommendations.length} onPress={decisionMode === 'dish' ? another : surpriseVenue} style={styles.mapsButton}><Sparkle size={22} color="#fff" /><Text style={styles.mapsText}>{tr(language, 'pickForMe')}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'manageHiddenFoods')} onPress={() => setHiddenFoodsVisible(true)} style={styles.creditButton}><Text style={styles.creditButtonText}>{tr(language, 'manageHiddenFoods')} ({blacklistedMeals.length})</Text></Pressable>
        {decisionMode === 'dish' ? <>
          <Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'narrow')} accessibilityState={{ expanded: narrow }} onPress={() => setNarrow(value => !value)} style={styles.outlineButton}><Text style={styles.outlineText}>{tr(language, 'narrow')} {narrow ? '−' : '+'}</Text></Pressable>
          {narrow && <>
          <View style={styles.questionRow}>
            <Text style={styles.question}>{tr(language, 'cuisineQuestion')}</Text><Text style={styles.optional}>{tr(language, 'optional')}</Text>
          </View>
          <Pressable accessibilityLabel={tr(language, 'surpriseCuisine')} onPress={surpriseCuisine} accessibilityRole="button" style={({ pressed }) => [styles.randomAction, pressed && styles.pressed]}>
            <View style={styles.randomIcon}><ArrowClockwise size={20} weight="bold" color={C.green} /></View>
            <View style={{ flex: 1 }}><Text style={styles.randomTitle}>{tr(language, 'surpriseCuisine')}</Text><Text style={styles.randomValue}>{cuisine ? `${tr(language, 'cuisinePicked')}: ${cuisineLabels[cuisine][language]}` : tr(language, 'anything')}</Text></View>
            <Sparkle size={19} weight="fill" color={C.gold} />
          </Pressable>
          <View style={styles.cuisineRow}>
            <ChoiceChip label={tr(language, 'anything')} active={cuisine === null} onPress={() => changeCuisine(null)} />
            {cuisines.map((id) => <ChoiceChip key={id} label={cuisineLabels[id][language]} active={cuisine === id} disabled={!cuisineIsAvailable(id)} onPress={() => changeCuisine(id)} />)}
          </View>

          <View style={styles.questionRow}>
            <Text style={styles.question}>{tr(language, 'foodQuestion')}</Text><Text style={styles.optional}>{tr(language, 'optional')}</Text>
          </View>
          <View style={styles.foodTypeRow}>
            <ChoiceChip label={tr(language, 'anything')} active={foodType === null} onPress={() => changeFoodType(null)} />
            {foodTypes.map((id) => <ChoiceChip key={id} label={foodTypeLabels[id][language]} active={foodType === id} disabled={!foodTypeIsAvailable(id)} onPress={() => changeFoodType(id)} />)}
          </View>

          </>}
          <View onLayout={event => { resultY.current = event.nativeEvent.layout.y; }}>
          {current ? (
            <View style={styles.heroCard}>
              <View style={styles.imageWrap}>
                <MealPhoto meal={current} language={language} />
                <View style={styles.matchBadge}><Sparkle size={14} weight="fill" color={C.ink} /><Text style={styles.matchText}>{tr(language, 'yourPick')}</Text></View>

              </View>
              <View style={styles.heroBody}>
                <Text style={styles.cuisineLabel}>{cuisineLabels[current.cuisine][language]}</Text>
                <Text accessibilityLiveRegion="polite" style={styles.mealName}>{language === 'zh' ? current.localName ?? current.name : current.name}</Text>
                <Text style={styles.localMealName}>{language === 'zh' ? current.name : current.localName}</Text>
                <Text style={styles.description}>{language === 'zh' ? current.descriptionZh : current.description}</Text>
                <View style={styles.tagRow}>
                  <Text style={styles.price}>{priceLabel(language, current.priceLabel)}</Text>
                  {(language === 'zh' ? current.foodTypes.slice(0, 2).map((type) => foodTypeLabels[type].zh) : current.tags.slice(0, 2)).map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}
                </View>
                <View style={styles.reason}><Check size={17} weight="bold" color={C.green} /><Text style={styles.reasonText}>{recommendationReason(current, cuisine, defaultPreferences, currentChosenTimes, language)}</Text></View>
                {confirmation && <Text accessibilityLiveRegion="polite" style={styles.confirmationText}>{tr(language, confirmation)}</Text>}
                {undoId && <Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'undo')} onPress={() => restoreBlacklistedMeal(undoId)} style={styles.creditButton}><Text style={styles.creditButtonText}>{tr(language, 'undo')}</Text></Pressable>}
                <Pressable accessibilityRole="button" accessibilityLabel={tr(language, savedId === current.id ? 'findNearby' : 'choseThis')} accessibilityHint={tr(language, savedId === current.id ? 'mapNote' : 'chooseHint')} onPress={() => savedId === current.id ? openShopPicker() : reactToMeal('chosen')} style={({ pressed }) => [styles.mapsButton, pressed && styles.pressed]}>
                  <MapPin size={21} weight="fill" color="#fff" />
                  <Text style={styles.mapsText}>{tr(language, savedId === current.id ? 'findNearby' : 'choseThis')}</Text>
                </Pressable>
                {savedId === current.id ? <Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'pickAgain')} onPress={another} style={styles.venueAnother}><Text style={styles.venueAnotherText}>{tr(language, 'pickAgain')}</Text></Pressable> : <View style={styles.feedbackRow}>
                  <Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'notToday')} accessibilityHint={tr(language, 'notTodayHint')} onPress={() => reactToMeal('not-today')} style={styles.smallAction}><ThumbsDown size={18} color={C.red} /><Text style={[styles.smallActionText, { color: C.red }]}>{tr(language, 'notToday')}</Text></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'another')} accessibilityHint={tr(language, 'anotherHint')} onPress={another} style={styles.smallAction}><ArrowClockwise size={18} color={C.green} /><Text style={styles.smallActionText}>{tr(language, 'another')}</Text></Pressable>
                </View>}
                <Text style={styles.reasonText}>{tr(language, 'feedbackHelp')}</Text>
                {mode === 'delivery' && <><Text selectable style={styles.description}>{current.name} · {current.localName}</Text><Text style={styles.reasonText}>{tr(language, 'deliveryHelp')}</Text></>}
                <Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'neverRecommend')} onPress={permanentlyHideCurrent} style={styles.blacklistAction}>
                  <EyeSlash size={17} color={C.muted} /><Text style={styles.blacklistText}>{tr(language, 'neverRecommend')}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{tr(language, !canRecommend ? 'storageLocked' : allHidden ? 'allHidden' : 'noMatch')}</Text>
              <Text style={styles.emptyBody}>{tr(language, !canRecommend ? 'storageLockedBody' : allHidden ? 'allHiddenBody' : 'noMatchBody')}</Text>
              {allHidden && <><Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'manageHiddenFoods')} onPress={() => setHiddenFoodsVisible(true)} style={styles.outlineButton}><Text style={styles.outlineText}>{tr(language, 'manageHiddenFoods')}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'restoreAll')} onPress={restoreAll} style={styles.outlineButton}><Text style={styles.outlineText}>{tr(language, 'restoreAll')}</Text></Pressable></>}
              <Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'clearFilters')} onPress={resetDishFilters} style={styles.outlineButton}><Text style={styles.outlineText}>{tr(language, 'clearFilters')}</Text></Pressable>
            </View>
          )}
          </View>
        </> : <>
          <View style={styles.questionRow}><Text style={styles.question}>{tr(language, 'venueQuestion')}</Text></View>
          <Text style={styles.venueHint}>{tr(language, 'venueHint')}</Text>
          <Pressable accessibilityLabel={tr(language, 'surpriseVenue')} onPress={surpriseVenue} accessibilityRole="button" style={({ pressed }) => [styles.randomAction, pressed && styles.pressed]}>
            <View style={styles.randomIcon}><ArrowClockwise size={20} weight="bold" color={C.green} /></View>
            <View style={{ flex: 1 }}><Text style={styles.randomTitle}>{tr(language, 'surpriseVenue')}</Text><Text style={styles.randomValue}>{currentVenue?.name[language] ?? tr(language, 'anything')}</Text></View>
            <Sparkle size={19} weight="fill" color={C.gold} />
          </Pressable>
          <View style={styles.venueTypeRow}>
            {venueTypes.map((venue) => <ChoiceChip key={venue.id} label={venue.name[language]} active={venueTypeId === venue.id} onPress={() => changeVenueType(venue.id)} />)}
          </View>
          {currentVenue && <View onLayout={event => { resultY.current = event.nativeEvent.layout.y; }} style={styles.venueCard}>
            <View style={styles.venueHero}>
              <View style={styles.venueIcon}><Storefront size={38} weight="fill" color="#fff" /></View>
              <View style={{ flex: 1 }}><Text style={styles.venueBadge}>{tr(language, 'venueIdea')}</Text><Text accessibilityLiveRegion="polite" style={styles.venueName}>{currentVenue.name[language]}</Text></View>
            </View>
            <Text style={styles.venueDescription}>{currentVenue.description[language]}</Text>
            <View style={styles.tagRow}>{currentVenue.tags[language].map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>
            <Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'findVenue')} onPress={openVenuePicker} style={({ pressed }) => [styles.mapsButton, pressed && styles.pressed]}>
              <MapPin size={21} weight="fill" color="#fff" /><Text style={styles.mapsText}>{tr(language, 'findVenue')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'anotherVenue')} onPress={surpriseVenue} style={styles.venueAnother}><ArrowClockwise size={18} color={C.green} /><Text style={styles.venueAnotherText}>{tr(language, 'anotherVenue')}</Text></Pressable>
          </View>}
        </>}

        {confirmation && (!current || decisionMode === 'venue') && <View style={styles.confirmation}><Check size={18} weight="bold" color={C.green} /><Text accessibilityLiveRegion="polite" style={styles.confirmationText}>{tr(language, confirmation)}</Text></View>}

        {undoId && !current && <Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'undo')} onPress={() => restoreBlacklistedMeal(undoId)} style={styles.creditButton}><Text style={styles.creditButtonText}>{tr(language, 'undo')}</Text></Pressable>}
        {decisionMode === 'dish' && recentChoices.length > 0 && (
          <View style={styles.history}>
            <Text style={styles.historyTitle}>{tr(language, 'historyTitle')}</Text>
            <Text style={styles.historyHint}>{tr(language, 'historyHint')}</Text>
            {recentChoices.map(({ meal, createdAt }) => (
              <Pressable accessibilityRole="button" accessibilityLabel={`${language === 'zh' ? meal.localName : meal.name}: ${tr(language, 'findNearby')}`} key={`${meal.id}-${createdAt}`} onPress={() => openShopPicker(meal)} style={styles.historyRow}>
                <MealPhoto meal={meal} language={language} small />
                <View style={{ flex: 1 }}><Text style={styles.historyName}>{language === 'zh' ? `${meal.localName ?? meal.name} · ${meal.name}` : `${meal.name}${meal.localName ? ` · ${meal.localName}` : ''}`}</Text><Text style={styles.historyCuisine}>{cuisineLabels[meal.cuisine][language]} · {priceLabel(language, meal.priceLabel)}</Text></View>
                <MapPin size={20} color={C.green} />
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.disclaimer}>{tr(language, 'disclaimer')}</Text>
        {blacklistedMeals.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'manageHiddenFoods')} onPress={() => setHiddenFoodsVisible(true)} style={styles.creditButton}><Text style={styles.creditButtonText}>{tr(language, 'manageHiddenFoods')} ({blacklistedMeals.length})</Text></Pressable>}
        <Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'photoCredits')} onPress={() => setCreditsVisible(true)} style={styles.creditButton}><Text style={styles.creditButtonText}>{tr(language, 'photoCredits')}</Text></Pressable>
        <Pressable accessibilityRole="link" accessibilityLabel={tr(language, 'sendFeedback')} accessibilityHint={tr(language, 'feedbackLinkBody')} onPress={openFeedback} style={styles.feedbackLink}><ChatCircleDots size={18} color={C.green} /><Text style={styles.creditButtonText}>{tr(language, 'sendFeedback')}</Text></Pressable>
        <Text style={styles.versionText}>{tr(language, 'version')} {appVersion}</Text>
      </ScrollView>

      <HiddenFoodsModal language={language} visible={hiddenFoodsVisible} blacklistedMeals={blacklistedMeals} hasFeedback={feedback.length > 0} onClearHistory={resetRecommendationHistory} onRestoreAll={restoreAll} onRestore={restoreBlacklistedMeal} onClose={() => setHiddenFoodsVisible(false)} />
      <CreditsModal language={language} visible={creditsVisible} onClose={() => setCreditsVisible(false)} />
      <ShopPickerModal
        language={language}
        visible={shopTarget !== null}
        venueMode={shopTarget?.kind === 'venue'}
        subject={shopSubject}
        onClose={() => setShopTarget(null)}
        onSelect={(strategy) => {
          if (shopMeal) void findMeal(shopMeal, strategy);
          else if (shopVenue) void findVenue(shopVenue.id, strategy);
        }}
      />
    </SafeAreaView>
  );
}

function MealPhoto({ meal, language, small = false }: { meal: Meal; language: Language; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [meal.imageKey]);
  if (failed || originalImageIds.has(meal.id) || needsNeutralImage(meal.id) || !mealImages[meal.imageKey]) {
    const displayName = language === 'zh' ? meal.localName ?? meal.name : meal.name;
    return (
      <View
        accessible
        accessibilityLabel={`${displayName}. ${tr(language, 'photoUnavailable')}`}
        style={[small ? styles.historyImage : styles.heroImage, styles.photoFallback, small && styles.photoFallbackSmall]}
      >
        <Text style={small ? styles.photoFallbackEmojiSmall : styles.photoFallbackEmoji}>{mealFallbackEmoji(meal)}</Text>
        {!small && <>
          <Text numberOfLines={2} style={styles.photoFallbackName}>{displayName}</Text>
          <Text style={styles.photoFallbackStatus}>{tr(language, 'photoUnavailable')}</Text>
        </>}
      </View>
    );
  }
  return <Image accessibilityLabel={language === 'zh' ? meal.localName : meal.name} source={mealImages[meal.imageKey]} style={small ? styles.historyImage : styles.heroImage} contentFit="cover" transition={180} onError={() => setFailed(true)} />;
}

function mealFallbackEmoji(meal: Meal) {
  const type = meal.foodTypes[0];
  if (type === 'rice') return '🍚';
  if (type === 'noodles') return '🍜';
  if (type === 'bread') return '🥙';
  if (type === 'soup') return '🍲';
  if (type === 'light') return '🥗';
  return '🍽️';
}

function ChoiceChip({ label, active, disabled = false, onPress }: { label: string; active: boolean; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} accessibilityLabel={label} accessibilityState={{ selected: active, disabled }} style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}><Text style={[styles.chipText, active && styles.chipTextActive, disabled && styles.chipTextDisabled]}>{label}</Text></Pressable>;
}

function HiddenFoodsModal({ language, visible, blacklistedMeals, hasFeedback, onClearHistory, onRestoreAll, onRestore, onClose }: { language: Language; visible: boolean; blacklistedMeals: Meal[]; hasFeedback: boolean; onClearHistory: () => void; onRestoreAll: () => void; onRestore: (mealId: string) => void; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}><Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'close')} style={{ flex: 1 }} onPress={onClose} />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.sheetHeader}><View style={{ flex: 1 }}><Text style={styles.sheetTitle}>{tr(language, 'manageHiddenFoods')}</Text><Text style={styles.sheetHint}>{tr(language, 'restoreHelp')}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'close')} onPress={onClose} style={styles.closeButton}><X size={25} color={C.ink} /></Pressable></View>
          <Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'restoreAll')} accessibilityState={{ disabled: !blacklistedMeals.length }} disabled={!blacklistedMeals.length} onPress={onRestoreAll} style={styles.creditButton}><Text style={styles.creditButtonText}>{tr(language, 'restoreAll')}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'clearHistory')} accessibilityState={{ disabled: !hasFeedback }} disabled={!hasFeedback} onPress={onClearHistory} style={[styles.creditButton, !hasFeedback && styles.disabledButton]}><Text style={styles.creditButtonText}>{tr(language, 'clearHistory')}</Text></Pressable>
          <ScrollView showsVerticalScrollIndicator={false}>
            {blacklistedMeals.map((meal) => (
              <View key={meal.id} style={styles.blacklistRow}>
                <Text style={styles.blacklistMeal}>{language === 'zh' ? meal.localName ?? meal.name : `${meal.name}${meal.localName ? ` · ${meal.localName}` : ''}`}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`${tr(language, 'restore')} ${language === 'zh' ? meal.localName : meal.name}`} onPress={() => onRestore(meal.id)} style={styles.restoreButton}><Text style={styles.restoreText}>{tr(language, 'restore')}</Text></Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ShopPickerModal({ language, visible, venueMode, subject, onClose, onSelect }: { language: Language; visible: boolean; venueMode: boolean; subject: string; onClose: () => void; onSelect: (strategy: SearchStrategy) => void }) {
  const choose = (strategy: SearchStrategy) => { onClose(); onSelect(strategy); };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}><Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'close')} style={{ flex: 1 }} onPress={onClose} />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}><Text style={styles.sheetTitle}>{venueMode ? tr(language, 'findVenue') : tr(language, 'chooseWhere')}</Text><Text style={styles.sheetHint}>{subject}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'close')} onPress={onClose} style={styles.closeButton}><X size={25} color={C.ink} /></Pressable>
          </View>
          <ScrollView><Text style={styles.shopIntro}>{tr(language, 'shopIntro')}</Text>
          <ShopStrategy icon={<NavigationArrow size={23} weight="fill" color={C.green} />} title={tr(language, 'closest')} description={tr(language, 'closestDescription')} onPress={() => choose('nearby')} />
          <ShopStrategy icon={<Star size={23} weight="fill" color={C.gold} />} title={tr(language, 'bestRated')} description={tr(language, 'bestDescription')} onPress={() => choose('best')} />
          <ShopStrategy icon={<Wallet size={23} weight="fill" color={C.green} />} title={tr(language, 'budgetSearch')} description={tr(language, 'budgetDescription')} onPress={() => choose('budget')} />
          <Text style={styles.shopNote}>{tr(language, 'mapNote')}</Text></ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ShopStrategy({ icon, title, description, onPress }: { icon: React.ReactNode; title: string; description: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.shopStrategy, pressed && styles.pressed]}>{icon}<View style={{ flex: 1 }}><Text style={styles.shopTitle}>{title}</Text><Text style={styles.shopDescription}>{description}</Text></View><NavigationArrow size={17} color={C.muted} /></Pressable>;
}

function CreditsModal({ language, visible, onClose }: { language: Language; visible: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  useEffect(() => { if (!visible) setQuery(''); }, [visible]);
  const filteredCredits = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return imageCredits;
    return imageCredits.filter(credit => {
      const meal = mealById.get(credit.mealId);
      return [meal?.name, meal?.localName, credit.sourceTitle, credit.artist].some(value => value?.toLocaleLowerCase().includes(needle));
    });
  }, [query]);
  const openCredit = (url: string) => { void openExternalUrl(url, Linking.openURL, () => Alert.alert(tr(language, 'linkError'), tr(language, 'linkErrorBody'), [{ text: tr(language, 'cancel') }, { text: tr(language, 'retry'), onPress: () => openCredit(url) }])); };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}><Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'close')} style={{ flex: 1 }} onPress={onClose} />
      <View accessibilityViewIsModal style={[styles.sheet, { maxHeight: '78%' }]}>
        <View style={styles.sheetHeader}><View style={{ flex: 1 }}><Text style={styles.sheetTitle}>{tr(language, 'photoCredits')}</Text><Text style={styles.sheetHint}>{tr(language, 'creditsHint')}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={tr(language, 'close')} onPress={onClose} style={styles.closeButton}><X size={25} color={C.ink} /></Pressable></View>
        <TextInput accessibilityLabel={tr(language, 'searchCredits')} placeholder={tr(language, 'searchCredits')} placeholderTextColor={C.muted} value={query} onChangeText={setQuery} style={styles.creditSearch} />
        <FlatList data={filteredCredits} keyExtractor={credit => credit.mealId} initialNumToRender={12} maxToRenderPerBatch={12} windowSize={7} keyboardShouldPersistTaps="handled" ListEmptyComponent={<Text style={styles.emptyBody}>{tr(language, 'noCredits')}</Text>} renderItem={({ item: credit }) => <View style={styles.creditRow}>
          <Text style={styles.creditMeal}>{language === 'zh' ? mealById.get(credit.mealId)?.localName : mealById.get(credit.mealId)?.name}</Text>
          <Text style={styles.creditMeta}>{credit.sourceTitle}</Text>
          {needsNeutralImage(credit.mealId) && <Text style={styles.creditMeta}>{tr(language, 'imageWithheld')}</Text>}
          <Text style={styles.creditMeta}>{credit.artist} · {credit.license}</Text>
          <Text style={styles.creditMeta}>{credit.modifications.map(change => tr(language, change === 'original-artwork' ? 'originalImage' : change === 'crop' ? 'imageCrop' : change === 'resize' ? 'imageResize' : 'imageWebp')).join(' · ')}</Text>
          {credit.license !== 'Original artwork' && <Text style={styles.creditMeta}>{tr(language, 'cardCrop')}</Text>}
          {credit.attributionStatus === 'source-assumed' && <Text style={styles.creditMeta}>{tr(language, 'assumedAuthor')}</Text>}
          {!!credit.sourceUrl && <Pressable accessibilityRole="link" accessibilityLabel={`${credit.sourceTitle}: ${tr(language, 'source')}`} onPress={() => openCredit(credit.sourceUrl)} style={styles.creditButton}><Text style={styles.creditButtonText}>{tr(language, 'source')}</Text></Pressable>}
          {!!credit.licenseUrl && <Pressable accessibilityRole="link" accessibilityLabel={`${credit.sourceTitle}: ${tr(language, 'licenseLink')}`} onPress={() => openCredit(credit.licenseUrl)} style={styles.creditButton}><Text style={styles.creditButtonText}>{tr(language, 'licenseLink')}</Text></Pressable>}
        </View>} />
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  closeButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  safe: { flex: 1, backgroundColor: C.cream }, screen: { padding: 16, paddingBottom: 38 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 }, logo: { width: 43, height: 43, borderRadius: 14, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, marginLeft: 11 }, brand: { color: C.ink, fontSize: 23, fontWeight: '900', letterSpacing: -0.6 }, tagline: { color: C.muted, fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 7 }, languageButton: { minWidth: 44, minHeight: 44, paddingHorizontal: 10, borderRadius: 19, borderWidth: 1, borderColor: C.green, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' }, languageText: { color: C.green, fontSize: 12, fontWeight: '900' },
  decisionTabs: { flexDirection: 'row', gap: 8, backgroundColor: '#F0E8DA', borderRadius: 16, padding: 4, marginBottom: 2 },
  decisionTab: { flex: 1, minHeight: 48, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8 },
  decisionTabActive: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.line },
  decisionTabText: { flexShrink: 1, color: C.muted, fontSize: 12, fontWeight: '800' }, decisionTabTextActive: { color: C.green },
  question: { color: C.ink, fontSize: 17, fontWeight: '800', marginBottom: 10 }, questionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 7, marginTop: 21 }, optional: { color: C.muted, fontSize: 12 },
  modeRow: { flexDirection: 'row', gap: 8 }, mode: { flex: 1, padding: 7, minHeight: 60, borderWidth: 1, borderColor: C.line, borderRadius: 14, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', gap: 3 },
  modeActive: { backgroundColor: C.green, borderColor: C.green }, modeText: { textAlign: 'center', flexShrink: 1, color: C.ink, fontSize: 12, fontWeight: '700' }, modeTextActive: { color: '#fff' },
  cuisineRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, foodTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingRight: 12, paddingBottom: 18 }, chip: { maxWidth: '100%', paddingVertical: 9, minHeight: 44, paddingHorizontal: 15, borderRadius: 22, borderWidth: 1, borderColor: '#DCCEB8', backgroundColor: C.paper, justifyContent: 'center' }, chipDisabled: { opacity: 0.42, backgroundColor: '#F2EEE5' }, chipTextDisabled: { color: C.muted }, disabledButton: { opacity: 0.45 },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink }, chipText: { color: C.text, fontSize: 12, fontWeight: '700' }, chipTextActive: { color: '#fff' },
  randomAction: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 15, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper, paddingHorizontal: 13, marginBottom: 11 },
  randomIcon: { width: 39, height: 39, borderRadius: 20, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' },
  randomTitle: { color: C.muted, fontSize: 11, fontWeight: '700' }, randomValue: { color: C.ink, fontSize: 15, fontWeight: '900', marginTop: 2 },
  venueHint: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: -4, marginBottom: 10 }, venueTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingRight: 12, paddingBottom: 18 },
  venueCard: { borderRadius: 22, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, padding: 17 },
  venueHero: { flexDirection: 'row', alignItems: 'center', gap: 13 }, venueIcon: { width: 62, height: 62, borderRadius: 18, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  venueBadge: { color: C.green, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7 }, venueName: { color: C.ink, fontSize: 25, lineHeight: 30, fontWeight: '900', letterSpacing: -0.6, marginTop: 2 },
  venueDescription: { color: C.text, fontSize: 14, lineHeight: 20, marginTop: 14 }, venueAnother: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 5 }, venueAnotherText: { flexShrink: 1, textAlign: 'center', color: C.green, fontSize: 13, fontWeight: '900' },
  heroCard: { borderRadius: 22, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }, imageWrap: { height: 224, backgroundColor: '#EAE1D2' }, heroImage: { width: '100%', height: '100%' },
  photoFallback: { backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 20 }, photoFallbackSmall: { padding: 0 }, photoFallbackEmoji: { fontSize: 52, lineHeight: 62 }, photoFallbackEmojiSmall: { fontSize: 24, lineHeight: 30 }, photoFallbackName: { maxWidth: '86%', color: C.ink, fontSize: 20, lineHeight: 25, fontWeight: '900', textAlign: 'center', marginTop: 5 }, photoFallbackStatus: { color: C.muted, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 5 },
  matchBadge: { position: 'absolute', left: 13, top: 13, flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: C.gold, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16 }, matchText: { color: C.ink, fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  counter: { position: 'absolute', right: 13, top: 13, backgroundColor: 'rgba(18,35,26,.78)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16 }, counterText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  heroBody: { padding: 17 }, cuisineLabel: { color: C.green, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 }, mealName: { color: C.ink, fontSize: 28, lineHeight: 33, fontWeight: '900', letterSpacing: -0.8, marginTop: 4 }, localMealName: { color: C.green, fontSize: 19, lineHeight: 25, fontWeight: '800', marginTop: 1 },
  description: { color: C.text, fontSize: 14, lineHeight: 20, marginTop: 7 }, tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 }, price: { color: C.ink, fontSize: 12, fontWeight: '800', backgroundColor: C.greenSoft, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 6 },
  tag: { color: C.muted, fontSize: 12, backgroundColor: '#F2EFE8', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 6, textTransform: 'capitalize' }, reason: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 15 }, reasonText: { flexShrink: 1, color: C.muted, fontSize: 12, lineHeight: 17 },
  mapsButton: { padding: 12, minHeight: 55, borderRadius: 15, backgroundColor: C.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 17 }, mapsText: { flexShrink: 1, textAlign: 'center', color: '#fff', fontSize: 15, fontWeight: '900' },
  feedbackRow: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: C.line, marginTop: 15 }, smallAction: { flexGrow: 1, flexBasis: 120, padding: 8, minHeight: 51, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }, smallActionText: { flexShrink: 1, color: C.green, fontSize: 11, fontWeight: '800' }, blacklistAction: { paddingVertical: 10, minHeight: 44, borderTopWidth: 1, borderTopColor: C.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, blacklistText: { flexShrink: 1, textAlign: 'center', color: C.muted, fontSize: 11, fontWeight: '700' }, pressed: { opacity: 0.82 },
  empty: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 25, alignItems: 'center' }, emptyTitle: { color: C.ink, fontSize: 19, fontWeight: '900' }, emptyBody: { color: C.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  outlineButton: { minHeight: 46, borderWidth: 1, borderColor: C.green, borderRadius: 13, justifyContent: 'center', paddingHorizontal: 18, marginTop: 15 }, outlineText: { color: C.green, fontWeight: '800' },
  confirmation: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: C.greenSoft, borderRadius: 12, padding: 12 }, confirmationText: { flexShrink: 1, color: C.green, fontSize: 12, fontWeight: '700' },
  history: { marginTop: 26 }, historyTitle: { color: C.ink, fontSize: 18, fontWeight: '900' }, historyHint: { color: C.muted, fontSize: 12, marginTop: 2, marginBottom: 8 }, historyRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 8 }, historyImage: { width: 57, height: 48, borderRadius: 10 }, historyName: { color: C.ink, fontSize: 13, fontWeight: '800' }, historyCuisine: { color: C.muted, fontSize: 11, marginTop: 3 },
  disclaimer: { color: C.muted, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 25 }, creditButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, creditButtonText: { color: C.green, fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' }, feedbackLink: { minHeight: 48, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' }, versionText: { color: C.muted, fontSize: 10, textAlign: 'center', marginTop: 4 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8,25,16,.35)' }, sheet: { maxHeight: '88%', backgroundColor: C.paper, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 30 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }, sheetTitle: { color: C.ink, fontSize: 22, fontWeight: '900' }, sheetHint: { color: C.muted, fontSize: 11, marginTop: 3 },
  blacklistRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: C.line }, blacklistMeal: { flex: 1, color: C.text, fontSize: 12, fontWeight: '700' }, restoreButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 }, restoreText: { color: C.green, fontSize: 12, fontWeight: '900' },
  shopIntro: { color: C.text, fontSize: 13, lineHeight: 19, marginBottom: 10 }, shopStrategy: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 10 }, shopTitle: { color: C.ink, fontSize: 14, fontWeight: '900' }, shopDescription: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 2 }, shopNote: { color: C.muted, fontSize: 10, lineHeight: 15, marginTop: 14 },
  creditSearch: { minHeight: 48, borderWidth: 1, borderColor: C.line, borderRadius: 13, color: C.text, backgroundColor: C.paper, paddingHorizontal: 14, marginBottom: 8 }, creditRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }, creditMeal: { color: C.ink, fontSize: 13, fontWeight: '800' }, creditMeta: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
});
