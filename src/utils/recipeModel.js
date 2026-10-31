// Normalizes recipe objects coming from storage, the create form, QR codes or AI variants,
// so every screen can rely on the same shape (no undefined arrays, numbered steps, unique ids).
import { normalizeVi } from './text';

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

  const steps = (Array.isArray(recipe.steps) ? recipe.steps : [])
    .filter(step => step && (str(step.instruction) || str(step.title)))
    .map((step, idx) => {
      const seconds = Number(step.timerSeconds);
      return {
        ...step,
        stepNumber: idx + 1,
        title: str(step.title, `Bước ${idx + 1}`),
        instruction: str(step.instruction, str(step.title, `Bước ${idx + 1}`)),
        timerSeconds: Number.isFinite(seconds) && seconds > 0 ? Math.min(Math.round(seconds), 24 * 3600) : null
      };
    });

  return {
    ...recipe,
    title,
    description: str(recipe.description),
    imageUrl: str(recipe.imageUrl, DEFAULT_RECIPE_IMAGE),
    category: str(recipe.category, 'Món chính 🍲'),
    difficulty: ['Dễ', 'Vừa', 'Khó'].includes(recipe.difficulty) ? recipe.difficulty : 'Vừa',
    prepTimeMinutes: num(recipe.prepTimeMinutes, 0, 0, 1440),
    cookTimeMinutes: num(recipe.cookTimeMinutes, 0, 0, 1440),
    servings: num(recipe.servings, 2, 1, 100),
    ingredients,
    steps
  };
};

export const totalMinutes = recipe => (recipe?.prepTimeMinutes || 0) + (recipe?.cookTimeMinutes || 0);

export const hasVideo = recipe => !!(recipe?.videoUrl || recipe?.steps?.some(step => step.videoUrl));
export const hasTimer = recipe => !!recipe?.steps?.some(step => step.timerSeconds);

// Signature used to detect that an imported recipe is already in the user's collection.
export const recipeSignature = recipe => [
  normalizeVi(recipe?.title),
  ...(recipe?.ingredients || []).map(i => normalizeVi(i.name)).sort()
].join('|');
