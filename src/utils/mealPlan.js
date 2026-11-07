// Meal journal + plan: one entry per dish eaten (past) or planned (future) on a day and meal slot.
// { id, date: 'YYYY-MM-DD', slot, recipeId | null, title, calories (kcal per portion | null),
//   servings (portions cooked, for shopping), portionsEaten (portions the user ate, for kcal),
//   eaten: boolean, note, createdAt }
// Days are local calendar days, so "hôm nay" always matches the phone's clock.
import { makeId } from './recipeModel';
import { normalizeCalories } from './nutrition';

export const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Bữa sáng', icon: '🌅' },
  { id: 'lunch', label: 'Bữa trưa', icon: '☀️' },
  { id: 'dinner', label: 'Bữa tối', icon: '🌙' },
  { id: 'snack', label: 'Ăn vặt', icon: '🍪' }
];
const SLOT_IDS = MEAL_SLOTS.map(slot => slot.id);
export const MEAL_PLAN_LIMIT = 1000;
export const PLAN_DAYS_AHEAD = 60;
// Portions the user ate of one dish: 0.25 – 10 in steps of 0.25 (same rule as the API)
export const PORTIONS_MIN = 0.25;
export const PORTIONS_MAX = 10;
export const PORTION_OPTIONS = [0.5, 1, 1.5, 2, 3];
export const clampPortions = value => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(PORTIONS_MAX, Math.max(PORTIONS_MIN, Math.round(n * 4) / 4));
};
/** "1", "1,5", "0,25" (Vietnamese decimal comma). */
export const formatPortions = value => String(clampPortions(value)).replace('.', ',');
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const pad = n => String(n).padStart(2, '0');
export const dateKey = (value = Date.now()) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const isDateKey = key => typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(parseDateKey(key).getTime());
/** Local midnight of a 'YYYY-MM-DD' key. */
export const parseDateKey = key => {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const addDays = (key, days) => {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
};
export const compareDateKeys = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
/** The 7 day keys (Monday → Sunday) of the week containing `key`. */
export const weekOf = key => {
  const d = parseDateKey(key);
  const mondayOffset = (d.getDay() + 6) % 7;
  const monday = addDays(key, -mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
};
export const weekdayLabel = key => WEEKDAYS[parseDateKey(key).getDay()];
export const shortDate = key => {
  const d = parseDateKey(key);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};
/** "Hôm nay", "Hôm qua", "Ngày mai" or "T4, 05/11". */
export const dayTitle = (key, today = dateKey()) => {
  if (key === today) return 'Hôm nay';
  if (key === addDays(today, -1)) return 'Hôm qua';
  if (key === addDays(today, 1)) return 'Ngày mai';
  return `${weekdayLabel(key)}, ${shortDate(key)}`;
};
/** 'past' | 'today' | 'future' relative to today. */
export const dayKind = (key, today = dateKey()) => key === today ? 'today' : key < today ? 'past' : 'future';

/**
 * Builds a clean entry. A recipe gives the title and kcal; a free meal ("Phở ngoài hàng")
 * needs its own title. Past days are logged as eaten; future days are a plan.
 */
export const makeMealEntry = ({ date, slot, recipe, title, calories, servings, portionsEaten, eaten, note }, today = dateKey()) => {
  if (!isDateKey(date)) return null;
  const cleanTitle = String(recipe?.title ?? title ?? '').trim();
  if (!cleanTitle) return null;
  return {
    id: makeId('meal'),
    date,
    slot: SLOT_IDS.includes(slot) ? slot : 'lunch',
    recipeId: recipe?.id || null,
    title: cleanTitle.slice(0, 80),
    // Recipe dishes follow the live recipe's kcal (null here) unless a value is given
    calories: normalizeCalories(calories),
    servings: Math.min(50, Math.max(1, Math.round(Number(servings) || recipe?.servings || 1))),
    portionsEaten: clampPortions(portionsEaten ?? 1),
    eaten: typeof eaten === 'boolean' ? eaten : date < today,
    note: String(note ?? '').trim().slice(0, 120),
    createdAt: Date.now()
  };
};

export const sanitizeMealPlan = list => (Array.isArray(list) ? list : [])
  .filter(entry => entry && isDateKey(entry.date) && String(entry.title ?? '').trim())
  .map(entry => ({
    id: typeof entry.id === 'string' ? entry.id : makeId('meal'),
    date: entry.date,
    slot: SLOT_IDS.includes(entry.slot) ? entry.slot : 'lunch',
    recipeId: typeof entry.recipeId === 'string' ? entry.recipeId : null,
    title: String(entry.title).trim().slice(0, 80),
    calories: normalizeCalories(entry.calories),
    servings: Math.min(50, Math.max(1, Math.round(Number(entry.servings) || 1))),
    // entries saved before this field existed count as 1 portion
    portionsEaten: clampPortions(entry.portionsEaten ?? 1),
    eaten: !!entry.eaten,
    note: String(entry.note ?? '').slice(0, 120),
    createdAt: Number(entry.createdAt) || 0
  }))
  .sort((a, b) => compareDateKeys(a.date, b.date) || SLOT_IDS.indexOf(a.slot) - SLOT_IDS.indexOf(b.slot) || a.createdAt - b.createdAt)
  .slice(-MEAL_PLAN_LIMIT);

/** Slot a finished cooking session falls into, from the hour it ended. */
export const slotForTime = time => {
  const hour = new Date(time).getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
};

/**
 * Everything on one day: journal/plan entries plus dishes finished in Cooking Mode (read-only,
 * flagged `fromHistory`). kcal comes from the entry, else from the live recipe.
 */
export const mealsForDay = (plan, history, date, getRecipe = () => null) => {
  const entries = (plan || []).filter(entry => entry.date === date).map(entry => ({
    ...entry,
    calories: entry.calories ?? getRecipe(entry.recipeId)?.calories ?? null
  }));
  // A dish cooked and also logged by hand for the same slot is shown once
  const cooked = (history || []).filter(item => dateKey(item.finishedAt) === date).map(item => ({
    id: `hist_${item.id}`,
    date,
    slot: slotForTime(item.finishedAt),
    recipeId: item.recipeId,
    title: item.recipeTitle,
    calories: getRecipe(item.recipeId)?.calories ?? null,
    servings: item.servings,
    // a dish cooked in Cooking Mode counts one portion for the user
    portionsEaten: 1,
    eaten: true,
    note: item.note || '',
    rating: item.rating,
    fromHistory: true
  })).filter(item => !entries.some(entry => entry.recipeId && entry.recipeId === item.recipeId && entry.slot === item.slot && entry.eaten));
  return [...entries, ...cooked].sort((a, b) => SLOT_IDS.indexOf(a.slot) - SLOT_IDS.indexOf(b.slot));
};

/** kcal the user gets from one dish: kcal per portion × portions eaten (cooked portions do not count). */
export const mealKcal = meal => (meal?.calories || 0) * clampPortions(meal?.portionsEaten ?? 1);

/** { eaten, planned } kcal for one person: each dish counts the portions the user ate. */
export const dayCalories = meals => (meals || []).reduce((sum, meal) => {
  const kcal = mealKcal(meal);
  if (meal.eaten) sum.eaten += kcal;
  else sum.planned += kcal;
  return sum;
}, { eaten: 0, planned: 0 });

/**
 * Ingredients for the planned (not yet eaten) recipe dishes between two days, scaled to each
 * entry's portions — ready for addToShoppingList(). Rows of the same recipe stay separate here;
 * the shopping list merges them.
 */
export const plannedIngredients = (plan, from, to, getRecipe, scale) => (plan || [])
  .filter(entry => !entry.eaten && entry.recipeId && entry.date >= from && entry.date <= to)
  .flatMap(entry => {
    const recipe = getRecipe(entry.recipeId);
    if (!recipe) return [];
    const ratio = entry.servings / Math.max(1, recipe.servings);
    return recipe.ingredients.map(item => ({ ...item, amount: scale(item.amount, ratio) }));
  });

/** Days in [from, to] where something was eaten, newest first — the journal's streak/summary. */
export const loggedDays = (plan, history, from, to) => {
  const days = new Set();
  (plan || []).forEach(entry => { if (entry.eaten && entry.date >= from && entry.date <= to) days.add(entry.date); });
  (history || []).forEach(item => { const key = dateKey(item.finishedAt); if (key >= from && key <= to) days.add(key); });
  return [...days].sort().reverse();
};
