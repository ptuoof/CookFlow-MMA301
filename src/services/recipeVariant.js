// Applies AI ingredient changes to a recipe without touching the original:
// the result is a personal copy ("bản của tôi") stored like any custom recipe.

export const VARIANT_SUFFIX = ' (bản của tôi)';

const formatIngredient = i => `${i.name} ${i.amount} ${i.unit}`.replace(/\s+/g, ' ').trim();

// Human-readable line, e.g. "Nước tương 150 ml → Nước mắm 60 ml + Nước lọc 90 ml"
export const describeChange = change =>
  `${formatIngredient(change.original)} → ${change.items.length ? change.items.map(formatIngredient).join(' + ') : 'bỏ'}`;

const toNumber = amount => {
  const text = String(amount).trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(text) ? parseFloat(text) : null;
};

// "Nước lọc 150 ml" + "Nước lọc 90 ml" → "Nước lọc 240 ml" (only when both amounts are plain numbers)
const sameText = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
const AI_ID_MARK = '_ai';

const mergeDuplicates = ingredients => {
  const merged = [];
  for (const ing of ingredients) {
    const twin = merged.find(m => sameText(m.name, ing.name) && sameText(m.unit, ing.unit) && toNumber(m.amount) !== null && toNumber(ing.amount) !== null);
    if (twin) {
      twin.amount = String(Math.round((toNumber(twin.amount) + toNumber(ing.amount)) * 100) / 100);
      // Keep the original recipe's id so later AI changes can still target this ingredient
      if (!ing.id.includes(AI_ID_MARK)) twin.id = ing.id;
    } else {
      merged.push({ ...ing });
    }
  }
  return merged;
};

// Replaces each changed ingredient in place, keeping the original order and group.
export const applyIngredientChanges = (ingredients, changes) => {
  const byId = new Map(changes.map(c => [c.replacesId, c]));
  const replaced = ingredients.flatMap(ing => {
    const change = byId.get(ing.id);
    if (!change) return [ing];
    return change.items.map((item, idx) => ({
      id: `${ing.id}${AI_ID_MARK}${Date.now().toString(36)}${idx}`,
      name: item.name,
      amount: item.amount,
      unit: item.unit,
      group: ing.group
    }));
  });
  return mergeDuplicates(replaced);
};

/**
 * Returns what to save for the chosen changes:
 * - { mode: 'update', recipe } when the recipe already is the user's personal copy
 * - { mode: 'create', recipe } (data for addRecipe) otherwise — the original stays untouched
 */
export const buildPersonalVariant = (recipe, changes) => {
  const notes = [...(recipe.aiChanges || []), ...changes.map(describeChange)];
  const ingredients = applyIngredientChanges(recipe.ingredients, changes);
  if (recipe.variantOf) {
    return { mode: 'update', recipe: { ...recipe, ingredients, aiChanges: notes } };
  }
  const { id, isCustom, createdAt, ...rest } = recipe;
  return {
    mode: 'create',
    recipe: {
      ...rest,
      title: `${recipe.title}${VARIANT_SUFFIX}`,
      ingredients,
      variantOf: id,
      aiChanges: notes
    }
  };
};

// New ingredients to buy for the chosen changes (removals add nothing).
export const shoppingItemsForChanges = changes => changes.flatMap(c => c.items);
