import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, Vibration } from 'react-native';
import * as Speech from 'expo-speech';
import { INITIAL_RECIPES } from '../data/mockRecipes';
import { makeId, normalizeRecipe, recipeSignature } from '../utils/recipeModel';
import { normalizeVi } from '../utils/text';
import { addAmounts } from '../utils/quantity';
import { showAlert } from '../utils/dialog';

const STORAGE_KEY_RECIPES = '@cookflow_recipes_v2';
const STORAGE_KEY_FAVS = '@cookflow_favs_v2';
const STORAGE_KEY_SHOPPING = '@cookflow_shopping_v2';
const STORAGE_KEY_PANTRY = '@cookflow_pantry_v1';
const STORAGE_KEY_ONBOARDING = '@cookflow_onboarding_v2';
const STORAGE_KEY_SETTINGS = '@cookflow_settings_v1';
const STORAGE_KEY_TIMER = '@cookflow_timer_v1';
const RecipeContext = createContext(undefined);

export const DEFAULT_SETTINGS = { keepAwake: true, timerSound: true, vibration: true };

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

const appendSource = (current, title) => {
  const sources = String(current || '').split(', ').filter(Boolean);
  return sources.includes(title) ? current : [...sources, title].join(', ');
};

/**
 * Timer model (one active timer per app, tied to a recipe step):
 * { recipeId, recipeTitle, stepIndex, stepTitle, durationSeconds, status: 'running'|'paused'|'done',
 *   endAt (epoch ms, while running), remainingSeconds (while paused/done) }
 * Remaining time is derived from the wall clock, so it stays correct after the JS thread
 * is paused in background, after a browser tab is throttled, or after an app restart.
 */
export const getTimerRemaining = (timer, now = Date.now()) => {
  if (!timer) return 0;
  if (timer.status === 'running') return Math.max(0, Math.ceil((timer.endAt - now) / 1000));
  return Math.max(0, timer.remainingSeconds ?? 0);
};

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
  const [isHydrated, setIsHydrated] = useState(false);
  const [cookingTimer, setCookingTimer] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [recipes, setRecipes] = useState(() => INITIAL_RECIPES.map(normalizeRecipe));
  const [favoriteIds, setFavoriteIds] = useState(['rec_01', 'rec_03']);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRecipeForCooking, setActiveRecipeForCooking] = useState(null);
  const [pantryIngredients, setPantryIngredients] = useState([]);
  const [shoppingList, setShoppingList] = useState(DEFAULT_SHOPPING);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  // Latest list for synchronous merges (two adds in the same tick must not drop items)
  const shoppingRef = useRef(shoppingList);
  shoppingRef.current = shoppingList;

  // ---------- Load persisted data once ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [rawRecipes, rawFavs, rawShopping, rawPantry, rawOnboarding, rawSettings, rawTimer] = await Promise.all([
        STORAGE_KEY_RECIPES, STORAGE_KEY_FAVS, STORAGE_KEY_SHOPPING, STORAGE_KEY_PANTRY,
        STORAGE_KEY_ONBOARDING, STORAGE_KEY_SETTINGS, STORAGE_KEY_TIMER
      ].map(key => safeStorage.getItem(key)));
      if (cancelled) return;

      const storedRecipes = parseJson(rawRecipes);
      if (Array.isArray(storedRecipes)) {
        const normalized = storedRecipes.map(normalizeRecipe).filter(Boolean);
        // Built-in recipes added in a newer app version are appended for existing users
        const knownIds = new Set(normalized.map(r => r.id));
        const newSamples = INITIAL_RECIPES.filter(r => !knownIds.has(r.id)).map(normalizeRecipe);
        setRecipes([...normalized, ...newSamples]);
      }
      const storedFavs = parseJson(rawFavs);
      if (Array.isArray(storedFavs)) setFavoriteIds(storedFavs.filter(id => typeof id === 'string'));
      const storedShopping = parseJson(rawShopping);
      if (Array.isArray(storedShopping)) {
        setShoppingList(storedShopping.filter(item => item && typeof item.name === 'string').map(item => ({ ...item, id: item.id || makeId('shop') })));
      }
      const storedPantry = parseJson(rawPantry);
      if (Array.isArray(storedPantry)) setPantryIngredients(storedPantry.filter(item => typeof item === 'string'));
      const storedSettings = parseJson(rawSettings);
      if (storedSettings && typeof storedSettings === 'object') setSettings({ ...DEFAULT_SETTINGS, ...storedSettings });
      const storedTimer = parseJson(rawTimer);
      if (storedTimer?.recipeId && ['running', 'paused', 'done'].includes(storedTimer.status)) {
        // A timer that ran out while the app was closed is restored as finished
        setCookingTimer(storedTimer.status === 'running' && storedTimer.endAt <= Date.now()
          ? { ...storedTimer, status: 'done', remainingSeconds: 0, endAt: undefined, notified: true }
          : storedTimer);
      }
      setHasSeenOnboarding(rawOnboarding === 'true');
      setIsHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Persist after hydration (never overwrite stored data with defaults) ----------
  usePersist(isHydrated, STORAGE_KEY_RECIPES, recipes);
  usePersist(isHydrated, STORAGE_KEY_FAVS, favoriteIds);
  usePersist(isHydrated, STORAGE_KEY_SHOPPING, shoppingList);
  usePersist(isHydrated, STORAGE_KEY_PANTRY, pantryIngredients);
  usePersist(isHydrated, STORAGE_KEY_SETTINGS, settings);
  usePersist(isHydrated, STORAGE_KEY_TIMER, cookingTimer);

  // ---------- Timer clock ----------
  const isTimerRunning = cookingTimer?.status === 'running';
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
    if (!cookingTimer || cookingTimer.status !== 'running' || now < cookingTimer.endAt) return;
    const finished = cookingTimer;
    setCookingTimer(timer => timer && timer.status === 'running'
      ? { ...timer, status: 'done', remainingSeconds: 0, endAt: undefined, notified: true }
      : timer);
    const { vibration, timerSound } = settingsRef.current;
    if (vibration && Platform.OS !== 'web') Vibration.vibrate([0, 500, 300, 500]);
    if (timerSound) {
      Speech.stop();
      Speech.speak(`Hết giờ bước ${finished.stepIndex + 1}: ${finished.stepTitle}`, { language: 'vi-VN' });
    }
    showAlert('⏰ ĐÃ HẾT GIỜ!', `${finished.recipeTitle}\nBước ${finished.stepIndex + 1}: ${finished.stepTitle}`);
  }, [now, cookingTimer]);

  const startStepTimer = useCallback(({ recipe, stepIndex, seconds }) => {
    const step = recipe?.steps?.[stepIndex];
    const duration = Math.max(1, Math.round(seconds || step?.timerSeconds || 0));
    if (!recipe || !step || !duration) return;
    setNow(Date.now());
    setCookingTimer({
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      stepIndex,
      stepTitle: step.title,
      durationSeconds: duration,
      status: 'running',
      endAt: Date.now() + duration * 1000
    });
  }, []);
  const pauseTimer = useCallback(() => {
    setCookingTimer(timer => timer?.status === 'running'
      ? { ...timer, status: 'paused', remainingSeconds: getTimerRemaining(timer), endAt: undefined }
      : timer);
  }, []);
  const resumeTimer = useCallback(() => {
    setNow(Date.now());
    setCookingTimer(timer => timer?.status === 'paused' && timer.remainingSeconds > 0
      ? { ...timer, status: 'running', endAt: Date.now() + timer.remainingSeconds * 1000, remainingSeconds: undefined }
      : timer);
  }, []);
  const addTimerMinute = useCallback(() => {
    setNow(Date.now());
    setCookingTimer(timer => {
      if (!timer) return timer;
      if (timer.status === 'running') return { ...timer, endAt: timer.endAt + 60000, durationSeconds: timer.durationSeconds + 60 };
      if (timer.status === 'done') {
        return { ...timer, status: 'running', endAt: Date.now() + 60000, remainingSeconds: undefined, durationSeconds: 60, notified: false };
      }
      return { ...timer, remainingSeconds: timer.remainingSeconds + 60, durationSeconds: timer.durationSeconds + 60 };
    });
  }, []);
  const clearTimer = useCallback(() => setCookingTimer(null), []);

  // ---------- Recipes ----------
  const addRecipe = newRecipeData => {
    const newRecipe = normalizeRecipe({
      ...newRecipeData,
      id: makeId('custom'),
      isCustom: true,
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
    setRecipes(prev => prev.map(r => r.id === normalized.id ? normalized : r));
    // Keep an open cooking session in sync with the edited content
    setActiveRecipeForCooking(active => active?.id === normalized.id ? normalized : active);
    setCookingTimer(timer => {
      if (timer?.recipeId !== normalized.id) return timer;
      const step = normalized.steps[timer.stepIndex];
      return step ? { ...timer, recipeTitle: normalized.title, stepTitle: step.title } : null;
    });
  };
  const deleteRecipe = id => {
    setRecipes(prev => prev.filter(r => r.id !== id));
    setFavoriteIds(prev => prev.filter(fId => fId !== id));
    setActiveRecipeForCooking(active => active?.id === id ? null : active);
    setCookingTimer(timer => timer?.recipeId === id ? null : timer);
  };
  const findDuplicateRecipe = candidate => {
    const signature = recipeSignature(candidate);
    return recipes.find(r => recipeSignature(r) === signature) || null;
  };
  const toggleFavorite = id => {
    setFavoriteIds(prev => prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]);
  };
  const isFavorite = id => favoriteIds.includes(id);
  const getRecipeById = id => recipes.find(r => r.id === id);

  // ---------- Pantry ----------
  const togglePantryIngredient = ingredientName => {
    const key = normalizeVi(ingredientName);
    if (!key) return;
    setPantryIngredients(prev => prev.some(name => normalizeVi(name) === key)
      ? prev.filter(name => normalizeVi(name) !== key)
      : [...prev, ingredientName.trim()]);
  };
  const clearPantry = () => setPantryIngredients([]);

  // ---------- Shopping list ----------
  /**
   * Adds ingredients, merging with unchecked rows of the same name + unit instead of duplicating.
   * @returns {{ added: number, merged: number }}
   */
  const addToShoppingList = (ingredients, recipeTitle) => {
    const source = recipeTitle || 'Công thức CookFlow';
    const result = { added: 0, merged: 0 };
    const list = [...shoppingRef.current];
    (ingredients || []).forEach(ing => {
      const name = String(ing?.name ?? '').trim();
      if (!name) return;
      const amount = String(ing.amount ?? '').trim() || 'Vừa đủ';
      const unit = String(ing.unit ?? '').trim();
      const idx = list.findIndex(item => !item.checked
        && normalizeVi(item.name) === normalizeVi(name)
        && normalizeVi(item.unit) === normalizeVi(unit));
      if (idx >= 0) {
        const existing = list[idx];
        const summed = addAmounts(existing.amount, amount);
        const sameText = normalizeVi(existing.amount) === normalizeVi(amount);
        if (summed !== null || sameText) {
          list[idx] = { ...existing, amount: summed ?? existing.amount, recipeTitle: appendSource(existing.recipeTitle, source) };
          result.merged += 1;
          return;
        }
      }
      list.unshift({ id: makeId('shop'), name, amount, unit, recipeTitle: source, checked: false });
      result.added += 1;
    });
    shoppingRef.current = list;
    setShoppingList(list);
    return result;
  };
  const toggleShoppingItem = id => {
    setShoppingList(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };
  const deleteShoppingItem = id => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  };
  const clearCheckedShoppingItems = () => {
    setShoppingList(prev => prev.filter(item => !item.checked));
  };
  const addCustomShoppingItem = (name, amount, unit) => {
    if (!String(name || '').trim()) return { added: 0, merged: 0 };
    return addToShoppingList([{ name, amount: String(amount || '').trim() || '1', unit: String(unit || '').trim() || 'phần' }], 'Mua tự do');
  };

  // ---------- Settings & onboarding ----------
  const updateSettings = patch => setSettings(prev => ({ ...prev, ...patch }));
  const completeOnboarding = () => {
    setHasSeenOnboarding(true);
    safeStorage.setItem(STORAGE_KEY_ONBOARDING, 'true');
  };
  const resetOnboarding = () => {
    setHasSeenOnboarding(false);
    safeStorage.removeItem(STORAGE_KEY_ONBOARDING);
  };

  const timerSecondsLeft = useMemo(() => getTimerRemaining(cookingTimer, now), [cookingTimer, now]);

  return <RecipeContext.Provider value={{
    isHydrated,
    cookingTimer,
    timerSecondsLeft,
    startStepTimer,
    pauseTimer,
    resumeTimer,
    addTimerMinute,
    clearTimer,
    recipes,
    favoriteIds,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    activeRecipeForCooking,
    setActiveRecipeForCooking,
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
    shoppingList,
    addToShoppingList,
    toggleShoppingItem,
    deleteShoppingItem,
    clearCheckedShoppingItems,
    addCustomShoppingItem,
    settings,
    updateSettings,
    hasSeenOnboarding,
    completeOnboarding,
    resetOnboarding
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
