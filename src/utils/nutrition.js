// Nutrition facts per serving: kcal + macros (protein / carbs / fat, in grams).
// Values are user-entered or estimated from the ingredient list with a small reference table.
import { normalizeVi, containsPhrase } from './text';
import { parseAmount } from './quantity';
import { normalizeUnit } from './units';

export const KCAL_MAX = 5000;
export const MACRO_MAX = 500;
export const DEFAULT_CALORIE_GOAL = 2000;
export const CALORIE_GOAL_MIN = 800;
export const CALORIE_GOAL_MAX = 6000;

const clampOrNull = (value, max) => {
  if (value === '' || value == null) return null;
  const n = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(max, Math.round(n));
};

/** kcal per serving: whole number in [0, KCAL_MAX], or null when unknown. */
export const normalizeCalories = value => {
  const n = clampOrNull(value, KCAL_MAX);
  return n ? n : null;
};

/** { protein, carbs, fat } in grams per serving; missing values are null. */
export const normalizeMacros = macros => ({
  protein: clampOrNull(macros?.protein, MACRO_MAX),
  carbs: clampOrNull(macros?.carbs, MACRO_MAX),
  fat: clampOrNull(macros?.fat, MACRO_MAX)
});

export const hasMacros = recipe => ['protein', 'carbs', 'fat'].some(key => recipe?.nutrition?.[key] != null);

/** kcal implied by macros (4 / 4 / 9 kcal per gram), null without macros. */
export const caloriesFromMacros = ({ protein, carbs, fat } = {}) => {
  if (protein == null && carbs == null && fat == null) return null;
  return Math.round((protein || 0) * 4 + (carbs || 0) * 4 + (fat || 0) * 9);
};

export const formatKcal = value => value == null ? '—' : `${Math.round(value).toLocaleString('vi-VN')} kcal`;

// kcal per 100 g (or 100 ml) and the weight of one piece ("quả", "củ", "miếng"...).
// Matched by whole-word phrase on the ingredient name; more specific entries come first.
const FOODS = [
  ['trung', 143, 50], ['bo lat', 717], ['bo thuc vat', 717], ['bo dong vat', 717], ['bo nhat', 717],
  ['qua bo', 160, 200], ['ba chi', 518], ['thit heo', 242], ['thit lon', 242], ['suon', 280], ['thit bo', 250], ['than bo', 250], ['bo uc', 250], ['bo my', 250], ['bo phi le', 250],
  ['thit ga', 165], ['uc ga', 120], ['dui ga', 180], ['ga', 190],
  ['tom', 99, 20], ['muc', 92], ['ca phe', 2], ['ca hoi', 208], ['ca rot', 41, 100], ['ca chua', 18, 100], ['ca', 120],
  ['dau phu', 76, 150], ['dau hu', 76, 150], ['dau phong', 567], ['dau xanh', 347],
  ['dau an', 884], ['dau oliu', 884], ['dau olive', 884], ['dau me', 884], ['dau hao', 51],
  ['gao', 360], ['com', 130], ['bun', 110], ['banh pho', 140], ['mi y', 350], ['spaghetti', 350], ['mi goi', 450, 75], ['mi', 350],
  ['bot mi', 364], ['bot nang', 357], ['banh mi', 265, 80], ['yen mach', 389],
  ['khoai tay', 77, 150], ['khoai lang', 86, 200], ['ca rot', 41, 100], ['ca chua', 18, 100], ['hanh tay', 40, 120],
  ['toi', 149, 5], ['hanh', 40, 20], ['ot chuong', 31, 150], ['ot', 40, 5], ['gung', 80, 10], ['sa', 99, 15],
  ['bi do', 26], ['bi dao', 13], ['rau', 20], ['xa lach', 15], ['cai', 20], ['nam', 22], ['dua leo', 15, 200], ['dua chuot', 15, 200],
  ['sua dua', 230], ['nuoc cot dua', 230], ['sua dac', 321], ['sua chua', 60, 100], ['sua tuoi', 62], ['sua', 62], ['kem tuoi', 340], ['whipping', 340], ['pho mai', 400],
  ['duong', 387], ['mat ong', 304], ['nuoc mam', 35], ['nuoc tuong', 53], ['xi dau', 53], ['tuong ot', 100], ['tuong ca', 100],
  ['chanh', 29, 60], ['xoai', 60, 300], ['chuoi', 89, 120], ['dau tay', 32], ['tao', 52, 180], ['cam', 47, 200], ['dua hau', 30],
  ['me', 573], ['hat dieu', 553], ['socola', 546], ['chocolate', 546], ['tra', 1], ['dao', 39, 150], ['gelatin', 335], ['huong thao', 0], ['la thom', 0],
  ['muoi', 0], ['tieu', 0], ['nuoc loc', 0], ['nuoc da', 0], ['da vien', 0], ['nuoc', 0]
].map(([key, kcal, pieceGrams]) => ({ key, kcal, pieceGrams }));

// Grams in one unit; pieces use the food's own weight (or a 50 g default)
const UNIT_GRAMS = { g: 1, kg: 1000, ml: 1, 'lít': 1000, 'muỗng canh': 15, 'muỗng cà phê': 5, 'chén': 150, 'ly': 250, 'lon': 330, 'chai': 500, 'gói': 75, 'hộp': 200 };
const PIECE_UNITS = new Set(['quả', 'củ', 'tép', 'nhánh', 'cây', 'bó', 'lát', 'miếng', 'phần']);

export const findFood = name => FOODS.find(food => containsPhrase(name, food.key)) || null;

/** Approximate grams of one ingredient row, or null when the amount is not numeric. */
export const ingredientGrams = ({ name, amount, unit }) => {
  const parsed = parseAmount(amount);
  if (!parsed || parsed.value <= 0) return null;
  const canonical = normalizeUnit(unit);
  if (UNIT_GRAMS[canonical] != null) return parsed.value * UNIT_GRAMS[canonical];
  const food = findFood(name);
  if (PIECE_UNITS.has(canonical) || !canonical) return parsed.value * (food?.pieceGrams || 50);
  return null;
};

/**
 * Estimates kcal per serving from the ingredient list.
 * @returns {{ perServing: number|null, total: number, matched: number, unmatched: string[] }}
 */
export const estimateCalories = recipe => {
  const unmatched = [];
  let total = 0;
  let matched = 0;
  (recipe?.ingredients || []).forEach(item => {
    if (!normalizeVi(item?.name)) return;
    const food = findFood(item.name);
    const grams = ingredientGrams(item);
    if (!food || grams == null) {
      // "Vừa đủ" seasonings barely count; anything else is reported as unknown
      if (!(food && food.kcal === 0)) unmatched.push(item.name);
      return;
    }
    matched += 1;
    total += food.kcal * grams / 100;
  });
  const servings = Math.max(1, Number(recipe?.servings) || 1);
  const perServing = matched ? Math.round(total / servings / 5) * 5 : null;
  return { perServing: perServing || (matched ? 5 : null), total: Math.round(total), matched, unmatched };
};

/** Share of the daily goal, 0–1 (can exceed 1 when over the goal). */
export const goalProgress = (kcal, goal) => goal > 0 ? Math.max(0, kcal) / goal : 0;
