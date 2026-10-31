// Vietnamese-aware text helpers shared by search, pantry matching and grocery aisles.
// NFD does not decompose "đ/Đ", so it must be mapped explicitly — otherwise
// "đường" never matches "duong" and "đậu" never matches "dau".

export const normalizeVi = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

// Splits a normalized string into word tokens (letters/digits only).
export const tokensOf = value => normalizeVi(value).split(/[^a-z0-9]+/).filter(Boolean);

// True when every word of `phrase` appears in `text` as consecutive whole words.
// "ca rot" matches "ca rot baby" but "oc" no longer matches "nuoc".
export const containsPhrase = (text, phrase) => {
  const hay = ` ${tokensOf(text).join(' ')} `;
  const needle = tokensOf(phrase).join(' ');
  return needle.length > 0 && hay.includes(` ${needle} `);
};

// Free-text search: every query word must appear (as a word prefix) somewhere in the fields.
export const matchesSearch = (fields, query) => {
  const words = tokensOf(query);
  if (words.length === 0) return true;
  const haystack = fields.flatMap(tokensOf);
  return words.every(word => haystack.some(token => token.startsWith(word)));
};
