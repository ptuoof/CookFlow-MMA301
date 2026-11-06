import React, { useMemo, useState } from 'react';
import { Image, Modal, Platform, View, Text, StyleSheet, ScrollView, Pressable, TextInput, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeronColors, Radius, HeronShadow, Spacing } from '../constants/theme';
import { useRecipes } from '../context/RecipeContext';
import { normalizeVi as normalize } from '../utils/text';
import { confirmAction, showAlert } from '../utils/dialog';
import { isInPantry as isAvailable, isStapleIngredient, pantryKeysOf } from '../utils/pantry';

const SEARCH_LIMIT = 40;

/**
 * "Tủ lạnh nhà tôi": what is at home (chips with ✕), suggestions to add more, and the recipes that
 * can be cooked with it — complete ones first, each with what is missing and a shortcut to buy it.
 */
export const PantryFinderModal = ({ visible, onClose, onSelectRecipe }) => {
  const { recipes, pantryIngredients, togglePantryIngredient, clearPantry, addToShoppingList, settings, updateSettings } = useRecipes();
  const insets = useSafeAreaInsets();
  // Android draws the sheet edge-to-edge (no grey status / navigation bands): pad it ourselves
  const padTop = Platform.OS === 'android' ? insets.top : 0;
  const padBottom = Platform.OS === 'android' ? insets.bottom : 0;
  const [query, setQuery] = useState('');
  // Shared with the recipe checklist, so both screens agree on what is "missing"
  const assumeStaples = settings.assumeStaples;
  const setAssumeStaples = value => updateSettings({ assumeStaples: value });
  const pantryKeys = useMemo(() => pantryKeysOf(pantryIngredients), [pantryIngredients]);
  const trimmedQuery = query.trim();
  const canAddCustom = trimmedQuery.length > 1 && !pantryKeys.includes(normalize(trimmedQuery));

  const ingredientCatalog = useMemo(() => {
    const unique = new Map();
    recipes.forEach(recipe => (recipe.ingredients || []).forEach(ingredient => {
      const key = normalize(ingredient.name);
      if (key && !unique.has(key)) unique.set(key, ingredient.name.trim());
    }));
    return [...unique.values()].sort((a, b) => a.localeCompare(b, 'vi'));
  }, [recipes]);

  // Suggestions = catalog items not in the pantry yet (the pantry itself is shown above)
  const suggestions = useMemo(() => {
    const needle = normalize(query);
    return ingredientCatalog.filter(name => !pantryKeys.includes(normalize(name)) && (!needle || normalize(name).includes(needle)));
  }, [ingredientCatalog, pantryKeys, query]);

  const matches = useMemo(() => {
    if (pantryKeys.length === 0) return [];
    return recipes.map(recipe => {
      const ingredients = recipe.ingredients || [];
      const availableIngredients = ingredients.filter(item => isAvailable(item.name, pantryKeys));
      const missingIngredients = ingredients.filter(item => !isAvailable(item.name, pantryKeys) && !(assumeStaples && isStapleIngredient(item.name)));
      const counted = availableIngredients.length + missingIngredients.length;
      return { recipe, availableIngredients, missingIngredients, counted };
    })
      .filter(result => result.availableIngredients.length > 0)
      .sort((a, b) => {
        const aComplete = a.missingIngredients.length === 0 ? 1 : 0;
        const bComplete = b.missingIngredients.length === 0 ? 1 : 0;
        return bComplete - aComplete
          || a.missingIngredients.length - b.missingIngredients.length
          || b.availableIngredients.length / Math.max(1, b.counted) - a.availableIngredients.length / Math.max(1, a.counted);
      });
  }, [recipes, pantryKeys, assumeStaples]);
  const readyCount = matches.filter(result => result.missingIngredients.length === 0).length;

  const handleAddMissing = async result => {
    if (!result.missingIngredients.length) return;
    const saved = await addToShoppingList(result.missingIngredients, result.recipe.title);
    if (!saved) return;
    const { added, merged } = saved;
    showAlert('Đã cập nhật giỏ đi chợ', `Món ${result.recipe.title}: thêm mới ${added}${merged ? `, cộng dồn ${merged}` : ''} nguyên liệu còn thiếu.`);
  };
  const handleClearPantry = () => confirmAction({
    title: 'Xóa hết nguyên liệu trong tủ?',
    message: `${pantryIngredients.length} nguyên liệu đã chọn sẽ bị bỏ chọn.`,
    confirmText: 'Xóa hết',
    destructive: true,
    onConfirm: clearPantry
  });
  const handleAddCustom = () => {
    if (!canAddCustom) return;
    togglePantryIngredient(trimmedQuery);
    setQuery('');
  };

  const renderSuggestion = name => <Pressable key={normalize(name)} accessibilityRole="button" accessibilityLabel={`Thêm ${name} vào tủ`} onPress={() => togglePantryIngredient(name)} style={({ pressed }) => [styles.suggestChip, pressed && styles.pressed]}>
      <Text style={styles.suggestPlus}>＋</Text>
      <Text style={styles.suggestText}>{name}</Text>
    </Pressable>;
  const customChip = canAddCustom ? <Pressable accessibilityRole="button" onPress={handleAddCustom} style={({ pressed }) => [styles.suggestChip, styles.customChip, pressed && styles.pressed]}>
      <Text style={[styles.suggestPlus, { color: '#FFFFFF' }]}>＋</Text>
      <Text style={[styles.suggestText, { color: '#FFFFFF' }]}>Thêm “{trimmedQuery}”</Text>
    </Pressable> : null;

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
    <View style={[styles.container, { paddingTop: padTop }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>🧊 TỦ LẠNH</Text>
          <Text style={styles.title}>Tủ lạnh nhà tôi</Text>
          <Text style={styles.subtitle}>Chọn thứ đang có, CookFlow gợi ý món nấu được.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng tủ lạnh" hitSlop={6} onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchGlyph}>⌕</Text>
        <TextInput
          accessibilityLabel="Tìm hoặc thêm nguyên liệu"
          style={styles.searchInput}
          placeholder="Tìm hoặc thêm nguyên liệu..."
          placeholderTextColor={HeronColors.disable}
          value={query}
          onChangeText={setQuery}
          returnKeyType="done"
          onSubmitEditing={handleAddCustom}
          autoCorrect={false}
        />
        {query ? <Pressable accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm" hitSlop={6} onPress={() => setQuery('')} style={({ pressed }) => [styles.clearSearch, pressed && styles.pressed]}>
          <Text style={styles.clearSearchText}>✕</Text>
        </Pressable> : null}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 28 + padBottom }}>
        {/* What is at home */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Đang có trong tủ</Text>
            <View style={styles.countPill}><Text style={styles.countText}>{pantryIngredients.length}</Text></View>
            <View style={{ flex: 1 }} />
            {pantryIngredients.length > 0 ? <Pressable accessibilityRole="button" hitSlop={8} onPress={handleClearPantry} style={({ pressed }) => pressed && styles.pressed}>
              <Text style={styles.clearAllText}>Bỏ chọn tất cả</Text>
            </Pressable> : null}
          </View>
          {pantryIngredients.length ? <View style={styles.pantryWrap}>
              {pantryIngredients.map(name => <Pressable key={`have_${normalize(name)}`} accessibilityRole="button" accessibilityLabel={`Bỏ ${name} khỏi tủ`} onPress={() => togglePantryIngredient(name)} style={({ pressed }) => [styles.haveChip, pressed && styles.pressed]}>
                  <Text style={styles.haveText}>{name}</Text>
                  <View style={styles.haveRemove}><Text style={styles.haveRemoveText}>✕</Text></View>
                </Pressable>)}
            </View> : <Text style={styles.cardHint}>Tủ đang trống. Chạm vào gợi ý bên dưới hoặc gõ tên nguyên liệu để thêm.</Text>}
        </View>

        {/* Suggestions: one scrollable row, or wrapped results while searching */}
        <Text style={styles.sectionLabel}>{trimmedQuery ? `Kết quả cho “${trimmedQuery}”` : 'Gợi ý thêm vào tủ'}</Text>
        {trimmedQuery ? <View style={[styles.pantryWrap, { paddingHorizontal: Spacing.lg }]}>
            {customChip}
            {suggestions.slice(0, SEARCH_LIMIT).map(renderSuggestion)}
            {!suggestions.length && !canAddCustom ? <Text style={styles.cardHint}>Không còn nguyên liệu nào khớp.</Text> : null}
          </View> : <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.suggestRow} contentContainerStyle={styles.suggestRowContent}>
            {suggestions.map(renderSuggestion)}
          </ScrollView>}

        <View style={[styles.card, styles.staplesCard]}>
          <View style={styles.staplesIcon}><Text style={{ fontSize: 18 }}>🧂</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.staplesTitle}>Gia vị cơ bản luôn có sẵn</Text>
            <Text style={styles.cardHint}>Muối, đường, tiêu, dầu ăn…</Text>
          </View>
          <Switch value={assumeStaples} onValueChange={setAssumeStaples} thumbColor="#FFFFFF" trackColor={{ false: HeronColors.border, true: HeronColors.brand }} />
        </View>

        <View style={styles.resultsHeading}>
          <Text style={styles.resultsTitle}>Món có thể nấu</Text>
          <View style={styles.countPill}><Text style={styles.countText}>{matches.length}</Text></View>
          <View style={{ flex: 1 }} />
          {readyCount ? <Text style={styles.readyText}>✓ {readyCount} món đủ nguyên liệu</Text> : null}
        </View>

        <View style={styles.resultsList}>
          {pantryIngredients.length === 0 ? <View style={styles.emptyState}>
            <View style={styles.emptyMark}><Text style={{ fontSize: 28 }}>🥕</Text></View>
            <Text style={styles.emptyTitle}>Bắt đầu từ tủ lạnh của bạn</Text>
            <Text style={styles.emptyCopy}>Thêm vài nguyên liệu để xem món nào nấu được và cần mua thêm gì.</Text>
          </View> : matches.length === 0 ? <View style={styles.emptyState}>
            <View style={styles.emptyMark}><Text style={{ fontSize: 28 }}>🔍</Text></View>
            <Text style={styles.emptyTitle}>Chưa tìm thấy món phù hợp</Text>
            <Text style={styles.emptyCopy}>Thử thêm nguyên liệu hoặc tìm bằng tên nguyên liệu khác.</Text>
          </View> : matches.map(result => {
            const complete = result.missingIngredients.length === 0;
            const ratio = result.counted ? result.availableIngredients.length / result.counted : 0;
            const missingNames = result.missingIngredients.map(item => item.name).join(', ');
            return <View key={result.recipe.id} style={styles.recipeCard}>
              <Pressable accessibilityRole="button" onPress={() => onSelectRecipe(result.recipe)} style={({ pressed }) => [styles.recipeMain, pressed && styles.pressed]}>
                <Image source={{ uri: result.recipe.imageUrl }} style={styles.recipeImage} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.recipeTitle} numberOfLines={2}>{result.recipe.title}</Text>
                  <View style={styles.progressRow}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.round(ratio * 100)}%` }, complete && styles.progressDone]} />
                    </View>
                    <Text style={styles.progressText}>{result.availableIngredients.length}/{result.counted}</Text>
                  </View>
                  <View style={[styles.statusChip, complete ? styles.statusReady : styles.statusMissing]}>
                    <Text style={[styles.statusText, { color: complete ? HeronColors.emerald : HeronColors.amber }]}>{complete ? '✓ Đủ để nấu' : `Thiếu ${result.missingIngredients.length}`}</Text>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
              {!complete ? <View style={styles.missingBox}>
                <Text style={styles.missingText} numberOfLines={2}><Text style={styles.missingLabel}>Còn thiếu: </Text>{missingNames}</Text>
                <Pressable accessibilityRole="button" onPress={() => handleAddMissing(result)} style={({ pressed }) => [styles.addMissingButton, pressed && styles.pressed]}>
                  <Text style={styles.addMissingText}>🛒  Thêm {result.missingIngredients.length} nguyên liệu còn thiếu vào giỏ</Text>
                </Pressable>
              </View> : null}
            </View>;
          })}
        </View>
      </ScrollView>
    </View>
  </Modal>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HeronColors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.lg, paddingTop: 18, paddingBottom: Spacing.md },
  eyebrow: { color: HeronColors.brand, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { marginTop: 4, color: HeronColors.inkPrimary, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: HeronColors.granite, fontSize: 13, lineHeight: 18, marginTop: 3 },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: HeronColors.inkPrimary, fontSize: 14, fontWeight: '800' },
  searchBar: { height: 48, flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginBottom: 14, paddingLeft: 14, paddingRight: 6, borderRadius: Radius.full, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border },
  searchGlyph: { color: HeronColors.granite, fontSize: 20, marginRight: 8 },
  searchInput: { flex: 1, color: HeronColors.inkPrimary, fontSize: 14, paddingVertical: 0 },
  clearSearch: { width: 30, height: 30, borderRadius: 15, backgroundColor: HeronColors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  clearSearchText: { color: HeronColors.granite, fontSize: 12, fontWeight: '800' },
  card: { marginHorizontal: Spacing.lg, padding: 14, borderRadius: Radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: HeronColors.primary },
  cardHint: { marginTop: 2, fontSize: 12, lineHeight: 17, color: HeronColors.granite },
  countPill: { minWidth: 22, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: HeronColors.brand, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 11, fontWeight: '900', color: '#FFFFFF' },
  clearAllText: { color: HeronColors.brand, fontSize: 12, fontWeight: '800' },
  pantryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  haveChip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingLeft: 12, paddingRight: 5, borderRadius: Radius.full, backgroundColor: HeronColors.brandLight, borderWidth: 1, borderColor: '#FFD8CF' },
  haveText: { fontSize: 13, fontWeight: '700', color: HeronColors.brandHover },
  haveRemove: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  haveRemoveText: { fontSize: 10, fontWeight: '900', color: HeronColors.brandHover },
  sectionLabel: { marginTop: 20, marginBottom: 2, marginHorizontal: Spacing.lg + 4, fontSize: 12, fontWeight: '800', color: HeronColors.granite, textTransform: 'uppercase', letterSpacing: 0.6 },
  suggestRow: { flexGrow: 0 },
  suggestRowContent: { paddingHorizontal: Spacing.lg, paddingTop: 10, gap: 8 },
  suggestChip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, paddingHorizontal: 12, borderRadius: Radius.full, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border },
  customChip: { backgroundColor: HeronColors.brand, borderColor: HeronColors.brand },
  suggestPlus: { fontSize: 13, fontWeight: '800', color: HeronColors.brand },
  suggestText: { fontSize: 13, fontWeight: '700', color: HeronColors.primary },
  staplesCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  staplesIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: HeronColors.amberLight, alignItems: 'center', justifyContent: 'center' },
  staplesTitle: { fontSize: 14, fontWeight: '800', color: HeronColors.primary },
  resultsHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 10, marginHorizontal: Spacing.lg + 4 },
  resultsTitle: { fontSize: 18, fontWeight: '900', color: HeronColors.primary, letterSpacing: -0.3 },
  readyText: { fontSize: 12, fontWeight: '800', color: HeronColors.emerald },
  resultsList: { paddingHorizontal: Spacing.lg, gap: 10 },
  emptyState: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 30, backgroundColor: '#FFFFFF', borderRadius: Radius.lg, borderWidth: 1, borderColor: HeronColors.border },
  emptyMark: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: HeronColors.brandLight, marginBottom: 12 },
  emptyTitle: { color: HeronColors.inkPrimary, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptyCopy: { color: HeronColors.granite, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 5, maxWidth: 300 },
  recipeCard: { backgroundColor: '#FFFFFF', borderRadius: Radius.lg, borderWidth: 1, borderColor: HeronColors.border, overflow: 'hidden', ...HeronShadow.subtle },
  recipeMain: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  recipeImage: { width: 76, height: 76, borderRadius: 14, backgroundColor: HeronColors.borderLight },
  recipeTitle: { color: HeronColors.inkPrimary, fontSize: 14, fontWeight: '800', lineHeight: 19 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: HeronColors.borderLight, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: HeronColors.amber },
  progressDone: { backgroundColor: HeronColors.emerald },
  progressText: { fontSize: 11, fontWeight: '800', color: HeronColors.secondary, fontVariant: ['tabular-nums'] },
  statusChip: { alignSelf: 'flex-start', marginTop: 7, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  statusReady: { backgroundColor: HeronColors.emeraldLight },
  statusMissing: { backgroundColor: HeronColors.amberLight },
  statusText: { fontSize: 11, fontWeight: '800' },
  chevron: { color: HeronColors.disable, fontSize: 24 },
  missingBox: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: HeronColors.borderLight, backgroundColor: HeronColors.cardAlt, gap: 10 },
  missingText: { fontSize: 12, lineHeight: 17, color: HeronColors.secondary },
  missingLabel: { fontWeight: '800', color: HeronColors.primary },
  addMissingButton: { height: 40, borderRadius: Radius.full, backgroundColor: HeronColors.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  addMissingText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.72 }
});
