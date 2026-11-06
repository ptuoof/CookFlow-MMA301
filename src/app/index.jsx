import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecipes } from '../context/RecipeContext';
import { HeronColors, Radius, HeronShadow, Spacing } from '../constants/theme';
import { AppleBadge } from '../components/ui/AppleBadge';
import { RecipeDetailModal } from '../components/RecipeDetailModal';
import { CookingModeModal } from '../components/CookingModeModal';
import { CreateRecipeModal } from '../components/CreateRecipeModal';
import { MealPlanScreen } from '../components/MealPlanScreen';
import { ProfileScreen } from '../components/ProfileScreen';
import { AiChefChatModal } from '../components/AiChefChatModal';
import { AiChefLogo } from '../components/ui/AiChefLogo';
import { SettingsModal } from '../components/SettingsModal';
import { OnboardingModal } from '../components/OnboardingModal';
import { ShoppingListModal } from '../components/ShoppingListModal';
import { QrScannerModal } from '../components/QrScannerModal';
import { PantryFinderModal } from '../components/PantryFinderModal';
import { FloatingTimerWidget } from '../components/ui/FloatingTimerWidget';
import { DIET_TAGS, TIME_FILTERS, filterRecipes, userAllergensIn } from '../utils/dietary';
import { useAuth } from '../context/AuthContext';
import { AuthScreen } from '../components/AuthScreen';
import { AdminScreen } from '../components/AdminScreen';
import { hasTimer, hasVideo, totalMinutes } from '../utils/recipeModel';
import { confirmAction, showAlert } from '../utils/dialog';
import { DIFFICULTIES } from '../types/recipe';
import { ALL_CATEGORY } from '../utils/categories';
export default function AppMainScreen() {
  const auth = useAuth();
  const {
    recipes,
    activeRecipeForCooking,
    cookingStepIndex,
    startCookingSession,
    setCookingStep,
    setCookingServings,
    endCookingSession,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    toggleFavorite,
    isFavorite,
    hasSeenOnboarding,
    isHydrated,
    shoppingList,
    getRecipeById,
    settings,
    categories,
    timers
  } = useRecipes();
  const CATEGORIES = useMemo(() => [ALL_CATEGORY, ...categories], [categories]);
  // Extra explore filters (screen-local): max total minutes, difficulty, diet tag
  const [maxMinutes, setMaxMinutes] = useState(null);
  const [difficultyFilter, setDifficultyFilter] = useState(null);
  const [tagFilter, setTagFilter] = useState(null);
  const [showAllergenRecipes, setShowAllergenRecipes] = useState(false);
  const allergies = useMemo(() => settings.allergies || [], [settings.allergies]);
  // Bottom menu: 'explore' | 'plan' | 'profile' (fridge and shopping list open as sheets)
  const [currentTab, setCurrentTab] = useState('explore');
  // Sub-page of the profile tab: 'home' | 'myRecipes' | 'requests'
  const [profileView, setProfileView] = useState('home');
  const [isAiChatVisible, setIsAiChatVisible] = useState(false);

  // Modals state
  const [selectedRecipeForDetail, setSelectedRecipeForDetail] = useState(null);
  const [isCookingVisible, setIsCookingVisible] = useState(false);
  const [isCookingCountdown, setIsCookingCountdown] = useState(false);
  const endCookingCountdown = useCallback(() => setIsCookingCountdown(false), []);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  // Recipe whose copy is being created ("Tạo bản sao để chỉnh")
  const [templateRecipe, setTemplateRecipe] = useState(null);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);
  const [isShoppingListVisible, setIsShoppingListVisible] = useState(false);
  const [isQrScannerVisible, setIsQrScannerVisible] = useState(false);
  const [isPantryVisible, setIsPantryVisible] = useState(false);

  // Filtered recipes
  // Diacritic-insensitive: "pho bo" finds "Phở bò", "duong" finds "Đường"
  const hideAllergens = settings.hideAllergenRecipes && !showAllergenRecipes;
  const { visible: filteredRecipes, hiddenByAllergy } = useMemo(() => filterRecipes(recipes, {
    category: selectedCategory,
    query: searchQuery,
    maxMinutes,
    difficulty: difficultyFilter,
    tag: tagFilter,
    allergies,
    hideAllergens
  }), [recipes, selectedCategory, searchQuery, maxMinutes, difficultyFilter, tagFilter, allergies, hideAllergens]);
  // "Món nổi bật hôm nay" changes every day, never suggesting a dish with the user's allergens
  const featuredRecipe = useMemo(() => {
    const candidates = recipes.filter(r => !r.isCustom && !userAllergensIn(r, allergies).length);
    const pool = candidates.length ? candidates : recipes;
    const dayIndex = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
    return pool[dayIndex % Math.max(1, pool.length)];
  }, [recipes, allergies]);
  const pendingShoppingCount = shoppingList.filter(item => !item.checked).length;
  const hasExtraFilters = maxMinutes !== null || difficultyFilter !== null || tagFilter !== null;
  const isFiltering = searchQuery.trim() !== '' || selectedCategory !== 'Tất cả' || hasExtraFilters;
  const renderFilterChip = (label, active, onPress) => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.categoryChip, active && styles.categoryChipActive]}>
      <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{label}</Text>
    </Pressable>;
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Tất cả');
    setMaxMinutes(null);
    setDifficultyFilter(null);
    setTagFilter(null);
  };
  // iOS cannot present a modal or alert while another modal is still dismissing
  const afterModalDismiss = fn => {
    if (Platform.OS === 'ios') setTimeout(fn, 450);
    else fn();
  };
  // A recipe opened from "Tủ lạnh nhà tôi" goes back to it when closed (✕, back button, "all ready")
  const [isDetailFromPantry, setIsDetailFromPantry] = useState(false);
  const closeRecipeDetail = () => {
    setSelectedRecipeForDetail(null);
    if (!isDetailFromPantry) return;
    setIsDetailFromPantry(false);
    afterModalDismiss(() => setIsPantryVisible(true));
  };
  // The session ended elsewhere (dish finished, recipe deleted): the cooking screen is gone too
  useEffect(() => {
    if (!activeRecipeForCooking) {
      setIsCookingVisible(false);
      setIsCookingCountdown(false);
    }
  }, [activeRecipeForCooking]);
  const switchCookingTo = (recipe, start) => {
    const current = activeRecipeForCooking;
    if (!current || current.id === recipe.id) return start();
    return confirmAction({
      title: 'Đang nấu dở món khác',
      message: `"${current.title}" đang ở bước ${cookingStepIndex + 1}/${current.steps.length}. Bắt đầu món mới sẽ kết thúc phiên nấu đó.`,
      confirmText: 'Nấu món mới',
      cancelText: 'Giữ nguyên',
      onConfirm: start
    });
  };
  /** Starts (or resumes) cooking a recipe for the servings chosen on its detail screen. */
  const openCooking = (recipe, servings) => {
    if (!recipe?.steps?.length) {
      showAlert('Chưa có bước nấu', 'Công thức này chưa có bước hướng dẫn nào. Hãy sửa công thức để thêm bước trước khi nấu.');
      return;
    }
    // A new session opens on the 5-second "get ready" countdown; resuming never does
    const restart = () => {
      startCookingSession(recipe, { servings });
      setIsCookingCountdown(true);
      setIsCookingVisible(true);
    };
    if (activeRecipeForCooking?.id === recipe.id && cookingStepIndex > 0) {
      confirmAction({
        title: 'Tiếp tục món đang nấu?',
        message: `Bạn đang ở bước ${cookingStepIndex + 1}/${recipe.steps.length}. Chọn "Tiếp tục" để quay lại bước đó, hoặc "Nấu lại từ đầu".`,
        confirmText: 'Tiếp tục',
        cancelText: 'Nấu lại từ đầu',
        onConfirm: () => {
          if (servings) setCookingServings(servings);
          setIsCookingVisible(true);
        },
        onCancel: restart
      });
      return;
    }
    switchCookingTo(recipe, restart);
  };
  // Opens Cooking Mode on the step that owns the tapped timer
  const reopenTimerStep = timer => {
    const recipe = timer ? getRecipeById(timer.recipeId) : null;
    if (!recipe) return;
    const stepIndex = Math.max(0, recipe.steps.findIndex(step => step.id === timer.stepId));
    switchCookingTo(recipe, () => {
      if (activeRecipeForCooking?.id === recipe.id) setCookingStep(stepIndex);
      else startCookingSession(recipe, { stepIndex });
      setIsCookingVisible(true);
    });
  };
  const handleEndSession = () => confirmAction({
    title: 'Kết thúc phiên nấu?',
    message: `Tiến độ nấu "${activeRecipeForCooking?.title}" sẽ không được lưu nữa.`,
    confirmText: 'Kết thúc',
    destructive: true,
    onConfirm: endCookingSession
  });
  const handleEditRecipe = recipe => {
    setTemplateRecipe(null);
    setEditingRecipe(recipe);
    setIsCreateModalVisible(true);
  };
  const handleDuplicateRecipe = recipe => {
    setEditingRecipe(null);
    setTemplateRecipe(recipe);
    setIsCreateModalVisible(true);
  };
  const renderDockItem = ({ key, icon, label, active, badge, badgeMuted, onPress }) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={badge ? `${label}, ${badge}` : label} onPress={onPress} style={({ pressed }) => [styles.tabItem, active && styles.tabItemActive, pressed && { opacity: 0.7 }]}>
      <View>
        <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
        {badge ? <View style={[styles.badgeCounter, badgeMuted && styles.badgeMuted]}>
            <Text style={styles.badgeCounterText}>{badge > 99 ? '99+' : badge}</Text>
          </View> : null}
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>{label}</Text>
    </Pressable>;
  if (!auth.ready) return <SafeAreaView style={styles.safeArea} />;
  if (!auth.user) return <AuthScreen />;
  if (auth.user.role === 'admin') return <AdminScreen />;
  return <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        {/* Header (explore only; the other tabs have their own titles) */}
        {currentTab === 'explore' ? <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.brandRow}>
              <View style={styles.brandLogoBox}>
                <View style={styles.brandInnerDot} />
              </View>
              <Text style={styles.brandTag}>COOKFLOW // SYS.AI</Text>
            </View>
            <Text style={styles.appTitle} numberOfLines={1}>Chào, {auth.user.name?.trim().split(/\s+/).slice(-1)[0] || 'bạn'}!</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Mở hồ sơ" onPress={() => { setProfileView('home'); setCurrentTab('profile'); }} style={({ pressed }) => [styles.avatarButton, pressed && { opacity: 0.8 }]}>
            <Text style={styles.avatarInitial}>{(auth.user.name || '?').trim().split(/\s+/).slice(-1)[0][0]?.toUpperCase()}</Text>
          </Pressable>
        </View> : null}

        {currentTab === 'explore' ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Heron Precision Search Bar */}
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput style={styles.searchInput} placeholder="Tìm kiếm công thức, nguyên liệu..." placeholderTextColor={HeronColors.disable} value={searchQuery} onChangeText={setSearchQuery} returnKeyType="search" autoCorrect={false} clearButtonMode="never" />
              {searchQuery.length > 0 ? <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                  <Text style={styles.clearSearchText}>✕</Text>
                </Pressable> : null}
              {/* Scan a friend's recipe QR code */}
              <Pressable onPress={() => setIsQrScannerVisible(true)} style={styles.scanQrBtn} hitSlop={6}>
                <Text style={styles.scanQrIcon}>📷</Text>
                <Text style={styles.scanQrText}>QUÉT QR</Text>
              </Pressable>
            </View>

            {/* Category Filter Capsules */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat;
            return <Pressable key={cat} onPress={() => setSelectedCategory(cat)} style={({
              pressed
            }) => [styles.categoryChip, isSelected && styles.categoryChipActive, {
              transform: [{
                scale: pressed ? 0.95 : 1
              }]
            }]}>
                    <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                      {cat}
                    </Text>
                  </Pressable>;
          })}
            </ScrollView>

            {/* Time / difficulty / diet filters — tap again to turn one off */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              {TIME_FILTERS.map(minutes => renderFilterChip(`⏱ ≤ ${minutes} phút`, maxMinutes === minutes, () => setMaxMinutes(current => current === minutes ? null : minutes)))}
              {DIFFICULTIES.map(level => renderFilterChip(`🎯 ${level}`, difficultyFilter === level, () => setDifficultyFilter(current => current === level ? null : level)))}
              {DIET_TAGS.map(tag => renderFilterChip(`🏷 ${tag}`, tagFilter === tag, () => setTagFilter(current => current === tag ? null : tag)))}
            </ScrollView>

            {hiddenByAllergy > 0 || (showAllergenRecipes && allergies.length && settings.hideAllergenRecipes) ? <View style={styles.allergyNotice}>
                <Text style={styles.allergyNoticeText}>
                  {showAllergenRecipes ? 'Đang hiện cả món có thể chứa chất bạn dị ứng.' : `Đã ẩn ${hiddenByAllergy} món có thể chứa chất bạn dị ứng.`}
                </Text>
                <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setShowAllergenRecipes(value => !value)}>
                  <Text style={styles.allergyNoticeAction}>{showAllergenRecipes ? 'ẨN LẠI' : 'HIỆN'}</Text>
                </Pressable>
              </View> : null}

            {/* Featured Hero Card (Architectural Poster) */}
            {!isFiltering && featuredRecipe ? <Pressable onPress={() => setSelectedRecipeForDetail(featuredRecipe)} style={({
          pressed
        }) => [styles.heroCard, {
          transform: [{
            scale: pressed ? 0.98 : 1
          }]
        }]}>
                <Image source={{
            uri: featuredRecipe.imageUrl
          }} style={styles.heroImage} resizeMode="cover" />
                <View style={styles.heroOverlay}>
                  <View style={styles.heroTopRow}>
                    <View style={styles.heroBadge}>
                      <View style={styles.heroDot} />
                      <Text style={styles.heroBadgeText}>MÓN NỔI BẬT HÔM NAY</Text>
                    </View>
                    <Pressable onPress={e => {
                e.stopPropagation();
                toggleFavorite(featuredRecipe.id);
              }} style={styles.favCircle}>
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
                          ⏱ {totalMinutes(featuredRecipe)} PHÚT
                        </Text>
                      </View>
                      <View style={styles.heroMetaPill}>
                        <Text style={styles.heroMetaText}>🎯 {featuredRecipe.difficulty.toUpperCase()}</Text>
                      </View>
                      {featuredRecipe.calories ? <View style={styles.heroMetaPill}>
                          <Text style={styles.heroMetaText}>🔥 {featuredRecipe.calories} KCAL</Text>
                        </View> : null}
                      {hasVideo(featuredRecipe) || hasTimer(featuredRecipe) ? <View style={[styles.heroMetaPill, {
                  backgroundColor: HeronColors.brand
                }]}>
                        <Text style={[styles.heroMetaText, {
                    color: '#FFFFFF',
                    fontWeight: '900'
                  }]}>
                          {[hasVideo(featuredRecipe) && '🎥 VIDEO', hasTimer(featuredRecipe) && '⏱ TIMER'].filter(Boolean).join(' & ')}
                        </Text>
                      </View> : null}
                    </View>
                  </View>
                </View>
              </Pressable> : null}

            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionSquare} />
                <Text style={styles.sectionTitle}>
                  {searchQuery.trim() ? 'KẾT QUẢ TÌM KIẾM' : selectedCategory === 'Tất cả' ? 'DANH SÁCH CÔNG THỨC' : selectedCategory.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.sectionCount}>[{filteredRecipes.length}]</Text>
            </View>

            {/* Recipe Cards List (Precision Spec Cards) */}
            {filteredRecipes.length === 0 ? <View style={styles.noResultContainer}>
                <Text style={styles.noResultEmoji}>⌕</Text>
                <Text style={styles.noResultTitle}>Không tìm thấy công thức</Text>
                <Text style={styles.noResultText}>
                  Hãy thử từ khóa khác hoặc chuyển sang danh mục khác.
                </Text>
                {isFiltering ? <Pressable onPress={clearFilters} style={styles.resetFilterBtn}>
                    <Text style={styles.resetFilterText}>Xóa bộ lọc</Text>
                  </Pressable> : null}
              </View> : <View style={styles.recipeGrid}>
                {filteredRecipes.map(item => {
            const isFav = isFavorite(item.id);
            const itemAllergens = userAllergensIn(item, allergies);
            return <Pressable key={item.id} onPress={() => setSelectedRecipeForDetail(item)} style={({
              pressed
            }) => [styles.recipeCard, {
              transform: [{
                scale: pressed ? 0.98 : 1
              }]
            }]}>
                      {/* Image Wrap */}
                      <View style={styles.cardImageWrap}>
                        <Image source={{
                  uri: item.imageUrl
                }} style={styles.cardImage} resizeMode="cover" />
                        {hasVideo(item) ? <View style={styles.cardVideoTag}>
                          <Text style={styles.cardVideoTagText}>🎥 VIDEO</Text>
                        </View> : null}
                        <Pressable onPress={e => {
                  e.stopPropagation();
                  toggleFavorite(item.id);
                }} style={styles.cardFavBtn}>
                          <Text style={styles.cardFavText}>{isFav ? '❤️' : '🤍'}</Text>
                        </Pressable>
                      </View>

                      {/* Card Content */}
                      <View style={styles.cardInfo}>
                        <View style={styles.cardTopMeta}>
                          <AppleBadge label={item.category} variant="coral" />
                          <Text style={styles.cardTimeMeta}>
                            ⏱ {totalMinutes(item)}P
                          </Text>
                        </View>

                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.cardDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                        {itemAllergens.length ? <Text style={styles.cardAllergy} numberOfLines={1}>
                            ⚠ Có thể chứa: {itemAllergens.map(a => a.label).join(', ')}
                          </Text> : null}

                        {/* One line: kcal • difficulty • steps • timer (never wraps on narrow phones) */}
                        <Text style={styles.cardSpecLine} numberOfLines={1}>
                          {item.calories ? <Text style={styles.cardKcal}>🔥 {item.calories} KCAL  •  </Text> : null}
                          {item.difficulty.toUpperCase()}  •  {item.steps.length} BƯỚC
                          {hasTimer(item) ? <Text style={styles.cardTimerFlag}>  •  ⏱ HẸN GIỜ</Text> : null}
                        </Text>
                      </View>
                    </Pressable>;
          })}
              </View>}

            <View style={{
          height: 170
        }} />
          </ScrollView> : currentTab === 'plan' ? <MealPlanScreen onSelectRecipe={rec => setSelectedRecipeForDetail(rec)} /> : <ProfileScreen
            view={profileView}
            onChangeView={setProfileView}
            onSelectRecipe={rec => setSelectedRecipeForDetail(rec)}
            onEditRecipe={rec => handleEditRecipe(rec)}
            onOpenSettings={() => setIsSettingsModalVisible(true)}
            onOpenQr={() => setIsQrScannerVisible(true)}
            onOpenPantry={() => setIsPantryVisible(true)}
          />}

        {/* AI Sous-Chef chat bubble (general questions, meal ideas) */}
        {currentTab !== 'profile' ? <Pressable accessibilityRole="button" accessibilityLabel="Mở trợ lý AI" onPress={() => setIsAiChatVisible(true)} style={({ pressed }) => [styles.aiFab, { bottom: (timers.length || activeRecipeForCooking) && !isCookingVisible ? 170 : 104, transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
            <AiChefLogo size={52} />
          </Pressable> : null}

        {/* Bottom menu: 5 items, "+" (create) in the middle. The fridge opens from Hồ sơ */}
        <View style={styles.tabBarContainer}>
          <View style={styles.tabBar}>
            {renderDockItem({ key: 'explore', icon: '⌂', label: 'Khám phá', active: currentTab === 'explore', onPress: () => setCurrentTab('explore') })}
            {renderDockItem({ key: 'plan', icon: '🗓', label: 'Lịch ăn', active: currentTab === 'plan', onPress: () => setCurrentTab('plan') })}

            <Pressable accessibilityRole="button" accessibilityLabel="Tạo công thức mới" onPress={() => {
            setEditingRecipe(null);
            setTemplateRecipe(null);
            setIsCreateModalVisible(true);
          }} style={({
            pressed
          }) => [styles.tabCenterBtn, {
            transform: [{
              scale: pressed ? 0.94 : 1
            }]
          }]}>
              <Text style={styles.tabCenterIcon}>+</Text>
            </Pressable>

            {renderDockItem({ key: 'shopping', icon: '🛒', label: 'Đi chợ', active: isShoppingListVisible, badge: pendingShoppingCount || null, onPress: () => setIsShoppingListVisible(true) })}
            {renderDockItem({ key: 'profile', icon: '👤', label: 'Hồ sơ', active: currentTab === 'profile', onPress: () => { if (currentTab === 'profile') setProfileView('home'); setCurrentTab('profile'); } })}
          </View>
        </View>

        {/* Modals */}
        <RecipeDetailModal
          recipe={selectedRecipeForDetail}
          visible={!!selectedRecipeForDetail}
          onClose={closeRecipeDetail}
          // Opened from the pantry: "all ingredients ready" leads back to it
          onAllReady={isDetailFromPantry ? closeRecipeDetail : undefined}
          onStartCooking={(rec, servings) => {
            setIsDetailFromPantry(false);
            setSelectedRecipeForDetail(null);
            afterModalDismiss(() => openCooking(rec, servings));
          }}
          onEditRecipe={rec => {
            setIsDetailFromPantry(false);
            setSelectedRecipeForDetail(null);
            afterModalDismiss(() => handleEditRecipe(rec));
          }}
          onDuplicateRecipe={rec => {
            setIsDetailFromPantry(false);
            setSelectedRecipeForDetail(null);
            afterModalDismiss(() => handleDuplicateRecipe(rec));
          }}
        />

        <CookingModeModal
          recipe={activeRecipeForCooking}
          visible={!!activeRecipeForCooking && isCookingVisible}
          onClose={() => {
            setIsCookingCountdown(false);
            setIsCookingVisible(false);
          }}
          countdown={isCookingCountdown}
          onCountdownDone={endCookingCountdown}
        />

        {/* Timers, or the dish in progress when no timer is left: pinned on every tab */}
        {!isCookingVisible ? <FloatingTimerWidget onPress={reopenTimerStep} onOpenSession={() => setIsCookingVisible(true)} onEndSession={handleEndSession} bottomOffset={100} /> : null}

        <CreateRecipeModal visible={isCreateModalVisible} onClose={() => setIsCreateModalVisible(false)} editingRecipe={editingRecipe} templateRecipe={templateRecipe} />

        <SettingsModal visible={isSettingsModalVisible} onClose={() => setIsSettingsModalVisible(false)} onReopenOnboarding={() => setTimeout(() => setIsOnboardingVisible(true), Platform.OS === 'ios' ? 450 : 0)} />

        <OnboardingModal visible={isHydrated && (!hasSeenOnboarding || isOnboardingVisible)} onClose={() => setIsOnboardingVisible(false)} />

        <ShoppingListModal visible={isShoppingListVisible} onClose={() => setIsShoppingListVisible(false)} />

        <QrScannerModal visible={isQrScannerVisible} onClose={() => setIsQrScannerVisible(false)} onImported={() => {
          setProfileView('myRecipes');
          setCurrentTab('profile');
        }} />
        <AiChefChatModal visible={isAiChatVisible} onClose={() => setIsAiChatVisible(false)} recipe={null} />
        <PantryFinderModal
          visible={isPantryVisible}
          onClose={() => setIsPantryVisible(false)}
          onSelectRecipe={recipe => {
            setIsPantryVisible(false);
            setIsDetailFromPantry(true);
            afterModalDismiss(() => setSelectedRecipeForDetail(recipe));
          }}
        />
      </View>
    </SafeAreaView>;
}
const styles = StyleSheet.create({
  allergyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    backgroundColor: '#FFF4E6'
  },
  allergyNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#9C3D00'
  },
  allergyNoticeAction: {
    fontSize: 12,
    fontWeight: '900',
    color: HeronColors.brand
  },
  cardAllergy: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C'
  },
  resetFilterBtn: {
    marginTop: 14,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: HeronColors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  resetFilterText: {
    fontSize: 13,
    fontWeight: '800',
    color: HeronColors.brand
  },
  safeArea: {
    flex: 1,
    backgroundColor: HeronColors.canvas
  },
  page: {
    flex: 1,
    backgroundColor: HeronColors.canvas
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    backgroundColor: HeronColors.canvas
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2
  },
  brandLogoBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: HeronColors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandInnerDot: {
    width: 5,
    height: 5,
    borderRadius: 1,
    backgroundColor: HeronColors.brand
  },
  brandTag: {
    fontSize: 10,
    fontWeight: '900',
    color: HeronColors.brand,
    letterSpacing: 1
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: -0.8
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  accountButton: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: HeronColors.border
  },
  accountButtonText: { color: HeronColors.granite, fontSize: 13, fontWeight: '600' },
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
    ...HeronShadow.subtle
  },
  headerActionIcon: {
    fontSize: 18,
    color: HeronColors.primary
  },
  fridgeIcon: {
    width: 16,
    height: 21,
    borderWidth: 1.5,
    borderColor: HeronColors.primary,
    borderRadius: 3,
    position: 'relative'
  },
  fridgeDivider: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 7,
    height: 1,
    backgroundColor: HeronColors.primary
  },
  fridgeHandleTop: {
    position: 'absolute',
    right: 2,
    top: 3,
    width: 1.5,
    height: 3,
    backgroundColor: HeronColors.primary
  },
  fridgeHandleBottom: {
    position: 'absolute',
    right: 2,
    top: 11,
    width: 1.5,
    height: 4,
    backgroundColor: HeronColors.primary
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
    paddingHorizontal: 4
  },
  badgeCounterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900'
  },
  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: HeronColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...HeronShadow.subtle
  },
  avatarIcon: {
    fontSize: 18,
    color: HeronColors.primary
  },
  scrollContent: {
    paddingTop: Spacing.xs
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
    ...HeronShadow.subtle
  },
  searchIcon: {
    fontSize: 18,
    color: HeronColors.surface,
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: HeronColors.primary,
    fontWeight: '600'
  },
  clearSearchBtn: {
    padding: 4
  },
  clearSearchText: {
    fontSize: 12,
    color: HeronColors.disable,
    fontWeight: '800'
  },
  scanQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: HeronColors.borderLight
  },
  scanQrIcon: {
    fontSize: 14
  },
  scanQrText: {
    fontSize: 10,
    fontWeight: '900',
    color: HeronColors.brand,
    letterSpacing: 0.5
  },
  categoryScroll: {
    paddingHorizontal: Spacing.lg,
    gap: 6,
    paddingBottom: Spacing.md
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: HeronColors.border
  },
  categoryChipActive: {
    backgroundColor: HeronColors.primary,
    borderColor: HeronColors.primary
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: HeronColors.granite
  },
  categoryChipTextActive: {
    color: '#FFFFFF'
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
    ...HeronShadow.card
  },
  heroImage: {
    width: '100%',
    height: '100%'
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(40,40,40,0.5)',
    padding: 16,
    justifyContent: 'space-between'
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: HeronColors.brand
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: 0.5
  },
  favCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  favCircleText: {
    fontSize: 16
  },
  heroBottomRow: {
    gap: 4
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5
  },
  heroDesc: {
    fontSize: 13,
    color: '#E0E0DA',
    lineHeight: 18
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6
  },
  heroMetaPill: {
    backgroundColor: 'rgba(40,40,40,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs
  },
  heroMetaText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  sectionSquare: {
    width: 6,
    height: 6,
    backgroundColor: HeronColors.brand
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: 0.8
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.surface
  },
  recipeGrid: {
    paddingHorizontal: Spacing.lg,
    gap: 10
  },
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.subtle
  },
  cardImageWrap: {
    width: 100,
    height: 100,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    position: 'relative'
  },
  cardVideoTag: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(40, 40, 40, 0.85)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: Radius.xs
  },
  cardVideoTagText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  cardImage: {
    width: '100%',
    height: '100%'
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
    justifyContent: 'center'
  },
  cardFavText: {
    fontSize: 12
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
    paddingVertical: 2
  },
  cardTopMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTimeMeta: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.brand,
    letterSpacing: 0.5
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: HeronColors.primary,
    letterSpacing: -0.2
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 16,
    color: HeronColors.granite
  },
  cardSpecLine: {
    fontSize: 10,
    fontWeight: '800',
    color: HeronColors.surface,
    letterSpacing: 0.4
  },
  cardKcal: {
    color: HeronColors.brand
  },
  cardTimerFlag: {
    color: HeronColors.brand
  },
  cardSpecFooter: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center'
  },
  cardSpecText: {
    fontSize: 10,
    fontWeight: '800',
    color: HeronColors.surface,
    letterSpacing: 0.5
  },
  noResultContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24
  },
  noResultEmoji: {
    fontSize: 36,
    color: HeronColors.disable,
    marginBottom: 8
  },
  noResultTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: HeronColors.primary,
    marginBottom: 4
  },
  noResultText: {
    fontSize: 13,
    color: HeronColors.granite,
    textAlign: 'center'
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    right: 12,
    alignItems: 'center'
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.dock
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: Radius.md,
    gap: 2
  },
  tabItemActive: {
    backgroundColor: HeronColors.brandLight
  },
  tabIcon: {
    fontSize: 18,
    textAlign: 'center',
    color: HeronColors.surface,
    opacity: 0.75
  },
  tabIconActive: {
    opacity: 1,
    color: HeronColors.primary
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: HeronColors.surface,
    letterSpacing: 0.1
  },
  tabLabelActive: {
    color: HeronColors.brandHover
  },
  badgeMuted: {
    backgroundColor: HeronColors.primary
  },
  aiFab: {
    position: 'absolute',
    right: 14,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...HeronShadow.brandGlow
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  tabCenterBtn: {
    width: 46,
    height: 46,
    marginHorizontal: 4,
    borderRadius: Radius.full,
    backgroundColor: HeronColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...HeronShadow.brandGlow
  },
  tabCenterIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '900',
    lineHeight: 24
  }
});
