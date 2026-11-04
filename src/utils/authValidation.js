export const isValidEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());

export function passwordStrength(value = '') {
  const checks = [value.length >= 8, /[a-z]/.test(value), /[A-Z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value)];
  const score = checks.filter(Boolean).length;
  return { score, label: score < 3 ? 'Yếu' : score < 5 ? 'Trung bình' : 'Mạnh', checks };
}

export const isAcceptablePassword = value => value.length >= 8 && passwordStrength(value).score >= 3;
