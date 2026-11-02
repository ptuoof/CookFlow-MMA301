// Allergens detected from ingredient names, diet tags chosen by the author, and the explore filters.
// Detection is a helper, not a guarantee: the UI always says "có thể chứa".
import { containsPhrase, matchesSearch, normalizeVi } from './text';

// Whole-word Vietnamese keywords (see containsPhrase). Bare "ca" is avoided on purpose:
// it is also "cà" (cà chua, cà rốt) once diacritics are removed.
export const ALLERGENS = [
  {
    id: 'seafood', label: 'Hải sản',
    keywords: ['tom', 'cua', 'ghe', 'muc', 'bach tuoc', 'ngheu', 'so', 'so diep', 'oc', 'hau', 'hai san', 'ca hoi', 'ca ngu',
      'ca basa', 'ca loc', 'ca thu', 'ca ro', 'ca chem', 'ca dieu hong', 'ca com', 'ca tra', 'ca kho', 'phi le ca', 'nuoc mam', 'mam tom'],
    exclude: ['oc cho', 'so co la', 'tom tat']
  },
  { id: 'peanut', label: 'Đậu phộng', keywords: ['dau phong', 'lac rang', 'dau lac', 'bo dau phong'] },
  { id: 'nuts', label: 'Các loại hạt', keywords: ['hat dieu', 'hanh nhan', 'oc cho', 'hat de', 'mac ca', 'hat macca', 'ho dao', 'hat thong', 'hat de cuoi'] },
  {
    id: 'dairy', label: 'Sữa', keywords: ['sua', 'sua tuoi', 'sua dac', 'sua chua', 'pho mai', 'phomai', 'bo lat', 'bo nhat', 'kem tuoi', 'whipping', 'yogurt', 'cheese'],
    exclude: ['sua dau nanh', 'sua hat', 'sua dua', 'sua yen mach', 'sua hanh nhan']
  },
  { id: 'egg', label: 'Trứng', keywords: ['trung', 'long do', 'long trang'] },
  { id: 'gluten', label: 'Gluten (lúa mì)', keywords: ['bot mi', 'banh mi', 'mi y', 'mi soi', 'mi trung', 'nui', 'bot chien gion', 'bot chien xu', 'vun banh mi', 'lua mach', 'yen mach', 'nuoc tuong', 'xi dau'] },
  { id: 'soy', label: 'Đậu nành', keywords: ['dau nanh', 'dau hu', 'dau phu', 'tau hu', 'nuoc tuong', 'xi dau', 'tuong ban', 'tuong hot', 'miso', 'sua dau nanh'] },
  { id: 'sesame', label: 'Mè (vừng)', keywords: ['me trang', 'me den', 'me rang', 'hat me', 'dau me', 'vung', 'xot me'] }
];
export const ALLERGEN_IDS = ALLERGENS.map(a => a.id);
export const allergenLabel = id => ALLERGENS.find(a => a.id === id)?.label ?? id;

// Diet tags are chosen by the recipe author (they cannot be inferred reliably)
export const DIET_TAGS = ['Chay', 'Eat clean', 'Ít đường', 'Giàu đạm', 'Không cay', 'Cho trẻ em'];
export const normalizeTags = tags => {
  const keys = new Set((Array.isArray(tags) ? tags : []).map(normalizeVi));
  return DIET_TAGS.filter(tag => keys.has(normalizeVi(tag)));
};

const matchesAllergen = (name, allergen) => !(allergen.exclude || []).some(word => containsPhrase(name, word))
  && allergen.keywords.some(keyword => containsPhrase(name, keyword));

/** [{ id, label, ingredients: [names] }] for every allergen found in the recipe's ingredients. */
export const detectAllergens = recipe => ALLERGENS
  .map(allergen => ({
    id: allergen.id,
    label: allergen.label,
    ingredients: (recipe?.ingredients || []).map(i => i.name).filter(name => matchesAllergen(name, allergen))
  }))
  .filter(found => found.ingredients.length > 0);

/** Allergens of the recipe that the user declared in Cài đặt. */
export const userAllergensIn = (recipe, allergies) => {
  const wanted = new Set(allergies || []);
  return detectAllergens(recipe).filter(found => wanted.has(found.id));
};

export const TIME_FILTERS = [15, 30, 60];

/**
 * Explore screen filtering. Returns { visible, hiddenByAllergy } so the screen can say how many
 * recipes were hidden because of the user's allergies.
 */
export const filterRecipes = (recipes, { category = 'Tất cả', query = '', maxMinutes = null, difficulty = null, tag = null, allergies = [], hideAllergens = false } = {}) => {
  let hiddenByAllergy = 0;
  const visible = (recipes || []).filter(recipe => {
    if (category !== 'Tất cả' && recipe.category !== category) return false;
    if (maxMinutes && (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0) > maxMinutes) return false;
    if (difficulty && recipe.difficulty !== difficulty) return false;
    if (tag && !(recipe.tags || []).includes(tag)) return false;
    if (!matchesSearch([recipe.title, recipe.description, recipe.category, ...(recipe.tags || []), ...(recipe.ingredients || []).map(i => i.name)], query)) return false;
    if (hideAllergens && allergies.length && userAllergensIn(recipe, allergies).length) {
      hiddenByAllergy += 1;
      return false;
    }
    return true;
  });
  return { visible, hiddenByAllergy };
};
