import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, Vibration } from 'react-native';
import * as Speech from 'expo-speech';
import { getSessionStepIndex, normalizeRecipe, recipeSignature, relocateTimerStep } from '../utils/recipeModel';
import { normalizeVi } from '../utils/text';
import { normalizeUnit } from '../utils/units';
import { MAX_TIMERS, finishDueTimers, getTimerRemaining, restoreTimers, timerIdFor } from '../utils/timers';
import { cancelTimerNotification, initTimerNotifications, scheduleTimerNotification } from '../utils/notifications';
import { buildBackup } from '../utils/backup';
import { confirmAction, showAlert } from '../utils/dialog';
import { SERVINGS_MAX, SERVINGS_MIN } from '../constants/limits';
import { ALL_CATEGORY, DEFAULT_CATEGORIES, setRecipeCategories, validateCategoryName } from '../utils/categories';
import { makeMealEntry, sanitizeMealPlan } from '../utils/mealPlan';
import { buildRequest, sanitizeRequests } from '../utils/recipeRequests';
import { sanitizeHistory } from '../utils/history';
import { CALORIE_GOAL_MAX, CALORIE_GOAL_MIN, DEFAULT_CALORIE_GOAL } from '../utils/nutrition';
import { useAuth } from './AuthContext';
import * as recipesApi from '../services/api/recipes';
import * as shoppingApi from '../services/api/shopping';
import * as pantryApi from '../services/api/pantry';
import * as historyApi from '../services/api/history';
import * as mealPlanApi from '../services/api/mealPlan';
import * as requestsApi from '../services/api/requests';
import * as usersApi from '../services/api/users';

// Recipes, categories, favorites, shopping list, pantry, settings, cooking history, meal plan and
// requests live on the CookFlow API (one account = the same data on every device).
// Running timers and the cooking session stay on this device (they follow the phone's clock).
const STORAGE_KEY_TIMERS = '@cookflow_timers_v2';
const STORAGE_KEY_SESSION = '@cookflow_cooking_session_v1';
const RecipeContext = createContext(undefined);

// assumeStaples: basic seasonings count as "on hand"; autoStockPantry: bought items go to the pantry;
// timerNotifications: system notification when a timer ends in background; allergies: allergen ids
export const DEFAULT_SETTINGS = {
  keepAwake: true, timerSound: true, vibration: true, timerNotifications: true,
  assumeStaples: true, autoStockPantry: true, allergies: [], hideAllergenRecipes: true,
  calorieGoal: DEFAULT_CALORIE_GOAL // kcal per day, shown on the meal plan
};
const clampGoal = value => Math.min(CALORIE_GOAL_MAX, Math.max(CALORIE_GOAL_MIN, Math.round(Number(value)) || DEFAULT_CALORIE_GOAL));

// Safe storage helper (device-only data: timers, cooking session, Gemini key)
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

const clampServings = value => Math.min(SERVINGS_MAX, Math.max(SERVINGS_MIN, Math.round(Number(value)) || SERVINGS_MIN));

const usePersist = (isHydrated, key, value) => {
  useEffect(() => {
    if (!isHydrated || !key) return;
    if (value == null) safeStorage.removeItem(key);
    else safeStorage.setItem(key, JSON.stringify(value));
  }, [isHydrated, key, value]);
};

const toSettings = settings => ({
  ...DEFAULT_SETTINGS,
  ...(settings || {}),
  allergies: Array.isArray(settings?.allergies) ? settings.allergies : [],
  calorieGoal: clampGoal(settings?.calorieGoal)
});

/** Shows the server's message (already in Vietnamese) for a failed action. */
const report = (title, error) => showAlert(title, error?.message || 'Vui lòng thử lại.');

export const RecipeProvider = ({
  children
}) => {
  const [cookingTimers, setCookingTimers] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [recipes, setRecipes] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const [searchQuery, setSearchQuery] = useState('');
  const [cookingSession, setCookingSession] = useState(null);
  const [pantryIngredients, setPantryIngredients] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [cookHistory, setCookHistory] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  // Server records of the categories ({ id, name, recipeCount }), to address them by id
  const [categoryRecords, setCategoryRecords] = useState([]);
  const [mealPlan, setMealPlan] = useState([]);
  const [recipeRequests, setRecipeRequests] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  // Latest lists for synchronous reads inside handlers
  const shoppingRef = useRef(shoppingList);
  shoppingRef.current = shoppingList;
  const pantryRef = useRef(pantryIngredients);
  pantryRef.current = pantryIngredients;
  const recipesRef = useRef(recipes);
  recipesRef.current = recipes;
  const mealPlanRef = useRef(mealPlan);
  mealPlanRef.current = mealPlan;
  const requestsRef = useRef(recipeRequests);
  requestsRef.current = recipeRequests;

  // ---------- Who is signed in: everything is loaded for that account ----------
  const { user } = useAuth();
  const userId = user?.id || null;
  const isAdmin = user?.role === 'admin';
  const [loadedFor, setLoadedFor] = useState(null);

  const applyCategoryList = useCallback(data => {
    // Registry first: normalizeRecipe() maps recipes onto the current category names
    const names = setRecipeCategories(data.names);
    setCategories(names);
    setCategoryRecords(data.categories || []);
    return names;
  }, []);
  const refreshCategories = useCallback(async () => applyCategoryList(await recipesApi.fetchCategories()), [applyCategoryList]);
  const refreshShopping = useCallback(async () => {
    const list = await shoppingApi.fetchShoppingList();
    shoppingRef.current = list;
    setShoppingList(list);
  }, []);

  useEffect(() => {
    if (!userId) {
      // Signed out: nothing of the previous account stays on screen
      setLoadedFor(null);
      setRecipes([]);
      setFavoriteIds([]);
      setShoppingList([]);
      setPantryIngredients([]);
      setCookHistory([]);
      setMealPlan([]);
      setRecipeRequests([]);
      setSettings(DEFAULT_SETTINGS);
      setCookingTimers([]);
      setCookingSession(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoadError('');
      try {
        const categoryData = await recipesApi.fetchCategories();
        const [serverRecipes, favs, shopping, pantry, settingsData, history, meals, requests, rawTimers, rawSession] = await Promise.all([
          recipesApi.fetchAllRecipes(),
          recipesApi.fetchFavoriteIds(),
          shoppingApi.fetchShoppingList(),
          pantryApi.fetchPantry(),
          usersApi.fetchSettings(),
          historyApi.fetchHistory(),
          mealPlanApi.fetchMealPlan(),
          requestsApi.fetchRequests(isAdmin),
          safeStorage.getItem(`${STORAGE_KEY_TIMERS}::${userId}`),
          safeStorage.getItem(`${STORAGE_KEY_SESSION}::${userId}`)
        ]);
        if (cancelled) return;
        applyCategoryList(categoryData);
        const loadedRecipes = serverRecipes.map(normalizeRecipe).filter(Boolean);
        recipesRef.current = loadedRecipes;
        setRecipes(loadedRecipes);
        setFavoriteIds(favs);
        shoppingRef.current = shopping;
        setShoppingList(shopping);
        pantryRef.current = pantry;
        setPantryIngredients(pantry);
        setSettings(toSettings(settingsData.settings));
        setHasSeenOnboarding(!!settingsData.hasSeenOnboarding);
        setCookHistory(sanitizeHistory(history));
        setMealPlan(sanitizeMealPlan(meals));
        setRecipeRequests(sanitizeRequests(requests));
        // Device-only state; timers / session of recipes that no longer exist are dropped
        const knownRecipeIds = new Set(loadedRecipes.map(r => r.id));
        setCookingTimers(restoreTimers(parseJson(rawTimers)).filter(timer => knownRecipeIds.has(timer.recipeId)));
        const storedSession = parseJson(rawSession);
        setCookingSession(storedSession?.recipeId && knownRecipeIds.has(storedSession.recipeId)
          ? { ...storedSession, servings: clampServings(storedSession.servings) }
          : null);
        setLoadedFor(userId);
      } catch (error) {
        if (cancelled) return;
        setLoadError(error.message);
        confirmAction({
          title: 'Không tải được dữ liệu',
          message: error.message,
          confirmText: 'Thử lại',
          cancelText: 'Đóng',
          onConfirm: () => setReloadKey(key => key + 1)
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, isAdmin, reloadKey, applyCategoryList]);

  /** Loads everything again from the server (after a restore, or to retry). */
  const reloadData = useCallback(() => setReloadKey(key => key + 1), []);

  // True once the signed-in account's own data is on screen (never while switching accounts)
  const isHydrated = !!userId && loadedFor === userId;

  // ---------- Device-only persistence (per account) ----------
  usePersist(isHydrated, userId && `${STORAGE_KEY_TIMERS}::${userId}`, cookingTimers);
  usePersist(isHydrated, userId && `${STORAGE_KEY_SESSION}::${userId}`, cookingSession);

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
  /**
   * Saves a personal recipe, or a catalog recipe ({ system: true }, admin only).
   * isPublic shares a personal recipe with other users. @returns the saved recipe, or null on error
   */
  const addRecipe = async (newRecipeData, { system = false, isPublic = false } = {}) => {
    try {
      const saved = normalizeRecipe(await recipesApi.createRecipe(newRecipeData, { system, isPublic }));
      setRecipes(prev => [saved, ...prev]);
      return saved;
    } catch (error) {
      report('Chưa lưu được công thức', error);
      return null;
    }
  };
  /** @returns the saved recipe, or null on error */
  const updateRecipe = async updatedRecipe => {
    const previous = recipesRef.current.find(r => r.id === updatedRecipe.id);
    try {
      const normalized = normalizeRecipe(await recipesApi.updateRecipe(updatedRecipe));
      setRecipes(prev => prev.map(r => r.id === normalized.id ? normalized : r));
      // The cooking session reads the live recipe and follows its step by id
      // Each timer follows its step by id (and stops when that step was deleted)
      setCookingTimers(prev => prev
        .map(timer => relocateTimerStep(timer, previous, normalized))
        .filter(Boolean)
        .map(timer => ({ ...timer, id: timerIdFor(timer.recipeId, timer.stepId) }))
        .filter((timer, idx, list) => list.findIndex(other => other.id === timer.id) === idx));
      return normalized;
    } catch (error) {
      report('Chưa cập nhật được công thức', error);
      return null;
    }
  };
  /** @returns true when deleted */
  const deleteRecipe = async id => {
    try {
      await recipesApi.deleteRecipe(id);
    } catch (error) {
      report('Chưa xóa được công thức', error);
      return false;
    }
    setRecipes(prev => prev.filter(r => r.id !== id));
    setFavoriteIds(prev => prev.filter(fId => fId !== id));
    setCookingSession(session => session?.recipeId === id ? null : session);
    setCookingTimers(prev => prev.filter(timer => timer.recipeId !== id));
    return true;
  };
  const findDuplicateRecipe = candidate => {
    const signature = recipeSignature(candidate);
    return recipes.find(r => recipeSignature(r) === signature) || null;
  };
  const flipFavorite = id => setFavoriteIds(prev => prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]);
  const toggleFavorite = id => {
    flipFavorite(id); // instant feedback; the server's answer wins
    recipesApi.toggleFavorite(id)
      .then(({ isFavorite: fav }) => setFavoriteIds(prev => fav ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter(fId => fId !== id)))
      .catch(error => {
        flipFavorite(id);
        report('Chưa cập nhật được yêu thích', error);
      });
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
  /** Logs a finished dish (with optional 1–5 rating and note). @returns the entry, or null */
  const recordCooking = async ({ recipe, servings, startedAt, rating, note }) => {
    if (!recipe?.id) return null;
    try {
      const entry = await historyApi.addHistoryEntry({ recipeId: recipe.id, servings, startedAt, rating, note });
      setCookHistory(prev => sanitizeHistory([entry, ...prev]));
      return entry;
    } catch (error) {
      report('Chưa lưu được lịch sử nấu', error);
      return null;
    }
  };
  const deleteHistoryEntry = id => {
    const before = cookHistory;
    setCookHistory(prev => prev.filter(entry => entry.id !== id));
    historyApi.deleteHistoryEntry(id).catch(error => {
      setCookHistory(before);
      report('Chưa xóa được', error);
    });
  };

  // ---------- Pantry ----------
  const setPantry = list => {
    pantryRef.current = list;
    setPantryIngredients(list);
  };
  /** Runs a pantry call with an optimistic list; the server's list wins, errors roll back. */
  const syncPantry = (optimistic, call) => {
    const before = pantryRef.current;
    setPantry(optimistic);
    call().then(setPantry).catch(error => {
      setPantry(before);
      report('Chưa cập nhật được tủ lạnh', error);
    });
  };
  const togglePantryIngredient = ingredientName => {
    const key = normalizeVi(ingredientName);
    if (!key) return;
    const current = pantryRef.current;
    const optimistic = current.some(name => normalizeVi(name) === key)
      ? current.filter(name => normalizeVi(name) !== key)
      : [...current, ingredientName.trim()];
    syncPantry(optimistic, () => pantryApi.togglePantryIngredient(ingredientName.trim()));
  };
  const clearPantry = () => syncPantry([], () => pantryApi.clearPantry());
  /** Removes several pantry entries at once (e.g. ingredients used up by a cooked dish). */
  const removePantryIngredients = names => {
    const keys = new Set((names || []).map(normalizeVi));
    if (!keys.size) return;
    syncPantry(pantryRef.current.filter(item => !keys.has(normalizeVi(item))), () => pantryApi.removePantryIngredients(names));
  };

  // ---------- Shopping list ----------
  // Merging rows with the same name (g + kg, ml + lít, "Vừa đủ") is done by the server.
  const setShopping = updater => {
    const next = typeof updater === 'function' ? updater(shoppingRef.current) : updater;
    shoppingRef.current = next;
    setShoppingList(next);
  };
  const replaceRow = (id, row) => setShopping(list => list.map(item => item.id === id ? row : item));
  /** @returns {Promise<{ added, merged } | null>} null on error */
  const addToShoppingList = async (ingredients, recipeTitle) => {
    const items = (ingredients || [])
      .filter(item => String(item?.name ?? '').trim())
      .map(item => ({ name: item.name, amount: item.amount, unit: item.unit }));
    if (!items.length) return { added: 0, merged: 0 };
    try {
      const result = await shoppingApi.addIngredientsToShopping(items, recipeTitle || 'Công thức CookFlow');
      await refreshShopping();
      return { added: result.added, merged: result.merged };
    } catch (error) {
      report('Chưa thêm được vào danh sách đi chợ', error);
      return null;
    }
  };
  /**
   * Marks a row bought / not bought. With autoStockPantry the server puts the item in the pantry
   * (and takes it back out when un-ticked by mistake).
   */
  const toggleShoppingItem = id => {
    const item = shoppingRef.current.find(row => row.id === id);
    if (!item) return;
    const checked = !item.checked;
    replaceRow(id, { ...item, checked });
    shoppingApi.setShoppingItemChecked(id, checked)
      .then(({ item: saved, pantry }) => {
        replaceRow(id, saved);
        if (pantry) setPantry(pantry);
      })
      .catch(error => {
        replaceRow(id, item);
        report('Chưa cập nhật được', error);
      });
  };
  /** Edits a row's name / amount / unit. @returns false when the name is empty. */
  const updateShoppingItem = (id, patch) => {
    const name = String(patch?.name ?? '').trim();
    if (!name) return false;
    const item = shoppingRef.current.find(row => row.id === id);
    if (!item) return false;
    const amount = String(patch?.amount ?? '').trim() || 'Vừa đủ';
    const unit = normalizeUnit(patch?.unit);
    replaceRow(id, { ...item, name, amount, unit });
    shoppingApi.updateShoppingItem(id, { name, amount, unit })
      .then(saved => replaceRow(id, saved))
      .catch(error => {
        replaceRow(id, item);
        report('Chưa lưu được', error);
      });
    return true;
  };
  /** Removes a row and returns what is needed to undo it: { item, index } (null if not found). */
  const deleteShoppingItem = id => {
    const index = shoppingRef.current.findIndex(item => item.id === id);
    if (index < 0) return null;
    const removed = { item: shoppingRef.current[index], index };
    setShopping(list => list.filter(item => item.id !== id));
    shoppingApi.deleteShoppingItem(id).catch(error => {
      setShopping(list => list.some(item => item.id === id) ? list : [...list.slice(0, index), removed.item, ...list.slice(index)]);
      report('Chưa xóa được', error);
    });
    return removed;
  };
  const restoreShoppingItem = removed => {
    if (!removed?.item) return;
    const tempId = removed.item.id;
    setShopping(list => {
      if (list.some(item => item.id === tempId)) return list;
      const next = [...list];
      next.splice(Math.min(removed.index, next.length), 0, removed.item);
      return next;
    });
    // The server gives the row back with a new id
    shoppingApi.restoreShoppingItem(removed.item)
      .then(saved => replaceRow(tempId, saved))
      .catch(error => {
        setShopping(list => list.filter(item => item.id !== tempId));
        report('Chưa hoàn tác được', error);
      });
  };
  const clearCheckedShoppingItems = () => {
    const before = shoppingRef.current;
    setShopping(list => list.filter(item => !item.checked));
    shoppingApi.clearCheckedShoppingItems().catch(error => {
      setShopping(before);
      report('Chưa xóa được', error);
    });
  };
  /** @returns {Promise<{ added, merged } | null>} null on error */
  const addCustomShoppingItem = async (name, amount, unit) => {
    if (!String(name || '').trim()) return { added: 0, merged: 0 };
    try {
      const result = await shoppingApi.addCustomShoppingItem(String(name).trim(), String(amount || '').trim() || '1', String(unit || '').trim() || 'phần');
      await refreshShopping();
      return { added: result.added, merged: result.merged };
    } catch (error) {
      report('Chưa thêm được', error);
      return null;
    }
  };

  // ---------- Categories (admin) ----------
  const categoryIdOf = name => categoryRecords.find(cat => cat.name === name)?.id;
  /** @returns an error message, or null when added. */
  const addCategory = async name => {
    const error = validateCategoryName(name, categories);
    if (error) return error;
    try {
      await recipesApi.createCategory(String(name).trim());
      await refreshCategories();
      return null;
    } catch (e) {
      return e.message;
    }
  };
  /** Renames a category and moves its recipes along. @returns an error message, or null. */
  const renameCategory = async (oldName, newName) => {
    const error = validateCategoryName(newName, categories, oldName);
    if (error) return error;
    const clean = String(newName).trim();
    try {
      await recipesApi.renameCategory(categoryIdOf(oldName), clean);
      // Registry first, so the recipes re-normalized below already accept the new name
      await refreshCategories();
    } catch (e) {
      return e.message;
    }
    setRecipes(prev => prev.map(r => r.category === oldName ? { ...r, category: clean } : r));
    setSelectedCategory(current => current === oldName ? clean : current);
    return null;
  };
  /** Deletes a category; its recipes move to the default one. @returns an error message, or null. */
  const deleteCategory = async name => {
    if (categories.length <= 1) return 'Cần giữ lại ít nhất 1 danh mục.';
    let target;
    try {
      const result = await recipesApi.deleteCategory(categoryIdOf(name));
      target = result.fallbackCategory?.name;
      await refreshCategories();
    } catch (e) {
      return e.message;
    }
    if (target) setRecipes(prev => prev.map(r => r.category === name ? { ...r, category: target } : r));
    setSelectedCategory(current => current === name ? ALL_CATEGORY : current);
    return null;
  };
  const moveCategory = (name, direction) => {
    const index = categories.indexOf(name);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    setCategories(setRecipeCategories(next));
    recipesApi.reorderCategories(next).then(applyCategoryList).catch(error => {
      refreshCategories().catch(() => {});
      report('Chưa đổi được thứ tự', error);
    });
  };
  const countRecipesInCategory = name => recipes.filter(r => r.category === name).length;

  // ---------- Meal journal & plan ----------
  const setMeals = updater => {
    const next = typeof updater === 'function' ? updater(mealPlanRef.current) : updater;
    mealPlanRef.current = next;
    setMealPlan(next);
  };
  /**
   * Logs (past) or plans (future) a dish.
   * @returns the entry; null when the input is invalid; false when the server refused (already reported)
   */
  const addMealEntry = async input => {
    const draft = makeMealEntry(input);
    if (!draft) return null;
    try {
      const entry = await mealPlanApi.createMealEntry({
        date: draft.date,
        slot: draft.slot,
        recipeId: input.recipe?.id || null,
        title: draft.title,
        calories: draft.calories,
        servings: draft.servings,
        eaten: typeof input.eaten === 'boolean' ? input.eaten : undefined,
        note: draft.note
      });
      setMeals(prev => sanitizeMealPlan([...prev, entry]));
      return entry;
    } catch (error) {
      report('Chưa thêm được món', error);
      return false;
    }
  };
  /** Optimistic change of one entry; the server's version wins, errors roll back. */
  const patchMeal = (id, patch) => {
    const before = mealPlanRef.current.find(entry => entry.id === id);
    if (!before) return;
    setMeals(prev => sanitizeMealPlan(prev.map(entry => entry.id === id ? { ...entry, ...patch, id } : entry)));
    mealPlanApi.updateMealEntry(id, patch)
      .then(saved => setMeals(prev => sanitizeMealPlan(prev.map(entry => entry.id === id ? saved : entry))))
      .catch(error => {
        setMeals(prev => sanitizeMealPlan(prev.map(entry => entry.id === id ? before : entry)));
        report('Chưa cập nhật được', error);
      });
  };
  const updateMealEntry = (id, patch) => patchMeal(id, patch);
  const toggleMealEaten = id => {
    const entry = mealPlanRef.current.find(item => item.id === id);
    if (entry) patchMeal(id, { eaten: !entry.eaten });
  };
  const deleteMealEntry = id => {
    const removed = mealPlanRef.current.find(entry => entry.id === id) || null;
    if (!removed) return null;
    setMeals(prev => prev.filter(entry => entry.id !== id));
    mealPlanApi.deleteMealEntry(id).catch(error => {
      setMeals(prev => sanitizeMealPlan([...prev, removed]));
      report('Chưa xóa được', error);
    });
    return removed;
  };
  /** Copies every entry of one day onto another. @returns the number copied, or null on error */
  const copyMealDay = async (fromDate, toDate) => {
    try {
      const copies = await mealPlanApi.copyMealDay(fromDate, toDate);
      if (copies.length) setMeals(prev => sanitizeMealPlan([...prev, ...copies]));
      return copies.length;
    } catch (error) {
      report('Chưa sao chép được', error);
      return null;
    }
  };
  /** Puts the ingredients of planned dishes between two days into the shopping list. @returns result or null */
  const addPlanToShopping = async (from, to) => {
    try {
      const result = await mealPlanApi.addPlanToShopping(from, to);
      if (result.dishes) await refreshShopping();
      return { added: result.added, merged: result.merged, dishes: result.dishes };
    } catch (error) {
      report('Chưa thêm được vào danh sách đi chợ', error);
      return null;
    }
  };

  // ---------- Recipe requests & reports ----------
  /** @returns {Promise<{ request } | { errors: string[] }>} */
  const submitRecipeRequest = async input => {
    // Same checks as the server, for an instant answer
    const result = buildRequest(input, requestsRef.current);
    if (result.errors) return result;
    try {
      const request = await requestsApi.createRequest({
        type: result.request.type,
        title: String(input.title ?? '').trim(),
        details: result.request.details,
        recipeId: input.recipe?.id || null
      });
      setRecipeRequests(prev => [request, ...prev]);
      return { request };
    } catch (error) {
      return { errors: (error.errors?.length ? error.errors.map(e => e.message) : [error.message]) };
    }
  };
  const updateRecipeRequest = (id, patch) => {
    const before = requestsRef.current.find(r => r.id === id);
    if (!before) return;
    setRecipeRequests(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    requestsApi.updateRequest(id, patch)
      .then(saved => setRecipeRequests(prev => prev.map(r => r.id === id ? saved : r)))
      .catch(error => {
        setRecipeRequests(prev => prev.map(r => r.id === id ? before : r));
        report('Chưa cập nhật được yêu cầu', error);
      });
  };
  const deleteRecipeRequest = id => {
    const before = requestsRef.current;
    setRecipeRequests(prev => prev.filter(r => r.id !== id));
    requestsApi.deleteRequest(id).catch(error => {
      setRecipeRequests(before);
      report('Chưa xóa được yêu cầu', error);
    });
  };

  // ---------- Settings & onboarding ----------
  const saveSettings = patch => usersApi.updateSettings(patch)
    .then(data => {
      setSettings(toSettings(data.settings));
      setHasSeenOnboarding(!!data.hasSeenOnboarding);
    })
    .catch(error => report('Chưa lưu được cài đặt', error));
  const updateSettings = patch => {
    setSettings(prev => ({ ...prev, ...patch, ...(patch?.calorieGoal != null ? { calorieGoal: clampGoal(patch.calorieGoal) } : {}) }));
    saveSettings(patch);
  };
  const completeOnboarding = () => {
    setHasSeenOnboarding(true);
    saveSettings({ hasSeenOnboarding: true });
  };
  const resetOnboarding = () => {
    setHasSeenOnboarding(false);
    saveSettings({ hasSeenOnboarding: false });
  };

  // ---------- Backup / restore / reset ----------
  // The file format is unchanged; only the user's own recipes go into it
  const exportBackup = () => buildBackup({
    recipes: recipes.filter(r => r.isCustom && r.isOwner),
    favoriteIds, shoppingList, pantryIngredients, settings, cookHistory, mealPlan
  });
  /** Replaces the account's data with a backup already validated by parseBackup(). @returns summary or null */
  const restoreBackup = async data => {
    try {
      const summary = await usersApi.importData({ format: 'cookflow-backup', version: 1, data });
      setCookingSession(null);
      setCookingTimers([]);
      reloadData();
      return summary;
    } catch (error) {
      report('Không khôi phục được', error);
      return null;
    }
  };
  /** Deletes every personal recipe, list, setting and history entry (the onboarding stays seen). @returns true when done */
  const resetAllData = async () => {
    try {
      await usersApi.resetData();
      setCookingSession(null);
      setCookingTimers([]);
      reloadData();
      return true;
    } catch (error) {
      report('Không xóa được dữ liệu', error);
      return false;
    }
  };

  // Timers with their remaining seconds at the current clock tick
  const timers = useMemo(() => cookingTimers.map(timer => ({ ...timer, secondsLeft: getTimerRemaining(timer, now) })), [cookingTimers, now]);
  const getStepTimer = (recipeId, stepId) => timers.find(timer => timer.id === timerIdFor(recipeId, stepId)) || null;

  return <RecipeContext.Provider value={{
    isHydrated,
    sharedReady: isHydrated,
    loadError,
    reloadData,
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
    recipes,
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
