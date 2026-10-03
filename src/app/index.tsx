import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecipes } from '../context/RecipeContext';
import { Recipe, Category } from '../types/recipe';
import { HeronColors, Radius, HeronShadow, Spacing } from '../constants/theme';
import { AppleBadge } from '../components/ui/AppleBadge';
import { RecipeDetailModal } from '../components/RecipeDetailModal';
import { CookingModeModal } from '../components/CookingModeModal';
import { CreateRecipeModal } from '../components/CreateRecipeModal';
import { MyRecipesView } from '../components/MyRecipesView';
import { SettingsModal } from '../components/SettingsModal';
import { OnboardingModal } from '../components/OnboardingModal';
import { ShoppingListModal } from '../components/ShoppingListModal';

const CATEGORIES: Category[] = [
  'Tất cả',
  'Món nhanh ⚡',
  'Món chính 🍲',
  'Ăn kiêng 🥗',
  'Tráng miệng 🍰',
  'Thức uống 🍹',
];

export default function AppMainScreen() {
  const {
    recipes,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    toggleFavorite,
    isFavorite,
    hasSeenOnboarding,
    shoppingList,
  } = useRecipes();

  // Navigation tab state: 'explore' | 'myRecipes'
  const [currentTab, setCurrentTab] = useState<'explore' | 'myRecipes'>('explore');

  // Modals state
  const [selectedRecipeForDetail, setSelectedRecipeForDetail] = useState<Recipe | null>(null);
  const [activeRecipeForCooking, setActiveRecipeForCooking] = useState<Recipe | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);
  const [isShoppingListVisible, setIsShoppingListVisible] = useState(false);

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchCat =
        selectedCategory === 'Tất cả' || recipe.category === selectedCategory;
      const matchQuery =
        searchQuery.trim() === '' ||
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.ingredients.some((i) =>
          i.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      return matchCat && matchQuery;
    });
  }, [recipes, selectedCategory, searchQuery]);

  const featuredRecipe = recipes[0];

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsCreateModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        {/* Heron Architectural Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              <View style={styles.brandLogoBox}>
                <View style={styles.brandInnerDot} />
              </View>
              <Text style={styles.brandTag}>COOKFLOW // SYS.AI</Text>
            </View>
            <Text style={styles.appTitle}>Trợ Lý Nấu Ăn</Text>
          </View>

          <View style={styles.headerRightActions}>
            {/* Guide Button */}
            <Pressable
              onPress={() => setIsOnboardingVisible(true)}
              style={({ pressed }) => [
                styles.headerActionBtn,
                { transform: [{ scale: pressed ? 0.94 : 1 }] },
              ]}
            >
              <Text style={styles.headerActionIcon}>💡</Text>
            </Pressable>

            {/* Shopping List Button */}
            <Pressable
              onPress={() => setIsShoppingListVisible(true)}
              style={({ pressed }) => [
                styles.headerActionBtn,
                { transform: [{ scale: pressed ? 0.94 : 1 }] },
              ]}
            >
              <Text style={styles.headerActionIcon}>🛒</Text>
              {shoppingList.length > 0 ? (
                <View style={styles.badgeCounter}>
                  <Text style={styles.badgeCounterText}>{shoppingList.length}</Text>
                </View>
              ) : null}
            </Pressable>

            {/* Settings Button */}
            <Pressable
              onPress={() => setIsSettingsModalVisible(true)}
              style={({ pressed }) => [
                styles.headerActionBtn,
                { transform: [{ scale: pressed ? 0.94 : 1 }] },
              ]}
            >
              <Text style={styles.headerActionIcon}>⚙</Text>
            </Pressable>
          </View>
        </View>

        {currentTab === 'explore' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Heron Precision Search Bar */}
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm công thức, nguyên liệu..."
                placeholderTextColor={HeronColors.disable}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 ? (
                <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                  <Text style={styles.clearSearchText}>✕</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Category Filter Capsules */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    style={({ pressed }) => [
                      styles.categoryChip,
                      isSelected && styles.categoryChipActive,
                      { transform: [{ scale: pressed ? 0.95 : 1 }] },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Featured Hero Card (Architectural Poster) */}
            {searchQuery.trim() === '' && selectedCategory === 'Tất cả' && featuredRecipe ? (
              <Pressable
                onPress={() => setSelectedRecipeForDetail(featuredRecipe)}
                style={({ pressed }) => [
                  styles.heroCard,
                  { transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
              >
                <Image
                  source={{ uri: featuredRecipe.imageUrl }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
                <View style={styles.heroOverlay}>
                  <View style={styles.heroTopRow}>
                    <View style={styles.heroBadge}>
                      <View style={styles.heroDot} />
                      <Text style={styles.heroBadgeText}>MÓN NỔI BẬT HÔM NAY</Text>
                    </View>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleFavorite(featuredRecipe.id);
                      }}
                      style={styles.favCircle}
                    >
                      <Text style={styles.favCircleText}>
                        {isFavorite(featuredRecipe.id) ? '❤️' : '🤍'}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.heroBottomRow}>
                    <Text style={styles.heroTitle}>{featuredRecipe.title}</Text>
                    <Text style={styles.heroDesc} numberOfLines={2}>
                      {featuredRecipe.description}
                    </Text>
                    <View style={styles.heroMetaRow}>
                      <View style={styles.heroMetaPill}>
                        <Text style={styles.heroMetaText}>
                          ⏱ {featuredRecipe.prepTimeMinutes + featuredRecipe.cookTimeMinutes} PHÚT
                        </Text>
                      </View>
                      <View style={styles.heroMetaPill}>
                        <Text style={styles.heroMetaText}>🎯 {featuredRecipe.difficulty.toUpperCase()}</Text>
                      </View>
                      <View style={[styles.heroMetaPill, { backgroundColor: HeronColors.brand }]}>
                        <Text style={[styles.heroMetaText, { color: '#FFFFFF', fontWeight: '900' }]}>
                          🎥 VIDEO & ⏱ TIMER
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Pressable>
            ) : null}

            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionSquare} />
                <Text style={styles.sectionTitle}>
                  {selectedCategory === 'Tất cả' ? 'DANH SÁCH CÔNG THỨC' : selectedCategory.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.sectionCount}>[{filteredRecipes.length}]</Text>
            </View>

            {/* Recipe Cards List (Precision Spec Cards) */}
            {filteredRecipes.length === 0 ? (
              <View style={styles.noResultContainer}>
                <Text style={styles.noResultEmoji}>⌕</Text>
                <Text style={styles.noResultTitle}>Không tìm thấy công thức</Text>
                <Text style={styles.noResultText}>
                  Hãy thử từ khóa khác hoặc chuyển sang danh mục khác.
                </Text>
              </View>
            ) : (
              <View style={styles.recipeGrid}>
                {filteredRecipes.map((item) => {
                  const isFav = isFavorite(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setSelectedRecipeForDetail(item)}
                      style={({ pressed }) => [
                        styles.recipeCard,
                        { transform: [{ scale: pressed ? 0.98 : 1 }] },
                      ]}
                    >
                      {/* Image Wrap */}
                      <View style={styles.cardImageWrap}>
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.cardImage}
                          resizeMode="cover"
                        />
                        <View style={styles.cardVideoTag}>
                          <Text style={styles.cardVideoTagText}>🎥 VIDEO</Text>
                        </View>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item.id);
                          }}
                          style={styles.cardFavBtn}
                        >
                          <Text style={styles.cardFavText}>{isFav ? '❤️' : '🤍'}</Text>
                        </Pressable>
                      </View>

                      {/* Card Content */}
                      <View style={styles.cardInfo}>
                        <View style={styles.cardTopMeta}>
                          <AppleBadge label={item.category} variant="coral" />
                          <Text style={styles.cardTimeMeta}>
                            ⏱ {item.prepTimeMinutes + item.cookTimeMinutes}P
                          </Text>
                        </View>

                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.cardDesc} numberOfLines={2}>
                          {item.description}
                        </Text>

                        <View style={styles.cardSpecFooter}>
                          <Text style={styles.cardSpecText}>ĐỘ KHÓ: {item.difficulty.toUpperCase()}</Text>
                          <Text style={styles.cardSpecText}>•</Text>
                          <Text style={styles.cardSpecText}>{item.steps.length} BƯỚC NẤU</Text>
                          <Text style={styles.cardSpecText}>•</Text>
                          <Text style={[styles.cardSpecText, { color: HeronColors.brand, fontWeight: '800' }]}>
                            ⏱ ĐẾM GIỜ
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={{ height: 110 }} />
          </ScrollView>
        ) : (
          <MyRecipesView
            onSelectRecipe={(rec) => setSelectedRecipeForDetail(rec)}
            onEditRecipe={(rec) => handleEditRecipe(rec)}
          />
        )}

        {/* Floating Heron Dock Bar */}
        <View style={styles.tabBarContainer}>
          <View style={styles.tabBar}>
            {/* Tab 1: Khám phá */}
            <Pressable
              onPress={() => setCurrentTab('explore')}
              style={[
                styles.tabItem,
                currentTab === 'explore' && styles.tabItemActive,
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  currentTab === 'explore' && styles.tabLabelActive,
                ]}
              >
                KHÁM PHÁ
              </Text>
            </Pressable>

            {/* Tab 2: Nút Tạo món ở giữa (Heron Flame Accent) */}
            <Pressable
              onPress={() => {
                setEditingRecipe(null);
                setIsCreateModalVisible(true);
              }}
              style={({ pressed }) => [
                styles.tabCenterBtn,
                { transform: [{ scale: pressed ? 0.94 : 1 }] },
              ]}
            >
              <Text style={styles.tabCenterIcon}>+</Text>
            </Pressable>

            {/* Tab 3: Món của tôi */}
            <Pressable
              onPress={() => setCurrentTab('myRecipes')}
              style={[
                styles.tabItem,
                currentTab === 'myRecipes' && styles.tabItemActive,
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  currentTab === 'myRecipes' && styles.tabLabelActive,
                ]}
              >
                CỦA TÔI
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Modals */}
        <RecipeDetailModal
          recipe={selectedRecipeForDetail}
          visible={!!selectedRecipeForDetail}
          onClose={() => setSelectedRecipeForDetail(null)}
          onStartCooking={(rec) => setActiveRecipeForCooking(rec)}
        />

        <CookingModeModal
          recipe={activeRecipeForCooking}
          visible={!!activeRecipeForCooking}
          onClose={() => setActiveRecipeForCooking(null)}
        />

        <CreateRecipeModal
          visible={isCreateModalVisible}
          onClose={() => setIsCreateModalVisible(false)}
          editingRecipe={editingRecipe}
        />

        <SettingsModal
          visible={isSettingsModalVisible}
          onClose={() => setIsSettingsModalVisible(false)}
          onReopenOnboarding={() => setIsOnboardingVisible(true)}
        />

        <OnboardingModal
          visible={!hasSeenOnboarding || isOnboardingVisible}
          onClose={() => setIsOnboardingVisible(false)}
        />

        <ShoppingListModal
          visible={isShoppingListVisible}
          onClose={() => setIsShoppingListVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: HeronColors.canvas,
  },
  page: {
    flex: 1,
    backgroundColor: HeronColors.canvas,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    backgroundColor: HeronColors.canvas,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  brandLogoBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: HeronColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandInnerDot: {
    width: 5,
    height: 5,
    borderRadius: 1,
    backgroundColor: HeronColors.brand,
  },
  brandTag: {
    fontSize: 10,
    fontWeight: '900',
    color: HeronColors.brand,
    letterSpacing: 1,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: -0.8,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: HeronColors.border,
    position: 'relative',
    ...HeronShadow.subtle,
  },
  headerActionIcon: {
    fontSize: 18,
    color: HeronColors.primary,
  },
  badgeCounter: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: HeronColors.accentFlame,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeCounterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.subtle,
  },
  avatarIcon: {
    fontSize: 18,
    color: HeronColors.primary,
  },
  scrollContent: {
    paddingTop: Spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: HeronColors.border,
    marginBottom: Spacing.md,
    ...HeronShadow.subtle,
  },
  searchIcon: {
    fontSize: 18,
    color: HeronColors.surface,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: HeronColors.primary,
    fontWeight: '600',
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 12,
    color: HeronColors.disable,
    fontWeight: '800',
  },
  categoryScroll: {
    paddingHorizontal: Spacing.lg,
    gap: 6,
    paddingBottom: Spacing.md,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: HeronColors.border,
  },
  categoryChipActive: {
    backgroundColor: HeronColors.primary,
    borderColor: HeronColors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: HeronColors.granite,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  heroCard: {
    marginHorizontal: Spacing.lg,
    height: 230,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.card,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: 'rgba(40,40,40,0.5)',
    padding: 16,
    justifyContent: 'space-between',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: HeronColors.brand,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: 0.5,
  },
  favCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favCircleText: {
    fontSize: 16,
  },
  heroBottomRow: {
    gap: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroDesc: {
    fontSize: 13,
    color: '#E0E0DA',
    lineHeight: 18,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  heroMetaPill: {
    backgroundColor: 'rgba(40,40,40,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  heroMetaText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionSquare: {
    width: 6,
    height: 6,
    backgroundColor: HeronColors.brand,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.surface,
  },
  recipeGrid: {
    paddingHorizontal: Spacing.lg,
    gap: 10,
  },
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.subtle,
  },
  cardImageWrap: {
    width: 100,
    height: 100,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  cardVideoTag: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(40, 40, 40, 0.85)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  cardVideoTagText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardFavBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFavText: {
    fontSize: 12,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  cardTopMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTimeMeta: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.brand,
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: HeronColors.primary,
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 16,
    color: HeronColors.granite,
  },
  cardSpecFooter: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  cardSpecText: {
    fontSize: 10,
    fontWeight: '800',
    color: HeronColors.surface,
    letterSpacing: 0.5,
  },
  noResultContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  noResultEmoji: {
    fontSize: 36,
    color: HeronColors.disable,
    marginBottom: 8,
  },
  noResultTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: HeronColors.primary,
    marginBottom: 4,
  },
  noResultText: {
    fontSize: 13,
    color: HeronColors.granite,
    textAlign: 'center',
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.dock,
  },
  tabItem: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: Radius.full,
  },
  tabItemActive: {
    backgroundColor: HeronColors.cardAlt,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: HeronColors.surface,
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: HeronColors.primary,
  },
  tabCenterBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: HeronColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...HeronShadow.brandGlow,
  },
  tabCenterIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '900',
    lineHeight: 24,
  },
});
