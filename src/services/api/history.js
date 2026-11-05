// Cooking history on the CookFlow API. Entries:
// { id, recipeId, recipeTitle, servings, startedAt (ms|null), finishedAt (ms), rating (1-5|null), note }
import { apiRequest } from './client';

const BASE = '/api/history';

export const fetchHistory = async () => (await apiRequest(BASE)).history;

export const addHistoryEntry = async ({ recipeId, servings, startedAt, rating, note }) =>
  (await apiRequest(BASE, { method: 'POST', body: { recipeId, servings, startedAt, rating: rating || null, note } })).entry;

export const deleteHistoryEntry = id => apiRequest(`${BASE}/${id}`, { method: 'DELETE' });
