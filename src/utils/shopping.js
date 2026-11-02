// Shopping list rules shared by the context and the tests.
import { makeId } from './recipeModel';
import { normalizeVi } from './text';
import { addQuantities, normalizeUnit } from './units';

const sameText = (a, b) => normalizeVi(a) === normalizeVi(b);

const appendSource = (current, title) => {
  const sources = String(current || '').split(', ').filter(Boolean);
  return sources.includes(title) ? current : [...sources, title].join(', ');
};

/**
 * Adds ingredients to a list without duplicating rows (pure: returns a new list).
 * An unchecked row with the same name absorbs the new quantity when the two can be added —
 * same unit, or the same family (g + kg, ml + lít) — or when both are the same text ("Vừa đủ").
 * @returns {{ list: object[], added: number, merged: number }}
 */
export const mergeIntoShoppingList = (list, ingredients, source) => {
  const next = [...list];
  const result = { added: 0, merged: 0 };
  (ingredients || []).forEach(ing => {
    const name = String(ing?.name ?? '').trim();
    if (!name) return;
    const amount = String(ing.amount ?? '').trim() || 'Vừa đủ';
    const unit = normalizeUnit(ing.unit);
    let sum = null;
    const idx = next.findIndex(item => {
      if (item.checked || !sameText(item.name, name)) return false;
      sum = addQuantities(item, { amount, unit });
      return !!sum || (sameText(item.amount, amount) && sameText(normalizeUnit(item.unit), unit));
    });
    if (idx >= 0) {
      const existing = next[idx];
      next[idx] = { ...existing, ...(sum || {}), recipeTitle: appendSource(existing.recipeTitle, source) };
      result.merged += 1;
      return;
    }
    next.unshift({ id: makeId('shop'), name, amount, unit, recipeTitle: source, checked: false });
    result.added += 1;
  });
  return { list: next, ...result };
};
