// Groups shopping items by supermarket aisle using whole-word Vietnamese keywords.
// Matching is word-based (see containsPhrase) so short keywords like "ốc", "cua", "ớt"
// no longer match inside other words ("nước", "của", "bột"), and "đ" is handled.
import { containsPhrase, normalizeVi } from './text';

const AISLES = [
  { id: 'produce', label: 'Rau củ & trái cây' },
  { id: 'meat', label: 'Thịt & gia cầm' },
  { id: 'seafood', label: 'Hải sản' },
  { id: 'dairy', label: 'Sữa & trứng' },
  { id: 'bakery', label: 'Bánh & ngũ cốc' },
  { id: 'pantry', label: 'Đồ khô & gia vị' },
  { id: 'other', label: 'Khác' }
];

// Order matters: the first rule whose keyword matches wins.
// More specific phrases ("dầu ăn", "cà rốt", "bột mì") come before generic words.
const RULES = [
  ['dairy', ['trung', 'sua tuoi', 'sua dac', 'sua chua', 'sua bot', 'pho mai', 'kem tuoi', 'bo lat', 'bo nhat']],
  ['pantry', ['nuoc tuong', 'nuoc mam', 'nuoc cot dua', 'nuoc dua', 'dau olive', 'dau o liu', 'dau an', 'dau me', 'dau hao', 'dau dieu',
    'duong', 'muoi', 'hat nem', 'bot ngot', 'bot nem', 'tieu den', 'tieu xay', 'gelatin', 'giam', 'siro', 'tra tui', 'tra xanh', 'me trang', 'me rang',
    'mat ong', 'gia vi', 'xot', 'sot', 'tuong ot', 'tuong ca', 'bot bap', 'bot nang', 'cacao', 'ca phe', 'vani', 'que', 'hoi', 'ngu vi huong']],
  ['bakery', ['banh mi', 'bot mi', 'yen mach', 'ngu coc', 'mi soi', 'mi y', 'mi trung', 'bun kho', 'bun tuoi', 'pho kho', 'banh pho', 'gao', 'nep', 'banh trang', 'banh quy']],
  ['produce', ['ca rot', 'ca chua', 'ca tim', 'ca le', 'ca phao', 'ca tim', 'dua leo', 'dua chuot', 'dua hau', 'dua luoi']],
  ['seafood', ['tom', 'ca hoi', 'ca ngu', 'ca basa', 'ca loc', 'ca thu', 'ca ro', 'ca chem', 'ca dieu hong', 'muc', 'bach tuoc', 'ngheu', 'so diep', 'cua', 'oc', 'hau', 'ghe', 'so', 'hai san']],
  ['meat', ['thit', 'thit bo', 'bap bo', 'bo phi le', 'bo vien', 'than bo', 'bo uc', 'bo bit tet', 'heo', 'lon', 'ga', 'vit', 'cuu', 'suon', 'ba roi', 'ribeye', 'xuc xich', 'lap xuong', 'cha lua', 'gio lua', 'thit nguoi']],
  ['dairy', ['sua', 'pho mai', 'phomai', 'bo lat', 'bo nhat', 'kem tuoi', 'kem whipping', 'whipping', 'sua chua', 'trung', 'yogurt', 'bo']],
  ['produce', ['rau', 'xa lach', 'cai', 'hanh', 'toi', 'ot', 'gung', 'rieng', 'sa', 'xoai', 'cam', 'chanh', 'bi', 'dau', 'khoai', 'nam', 'bap', 'ngo',
    'chuoi', 'tao', 'dua', 'bo sap', 'thom', 'ngo ri', 'rau mui', 'hung que', 'la', 'dau hu', 'dau phu', 'gia', 'tieu xanh', 'muop', 'su su', 'bo xoi', 'trai cay', 'dao', 'nho', 'le', 'qua']],
  ['pantry', ['tieu', 'bot', 'dau', 'nuoc loc']]
];

// Words that look like a keyword but mean something else in an ingredient name.
const EXCLUDE = { meat: ['bo lat', 'bo nhat', 'bo sap', 'bo xoi', 'bo dau'], dairy: ['bo sap', 'bo xoi'] };

export const getGroceryAisle = ingredientName => {
  const name = normalizeVi(ingredientName);
  if (!name) return AISLES[6];
  for (const [aisleId, keywords] of RULES) {
    const excluded = (EXCLUDE[aisleId] || []).some(word => containsPhrase(name, word));
    if (!excluded && keywords.some(keyword => containsPhrase(name, keyword))) {
      return AISLES.find(aisle => aisle.id === aisleId);
    }
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
