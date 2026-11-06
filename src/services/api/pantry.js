// Pantry on the CookFlow API. Names are matched without accents ("hanh la" = "Hành lá").
// Every call returns the whole pantry (array of names, in the order they were added).
import { apiRequest } from './client';

const BASE = '/api/pantry';

export const fetchPantry = async () => (await apiRequest(BASE)).ingredients;

export const togglePantryIngredient = async ingredientName =>
  (await apiRequest(`${BASE}/toggle`, { method: 'POST', body: { ingredientName } })).ingredients;

/** Adds names not in the pantry yet (never toggles off). */
export const addPantryIngredients = async names => (await apiRequest(BASE, { method: 'POST', body: { names } })).ingredients;

export const removePantryIngredients = async names => (await apiRequest(`${BASE}/remove`, { method: 'POST', body: { names } })).ingredients;

export const clearPantry = async () => (await apiRequest(BASE, { method: 'DELETE' })).ingredients;
