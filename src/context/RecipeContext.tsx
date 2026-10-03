import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { Recipe, Category, Ingredient, ShoppingItem } from '../types/recipe';
import { INITIAL_RECIPES } from '../data/mockRecipes';

interface RecipeContextType {
  recipes: Recipe[];
  favoriteIds: string[];
  selectedCategory: Category;
  setSelectedCategory: (cat: Category) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeRecipeForCooking: Recipe | null;
  setActiveRecipeForCooking: (recipe: Recipe | null) => void;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => void;
  updateRecipe: (recipe: Recipe) => void;
  deleteRecipe: (id: string) => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  getRecipeById: (id: string) => Recipe | undefined;

  // Shopping List Workflow
  shoppingList: ShoppingItem[];
  addToShoppingList: (ingredients: Ingredient[], recipeTitle?: string) => void;
  toggleShoppingItem: (id: string) => void;
  deleteShoppingItem: (id: string) => void;
  clearCheckedShoppingItems: () => void;
  addCustomShoppingItem: (name: string, amount: string, unit: string) => void;

  // Onboarding Guide Workflow
  hasSeenOnboarding: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

const STORAGE_KEY_RECIPES = '@cookflow_recipes_v2';
const STORAGE_KEY_FAVS = '@cookflow_favs_v2';
const STORAGE_KEY_SHOPPING = '@cookflow_shopping_v2';
const STORAGE_KEY_ONBOARDING = '@cookflow_onboarding_v2';

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

// Safe storage helper
export const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch {
      // In-memory fallback
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem(key);
    } catch {
      // Fallback
    }
  },
};

export const RecipeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(['rec_01', 'rec_03']);
  const [selectedCategory, setSelectedCategory] = useState<Category>('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRecipeForCooking, setActiveRecipeForCooking] = useState<Recipe | null>(null);

  // Shopping list state
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([
    {
      id: 'shop_01',
      name: 'Thịt bò phi lê',
      amount: '300',
      unit: 'g',
      recipeTitle: 'Bò Lúc Lắc Sốt Tiêu',
      checked: false,
    },
    {
      id: 'shop_02',
      name: 'Ớt chuông đà lạt',
      amount: '2',
      unit: 'quả',
      recipeTitle: 'Bò Lúc Lắc Sốt Tiêu',
      checked: true,
    },
  ]);

  // Onboarding status state
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(false);

  useEffect(() => {
    loadPersistedData();
  }, []);

  const loadPersistedData = async () => {
    try {
      const storedRecipes = await safeStorage.getItem(STORAGE_KEY_RECIPES);
      const storedFavs = await safeStorage.getItem(STORAGE_KEY_FAVS);
      const storedShopping = await safeStorage.getItem(STORAGE_KEY_SHOPPING);
      const storedOnboarding = await safeStorage.getItem(STORAGE_KEY_ONBOARDING);

      if (storedRecipes) {
        const parsed = JSON.parse(storedRecipes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecipes(parsed);
        }
      } else {
        await safeStorage.setItem(STORAGE_KEY_RECIPES, JSON.stringify(INITIAL_RECIPES));
      }

      if (storedFavs) {
        const parsedFavs = JSON.parse(storedFavs);
        if (Array.isArray(parsedFavs)) {
          setFavoriteIds(parsedFavs);
        }
      }

      if (storedShopping) {
        const parsedShopping = JSON.parse(storedShopping);
        if (Array.isArray(parsedShopping)) {
          setShoppingList(parsedShopping);
        }
      }

      if (storedOnboarding === 'true') {
        setHasSeenOnboarding(true);
      } else {
        setHasSeenOnboarding(false);
      }
    } catch (e) {
      console.log('Using default state');
    }
  };

  const addRecipe = (newRecipeData: Omit<Recipe, 'id' | 'createdAt'>) => {
    const newRecipe: Recipe = {
      ...newRecipeData,
      id: `custom_${Date.now()}`,
      isCustom: true,
      createdAt: new Date().toISOString(),
      colorAccent: newRecipeData.colorAccent || '#FF6B6B',
    };
    const updated = [newRecipe, ...recipes];
    setRecipes(updated);
    safeStorage.setItem(STORAGE_KEY_RECIPES, JSON.stringify(updated));
  };

  const updateRecipe = (updatedRecipe: Recipe) => {
    const updated = recipes.map((r) => (r.id === updatedRecipe.id ? updatedRecipe : r));
    setRecipes(updated);
    safeStorage.setItem(STORAGE_KEY_RECIPES, JSON.stringify(updated));
  };

  const deleteRecipe = (id: string) => {
    const updated = recipes.filter((r) => r.id !== id);
    setRecipes(updated);
    safeStorage.setItem(STORAGE_KEY_RECIPES, JSON.stringify(updated));
  };

  const toggleFavorite = (id: string) => {
    let updated: string[];
    if (favoriteIds.includes(id)) {
      updated = favoriteIds.filter((fId) => fId !== id);
    } else {
      updated = [...favoriteIds, id];
    }
    setFavoriteIds(updated);
    safeStorage.setItem(STORAGE_KEY_FAVS, JSON.stringify(updated));
  };

  const isFavorite = (id: string) => favoriteIds.includes(id);

  const getRecipeById = (id: string) => recipes.find((r) => r.id === id);

  // Shopping List methods
  const addToShoppingList = (ingredients: Ingredient[], recipeTitle?: string) => {
    const newItems: ShoppingItem[] = ingredients.map((ing) => ({
      id: `shop_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      recipeTitle: recipeTitle || 'Công thức CookFlow',
      checked: false,
    }));
    const updated = [...newItems, ...shoppingList];
    setShoppingList(updated);
    safeStorage.setItem(STORAGE_KEY_SHOPPING, JSON.stringify(updated));
  };

  const toggleShoppingItem = (id: string) => {
    const updated = shoppingList.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setShoppingList(updated);
    safeStorage.setItem(STORAGE_KEY_SHOPPING, JSON.stringify(updated));
  };

  const deleteShoppingItem = (id: string) => {
    const updated = shoppingList.filter((item) => item.id !== id);
    setShoppingList(updated);
    safeStorage.setItem(STORAGE_KEY_SHOPPING, JSON.stringify(updated));
  };

  const clearCheckedShoppingItems = () => {
    const updated = shoppingList.filter((item) => !item.checked);
    setShoppingList(updated);
    safeStorage.setItem(STORAGE_KEY_SHOPPING, JSON.stringify(updated));
  };

  const addCustomShoppingItem = (name: string, amount: string, unit: string) => {
    if (!name.trim()) return;
    const newItem: ShoppingItem = {
      id: `shop_${Date.now()}`,
      name: name.trim(),
      amount: amount.trim() || '1',
      unit: unit.trim() || 'phần',
      recipeTitle: 'Mua tự do',
      checked: false,
    };
    const updated = [newItem, ...shoppingList];
    setShoppingList(updated);
    safeStorage.setItem(STORAGE_KEY_SHOPPING, JSON.stringify(updated));
  };

  // Onboarding methods
  const completeOnboarding = () => {
    setHasSeenOnboarding(true);
    safeStorage.setItem(STORAGE_KEY_ONBOARDING, 'true');
  };

  const resetOnboarding = () => {
    setHasSeenOnboarding(false);
    safeStorage.removeItem(STORAGE_KEY_ONBOARDING);
  };

  return (
    <RecipeContext.Provider
      value={{
        recipes,
        favoriteIds,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        activeRecipeForCooking,
        setActiveRecipeForCooking,
        addRecipe,
        updateRecipe,
        deleteRecipe,
        toggleFavorite,
        isFavorite,
        getRecipeById,
        shoppingList,
        addToShoppingList,
        toggleShoppingItem,
        deleteShoppingItem,
        clearCheckedShoppingItems,
        addCustomShoppingItem,
        hasSeenOnboarding,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </RecipeContext.Provider>
  );
};

export const useRecipes = () => {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error('useRecipes must be used within RecipeProvider');
  }
  return context;
};

