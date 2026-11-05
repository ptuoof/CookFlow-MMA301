// Meal journal / plan on the CookFlow API. Entries:
// { id, date: 'YYYY-MM-DD', slot, recipeId|null, title, calories|null, servings, eaten, note, createdAt (ms) }
// `today` is the phone's calendar day: the server uses it to decide "eaten" for past days.
import { apiRequest } from './client';
import { dateKey } from '../../utils/mealPlan';

const BASE = '/api/meal-plans';

export const fetchMealPlan = async ({ from, to } = {}) => (await apiRequest(BASE, { query: { from, to } })).entries;

export const createMealEntry = async ({ date, slot, recipeId, title, calories, servings, eaten, note }) =>
  (await apiRequest(BASE, { method: 'POST', body: { date, slot, recipeId, title, calories, servings, eaten, note, today: dateKey() } })).entry;

export const updateMealEntry = async (id, patch) => (await apiRequest(`${BASE}/${id}`, { method: 'PATCH', body: patch })).entry;

export const deleteMealEntry = id => apiRequest(`${BASE}/${id}`, { method: 'DELETE' });

/** @returns the copied entries */
export const copyMealDay = async (fromDate, toDate) =>
  (await apiRequest(`${BASE}/copy-day`, { method: 'POST', body: { fromDate, toDate, today: dateKey() } })).entries;

/** @returns {{ added, merged, dishes }} */
export const addPlanToShopping = (from, to) => apiRequest(`${BASE}/to-shopping`, { method: 'POST', body: { from, to } });
