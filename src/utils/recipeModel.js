// Normalizes recipe objects coming from storage, the create form, QR codes or AI variants,
// so every screen can rely on the same shape (no undefined arrays, numbered steps, unique ids).
import { normalizeVi, tokensOf } from './text';
import { CATEGORIES } from '../types/recipe';
import { MINUTES_MAX, SERVINGS_MAX, SERVINGS_MIN, TIMER_SECONDS_MAX } from '../constants/limits';

let idCounter = 0;
export const makeId = prefix => {
  idCounter = (idCounter + 1) % 100000;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
};

const str = (value, fallback = '') => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return fallback;
  return value.trim() || fallback;
};

const num = (value, fallback, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

export const DEFAULT_CATEGORY = 'Món chính 🍲';
const RECIPE_CATEGORIES = CATEGORIES.filter(cat => cat !== 'Tất cả');
const categoryKey = value => tokensOf(value).join(' ');

// Maps any category text to one of the filter chips ("mon chinh", "Món chính" → "Món chính 🍲").
// Unknown values (e.g. from a QR code) fall back to the default so the recipe stays filterable.
export const normalizeCategory = value => {
  const key = categoryKey(value);
  return RECIPE_CATEGORIES.find(cat => categoryKey(cat) === key) || DEFAULT_CATEGORY;
};

export const DEFAULT_RECIPE_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';

export const normalizeRecipe = recipe => {
  if (!recipe || typeof recipe !== 'object') return null;
  const title = str(recipe.title);
  if (!title) return null;

  // Ingredient ids must be unique inside a recipe: the checklist and AI substitutions key on them.
  const seenIds = new Set();
  const ingredients = (Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
    .filter(item => item && str(item.name))
    .map((item, idx) => {
      let id = str(item.id, `i${idx + 1}`);
      while (seenIds.has(id)) id = `${id}_${idx}`;
      seenIds.add(id);
      return { ...item, id, name: str(item.name), amount: str(item.amount, 'Vừa đủ'), unit: str(item.unit) };
    });

  // Step ids survive adding, removing or reordering steps: timers key on them, so an edit
  // never re-labels a running timer with a different step.
  const seenStepIds = new Set();
  const steps = (Array.isArray(recipe.steps) ? recipe.steps : [])
    .filter(step => step && (str(step.instruction) || str(step.title)))
    .map((step, idx) => {
      const seconds = Number(step.timerSeconds);
      let id = str(step.id, `s${idx + 1}`);
      while (seenStepIds.has(id)) id = `${id}_${idx}`;
      seenStepIds.add(id);
      return {
        ...step,
        id,
        stepNumber: idx + 1,
        title: str(step.title, `Bước ${idx + 1}`),
        instruction: str(step.instruction, str(step.title, `Bước ${idx + 1}`)),
        timerSeconds: Number.isFinite(seconds) && seconds > 0 ? Math.min(Math.round(seconds), TIMER_SECONDS_MAX) : null
      };
    });

  return {
    ...recipe,
    title,
    description: str(recipe.description),
    imageUrl: str(recipe.imageUrl, DEFAULT_RECIPE_IMAGE),
    category: normalizeCategory(recipe.category),
    difficulty: ['Dễ', 'Vừa', 'Khó'].includes(recipe.difficulty) ? recipe.difficulty : 'Vừa',
    prepTimeMinutes: num(recipe.prepTimeMinutes, 0, 0, MINUTES_MAX),
    cookTimeMinutes: num(recipe.cookTimeMinutes, 0, 0, MINUTES_MAX),
    servings: num(recipe.servings, 2, SERVINGS_MIN, SERVINGS_MAX),
    ingredients,
    steps
  };
};

export const totalMinutes = recipe => (recipe?.prepTimeMinutes || 0) + (recipe?.cookTimeMinutes || 0);

export const hasVideo = recipe => !!(recipe?.videoUrl || recipe?.steps?.some(step => step.videoUrl));
export const hasTimer = recipe => !!recipe?.steps?.some(step => step.timerSeconds);

/**
 * Keeps a timer attached to its step after the recipe was edited. The step is found by id, so
 * inserting/removing other steps moves the timer to the step's new position; deleting the step
 * itself stops the timer (null) instead of re-labeling it with whatever step took its index.
 * Timers saved before step ids existed are matched through the previous version of the recipe.
 */
export const relocateTimerStep = (timer, previousRecipe, nextRecipe) => {
  if (!timer || timer.recipeId !== nextRecipe?.id) return timer;
  const stepId = timer.stepId ?? previousRecipe?.steps?.[timer.stepIndex]?.id;
  const stepIndex = nextRecipe.steps.findIndex(step => step.id === stepId);
  if (stepIndex < 0) return null;
  return { ...timer, stepId, stepIndex, recipeTitle: nextRecipe.title, stepTitle: nextRecipe.steps[stepIndex].title };
};

// Signature used to detect that an imported recipe is already in the user's collection.
export const recipeSignature = recipe => [
  normalizeVi(recipe?.title),
  ...(recipe?.ingredients || []).map(i => normalizeVi(i.name)).sort()
].join('|');
