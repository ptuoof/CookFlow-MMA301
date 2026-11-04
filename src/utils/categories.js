// Recipe categories managed by the admin. The list lives in RecipeContext (persisted) and is
// mirrored here so pure helpers like normalizeRecipe() map recipes onto the current categories.
import { CATEGORIES } from '../types/recipe';
import { tokensOf } from './text';

export const ALL_CATEGORY = 'Tất cả';
export const DEFAULT_CATEGORIES = CATEGORIES.filter(cat => cat !== ALL_CATEGORY);
export const PREFERRED_DEFAULT = 'Món chính 🍲';
export const CATEGORY_NAME_MAX = 30;

let registry = [...DEFAULT_CATEGORIES];

export const categoryKey = value => tokensOf(value).join(' ');
export const getRecipeCategories = () => registry;
/** Category used when a recipe's category is unknown or was deleted. */
export const fallbackCategory = (list = registry) => list.includes(PREFERRED_DEFAULT) ? PREFERRED_DEFAULT : list[0] || PREFERRED_DEFAULT;

/** Cleans a stored list: trimmed, unique (ignoring accents/emoji), never empty, never "Tất cả". */
export const sanitizeCategories = list => {
  const seen = new Set();
  const clean = (Array.isArray(list) ? list : [])
    .map(name => String(name ?? '').trim().slice(0, CATEGORY_NAME_MAX))
    .filter(name => {
      const key = categoryKey(name);
      if (!key || key === categoryKey(ALL_CATEGORY) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return clean.length ? clean : [...DEFAULT_CATEGORIES];
};

export const setRecipeCategories = list => {
  registry = sanitizeCategories(list);
  return registry;
};

/**
 * Checks a new or renamed category. Returns an error message, or null when valid.
 * `current` is the name being renamed (it may keep its own name).
 */
export const validateCategoryName = (name, list, current = null) => {
  const clean = String(name ?? '').trim();
  if (!categoryKey(clean)) return 'Tên danh mục không được để trống.';
  if (clean.length > CATEGORY_NAME_MAX) return `Tên danh mục tối đa ${CATEGORY_NAME_MAX} ký tự.`;
  if (categoryKey(clean) === categoryKey(ALL_CATEGORY)) return '"Tất cả" là tên dành riêng cho bộ lọc.';
  const key = categoryKey(clean);
  if ((list || []).some(cat => cat !== current && categoryKey(cat) === key)) return 'Danh mục này đã tồn tại.';
  return null;
};
