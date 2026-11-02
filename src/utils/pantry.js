// Pantry matching shared by Pantry Finder, the recipe checklist and the end of Cooking Mode.
import { containsPhrase, normalizeVi } from './text';

// Basic seasonings most kitchens always have; optionally not counted as "missing".
const STAPLES = ['muoi', 'duong', 'tieu', 'nuoc loc', 'dau an', 'hat nem', 'bot ngot', 'nuoc da'];

export const isStapleIngredient = name => {
  const key = normalizeVi(name);
  return STAPLES.some(staple => key === staple || key.startsWith(`${staple} `) || key.startsWith(`${staple},`));
};

export const pantryKeysOf = names => (names || []).map(normalizeVi).filter(Boolean);

// "Thịt bò" in the pantry covers "Thịt bò phi lê"; exact names always match.
export const isInPantry = (ingredientName, pantryKeys) => {
  const key = normalizeVi(ingredientName);
  return pantryKeys.some(p => p === key || containsPhrase(key, p));
};

/** Ingredients the user already has: found in the pantry, or a basic seasoning when assumeStaples. */
export const ingredientsOnHand = (ingredients, pantryNames, assumeStaples) => {
  const keys = pantryKeysOf(pantryNames);
  return (ingredients || []).filter(item => isInPantry(item.name, keys) || (assumeStaples && isStapleIngredient(item.name)));
};

/** Pantry entries a recipe uses — offered for removal once the dish is cooked. */
export const pantryItemsUsedBy = (recipe, pantryNames) => (pantryNames || []).filter(name => {
  const keys = pantryKeysOf([name]);
  return (recipe?.ingredients || []).some(item => isInPantry(item.name, keys));
});
