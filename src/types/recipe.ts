export type Category = 'Tất cả' | 'Món nhanh ⚡' | 'Món chính 🍲' | 'Ăn kiêng 🥗' | 'Tráng miệng 🍰' | 'Thức uống 🍹';

export type Difficulty = 'Dễ' | 'Vừa' | 'Khó';

export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
  group?: 'Nguyên liệu chính' | 'Gia vị' | 'Rau thơm' | 'Nước xốt' | 'Trang trí';
}

export interface CookingStep {
  stepNumber: number;
  title: string;
  instruction: string;
  image?: string;
  videoUrl?: string; // Link video MP4 hướng dẫn chi tiết cho bước này
  timerSeconds?: number | null;
  tip?: string;
}
export interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string; // Video trailer giới thiệu tổng quan món ăn
  category: Exclude<Category, 'Tất cả'>;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  calories?: number;
  difficulty: Difficulty;
  ingredients: Ingredient[];
  steps: CookingStep[];
  isCustom?: boolean;
  createdAt?: string;
  colorAccent?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount: string;
  unit: string;
  recipeTitle?: string;
  checked: boolean;
}

