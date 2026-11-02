// Cooking history: one entry per finished dish, newest first.
// { id, recipeId, recipeTitle, servings, startedAt, finishedAt (epoch ms), rating (1–5 | null), note }
import { makeId } from './recipeModel';

export const HISTORY_LIMIT = 200;
export const NOTE_MAX_LENGTH = 200;

const clampRating = value => {
  const n = Math.round(Number(value));
  return n >= 1 && n <= 5 ? n : null;
};

/** Builds a clean history entry; returns null without a recipe. */
export const makeHistoryEntry = ({ recipe, servings, startedAt, finishedAt = Date.now(), rating, note }) => {
  if (!recipe?.id) return null;
  const started = Number(startedAt);
  return {
    id: makeId('cook'),
    recipeId: recipe.id,
    recipeTitle: recipe.title,
    servings: Math.max(1, Math.round(Number(servings) || recipe.servings || 1)),
    startedAt: Number.isFinite(started) && started > 0 && started <= finishedAt ? started : null,
    finishedAt,
    rating: clampRating(rating),
    note: String(note ?? '').trim().slice(0, NOTE_MAX_LENGTH)
  };
};

/** Validates entries read from storage or a backup file. */
export const sanitizeHistory = list => (Array.isArray(list) ? list : [])
  .filter(entry => entry && typeof entry.recipeId === 'string' && Number.isFinite(Number(entry.finishedAt)))
  .map(entry => ({
    ...entry,
    id: typeof entry.id === 'string' ? entry.id : makeId('cook'),
    recipeTitle: String(entry.recipeTitle ?? ''),
    finishedAt: Number(entry.finishedAt),
    rating: clampRating(entry.rating),
    note: String(entry.note ?? '').slice(0, NOTE_MAX_LENGTH)
  }))
  .sort((a, b) => b.finishedAt - a.finishedAt)
  .slice(0, HISTORY_LIMIT);

/** { count, lastAt, avgRating (one decimal, null when never rated) } for one recipe. */
export const recipeStats = (history, recipeId) => {
  const entries = (history || []).filter(entry => entry.recipeId === recipeId);
  const rated = entries.filter(entry => entry.rating);
  return {
    count: entries.length,
    lastAt: entries.reduce((latest, entry) => Math.max(latest, entry.finishedAt), 0) || null,
    avgRating: rated.length ? Math.round(rated.reduce((sum, entry) => sum + entry.rating, 0) / rated.length * 10) / 10 : null
  };
};

const DAY_MS = 24 * 3600 * 1000;
const startOfDay = time => {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/** "Hôm nay", "Hôm qua", "3 ngày trước" or a dd/mm/yyyy date. */
export const formatCookedDay = (time, now = Date.now()) => {
  const days = Math.round((startOfDay(now) - startOfDay(time)) / DAY_MS);
  if (days <= 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  const date = new Date(time);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

export const formatRating = rating => rating == null ? '' : `★ ${String(rating).replace('.', ',')}`;
