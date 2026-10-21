// Serverless recipe sharing via QR code.
// Recipes are serialized into a compact JSON payload (short keys + arrays) with a
// version prefix. Vietnamese text is multi-byte in UTF-8, so the encoder degrades
// detail level step by step until the payload fits a QR size phones can scan reliably.

export const QR_PREFIX = 'CF1:';
export const QR_MAX_BYTES = 1500;

const MAX_STR = 600;
const MAX_ITEMS = 40;

export const utf8ByteLength = str => {
  let bytes = 0;
  for (const ch of str) {
    const code = ch.codePointAt(0);
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
};

const truncate = (text, max) => {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
};

// Each level trades detail for size. Level 0 keeps everything worth sharing.
const DETAIL_LEVELS = [
  { video: true, tips: true, desc: Infinity, instr: Infinity, image: true },
  { video: false, tips: true, desc: Infinity, instr: Infinity, image: true },
  { video: false, tips: false, desc: Infinity, instr: Infinity, image: true },
  { video: false, tips: false, desc: 120, instr: 140, image: true },
  { video: false, tips: false, desc: 80, instr: 80, image: true },
  { video: false, tips: false, desc: 60, instr: 45, image: false },
  { video: false, tips: false, desc: 0, instr: 0, image: false }
];

const toCompact = (recipe, level) => {
  const compact = {
    t: recipe.title,
    d: truncate(recipe.description, level.desc),
    c: recipe.category,
    p: recipe.prepTimeMinutes || 0,
    k: recipe.cookTimeMinutes || 0,
    s: recipe.servings || 1,
    df: recipe.difficulty,
    a: recipe.colorAccent,
    g: (recipe.ingredients || []).map(i => [i.name, i.amount, i.unit, i.group || '']),
    st: (recipe.steps || []).map(step => {
      const row = [step.title, truncate(step.instruction, level.instr), step.timerSeconds || 0];
      if (level.tips && step.tip) row.push(step.tip);
      return row;
    })
  };
  if (recipe.calories) compact.cal = recipe.calories;
  if (level.image && recipe.imageUrl) compact.i = recipe.imageUrl;
  if (level.video && recipe.videoUrl) compact.v = recipe.videoUrl;
  return compact;
};

/**
 * Encodes a recipe into a QR-ready string.
 * Returns { payload, bytes, truncated } — truncated is true when some detail was dropped.
 */
export const encodeRecipeForQr = recipe => {
  let payload = '';
  for (let i = 0; i < DETAIL_LEVELS.length; i++) {
    payload = QR_PREFIX + JSON.stringify(toCompact(recipe, DETAIL_LEVELS[i]));
    const bytes = utf8ByteLength(payload);
    if (bytes <= QR_MAX_BYTES || i === DETAIL_LEVELS.length - 1) {
      return { payload, bytes, truncated: i > 1 };
    }
  }
  return { payload, bytes: utf8ByteLength(payload), truncated: true };
};

const cleanStr = (value, fallback = '') => {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, MAX_STR) || fallback;
};

const cleanNum = (value, fallback, max) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), max) : fallback;
};

const cleanUrl = value => {
  const url = cleanStr(value);
  return /^https?:\/\//i.test(url) ? url : '';
};

const cleanColor = value => {
  const color = cleanStr(value);
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#FA3600';
};

// Builds a recipe object accepted by RecipeContext.addRecipe from untrusted fields.
const buildRecipe = fields => {
  const title = cleanStr(fields.title);
  if (!title) throw new Error('missing title');

  const ingredients = (Array.isArray(fields.ingredients) ? fields.ingredients : [])
    .slice(0, MAX_ITEMS)
    .map((ing, idx) => ({
      id: `qr_i${idx + 1}`,
      name: cleanStr(ing.name, `Nguyên liệu ${idx + 1}`),
      amount: cleanStr(ing.amount, 'Vừa đủ'),
      unit: cleanStr(ing.unit),
      group: cleanStr(ing.group, 'Nguyên liệu chính')
    }));

  const steps = (Array.isArray(fields.steps) ? fields.steps : [])
    .slice(0, MAX_ITEMS)
    .map((step, idx) => {
      const parsed = {
        stepNumber: idx + 1,
        title: cleanStr(step.title, `Bước ${idx + 1}`),
        instruction: cleanStr(step.instruction, cleanStr(step.title, `Bước ${idx + 1}`)),
        timerSeconds: cleanNum(step.timerSeconds, 0, 24 * 3600)
      };
      const tip = cleanStr(step.tip);
      if (tip) parsed.tip = tip;
      const videoUrl = cleanUrl(step.videoUrl);
      if (videoUrl) parsed.videoUrl = videoUrl;
      return parsed;
    });

  if (steps.length === 0) throw new Error('missing steps');

  return {
    title,
    description: cleanStr(fields.description, 'Công thức được chia sẻ qua mã QR CookFlow.'),
    imageUrl:
      cleanUrl(fields.imageUrl) ||
      'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&q=80',
    videoUrl: cleanUrl(fields.videoUrl) || undefined,
    category: cleanStr(fields.category, 'Món chính 🍲'),
    prepTimeMinutes: cleanNum(fields.prepTimeMinutes, 0, 1440),
    cookTimeMinutes: cleanNum(fields.cookTimeMinutes, 0, 1440),
    servings: Math.max(1, cleanNum(fields.servings, 2, 100)),
    calories: cleanNum(fields.calories, 0, 10000) || undefined,
    difficulty: ['Dễ', 'Vừa', 'Khó'].includes(fields.difficulty) ? fields.difficulty : 'Vừa',
    colorAccent: cleanColor(fields.colorAccent),
    ingredients,
    steps
  };
};

const fromCompact = c => {
  const row = value => (Array.isArray(value) ? value : []);
  return buildRecipe({
    title: c.t,
    description: c.d,
    imageUrl: c.i,
    videoUrl: c.v,
    category: c.c,
    prepTimeMinutes: c.p,
    cookTimeMinutes: c.k,
    servings: c.s,
    calories: c.cal,
    difficulty: c.df,
    colorAccent: c.a,
    ingredients: row(c.g).map(g => ({
      name: row(g)[0],
      amount: row(g)[1],
      unit: row(g)[2],
      group: row(g)[3]
    })),
    steps: row(c.st).map(s => ({
      title: row(s)[0],
      instruction: row(s)[1],
      timerSeconds: row(s)[2],
      tip: row(s)[3]
    }))
  });
};

/**
 * Parses scanned/pasted text back into a recipe ready for addRecipe().
 * Accepts the compact CF1 format and plain recipe JSON (as exported by the app).
 * Throws an Error with a user-facing Vietnamese message when the data is not a recipe.
 */
export const decodeRecipeFromQr = raw => {
  const text = typeof raw === 'string' ? raw.trim() : '';
  try {
    if (text.startsWith(QR_PREFIX)) {
      return fromCompact(JSON.parse(text.slice(QR_PREFIX.length)));
    }
    if (text.startsWith('{')) {
      return buildRecipe(JSON.parse(text));
    }
  } catch {
    // fall through to the generic error below
  }
  throw new Error('Mã này không phải công thức CookFlow hợp lệ hoặc đã bị hỏng.');
};
