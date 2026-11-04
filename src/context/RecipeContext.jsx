import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, Vibration } from 'react-native';
import * as Speech from 'expo-speech';
import { INITIAL_RECIPES } from '../data/mockRecipes';
import { getSessionStepIndex, makeId, normalizeRecipe, recipeSignature, relocateTimerStep } from '../utils/recipeModel';
import { normalizeVi } from '../utils/text';
import { normalizeUnit } from '../utils/units';
import { mergeIntoShoppingList } from '../utils/shopping';
import { HISTORY_LIMIT, makeHistoryEntry, sanitizeHistory } from '../utils/history';
import { MAX_TIMERS, finishDueTimers, getTimerRemaining, restoreTimers, timerIdFor } from '../utils/timers';
import { cancelTimerNotification, initTimerNotifications, scheduleTimerNotification } from '../utils/notifications';
import { buildBackup } from '../utils/backup';
import { showAlert } from '../utils/dialog';
import { SERVINGS_MAX, SERVINGS_MIN } from '../constants/limits';
import { ALL_CATEGORY, DEFAULT_CATEGORIES, fallbackCategory, sanitizeCategories, setRecipeCategories, validateCategoryName } from '../utils/categories';
import { makeMealEntry, plannedIngredients, sanitizeMealPlan, MEAL_PLAN_LIMIT } from '../utils/mealPlan';
import { applyRequestUpdate, buildRequest, sanitizeRequests, REQUEST_LIMIT } from '../utils/recipeRequests';
import { CALORIE_GOAL_MAX, CALORIE_GOAL_MIN, DEFAULT_CALORIE_GOAL } from '../utils/nutrition';
import { scaleAmount } from '../utils/quantity';
import { useAuth } from './AuthContext';

const STORAGE_KEY_RECIPES = '@cookflow_recipes_v2';
const STORAGE_KEY_FAVS = '@cookflow_favs_v2';
const STORAGE_KEY_SHOPPING = '@cookflow_shopping_v2';
const STORAGE_KEY_PANTRY = '@cookflow_pantry_v1';
const STORAGE_KEY_ONBOARDING = '@cookflow_onboarding_v2';
const STORAGE_KEY_SETTINGS = '@cookflow_settings_v1';
const STORAGE_KEY_LEGACY_TIMER = '@cookflow_timer_v1'; // single timer of older versions, migrated
const STORAGE_KEY_TIMERS = '@cookflow_timers_v2';
const STORAGE_KEY_SESSION = '@cookflow_cooking_session_v1';
const STORAGE_KEY_HISTORY = '@cookflow_history_v1';
const STORAGE_KEY_CATEGORIES = '@cookflow_categories_v1';
const STORAGE_KEY_MEAL_PLAN = '@cookflow_meal_plan_v1';
const STORAGE_KEY_REQUESTS = '@cookflow_recipe_requests_v1';
// Built-in recipes the admin deleted: they must not come back as "new samples" on the next launch
const STORAGE_KEY_DELETED_BUILTINS = '@cookflow_deleted_builtins_v1';
const RecipeContext = createContext(undefined);

// assumeStaples: basic seasonings count as "on hand"; autoStockPantry: bought items go to the pantry;
// timerNotifications: system notification when a timer ends in background; allergies: allergen ids
export const DEFAULT_SETTINGS = {
  keepAwake: true, timerSound: true, vibration: true, timerNotifications: true,
  assumeStaples: true, autoStockPantry: true, allergies: [], hideAllergenRecipes: true,
  calorieGoal: DEFAULT_CALORIE_GOAL // kcal per day, shown on the meal plan
};
const clampGoal = value => Math.min(CALORIE_GOAL_MAX, Math.max(CALORIE_GOAL_MIN, Math.round(Number(value)) || DEFAULT_CALORIE_GOAL));

// Safe storage helper
export const safeStorage = {
  getItem: async key => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch {
      // In-memory fallback
    }
  },
  removeItem: async key => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem(key);
    } catch {
      // Fallback
    }
  }
};

const parseJson = raw => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const DEFAULT_SHOPPING = [{
  id: 'shop_01',
  name: 'Thịt bò phi lê',
  amount: '300',
  unit: 'g',
  recipeTitle: 'Bò Lúc Lắc Sốt Tiêu',
  checked: false
}, {
  id: 'shop_02',
  name: 'Ớt chuông đà lạt',
  amount: '2',
  unit: 'quả',
  recipeTitle: 'Bò Lúc Lắc Sốt Tiêu',
  checked: true
}];

const clampServings = value => Math.min(SERVINGS_MAX, Math.max(SERVINGS_MIN, Math.round(Number(value)) || SERVINGS_MIN));

const usePersist = (isHydrated, key, value) => {
  useEffect(() => {
    if (!isHydrated) return;
    if (value == null) safeStorage.removeItem(key);
    else safeStorage.setItem(key, JSON.stringify(value));
  }, [isHydrated, key, value]);
};

export const RecipeProvider = ({
  children
}) => {
  const [cookingTimers, setCookingTimers] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [recipes, setRecipes] = useState(() => INITIAL_RECIPES.map(normalizeRecipe));
  const [favoriteIds, setFavoriteIds] = useState(['rec_01', 'rec_03']);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [cookingSession, setCookingSession] = useState(null);
  const [pantryIngredients, setPantryIngredients] = useState([]);
  const [shoppingList, setShoppingList] = useState(DEFAULT_SHOPPING);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [cookHistory, setCookHistory] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [mealPlan, setMealPlan] = useState([]);
  const [recipeRequests, setRecipeRequests] = useState([]);
  const [deletedBuiltInIds, setDeletedBuiltInIds] = useState([]);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  // Latest list for synchronous merges (two adds in the same tick must not drop items)
  const shoppingRef = useRef(shoppingList);
  shoppingRef.current = shoppingList;
  const pantryRef = useRef(pantryIngredients);
  pantryRef.current = pantryIngredients;

  // ---------- Who is signed in: personal data is stored per account ----------
  const { user } = useAuth();
  const userEmail = user?.email || null;
  const isAdmin = user?.role === 'admin';
  const recipesRef = useRef(recipes);
  recipesRef.current = recipes;
  // Shared catalog (recipes, categories, requests) loads once; personal data loads per account
  const [sharedReady, setSharedReady] = useState(false);
  const [loadedFor, setLoadedFor] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [rawRecipes, rawCategories, rawRequests, rawDeletedBuiltIns] = await Promise.all([
        STORAGE_KEY_RECIPES, STORAGE_KEY_CATEGORIES, STORAGE_KEY_REQUESTS, STORAGE_KEY_DELETED_BUILTINS
      ].map(key => safeStorage.getItem(key)));
      if (cancelled) return;
      setRecipeRequests(sanitizeRequests(parseJson(rawRequests)));
      // Categories first: recipes are normalized onto the admin's category list
      const storedCategories = parseJson(rawCategories);
      if (Array.isArray(storedCategories)) setCategories(setRecipeCategories(storedCategories));
      const deletedIds = (parseJson(rawDeletedBuiltIns) || []).filter(id => typeof id === 'string');
      setDeletedBuiltInIds(deletedIds);
      const deletedSet = new Set(deletedIds);
      let loadedRecipes = INITIAL_RECIPES.filter(r => !deletedSet.has(r.id)).map(normalizeRecipe);
      const storedRecipes = parseJson(rawRecipes);
      if (Array.isArray(storedRecipes)) {
        const normalized = storedRecipes.map(normalizeRecipe).filter(Boolean);
        // Built-in recipes added in a newer app version are appended for existing users
        const knownIds = new Set(normalized.map(r => r.id));
        const newSamples = INITIAL_RECIPES.filter(r => !knownIds.has(r.id) && !deletedSet.has(r.id)).map(normalizeRecipe);
        loadedRecipes = [...normalized, ...newSamples];
      }
      recipesRef.current = loadedRecipes;
      setRecipes(loadedRecipes);
      setSharedReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sharedReady || !userEmail) return undefined;
    let cancelled = false;
    (async () => {
      const scoped = key => `${key}::${userEmail}`;
      const personalKeys = [STORAGE_KEY_FAVS, STORAGE_KEY_SHOPPING, STORAGE_KEY_PANTRY, STORAGE_KEY_ONBOARDING, STORAGE_KEY_SETTINGS,
        STORAGE_KEY_TIMERS, STORAGE_KEY_SESSION, STORAGE_KEY_HISTORY, STORAGE_KEY_MEAL_PLAN];
      const raws = await Promise.all(personalKeys.map(key => safeStorage.getItem(scoped(key))));
      // Data saved before accounts were separated belongs to the first account that signs in
      const claimLegacy = raws.every(raw => raw == null);
      const legacy = claimLegacy ? await Promise.all([...personalKeys, STORAGE_KEY_LEGACY_TIMER].map(key => safeStorage.getItem(key))) : [];
      if (cancelled) return;
      const pick = index => raws[index] ?? legacy[index] ?? null;
      const [rawFavs, rawShopping, rawPantry, rawOnboarding, rawSettings, rawTimers, rawSession, rawHistory, rawMealPlan] = personalKeys.map((_, i) => pick(i));
      const rawLegacyTimer = legacy[personalKeys.length] ?? null;
      const loadedRecipes = recipesRef.current;

      setCookHistory(sanitizeHistory(parseJson(rawHistory)));
      setMealPlan(sanitizeMealPlan(parseJson(rawMealPlan)));
      const storedSession = parseJson(rawSession);
      setCookingSession(storedSession?.recipeId && loadedRecipes.some(r => r.id === storedSession.recipeId)
        ? { ...storedSession, servings: clampServings(storedSession.servings) }
        : null);
      const storedFavs = parseJson(rawFavs);
      setFavoriteIds(Array.isArray(storedFavs) ? storedFavs.filter(id => typeof id === 'string') : ['rec_01', 'rec_03']);
      const storedShopping = parseJson(rawShopping);
      const shopping = Array.isArray(storedShopping)
        ? storedShopping.filter(item => item && typeof item.name === 'string').map(item => ({ ...item, id: item.id || makeId('shop'), unit: normalizeUnit(item.unit) }))
        : DEFAULT_SHOPPING;
      shoppingRef.current = shopping;
      setShoppingList(shopping);
      const storedPantry = parseJson(rawPantry);
      const pantry = Array.isArray(storedPantry) ? storedPantry.filter(item => typeof item === 'string') : [];
      pantryRef.current = pantry;
      setPantryIngredients(pantry);
      const storedSettings = parseJson(rawSettings);
      setSettings(storedSettings && typeof storedSettings === 'object' ? {
        ...DEFAULT_SETTINGS, ...storedSettings,
        allergies: Array.isArray(storedSettings.allergies) ? storedSettings.allergies : [],
        calorieGoal: clampGoal(storedSettings.calorieGoal)
      } : DEFAULT_SETTINGS);
      // Timers of deleted recipes are dropped; a timer that ran out while closed comes back finished
      const knownRecipeIds = new Set(loadedRecipes.map(r => r.id));
      setCookingTimers(restoreTimers(parseJson(rawTimers), parseJson(rawLegacyTimer)).filter(timer => knownRecipeIds.has(timer.recipeId)));
      setHasSeenOnboarding(rawOnboarding === 'true');
      if (claimLegacy) [...personalKeys, STORAGE_KEY_LEGACY_TIMER].forEach(key => safeStorage.removeItem(key));
      setLoadedFor(userEmail);
    })();
    return () => {
      cancelled = true;
    };
  }, [sharedReady, userEmail]);

  // True once the signed-in account's own data is on screen (never while switching accounts)
  const isHydrated = sharedReady && !!userEmail && loadedFor === userEmail;
  const personalKey = key => `${key}::${userEmail}`;

  // ---------- Persist after hydration (never overwrite stored data with defaults or another account's data) ----------
  usePersist(sharedReady, STORAGE_KEY_RECIPES, recipes);
  usePersist(sharedReady, STORAGE_KEY_CATEGORIES, categories);
  usePersist(sharedReady, STORAGE_KEY_REQUESTS, recipeRequests);
  usePersist(sharedReady, STORAGE_KEY_DELETED_BUILTINS, deletedBuiltInIds);
  usePersist(isHydrated, personalKey(STORAGE_KEY_FAVS), favoriteIds);
  usePersist(isHydrated, personalKey(STORAGE_KEY_SHOPPING), shoppingList);
  usePersist(isHydrated, personalKey(STORAGE_KEY_PANTRY), pantryIngredients);
  usePersist(isHydrated, personalKey(STORAGE_KEY_SETTINGS), settings);
  usePersist(isHydrated, personalKey(STORAGE_KEY_TIMERS), cookingTimers);
  usePersist(isHydrated, personalKey(STORAGE_KEY_SESSION), cookingSession);
  usePersist(isHydrated, personalKey(STORAGE_KEY_HISTORY), cookHistory);
  usePersist(isHydrated, personalKey(STORAGE_KEY_MEAL_PLAN), mealPlan);

  // Personal recipes are visible to their owner only (the admin sees every recipe).
  // Recipes created before accounts were separated have no owner and stay visible to everyone.
  const visibleRecipes = useMemo(() => isAdmin ? recipes : recipes.filter(r => !r.isCustom || !r.ownerEmail || r.ownerEmail === userEmail), [recipes, isAdmin, userEmail]);

  // ---------- Timer clock ----------
  const isTimerRunning = cookingTimers.some(timer => timer.status === 'running');
  useEffect(() => {
    if (!isTimerRunning) return undefined;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 500);
    const sub = AppState.addEventListener?.('change', state => {
      if (state === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(interval);
      sub?.remove?.();
    };
  }, [isTimerRunning]);

  // Finish detection lives here (not in TimerCircle) so it fires even when Cooking Mode is closed
  useEffect(() => {
    const { finished } = finishDueTimers(cookingTimers, now);
    if (!finished.length) return;
    setCookingTimers(prev => finishDueTimers(prev, now).timers);
    const { vibration, timerSound } = settingsRef.current;
    if (vibration && Platform.OS !== 'web') Vibration.vibrate([0, 500, 300, 500]);
    const lines = finished.map(timer => `${timer.recipeTitle}\nBước ${timer.stepIndex + 1}: ${timer.stepTitle}`);
    if (timerSound) {
      Speech.stop();
      Speech.speak(finished.map(timer => `Hết giờ bước ${timer.stepIndex + 1}: ${timer.stepTitle}`).join('. '), { language: 'vi-VN' });
    }
    showAlert('⏰ ĐÃ HẾT GIỜ!', lines.join('\n\n'));
  }, [now, cookingTimers]);

  // ---------- System notifications (background / closed app) ----------
  // timerId → { endAt, idPromise }: one scheduled notification per running timer
  const scheduledRef = useRef(new Map());
  const [notificationsReady, setNotificationsReady] = useState(false);
  useEffect(() => {
    initTimerNotifications().finally(() => setNotificationsReady(true));
  }, []);
  useEffect(() => {
    if (!isHydrated || !notificationsReady) return;
    const wanted = new Map(settings.timerNotifications
      ? cookingTimers.filter(timer => timer.status === 'running').map(timer => [timer.id, timer])
      : []);
    scheduledRef.current.forEach((entry, id) => {
      if (wanted.get(id)?.endAt === entry.endAt) return;
      entry.idPromise.then(cancelTimerNotification);
      scheduledRef.current.delete(id);
    });
    wanted.forEach((timer, id) => {
      if (!scheduledRef.current.has(id)) scheduledRef.current.set(id, { endAt: timer.endAt, idPromise: scheduleTimerNotification(timer) });
    });
  }, [isHydrated, notificationsReady, cookingTimers, settings.timerNotifications]);

  const updateTimer = useCallback((id, update) => {
    setNow(Date.now());
    setCookingTimers(prev => prev.map(timer => timer.id === id ? update(timer) : timer));
  }, []);
  /**
   * Starts (or restarts) the timer of one step. Other steps' timers keep running.
   * @returns false when MAX_TIMERS other timers are already active
   */
  const startStepTimer = ({ recipe, stepIndex, seconds }) => {
    const step = recipe?.steps?.[stepIndex];
    const duration = Math.max(1, Math.round(seconds || step?.timerSeconds || 0));
    if (!recipe || !step || !duration) return false;
    const id = timerIdFor(recipe.id, step.id);
    const others = cookingTimers.filter(timer => timer.id !== id);
    // Finished timers make room automatically; only running/paused ones count towards the limit
    const active = others.filter(timer => timer.status !== 'done');
    if (active.length >= MAX_TIMERS) return false;
    const kept = others.length >= MAX_TIMERS ? active : others;
    setNow(Date.now());
    setCookingTimers([...kept, {
      id,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      stepId: step.id,
      stepIndex,
      stepTitle: step.title,
      durationSeconds: duration,
      status: 'running',
      endAt: Date.now() + duration * 1000
    }]);
    return true;
  };
  const pauseTimer = useCallback(id => updateTimer(id, timer => timer.status === 'running'
    ? { ...timer, status: 'paused', remainingSeconds: getTimerRemaining(timer), endAt: undefined }
    : timer), [updateTimer]);
  const resumeTimer = useCallback(id => updateTimer(id, timer => timer.status === 'paused' && timer.remainingSeconds > 0
    ? { ...timer, status: 'running', endAt: Date.now() + timer.remainingSeconds * 1000, remainingSeconds: undefined }
    : timer), [updateTimer]);
  const addTimerMinute = useCallback(id => updateTimer(id, timer => {
    if (timer.status === 'running') return { ...timer, endAt: timer.endAt + 60000, durationSeconds: timer.durationSeconds + 60 };
    if (timer.status === 'done') {
      return { ...timer, status: 'running', endAt: Date.now() + 60000, remainingSeconds: undefined, durationSeconds: 60, notified: false };
    }
    return { ...timer, remainingSeconds: timer.remainingSeconds + 60, durationSeconds: timer.durationSeconds + 60 };
  }), [updateTimer]);
  const clearTimer = useCallback(id => setCookingTimers(prev => prev.filter(timer => timer.id !== id)), []);
  const clearRecipeTimers = useCallback(recipeId => setCookingTimers(prev => prev.filter(timer => timer.recipeId !== recipeId)), []);

  // ---------- Recipes ----------
  /** Adds a personal recipe, or a catalog recipe ({ system: true }, admin only). */
  const addRecipe = (newRecipeData, { system = false } = {}) => {
    const newRecipe = normalizeRecipe({
      ...newRecipeData,
      id: makeId(system ? 'sys' : 'custom'),
      isCustom: !system,
      ownerEmail: system ? undefined : userEmail || undefined,
      createdAt: new Date().toISOString(),
      colorAccent: newRecipeData.colorAccent || '#FF6B6B'
    });
    if (!newRecipe) return null;
    setRecipes(prev => [newRecipe, ...prev]);
    return newRecipe;
  };
  const updateRecipe = updatedRecipe => {
    const normalized = normalizeRecipe({ ...updatedRecipe, updatedAt: new Date().toISOString() });
    if (!normalized) return;
    const previous = recipes.find(r => r.id === normalized.id);
    setRecipes(prev => prev.map(r => r.id === normalized.id ? normalized : r));
    // The cooking session reads the live recipe and follows its step by id
    // Each timer follows its step by id (and stops when that step was deleted)
    setCookingTimers(prev => prev
      .map(timer => relocateTimerStep(timer, previous, normalized))
      .filter(Boolean)
      .map(timer => ({ ...timer, id: timerIdFor(timer.recipeId, timer.stepId) }))
      .filter((timer, idx, list) => list.findIndex(other => other.id === timer.id) === idx));
  };
  const deleteRecipe = id => {
    if (INITIAL_RECIPES.some(r => r.id === id)) setDeletedBuiltInIds(prev => prev.includes(id) ? prev : [...prev, id]);
    setRecipes(prev => prev.filter(r => r.id !== id));
    setFavoriteIds(prev => prev.filter(fId => fId !== id));
    setCookingSession(session => session?.recipeId === id ? null : session);
    setCookingTimers(prev => prev.filter(timer => timer.recipeId !== id));
  };
  const findDuplicateRecipe = candidate => {
    const signature = recipeSignature(candidate);
    return visibleRecipes.find(r => recipeSignature(r) === signature) || null;
  };
  const toggleFavorite = id => {
    setFavoriteIds(prev => prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]);
  };
  const isFavorite = id => favoriteIds.includes(id);
  const getRecipeById = id => recipes.find(r => r.id === id);

  // ---------- Cooking session ----------
  const activeRecipeForCooking = useMemo(
    () => cookingSession ? recipes.find(r => r.id === cookingSession.recipeId) || null : null,
    [recipes, cookingSession]
  );
  const cookingStepIndex = getSessionStepIndex(cookingSession, activeRecipeForCooking);
  const startCookingSession = (recipe, { servings, stepIndex = 0 } = {}) => {
    if (!recipe?.steps?.length) return;
    const index = Math.min(Math.max(0, stepIndex), recipe.steps.length - 1);
    setCookingSession({
      recipeId: recipe.id,
      servings: clampServings(servings ?? recipe.servings),
      stepId: recipe.steps[index].id,
      stepIndex: index,
      startedAt: Date.now()
    });
  };
  const setCookingStep = stepIndex => {
    const step = activeRecipeForCooking?.steps?.[stepIndex];
    if (!step) return;
    setCookingSession(session => session ? { ...session, stepId: step.id, stepIndex } : session);
  };
  const setCookingServings = servings => {
    setCookingSession(session => session ? { ...session, servings: clampServings(servings) } : session);
  };
  const endCookingSession = () => setCookingSession(null);

  // ---------- Cooking history ----------
  /** Logs a finished dish (with optional 1–5 rating and note). */
  const recordCooking = ({ recipe, servings, startedAt, rating, note }) => {
    const entry = makeHistoryEntry({ recipe, servings, startedAt, rating, note });
    if (entry) setCookHistory(prev => [entry, ...prev].slice(0, HISTORY_LIMIT));
    return entry;
  };
  const deleteHistoryEntry = id => setCookHistory(prev => prev.filter(entry => entry.id !== id));

  // ---------- Pantry ----------
  const togglePantryIngredient = ingredientName => {
    const key = normalizeVi(ingredientName);
    if (!key) return;
    setPantryIngredients(prev => prev.some(name => normalizeVi(name) === key)
      ? prev.filter(name => normalizeVi(name) !== key)
      : [...prev, ingredientName.trim()]);
  };
  const clearPantry = () => setPantryIngredients([]);
  const isInPantryList = name => pantryRef.current.some(item => normalizeVi(item) === normalizeVi(name));
  const addPantryIngredient = name => {
    const clean = String(name || '').trim();
    if (!clean || isInPantryList(clean)) return false;
    pantryRef.current = [...pantryRef.current, clean];
    setPantryIngredients(pantryRef.current);
    return true;
  };
  /** Removes several pantry entries at once (e.g. ingredients used up by a cooked dish). */
  const removePantryIngredients = names => {
    const keys = new Set((names || []).map(normalizeVi));
    if (!keys.size) return;
    pantryRef.current = pantryRef.current.filter(item => !keys.has(normalizeVi(item)));
    setPantryIngredients(pantryRef.current);
  };

  // ---------- Shopping list ----------
  /**
   * Adds ingredients, merging with unchecked rows of the same name (same unit or g/kg, ml/lít)
   * instead of duplicating. @returns {{ added: number, merged: number }}
   */
  const addToShoppingList = (ingredients, recipeTitle) => {
    const { list, added, merged } = mergeIntoShoppingList(shoppingRef.current, ingredients, recipeTitle || 'Công thức CookFlow');
    shoppingRef.current = list;
    setShoppingList(list);
    return { added, merged };
  };
  /**
   * Marks a row bought / not bought. With autoStockPantry, buying puts the item in the pantry
   * (flagged so un-ticking by mistake takes it back out — but never an item that was already there).
   */
  const toggleShoppingItem = id => {
    const item = shoppingRef.current.find(row => row.id === id);
    if (!item) return;
    const checked = !item.checked;
    let stockedToPantry = item.stockedToPantry;
    if (checked && settingsRef.current.autoStockPantry && addPantryIngredient(item.name)) {
      stockedToPantry = true;
    } else if (!checked && item.stockedToPantry) {
      const stillBought = shoppingRef.current.some(row => row.id !== id && row.checked && normalizeVi(row.name) === normalizeVi(item.name));
      if (!stillBought) removePantryIngredients([item.name]);
      stockedToPantry = undefined;
    }
    const list = shoppingRef.current.map(row => row.id === id ? { ...row, checked, stockedToPantry } : row);
    shoppingRef.current = list;
    setShoppingList(list);
  };
  /** Edits a row's name / amount / unit. @returns false when the name is empty. */
  const updateShoppingItem = (id, patch) => {
    const name = String(patch?.name ?? '').trim();
    if (!name) return false;
    const amount = String(patch?.amount ?? '').trim() || 'Vừa đủ';
    const unit = normalizeUnit(patch?.unit);
    setShoppingList(prev => prev.map(row => row.id === id ? { ...row, name, amount, unit } : row));
    return true;
  };
  /** Removes a row and returns what is needed to undo it: { item, index } (null if not found). */
  const deleteShoppingItem = id => {
    const index = shoppingRef.current.findIndex(item => item.id === id);
    if (index < 0) return null;
    const removed = { item: shoppingRef.current[index], index };
    setShoppingList(prev => prev.filter(item => item.id !== id));
    return removed;
  };
  const restoreShoppingItem = removed => {
    if (!removed?.item) return;
    setShoppingList(prev => {
      if (prev.some(item => item.id === removed.item.id)) return prev;
      const next = [...prev];
      next.splice(Math.min(removed.index, next.length), 0, removed.item);
      return next;
    });
  };
  const clearCheckedShoppingItems = () => {
    setShoppingList(prev => prev.filter(item => !item.checked));
  };
  const addCustomShoppingItem = (name, amount, unit) => {
    if (!String(name || '').trim()) return { added: 0, merged: 0 };
    return addToShoppingList([{ name, amount: String(amount || '').trim() || '1', unit: String(unit || '').trim() || 'phần' }], 'Mua tự do');
  };

  // ---------- Categories (admin) ----------
  const applyCategories = next => {
    const clean = setRecipeCategories(next);
    setCategories(clean);
    return clean;
  };
  /** @returns an error message, or null when added. */
  const addCategory = name => {
    const error = validateCategoryName(name, categories);
    if (error) return error;
    applyCategories([...categories, String(name).trim()]);
    return null;
  };
  /** Renames a category and moves its recipes along. @returns an error message, or null. */
  const renameCategory = (oldName, newName) => {
    const error = validateCategoryName(newName, categories, oldName);
    if (error) return error;
    const clean = String(newName).trim();
    // Registry first, so the recipes re-normalized below already accept the new name
    applyCategories(categories.map(cat => cat === oldName ? clean : cat));
    setRecipes(prev => prev.map(r => r.category === oldName ? { ...r, category: clean } : r));
    setSelectedCategory(current => current === oldName ? clean : current);
    return null;
  };
  /** Deletes a category; its recipes move to the default one. @returns an error message, or null. */
  const deleteCategory = name => {
    if (categories.length <= 1) return 'Cần giữ lại ít nhất 1 danh mục.';
    const next = applyCategories(categories.filter(cat => cat !== name));
    const target = fallbackCategory(next);
    setRecipes(prev => prev.map(r => r.category === name ? { ...r, category: target } : r));
    setSelectedCategory(current => current === name ? ALL_CATEGORY : current);
    return null;
  };
  const moveCategory = (name, direction) => {
    const index = categories.indexOf(name);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    applyCategories(next);
  };
  const countRecipesInCategory = name => recipes.filter(r => r.category === name).length;

  // ---------- Meal journal & plan ----------
  /** Logs (past) or plans (future) a dish. @returns the entry, or null when invalid. */
  const addMealEntry = input => {
    const entry = makeMealEntry(input);
    if (entry) setMealPlan(prev => sanitizeMealPlan([...prev, entry]).slice(-MEAL_PLAN_LIMIT));
    return entry;
  };
  const updateMealEntry = (id, patch) => setMealPlan(prev => sanitizeMealPlan(prev.map(entry => entry.id === id ? { ...entry, ...patch, id } : entry)));
  const toggleMealEaten = id => setMealPlan(prev => prev.map(entry => entry.id === id ? { ...entry, eaten: !entry.eaten } : entry));
  const deleteMealEntry = id => {
    const removed = mealPlan.find(entry => entry.id === id) || null;
    setMealPlan(prev => prev.filter(entry => entry.id !== id));
    return removed;
  };
  /** Copies every entry of one day onto another (as a plan, or as eaten for a past day). */
  const copyMealDay = (fromDate, toDate) => {
    const copies = mealPlan.filter(entry => entry.date === fromDate)
      .map(entry => makeMealEntry({ ...entry, recipe: entry.recipeId ? getRecipeById(entry.recipeId) || { id: entry.recipeId, title: entry.title } : null, date: toDate, eaten: undefined }))
      .filter(Boolean);
    if (copies.length) setMealPlan(prev => sanitizeMealPlan([...prev, ...copies]));
    return copies.length;
  };
  /** Puts the ingredients of planned dishes between two days into the shopping list. */
  const addPlanToShopping = (from, to) => {
    const items = plannedIngredients(mealPlan, from, to, getRecipeById, scaleAmount);
    if (!items.length) return { added: 0, merged: 0, dishes: 0 };
    const dishes = mealPlan.filter(entry => !entry.eaten && entry.recipeId && entry.date >= from && entry.date <= to && getRecipeById(entry.recipeId)).length;
    return { ...addToShoppingList(items, 'Kế hoạch bữa ăn'), dishes };
  };

  // ---------- Recipe requests & reports ----------
  /** @returns {{ request } | { errors: string[] }} */
  const submitRecipeRequest = input => {
    const result = buildRequest(input, recipeRequests);
    if (result.request) setRecipeRequests(prev => [result.request, ...prev].slice(0, REQUEST_LIMIT));
    return result;
  };
  const updateRecipeRequest = (id, patch) => setRecipeRequests(prev => prev.map(r => r.id === id ? applyRequestUpdate(r, patch) : r));
  const deleteRecipeRequest = id => setRecipeRequests(prev => prev.filter(r => r.id !== id));

  // ---------- Settings & onboarding ----------
  const updateSettings = patch => setSettings(prev => ({ ...prev, ...patch, ...(patch?.calorieGoal != null ? { calorieGoal: clampGoal(patch.calorieGoal) } : {}) }));
  const completeOnboarding = () => {
    setHasSeenOnboarding(true);
    if (userEmail) safeStorage.setItem(personalKey(STORAGE_KEY_ONBOARDING), 'true');
  };
  const resetOnboarding = () => {
    setHasSeenOnboarding(false);
    if (userEmail) safeStorage.removeItem(personalKey(STORAGE_KEY_ONBOARDING));
  };

  // ---------- Backup / restore / reset ----------
  const exportBackup = () => buildBackup({ recipes: visibleRecipes, favoriteIds, shoppingList, pantryIngredients, settings, cookHistory, mealPlan });
  // Catalog recipes (built-in + admin-managed) stay as they are; the user's own data is replaced as a whole
  const replaceUserData = ({ recipes: customRecipes = [], favoriteIds: favs = [], shoppingList: shopping = [], pantry = [], settings: savedSettings = {}, history = [], mealPlan: plan = [] }) => {
    // Other accounts' personal recipes are never touched by this account's restore/reset
    const mine = r => r.isCustom && (!r.ownerEmail || r.ownerEmail === userEmail);
    const kept = recipes.filter(r => !mine(r));
    const keptIds = new Set(kept.map(r => r.id));
    setRecipes([...customRecipes.filter(r => !keptIds.has(r.id)).map(r => normalizeRecipe({ ...r, ownerEmail: userEmail || undefined })).filter(Boolean), ...kept]);
    setMealPlan(sanitizeMealPlan(plan));
    setFavoriteIds(favs);
    shoppingRef.current = shopping;
    setShoppingList(shopping);
    pantryRef.current = pantry;
    setPantryIngredients(pantry);
    setSettings({ ...DEFAULT_SETTINGS, ...savedSettings, calorieGoal: clampGoal(savedSettings.calorieGoal) });
    setCookHistory(history);
    setCookingSession(null);
    setCookingTimers([]);
  };
  /** Replaces the user's data with a backup already validated by parseBackup(). */
  const restoreBackup = data => replaceUserData(data);
  /** Deletes every personal recipe, list, setting and history entry (the onboarding stays seen). */
  const resetAllData = () => replaceUserData({});

  // Timers with their remaining seconds at the current clock tick
  const timers = useMemo(() => cookingTimers.map(timer => ({ ...timer, secondsLeft: getTimerRemaining(timer, now) })), [cookingTimers, now]);
  const getStepTimer = (recipeId, stepId) => timers.find(timer => timer.id === timerIdFor(recipeId, stepId)) || null;

  return <RecipeContext.Provider value={{
    isHydrated,
    sharedReady,
    timers,
    getStepTimer,
    startStepTimer,
    pauseTimer,
    resumeTimer,
    addTimerMinute,
    clearTimer,
    clearRecipeTimers,
    cookHistory,
    recordCooking,
    deleteHistoryEntry,
    exportBackup,
    restoreBackup,
    resetAllData,
    recipes: visibleRecipes,
    favoriteIds,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    cookingSession,
    activeRecipeForCooking,
    cookingStepIndex,
    startCookingSession,
    setCookingStep,
    setCookingServings,
    endCookingSession,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    findDuplicateRecipe,
    toggleFavorite,
    isFavorite,
    getRecipeById,
    pantryIngredients,
    togglePantryIngredient,
    clearPantry,
    removePantryIngredients,
    shoppingList,
    addToShoppingList,
    toggleShoppingItem,
    updateShoppingItem,
    deleteShoppingItem,
    restoreShoppingItem,
    clearCheckedShoppingItems,
    addCustomShoppingItem,
    settings,
    updateSettings,
    hasSeenOnboarding,
    completeOnboarding,
    resetOnboarding,
    categories,
    addCategory,
    renameCategory,
    deleteCategory,
    moveCategory,
    countRecipesInCategory,
    mealPlan,
    addMealEntry,
    updateMealEntry,
    toggleMealEaten,
    deleteMealEntry,
    copyMealDay,
    addPlanToShopping,
    recipeRequests,
    submitRecipeRequest,
    updateRecipeRequest,
    deleteRecipeRequest
  }}>
      {children}
    </RecipeContext.Provider>;
};
export const useRecipes = () => {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error('useRecipes must be used within RecipeProvider');
  }
  return context;
};
