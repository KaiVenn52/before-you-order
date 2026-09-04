import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { getLocales } from 'expo-localization';
import {
  ArrowClockwise, Check, EyeSlash, ForkKnife, Handbag, Heart, MapPin, Moped, NavigationArrow,
  Sparkle, Star, Storefront, ThumbsDown, Wallet, X,
} from 'phosphor-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import imageCredits from './src/data/imageCredits.json';
import { cuisineLabels, foodTypeLabels, meals } from './src/data/meals';
import { mealImages } from './src/data/mealImages';
import { venueTypes } from './src/data/venues';
import { buildNearbyQuery, googleMapsSearchUrl, type SearchStrategy } from './src/domain/places';
import { pickDifferentItem, pickRefreshedPosition, recommendationReason, recommendMeals } from './src/domain/recommend';
import type { CuisineId, DecisionMode, EatingMode, FoodType, Language, Meal, MealFeedback, VenueTypeId } from './src/domain/types';
import { countLabel, priceLabel, tr } from './src/i18n';
import {
  blacklistMeal, defaultPreferences, getBlacklistedMealIds, getFeedback, getLanguage, getUserSettings,
  initializeStorage, recordFeedback, restoreMeal, saveLanguage, saveUserSettings,
} from './src/storage/choices';

const C = {
  cream: '#FFF8EA', paper: '#FFFEFA', ink: '#123C2A', green: '#17623B', greenSoft: '#E6F0E9',
  gold: '#E99A14', line: '#E7DCC9', text: '#20241F', muted: '#686D67', red: '#A34236',
};
const modeOptions: Array<{ id: EatingMode; labelKey: 'dineOut' | 'takeaway' | 'delivery'; icon: typeof Storefront }> = [
  { id: 'dine-out', labelKey: 'dineOut', icon: Storefront },
  { id: 'takeaway', labelKey: 'takeaway', icon: Handbag },
  { id: 'delivery', labelKey: 'delivery', icon: Moped },
];
const cuisines = Object.keys(cuisineLabels) as CuisineId[];
const foodTypes = Object.keys(foodTypeLabels) as FoodType[];
type ShopTarget = { kind: 'meal'; id: string } | { kind: 'venue'; id: VenueTypeId } | null;

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

function AppContent() {
  const [language, setLanguage] = useState<Language>('en');
  const [mode, setMode] = useState<EatingMode>('dine-out');
  const [decisionMode, setDecisionMode] = useState<DecisionMode>('dish');
  const [cuisine, setCuisine] = useState<CuisineId | null>(null);
  const [foodType, setFoodType] = useState<FoodType | null>(null);
  const [venueTypeId, setVenueTypeId] = useState<VenueTypeId | null>(null);
  const [feedback, setFeedback] = useState<MealFeedback[]>([]);
  const [blacklistedIds, setBlacklistedIds] = useState<string[]>([]);
  const [position, setPosition] = useState(0);
  const [hiddenFoodsVisible, setHiddenFoodsVisible] = useState(false);
  const [creditsVisible, setCreditsVisible] = useState(false);
  const [shopTarget, setShopTarget] = useState<ShopTarget>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

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
    setBlacklistedIds(getBlacklistedMealIds());
  }, []);

  const recommendations = useMemo(
    () => recommendMeals(meals, mode, cuisine, foodType, defaultPreferences, feedback, blacklistedIds),
    [mode, cuisine, foodType, feedback, blacklistedIds],
  );
  const current = recommendations[position % Math.max(recommendations.length, 1)];
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
      if (seen.has(item.mealId)) return [];
      seen.add(item.mealId);
      const meal = meals.find((candidate) => candidate.id === item.mealId);
      return meal ? [{ ...item, meal }] : [];
    }).slice(0, 4);
  }, [feedback]);

  const haptic = async (success = false) => {
    if (Platform.OS === 'web') return;
    if (success) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else await Haptics.selectionAsync();
  };
  const changeLanguage = async () => {
    await haptic();
    const next: Language = language === 'en' ? 'zh' : 'en';
    setLanguage(next); saveLanguage(next);
  };
  const changeMode = async (next: EatingMode) => {
    await haptic(); setMode(next); setPosition(0); setConfirmation(null);
    saveUserSettings(defaultPreferences, next, cuisine);
  };
  const changeDecisionMode = async (next: DecisionMode) => {
    await haptic();
    setDecisionMode(next); setConfirmation(null);
    if (next === 'venue' && !venueTypeId) setVenueTypeId(pickDifferentItem(venueTypes.map((venue) => venue.id), null));
  };
  const changeCuisine = async (next: CuisineId | null) => {
    await haptic();
    const nextRecommendations = recommendMeals(meals, mode, next, foodType, defaultPreferences, feedback, blacklistedIds);
    let nextPosition = pickRefreshedPosition(nextRecommendations.length, next === cuisine ? position : -1);
    if (current && nextRecommendations[nextPosition]?.id === current.id && nextRecommendations.length > 1) {
      nextPosition = (nextPosition + 1) % nextRecommendations.length;
    }
    setCuisine(next); setPosition(nextPosition); setConfirmation(null);
    saveUserSettings(defaultPreferences, mode, next);
  };
  const surpriseCuisine = async () => {
    await haptic();
    const eligibleCuisines = cuisines.filter((candidate) => recommendMeals(meals, mode, candidate, null, defaultPreferences, feedback, blacklistedIds).length > 0);
    const next = pickDifferentItem(eligibleCuisines, cuisine);
    if (!next) return;
    const nextRecommendations = recommendMeals(meals, mode, next, null, defaultPreferences, feedback, blacklistedIds);
    setCuisine(next); setFoodType(null); setPosition(pickRefreshedPosition(nextRecommendations.length)); setConfirmation(null);
    saveUserSettings(defaultPreferences, mode, next);
  };
  const changeFoodType = async (next: FoodType | null) => {
    await haptic();
    const nextRecommendations = recommendMeals(meals, mode, cuisine, next, defaultPreferences, feedback, blacklistedIds);
    let nextPosition = pickRefreshedPosition(nextRecommendations.length, next === foodType ? position : -1);
    if (current && nextRecommendations[nextPosition]?.id === current.id && nextRecommendations.length > 1) {
      nextPosition = (nextPosition + 1) % nextRecommendations.length;
    }
    setFoodType(next); setPosition(nextPosition); setConfirmation(null);
  };
  const changeVenueType = async (next: VenueTypeId) => {
    await haptic(); setVenueTypeId(next); setConfirmation(null);
  };
  const surpriseVenue = async () => {
    await haptic();
    setVenueTypeId(pickDifferentItem(venueTypes.map((venue) => venue.id), venueTypeId));
    setConfirmation(null);
  };
  const another = async () => {
    if (recommendations.length < 2) return;
    await haptic(); setPosition((value) => (value + 1) % recommendations.length); setConfirmation(null);
  };
  const reactToMeal = async (action: 'chosen' | 'not-today') => {
    if (!current) return;
    await haptic(action === 'chosen');
    recordFeedback(current.id, action);
    setFeedback(getFeedback());
    setPosition(0);
    const currentName = language === 'zh' ? current.localName ?? current.name : current.name;
    setConfirmation(action === 'chosen' ? `${currentName}${language === 'zh' ? '' : ' '}${tr(language, 'chosenConfirmation')}` : null);
  };
  const permanentlyHideCurrent = () => {
    if (!current) return;
    Alert.alert(
      `${tr(language, 'neverTitle')} ${language === 'zh' ? current.localName ?? current.name : current.name}?`,
      tr(language, 'neverBody'),
      [
        { text: tr(language, 'cancel'), style: 'cancel' },
        { text: tr(language, 'neverShow'), style: 'destructive', onPress: async () => {
          await haptic(); blacklistMeal(current.id); setBlacklistedIds(getBlacklistedMealIds()); setPosition(0); setConfirmation(null);
        } },
      ],
    );
  };
  const restoreBlacklistedMeal = (mealId: string) => {
    restoreMeal(mealId); const nextIds = getBlacklistedMealIds(); setBlacklistedIds(nextIds); setPosition(0);
    if (nextIds.length === 0) setHiddenFoodsVisible(false);
  };
  const openMapSearch = async (subject: string, strategy: SearchStrategy, vegetarian = false) => {
    const url = googleMapsSearchUrl(buildNearbyQuery(subject, strategy, mode, vegetarian));
    try { await Linking.openURL(url); } catch { Alert.alert(tr(language, 'mapsError'), tr(language, 'mapsErrorBody')); }
  };
  const findMeal = async (meal: Meal, strategy: SearchStrategy) => {
    await openMapSearch(meal.searchQuery, strategy);
  };
  const findVenue = async (venueId: VenueTypeId, strategy: SearchStrategy) => {
    const venue = venueTypes.find((candidate) => candidate.id === venueId);
    if (venue) await openMapSearch(venue.searchQuery, strategy);
  };
  const openShopPicker = (meal = current) => { if (meal) setShopTarget({ kind: 'meal', id: meal.id }); };
  const openVenuePicker = () => { if (currentVenue) setShopTarget({ kind: 'venue', id: currentVenue.id }); };
  const resetDishFilters = () => {
    setCuisine(null); setFoodType(null); setPosition(0); setConfirmation(null);
    saveUserSettings(defaultPreferences, mode, null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
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
              <Pressable key={id} onPress={() => changeMode(id)} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.mode, active && styles.modeActive]}>
                <Icon size={22} color={active ? '#fff' : C.green} weight={active ? 'fill' : 'regular'} />
                <Text style={[styles.modeText, active && styles.modeTextActive]}>{tr(language, labelKey)}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.questionRow}><Text style={styles.question}>{tr(language, 'decideQuestion')}</Text></View>
        <View style={styles.decisionTabs}>
          <Pressable onPress={() => changeDecisionMode('dish')} accessibilityRole="button" accessibilityState={{ selected: decisionMode === 'dish' }} style={[styles.decisionTab, decisionMode === 'dish' && styles.decisionTabActive]}>
            <ForkKnife size={19} weight="bold" color={C.green} />
            <Text style={[styles.decisionTabText, decisionMode === 'dish' && styles.decisionTabTextActive]}>{tr(language, 'decideDish')}</Text>
          </Pressable>
          <Pressable onPress={() => changeDecisionMode('venue')} accessibilityRole="button" accessibilityState={{ selected: decisionMode === 'venue' }} style={[styles.decisionTab, decisionMode === 'venue' && styles.decisionTabActive]}>
            <Storefront size={19} weight="bold" color={C.green} />
            <Text style={[styles.decisionTabText, decisionMode === 'venue' && styles.decisionTabTextActive]}>{tr(language, 'decideVenue')}</Text>
          </Pressable>
        </View>

        {decisionMode === 'dish' ? <>
          <View style={styles.questionRow}>
            <Text style={styles.question}>{tr(language, 'cuisineQuestion')}</Text><Text style={styles.optional}>{tr(language, 'optional')}</Text>
          </View>
          <Pressable onPress={surpriseCuisine} accessibilityRole="button" style={({ pressed }) => [styles.randomAction, pressed && styles.pressed]}>
            <View style={styles.randomIcon}><ArrowClockwise size={20} weight="bold" color={C.green} /></View>
            <View style={{ flex: 1 }}><Text style={styles.randomTitle}>{tr(language, 'surpriseCuisine')}</Text><Text style={styles.randomValue}>{cuisine ? `${tr(language, 'cuisinePicked')}: ${cuisineLabels[cuisine][language]}` : tr(language, 'anything')}</Text></View>
            <Sparkle size={19} weight="fill" color={C.gold} />
          </Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cuisineRow}>
            <ChoiceChip label={tr(language, 'anything')} active={cuisine === null} onPress={() => changeCuisine(null)} />
            {cuisines.map((id) => <ChoiceChip key={id} label={cuisineLabels[id][language]} active={cuisine === id} onPress={() => changeCuisine(id)} />)}
          </ScrollView>

          <View style={styles.questionRow}>
            <Text style={styles.question}>{tr(language, 'foodQuestion')}</Text><Text style={styles.optional}>{tr(language, 'optional')}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.foodTypeRow}>
            <ChoiceChip label={tr(language, 'anything')} active={foodType === null} onPress={() => changeFoodType(null)} />
            {foodTypes.map((id) => <ChoiceChip key={id} label={foodTypeLabels[id][language]} active={foodType === id} onPress={() => changeFoodType(id)} />)}
          </ScrollView>

          {current ? (
            <View style={styles.heroCard}>
              <View style={styles.imageWrap}>
                <Image source={mealImages[current.imageKey]} style={styles.heroImage} contentFit="cover" transition={180} />
                <View style={styles.matchBadge}><Sparkle size={14} weight="fill" color="#fff" /><Text style={styles.matchText}>{tr(language, 'yourPick')}</Text></View>
                <View style={styles.counter}><Text style={styles.counterText}>{countLabel(language, position % recommendations.length + 1, recommendations.length)}</Text></View>
              </View>
              <View style={styles.heroBody}>
                <Text style={styles.cuisineLabel}>{cuisineLabels[current.cuisine][language]}</Text>
                <Text style={styles.mealName}>{language === 'zh' ? current.localName ?? current.name : current.name}</Text>
                <Text style={styles.localMealName}>{language === 'zh' ? current.name : current.localName}</Text>
                <Text style={styles.description}>{language === 'zh' ? current.descriptionZh : current.description}</Text>
                <View style={styles.tagRow}>
                  <Text style={styles.price}>{priceLabel(language, current.priceLabel)}</Text>
                  {(language === 'zh' ? current.foodTypes.slice(0, 2).map((type) => foodTypeLabels[type].zh) : current.tags.slice(0, 2)).map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}
                </View>
                <View style={styles.reason}><Check size={17} weight="bold" color={C.green} /><Text style={styles.reasonText}>{recommendationReason(current, cuisine, defaultPreferences, currentChosenTimes, language)}</Text></View>
                <Pressable accessibilityRole="button" onPress={() => openShopPicker()} style={({ pressed }) => [styles.mapsButton, pressed && styles.pressed]}>
                  <MapPin size={21} weight="fill" color="#fff" />
                  <Text style={styles.mapsText}>{tr(language, 'chooseNearby')}</Text>
                </Pressable>
                <View style={styles.feedbackRow}>
                  <Pressable onPress={() => reactToMeal('not-today')} style={styles.smallAction}><ThumbsDown size={18} color={C.red} /><Text style={[styles.smallActionText, { color: C.red }]}>{tr(language, 'notToday')}</Text></Pressable>
                  <Pressable onPress={another} style={styles.smallAction}><ArrowClockwise size={18} color={C.green} /><Text style={styles.smallActionText}>{tr(language, 'another')}</Text></Pressable>
                  <Pressable onPress={() => reactToMeal('chosen')} style={styles.smallAction}><Heart size={18} color={C.green} /><Text style={styles.smallActionText}>{tr(language, 'choseThis')}</Text></Pressable>
                </View>
                <Pressable onPress={permanentlyHideCurrent} style={styles.blacklistAction}>
                  <EyeSlash size={17} color={C.muted} /><Text style={styles.blacklistText}>{tr(language, 'neverRecommend')}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{tr(language, 'noMatch')}</Text>
              <Text style={styles.emptyBody}>{tr(language, 'noMatchBody')}</Text>
              <Pressable onPress={resetDishFilters} style={styles.outlineButton}><Text style={styles.outlineText}>{tr(language, 'clearFilters')}</Text></Pressable>
            </View>
          )}
        </> : <>
          <View style={styles.questionRow}><Text style={styles.question}>{tr(language, 'venueQuestion')}</Text></View>
          <Text style={styles.venueHint}>{tr(language, 'venueHint')}</Text>
          <Pressable onPress={surpriseVenue} accessibilityRole="button" style={({ pressed }) => [styles.randomAction, pressed && styles.pressed]}>
            <View style={styles.randomIcon}><ArrowClockwise size={20} weight="bold" color={C.green} /></View>
            <View style={{ flex: 1 }}><Text style={styles.randomTitle}>{tr(language, 'surpriseVenue')}</Text><Text style={styles.randomValue}>{currentVenue?.name[language] ?? tr(language, 'anything')}</Text></View>
            <Sparkle size={19} weight="fill" color={C.gold} />
          </Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.venueTypeRow}>
            {venueTypes.map((venue) => <ChoiceChip key={venue.id} label={venue.name[language]} active={venueTypeId === venue.id} onPress={() => changeVenueType(venue.id)} />)}
          </ScrollView>
          {currentVenue && <View style={styles.venueCard}>
            <View style={styles.venueHero}>
              <View style={styles.venueIcon}><Storefront size={38} weight="fill" color="#fff" /></View>
              <View style={{ flex: 1 }}><Text style={styles.venueBadge}>{tr(language, 'venueIdea')}</Text><Text style={styles.venueName}>{currentVenue.name[language]}</Text></View>
            </View>
            <Text style={styles.venueDescription}>{currentVenue.description[language]}</Text>
            <View style={styles.tagRow}>{currentVenue.tags[language].map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>
            <Pressable accessibilityRole="button" onPress={openVenuePicker} style={({ pressed }) => [styles.mapsButton, pressed && styles.pressed]}>
              <MapPin size={21} weight="fill" color="#fff" /><Text style={styles.mapsText}>{tr(language, 'findVenue')}</Text>
            </Pressable>
            <Pressable onPress={surpriseVenue} style={styles.venueAnother}><ArrowClockwise size={18} color={C.green} /><Text style={styles.venueAnotherText}>{tr(language, 'anotherVenue')}</Text></Pressable>
          </View>}
        </>}

        {confirmation && <View style={styles.confirmation}><Check size={18} weight="bold" color={C.green} /><Text style={styles.confirmationText}>{confirmation}</Text></View>}

        {decisionMode === 'dish' && recentChoices.length > 0 && (
          <View style={styles.history}>
            <Text style={styles.historyTitle}>{tr(language, 'historyTitle')}</Text>
            <Text style={styles.historyHint}>{tr(language, 'historyHint')}</Text>
            {recentChoices.map(({ meal, createdAt }) => (
              <Pressable key={`${meal.id}-${createdAt}`} onPress={() => openShopPicker(meal)} style={styles.historyRow}>
                <Image source={mealImages[meal.imageKey]} style={styles.historyImage} contentFit="cover" />
                <View style={{ flex: 1 }}><Text style={styles.historyName}>{language === 'zh' ? `${meal.localName ?? meal.name} · ${meal.name}` : `${meal.name}${meal.localName ? ` · ${meal.localName}` : ''}`}</Text><Text style={styles.historyCuisine}>{cuisineLabels[meal.cuisine][language]} · {priceLabel(language, meal.priceLabel)}</Text></View>
                <MapPin size={20} color={C.green} />
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.disclaimer}>{tr(language, 'disclaimer')}</Text>
        {blacklistedMeals.length > 0 && <Pressable onPress={() => setHiddenFoodsVisible(true)} style={styles.creditButton}><Text style={styles.creditButtonText}>{tr(language, 'manageHiddenFoods')} ({blacklistedMeals.length})</Text></Pressable>}
        <Pressable onPress={() => setCreditsVisible(true)} style={styles.creditButton}><Text style={styles.creditButtonText}>{tr(language, 'photoCredits')}</Text></Pressable>
      </ScrollView>

      <HiddenFoodsModal language={language} visible={hiddenFoodsVisible} blacklistedMeals={blacklistedMeals} onRestore={restoreBlacklistedMeal} onClose={() => setHiddenFoodsVisible(false)} />
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

function ChoiceChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></Pressable>;
}

function HiddenFoodsModal({ language, visible, blacklistedMeals, onRestore, onClose }: { language: Language; visible: boolean; blacklistedMeals: Meal[]; onRestore: (mealId: string) => void; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}><Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}><View style={{ flex: 1 }}><Text style={styles.sheetTitle}>{tr(language, 'manageHiddenFoods')}</Text><Text style={styles.sheetHint}>{tr(language, 'restoreHelp')}</Text></View><Pressable onPress={onClose} hitSlop={12}><X size={25} color={C.ink} /></Pressable></View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {blacklistedMeals.map((meal) => (
              <View key={meal.id} style={styles.blacklistRow}>
                <Text style={styles.blacklistMeal}>{language === 'zh' ? meal.localName ?? meal.name : `${meal.name}${meal.localName ? ` · ${meal.localName}` : ''}`}</Text>
                <Pressable onPress={() => onRestore(meal.id)} style={styles.restoreButton}><Text style={styles.restoreText}>{tr(language, 'restore')}</Text></Pressable>
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
      <View style={styles.backdrop}><Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}><Text style={styles.sheetTitle}>{venueMode ? tr(language, 'findVenue') : tr(language, 'chooseWhere')}</Text><Text style={styles.sheetHint}>{subject}</Text></View>
            <Pressable onPress={onClose} hitSlop={12}><X size={25} color={C.ink} /></Pressable>
          </View>
          <Text style={styles.shopIntro}>{tr(language, 'shopIntro')}</Text>
          <ShopStrategy icon={<NavigationArrow size={23} weight="fill" color={C.green} />} title={tr(language, 'closest')} description={tr(language, 'closestDescription')} onPress={() => choose('nearby')} />
          <ShopStrategy icon={<Star size={23} weight="fill" color={C.gold} />} title={tr(language, 'bestRated')} description={tr(language, 'bestDescription')} onPress={() => choose('best')} />
          <ShopStrategy icon={<Wallet size={23} weight="fill" color={C.green} />} title={tr(language, 'budgetSearch')} description={tr(language, 'budgetDescription')} onPress={() => choose('budget')} />
          <Text style={styles.shopNote}>{tr(language, 'mapNote')}</Text>
        </View>
      </View>
    </Modal>
  );
}

function ShopStrategy({ icon, title, description, onPress }: { icon: React.ReactNode; title: string; description: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.shopStrategy, pressed && styles.pressed]}>{icon}<View style={{ flex: 1 }}><Text style={styles.shopTitle}>{title}</Text><Text style={styles.shopDescription}>{description}</Text></View><NavigationArrow size={17} color={C.muted} /></Pressable>;
}

function CreditsModal({ language, visible, onClose }: { language: Language; visible: boolean; onClose: () => void }) {
  const clean = (value: string) => value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}><Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.sheet, { maxHeight: '78%' }]}>
          <View style={styles.sheetHeader}><View><Text style={styles.sheetTitle}>{tr(language, 'photoCredits')}</Text><Text style={styles.sheetHint}>{tr(language, 'creditsHint')}</Text></View><Pressable onPress={onClose} hitSlop={12}><X size={25} color={C.ink} /></Pressable></View>
          <ScrollView>{imageCredits.map((credit) => <Pressable key={credit.mealId} onPress={() => Linking.openURL(credit.sourceUrl)} style={styles.creditRow}><Text style={styles.creditMeal}>{credit.sourceTitle}</Text><Text style={styles.creditMeta}>{clean(credit.artist)} · {credit.license}</Text></Pressable>)}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream }, screen: { padding: 16, paddingBottom: 38 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 }, logo: { width: 43, height: 43, borderRadius: 14, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, marginLeft: 11 }, brand: { color: C.ink, fontSize: 23, fontWeight: '900', letterSpacing: -0.6 }, tagline: { color: C.muted, fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 7 }, languageButton: { minWidth: 44, height: 38, paddingHorizontal: 10, borderRadius: 19, borderWidth: 1, borderColor: C.green, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' }, languageText: { color: C.green, fontSize: 12, fontWeight: '900' },
  decisionTabs: { flexDirection: 'row', gap: 8, backgroundColor: '#F0E8DA', borderRadius: 16, padding: 4, marginBottom: 2 },
  decisionTab: { flex: 1, minHeight: 48, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8 },
  decisionTabActive: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.line },
  decisionTabText: { color: C.muted, fontSize: 12, fontWeight: '800' }, decisionTabTextActive: { color: C.green },
  question: { color: C.ink, fontSize: 17, fontWeight: '800', marginBottom: 10 }, questionRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 21 }, optional: { color: C.muted, fontSize: 12 },
  modeRow: { flexDirection: 'row', gap: 8 }, mode: { flex: 1, minHeight: 69, borderWidth: 1, borderColor: C.line, borderRadius: 14, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', gap: 5 },
  modeActive: { backgroundColor: C.green, borderColor: C.green }, modeText: { color: C.ink, fontSize: 12, fontWeight: '700' }, modeTextActive: { color: '#fff' },
  cuisineRow: { gap: 8, paddingRight: 12 }, foodTypeRow: { gap: 8, paddingRight: 12, paddingBottom: 18 }, chip: { minHeight: 43, paddingHorizontal: 15, borderRadius: 22, borderWidth: 1, borderColor: '#DCCEB8', backgroundColor: C.paper, justifyContent: 'center' },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink }, chipText: { color: C.text, fontSize: 12, fontWeight: '700' }, chipTextActive: { color: '#fff' },
  randomAction: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 15, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper, paddingHorizontal: 13, marginBottom: 11 },
  randomIcon: { width: 39, height: 39, borderRadius: 20, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' },
  randomTitle: { color: C.muted, fontSize: 11, fontWeight: '700' }, randomValue: { color: C.ink, fontSize: 15, fontWeight: '900', marginTop: 2 },
  venueHint: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: -4, marginBottom: 10 }, venueTypeRow: { gap: 8, paddingRight: 12, paddingBottom: 18 },
  venueCard: { borderRadius: 22, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, padding: 17 },
  venueHero: { flexDirection: 'row', alignItems: 'center', gap: 13 }, venueIcon: { width: 62, height: 62, borderRadius: 18, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  venueBadge: { color: C.gold, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7 }, venueName: { color: C.ink, fontSize: 25, lineHeight: 30, fontWeight: '900', letterSpacing: -0.6, marginTop: 2 },
  venueDescription: { color: C.text, fontSize: 14, lineHeight: 20, marginTop: 14 }, venueAnother: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 5 }, venueAnotherText: { color: C.green, fontSize: 13, fontWeight: '900' },
  heroCard: { borderRadius: 22, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }, imageWrap: { height: 224, backgroundColor: '#EAE1D2' }, heroImage: { width: '100%', height: '100%' },
  matchBadge: { position: 'absolute', left: 13, top: 13, flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: C.gold, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16 }, matchText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  counter: { position: 'absolute', right: 13, top: 13, backgroundColor: 'rgba(18,35,26,.78)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16 }, counterText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  heroBody: { padding: 17 }, cuisineLabel: { color: C.gold, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 }, mealName: { color: C.ink, fontSize: 28, lineHeight: 33, fontWeight: '900', letterSpacing: -0.8, marginTop: 4 }, localMealName: { color: C.green, fontSize: 19, lineHeight: 25, fontWeight: '800', marginTop: 1 },
  description: { color: C.text, fontSize: 14, lineHeight: 20, marginTop: 7 }, tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 }, price: { color: C.ink, fontSize: 12, fontWeight: '800', backgroundColor: C.greenSoft, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 6 },
  tag: { color: C.muted, fontSize: 12, backgroundColor: '#F2EFE8', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 6, textTransform: 'capitalize' }, reason: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 15 }, reasonText: { flex: 1, color: C.muted, fontSize: 12, lineHeight: 17 },
  mapsButton: { minHeight: 55, borderRadius: 15, backgroundColor: C.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 17 }, mapsText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  feedbackRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, marginTop: 15 }, smallAction: { flex: 1, minHeight: 51, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }, smallActionText: { color: C.green, fontSize: 11, fontWeight: '800' }, blacklistAction: { minHeight: 44, borderTopWidth: 1, borderTopColor: C.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, blacklistText: { color: C.muted, fontSize: 11, fontWeight: '700' }, pressed: { opacity: 0.82 },
  empty: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 25, alignItems: 'center' }, emptyTitle: { color: C.ink, fontSize: 19, fontWeight: '900' }, emptyBody: { color: C.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  outlineButton: { minHeight: 46, borderWidth: 1, borderColor: C.green, borderRadius: 13, justifyContent: 'center', paddingHorizontal: 18, marginTop: 15 }, outlineText: { color: C.green, fontWeight: '800' },
  confirmation: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: C.greenSoft, borderRadius: 12, padding: 12 }, confirmationText: { color: C.green, fontSize: 12, fontWeight: '700' },
  history: { marginTop: 26 }, historyTitle: { color: C.ink, fontSize: 18, fontWeight: '900' }, historyHint: { color: C.muted, fontSize: 12, marginTop: 2, marginBottom: 8 }, historyRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 8 }, historyImage: { width: 57, height: 48, borderRadius: 10 }, historyName: { color: C.ink, fontSize: 13, fontWeight: '800' }, historyCuisine: { color: C.muted, fontSize: 11, marginTop: 3 },
  disclaimer: { color: C.muted, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 25 }, creditButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, creditButtonText: { color: C.green, fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8,25,16,.35)' }, sheet: { maxHeight: '88%', backgroundColor: C.paper, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 30 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }, sheetTitle: { color: C.ink, fontSize: 22, fontWeight: '900' }, sheetHint: { color: C.muted, fontSize: 11, marginTop: 3 },
  blacklistRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: C.line }, blacklistMeal: { flex: 1, color: C.text, fontSize: 12, fontWeight: '700' }, restoreButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 10 }, restoreText: { color: C.green, fontSize: 12, fontWeight: '900' },
  shopIntro: { color: C.text, fontSize: 13, lineHeight: 19, marginBottom: 10 }, shopStrategy: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 10 }, shopTitle: { color: C.ink, fontSize: 14, fontWeight: '900' }, shopDescription: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 2 }, shopNote: { color: C.muted, fontSize: 10, lineHeight: 15, marginTop: 14 },
  creditRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }, creditMeal: { color: C.ink, fontSize: 13, fontWeight: '800' }, creditMeta: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
});
