// Backup file of the user's own data (custom recipes, favorites, shopping list, pantry, settings,
// cooking history). Built-in recipes ship with the app and the Gemini key is a secret: neither is included.
import { normalizeRecipe } from './recipeModel';
import { sanitizeHistory } from './history';
import { normalizeUnit } from './units';
import { ALLERGEN_IDS } from './dietary';

export const BACKUP_FORMAT = 'cookflow-backup';
export const BACKUP_VERSION = 1;
const BOOLEAN_SETTINGS = ['keepAwake', 'timerSound', 'vibration', 'timerNotifications', 'assumeStaples', 'autoStockPantry', 'hideAllergenRecipes'];

export const buildBackup = ({ recipes, favoriteIds, shoppingList, pantryIngredients, settings, cookHistory }) => ({
  format: BACKUP_FORMAT,
  version: BACKUP_VERSION,
  exportedAt: new Date().toISOString(),
  data: {
    recipes: (recipes || []).filter(recipe => recipe.isCustom),
    favoriteIds: favoriteIds || [],
    shoppingList: shoppingList || [],
    pantry: pantryIngredients || [],
    settings: settings || {},
    history: cookHistory || []
  }
});

/** "cookflow-backup-2026-11-02.json" */
export const backupFileName = (date = new Date()) =>
  `cookflow-backup-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.json`;

const sanitizeSettings = settings => {
  const clean = {};
  if (!settings || typeof settings !== 'object') return clean;
  BOOLEAN_SETTINGS.forEach(key => {
    if (typeof settings[key] === 'boolean') clean[key] = settings[key];
  });
  if (Array.isArray(settings.allergies)) clean.allergies = settings.allergies.filter(id => ALLERGEN_IDS.includes(id));
  return clean;
};

/**
 * Validates a backup file's text. Returns { data, summary } ready for restoreBackup(), or throws an
 * Error with a user-facing Vietnamese message. Every record goes through the app's normal sanitizing.
 */
export const parseBackup = text => {
  let parsed;
  try {
    parsed = JSON.parse(String(text ?? '').trim());
  } catch {
    throw new Error('Tệp không phải bản sao lưu CookFlow (không đọc được JSON).');
  }
  if (parsed?.format !== BACKUP_FORMAT || !parsed.data || typeof parsed.data !== 'object') {
    throw new Error('Tệp không phải bản sao lưu CookFlow.');
  }
  if (!(parsed.version >= 1 && parsed.version <= BACKUP_VERSION)) {
    throw new Error('Bản sao lưu được tạo từ phiên bản CookFlow mới hơn. Hãy cập nhật ứng dụng rồi thử lại.');
  }
  const { data } = parsed;
  const recipes = (Array.isArray(data.recipes) ? data.recipes : [])
    .map(recipe => normalizeRecipe({ ...recipe, isCustom: true }))
    .filter(recipe => recipe && typeof recipe.id === 'string');
  const clean = {
    recipes,
    // Favorites may point at built-in recipes, which are not in the file
    favoriteIds: (Array.isArray(data.favoriteIds) ? data.favoriteIds : []).filter(id => typeof id === 'string'),
    shoppingList: (Array.isArray(data.shoppingList) ? data.shoppingList : [])
      .filter(item => item && typeof item.name === 'string' && item.name.trim())
      .map((item, idx) => ({
        id: typeof item.id === 'string' ? item.id : `shop_restored_${idx}`,
        name: item.name.trim(),
        amount: String(item.amount ?? '').trim() || 'Vừa đủ',
        unit: normalizeUnit(item.unit),
        recipeTitle: String(item.recipeTitle ?? ''),
        checked: !!item.checked
      })),
    pantry: (Array.isArray(data.pantry) ? data.pantry : []).filter(name => typeof name === 'string' && name.trim()),
    settings: sanitizeSettings(data.settings),
    history: sanitizeHistory(data.history)
  };
  return {
    data: clean,
    summary: {
      exportedAt: parsed.exportedAt || null,
      recipes: recipes.length,
      shopping: clean.shoppingList.length,
      pantry: clean.pantry.length,
      history: clean.history.length,
      // Album photos/videos are files on the old device; they do not travel with the backup
      localMedia: recipes.filter(r => /^(file|content):/i.test(r.imageUrl || '')).length
    }
  };
};
