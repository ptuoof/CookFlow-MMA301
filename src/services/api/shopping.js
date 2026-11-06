// Shopping list on the CookFlow API. Each function matches one action of RecipeContext,
// so the context can switch from local storage to the server one call at a time.
// Rows come back as { id, name, amount, unit, recipeTitle, checked, stockedToPantry, createdAt }.
//
// The server applies the app's own rules, so the context no longer needs to:
//  - merge rows with the same name (g + kg, ml + lít, "Vừa đủ")          -> done by POST /shopping and /bulk
//  - put a bought row into the pantry / take it back out (autoStockPantry) -> done by PATCH /shopping/:id
import { apiRequest } from './client';

const BASE = '/api/shopping';

/** Whole list, newest first. */
export const fetchShoppingList = async () => (await apiRequest(BASE)).items;

/**
 * Adds ingredients of a recipe / the meal plan (merged with existing unchecked rows).
 * @returns {{ added: number, merged: number, items: object[] }} items = rows created or changed
 */
export const addIngredientsToShopping = async (ingredients, recipeTitle) => {
  const data = await apiRequest(`${BASE}/bulk`, { method: 'POST', body: { ingredients, recipeTitle } });
  return { added: data.added, merged: data.merged, items: data.items };
};

/** "Mua tự do" row. @returns {{ added, merged, item }} */
export const addCustomShoppingItem = async (name, amount, unit) => {
  const data = await apiRequest(BASE, { method: 'POST', body: { name, amount, unit } });
  return { added: data.added, merged: data.merged, item: data.item };
};

/**
 * Edits a row's name / amount / unit (RecipeContext.updateShoppingItem).
 * An empty amount becomes "Vừa đủ"; the unit is normalized ("gram" -> "g").
 */
export const updateShoppingItem = async (id, { name, amount, unit }) =>
  (await apiRequest(`${BASE}/${id}`, { method: 'PATCH', body: { name, amount, unit } })).item;

/**
 * Marks a row bought / not bought (RecipeContext.toggleShoppingItem sets an explicit value,
 * so a double tap can never flip it twice).
 * @returns {{ item, pantry?: string[] }} pantry is present when the pantry changed (autoStockPantry)
 */
export const setShoppingItemChecked = async (id, checked) => {
  const data = await apiRequest(`${BASE}/${id}`, { method: 'PATCH', body: { checked } });
  return { item: data.item, pantry: data.pantry };
};

/** Server-side flip (kept for older screens). @returns {{ item, pantry?: string[] }} */
export const toggleShoppingItem = async id => {
  const data = await apiRequest(`${BASE}/${id}/toggle`, { method: 'PATCH' });
  return { item: data.item, pantry: data.pantry };
};

/** Deletes a row. @returns the deleted row, to pass to restoreShoppingItem() for "Hoàn tác". */
export const deleteShoppingItem = async id => (await apiRequest(`${BASE}/${id}`, { method: 'DELETE' })).item;

/** Puts a deleted row back exactly as it was (no merge). @returns the new row (new id) */
export const restoreShoppingItem = async item => (await apiRequest(`${BASE}/restore`, { method: 'POST', body: item })).item;

/** @returns number of rows removed */
export const clearCheckedShoppingItems = async () => (await apiRequest(`${BASE}/clear-checked`, { method: 'DELETE' })).deletedCount;
