// Recipes, favorites and categories on the CookFlow API.
// Recipes keep the app's shape (category = name, ingredients/steps with ids) plus:
// type ('system' | 'admin' | 'personal'), isPublic, ownerId, isOwner, canEdit, legacyId.
import { apiRequest } from './client';

// Fields computed by the server: never sent back (and `type` / `system` would change who owns the recipe)
const SERVER_FIELDS = ['id', '_id', 'type', 'system', 'author', 'ownerId', 'authorName', 'isOwner', 'canEdit', 'isCustom',
  'categoryId', 'categoryObj', 'categoryName', 'likesCount', 'legacyId', 'createdAt', 'updatedAt', 'ownerEmail', '__v'];
const toBody = recipe => {
  const body = { ...recipe };
  SERVER_FIELDS.forEach(key => delete body[key]);
  return body;
};

/** Every recipe the signed-in user can see (catalog + own; admins: all). */
export const fetchAllRecipes = async () => {
  const all = [];
  for (let page = 1; ; page += 1) {
    const data = await apiRequest('/api/recipes', { query: { page, limit: 100 } });
    all.push(...data.recipes);
    if (page >= data.totalPages || data.recipes.length === 0) return all;
  }
};

/**
 * @param recipe   recipe data from a form / QR code / AI variant / copy
 * @param options  { system: true } = admin catalog recipe; isPublic = share a personal recipe
 */
export const createRecipe = async (recipe, { system = false, isPublic = false } = {}) => {
  const body = { ...toBody(recipe), type: system ? 'admin' : 'personal', isPublic: system ? true : !!isPublic };
  return (await apiRequest('/api/recipes', { method: 'POST', body })).recipe;
};

/** Full update; ingredient / step ids from the server are kept so timers stay on their step. */
export const updateRecipe = async recipe =>
  (await apiRequest(`/api/recipes/${recipe.id}`, { method: 'PUT', body: toBody(recipe) })).recipe;

export const deleteRecipe = id => apiRequest(`/api/recipes/${id}`, { method: 'DELETE' });

// ----- Favorites -----
export const fetchFavoriteIds = async () => (await apiRequest('/api/favorites')).favoriteIds;

/** @returns {{ isFavorite, likesCount }} */
export const toggleFavorite = id => apiRequest(`/api/favorites/${id}/toggle`, { method: 'POST' });

// ----- Categories -----
/** @returns {{ names: string[], categories: { id, name, slug, icon, order, recipeCount }[] }} */
export const fetchCategories = () => apiRequest('/api/categories', { auth: false });

export const createCategory = async name => (await apiRequest('/api/categories', { method: 'POST', body: { name } })).category;

export const renameCategory = async (id, name) => (await apiRequest(`/api/categories/${id}`, { method: 'PUT', body: { name } })).category;

/** Recipes in it move to the default category. @returns {{ movedRecipes, fallbackCategory }} */
export const deleteCategory = id => apiRequest(`/api/categories/${id}`, { method: 'DELETE' });

/** @param names every category, in the new order */
export const reorderCategories = names => apiRequest('/api/categories/reorder', { method: 'PUT', body: { names } });
