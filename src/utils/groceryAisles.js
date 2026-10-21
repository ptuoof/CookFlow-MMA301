const AISLES = [
  { id: 'produce', label: 'Rau củ & trái cây' },
  { id: 'meat', label: 'Thịt & gia cầm' },
  { id: 'seafood', label: 'Hải sản' },
  { id: 'dairy', label: 'Sữa & trứng' },
  { id: 'bakery', label: 'Bánh & ngũ cốc' },
  { id: 'pantry', label: 'Đồ khô & gia vị' },
  { id: 'other', label: 'Khác' }
];

const normalize = value => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const matchesAny = (value, terms) => terms.some(term => value.includes(term));

export const getGroceryAisle = ingredientName => {
  const name = normalize(ingredientName || '');

  if (matchesAny(name, ['ca rot', 'ca chua', 'ca tim', 'ca le'])) {
    return AISLES[0];
  }
  if (name === 'tom' || name.startsWith('tom ') || name.includes(', tom')
    || matchesAny(name, ['ca hoi', 'ca ngu', 'ca basa', 'muc', 'bach tuoc', 'ngheu', 'so diep', 'cua', 'oc', 'ca loc', 'ca thu'])
    || name === 'ca ro' || name.startsWith('ca ro,') || name.startsWith('ca ro ')) {
    return AISLES[2];
  }
  if (name.startsWith('thit ') || matchesAny(name, ['bo uc', 'ribeye', 'suon', 'uc ga', 'ga ta', 'thit nguoi', 'xuc xich', 'ba roi'])) {
    return AISLES[1];
  }
  if (matchesAny(name, ['sua', 'pho mai', 'phomai', 'bo lat', 'kem tuoi', 'sua chua', 'trung'])) {
    return AISLES[3];
  }
  if (matchesAny(name, ['banh mi', 'bot mi', 'yen mach', 'ngu coc', 'mi soi', 'bun kho', 'pho kho', 'gao'])) {
    return AISLES[4];
  }
  if (matchesAny(name, ['rau', 'xa lach', 'ca chua', 'hanh', 'toi', 'ot', 'gung', 'sa tuoi', 'sa ', 'bo sap', 'xoai', 'cam', 'chanh', 'dua leo', 'dau ', 'khoai', 'nam ', 'nam,', 'ca rot', 'bi xanh', 'tieu xanh'])) {
    return AISLES[0];
  }
  if (matchesAny(name, ['nuoc tuong', 'nuoc mam', 'nuoc loc', 'nuoc cot dua', 'dau olive', 'dau an', 'duong', 'muoi', 'tieu', 'bot ', 'gelatin', 'giam', 'siro', 'tra tui', 'me trang', 'mat ong', 'xot'])) {
    return AISLES[5];
  }
  return AISLES[6];
};

export const groupShoppingItemsByAisle = items => {
  const groups = new Map();
  items.forEach(item => {
    const aisle = getGroceryAisle(item.name);
    if (!groups.has(aisle.id)) groups.set(aisle.id, { ...aisle, items: [] });
    groups.get(aisle.id).items.push(item);
  });
  return AISLES.map(aisle => groups.get(aisle.id)).filter(Boolean);
};
