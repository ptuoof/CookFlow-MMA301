// Parsing, scaling and merging of free-text ingredient amounts ("150", "1/2", "1 1/2", "2,5", "Vừa đủ").

const UNICODE_FRACTIONS = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75 };

/**
 * Reads the leading number of an amount.
 * @returns {{ value: number, rest: string } | null} null when the amount is not numeric ("Vừa đủ").
 */
export const parseAmount = amount => {
  if (typeof amount === 'number') return Number.isFinite(amount) ? { value: amount, rest: '' } : null;
  const text = String(amount ?? '').trim();
  if (!text) return null;
  let match = text.match(/^(\d+)\s+(\d+)\/(\d+)(.*)$/); // mixed fraction "1 1/2"
  if (match && Number(match[3]) > 0) {
    return { value: Number(match[1]) + Number(match[2]) / Number(match[3]), rest: match[4] };
  }
  match = text.match(/^(\d+)\/(\d+)(.*)$/);
  if (match && Number(match[2]) > 0) return { value: Number(match[1]) / Number(match[2]), rest: match[3] };
  match = text.match(/^(\d+)?\s*([½⅓⅔¼¾])(.*)$/);
  if (match) return { value: Number(match[1] || 0) + UNICODE_FRACTIONS[match[2]], rest: match[3] };
  match = text.match(/^(\d+(?:[.,]\d+)?)(.*)$/);
  if (match) return { value: Number(match[1].replace(',', '.')), rest: match[2] };
  return null;
};

export const formatNumber = value => {
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1).replace('.', ',');
};

// Scales the leading number by `ratio`; text amounts ("Vừa đủ") are returned unchanged.
export const scaleAmount = (amount, ratio) => {
  const parsed = parseAmount(amount);
  if (!parsed || !Number.isFinite(ratio) || ratio <= 0) return amount == null ? '' : String(amount);
  if (ratio === 1) return String(amount);
  const scaled = parsed.value * ratio;
  // Never round a non-zero quantity down to 0 ("1/4 muỗng" x 0.25 stays visible)
  const shown = scaled > 0 && scaled < 0.1 ? '0,1' : formatNumber(scaled);
  return `${shown}${parsed.rest}`;
};

/** Sums two amounts when both are plain numbers; returns null when they cannot be added. */
export const addAmounts = (a, b) => {
  const pa = parseAmount(a);
  const pb = parseAmount(b);
  if (!pa || !pb || pa.rest.trim() || pb.rest.trim()) return null;
  return formatNumber(pa.value + pb.value);
};

/** Parses a user-typed whole number within [min, max]; returns null when invalid. */
export const parseIntInRange = (text, min, max) => {
  const value = String(text ?? '').trim();
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= min && n <= max ? n : null;
};
