import React, { useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { HeronColors, Radius, HeronShadow, Spacing } from '../constants/theme';
import { useRecipes } from '../context/RecipeContext';

const normalize = value => (value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

export const PantryFinderModal = ({ visible, onClose, onSelectRecipe }) => {
  const { recipes, pantryIngredients, togglePantryIngredient, clearPantry, addToShoppingList } = useRecipes();
  const [query, setQuery] = useState('');

  const ingredientCatalog = useMemo(() => {
    const unique = new Map();
    recipes.forEach(recipe => (recipe.ingredients || []).forEach(ingredient => {
      const key = normalize(ingredient.name);
      if (key && !unique.has(key)) unique.set(key, ingredient.name.trim());
    }));
    return [...unique.values()].sort((a, b) => a.localeCompare(b, 'vi'));
  }, [recipes]);

  const visibleIngredients = useMemo(() => {
    const needle = normalize(query);
    return ingredientCatalog.filter(name => !needle || normalize(name).includes(needle));
  }, [ingredientCatalog, query]);

  const matches = useMemo(() => {
    if (pantryIngredients.length === 0) return [];
    const available = new Set(pantryIngredients.map(normalize));
    return recipes.map(recipe => {
      const ingredients = recipe.ingredients || [];
      const availableIngredients = ingredients.filter(item => available.has(normalize(item.name)));
      const missingIngredients = ingredients.filter(item => !available.has(normalize(item.name)));
      return { recipe, availableIngredients, missingIngredients };
    })
      .filter(result => result.availableIngredients.length > 0)
      .sort((a, b) => {
        const aComplete = a.missingIngredients.length === 0 ? 1 : 0;
        const bComplete = b.missingIngredients.length === 0 ? 1 : 0;
        return bComplete - aComplete
          || b.availableIngredients.length / b.recipe.ingredients.length - a.availableIngredients.length / a.recipe.ingredients.length
          || b.availableIngredients.length - a.availableIngredients.length;
      });
  }, [recipes, pantryIngredients]);

  const handleAddMissing = result => {
    if (!result.missingIngredients.length) return;
    addToShoppingList(result.missingIngredients, result.recipe.title);
    Alert.alert('Đã thêm vào giỏ', `Đã thêm ${result.missingIngredients.length} nguyên liệu còn thiếu cho món ${result.recipe.title}.`);
  };

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <View style={styles.container}>
      <View style={styles.dragHandleWrap}><View style={styles.dragHandle} /></View>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>COOKFLOW // PANTRY</Text>
          <Text style={styles.title}>Tủ lạnh nhà tôi</Text>
          <Text style={styles.subtitle}>Chọn nguyên liệu đang có để tìm món phù hợp.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng tủ lạnh" onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
          <Text style={styles.closeText}>Xong</Text>
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchGlyph}>⌕</Text>
        <TextInput
          accessibilityLabel="Tìm nguyên liệu trong danh sách"
          style={styles.searchInput}
          placeholder="Tìm nguyên liệu..."
          placeholderTextColor={HeronColors.surface}
          value={query}
          onChangeText={setQuery}
        />
        {query ? <Pressable accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm" hitSlop={4} onPress={() => setQuery('')} style={({ pressed }) => [styles.clearSearch, pressed && styles.pressed]}>
          <Text style={styles.clearSearchText}>×</Text>
        </Pressable> : null}
      </View>

      <View style={styles.inventoryHeading}>
        <View>
          <Text style={styles.sectionTitle}>NGUYÊN LIỆU CỦA BẠN</Text>
          <Text style={styles.sectionHint}>{pantryIngredients.length} nguyên liệu đã chọn</Text>
        </View>
        {pantryIngredients.length > 0 ? <Pressable accessibilityRole="button" onPress={clearPantry} style={({ pressed }) => [styles.clearAllButton, pressed && styles.pressed]}>
          <Text style={styles.clearAllText}>Bỏ chọn tất cả</Text>
        </Pressable> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ingredientList}>
        {visibleIngredients.map(name => {
          const selected = pantryIngredients.includes(name);
          return <Pressable
            key={normalize(name)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            onPress={() => togglePantryIngredient(name)}
            style={({ pressed }) => [styles.ingredientChip, selected && styles.ingredientChipSelected, pressed && styles.pressed]}
          >
            <Text style={[styles.chipCheck, selected && styles.chipCheckSelected]}>{selected ? '✓' : '+'}</Text>
            <Text style={[styles.ingredientChipText, selected && styles.ingredientChipTextSelected]}>{name}</Text>
          </Pressable>;
        })}
        {visibleIngredients.length === 0 ? <Text style={styles.noIngredients}>Không tìm thấy nguyên liệu phù hợp.</Text> : null}
      </ScrollView>

      <View style={styles.resultsHeading}>
        <View style={styles.resultsTitleRow}>
          <View style={styles.accentDot} />
          <Text style={styles.sectionTitle}>MÓN CÓ THỂ NẤU</Text>
        </View>
        <Text style={styles.resultCount}>[{matches.length}]</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultsList}>
        {pantryIngredients.length === 0 ? <View style={styles.emptyState}>
          <View style={styles.emptyMark}><Text style={styles.emptyMarkText}>+</Text></View>
          <Text style={styles.emptyTitle}>Bắt đầu từ tủ lạnh của bạn</Text>
          <Text style={styles.emptyCopy}>Chọn nguyên liệu ở trên để xem món nào nấu được và cần mua thêm gì.</Text>
        </View> : matches.length === 0 ? <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Chưa tìm thấy món phù hợp</Text>
          <Text style={styles.emptyCopy}>Thử chọn thêm nguyên liệu hoặc tìm bằng tên nguyên liệu khác.</Text>
        </View> : matches.map(result => {
          const complete = result.missingIngredients.length === 0;
          return <View key={result.recipe.id} style={styles.recipeCard}>
            <Pressable accessibilityRole="button" onPress={() => onSelectRecipe(result.recipe)} style={({ pressed }) => [styles.recipeMain, pressed && styles.pressed]}>
              <View style={[styles.statusDot, complete && styles.statusDotComplete]} />
              <View style={styles.recipeCopy}>
                <Text style={styles.recipeTitle} numberOfLines={2}>{result.recipe.title}</Text>
                <Text style={styles.recipeMeta}>
                  {result.availableIngredients.length}/{result.recipe.ingredients.length} nguyên liệu có sẵn
                  {complete ? ' · Đủ để nấu' : ` · Thiếu ${result.missingIngredients.length}`}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
            {!complete ? <Pressable accessibilityRole="button" onPress={() => handleAddMissing(result)} style={({ pressed }) => [styles.addMissingButton, pressed && styles.pressed]}>
              <Text style={styles.addMissingText}>Thêm {result.missingIngredients.length} món còn thiếu vào giỏ</Text>
            </Pressable> : null}
          </View>;
        })}
        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  </Modal>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HeronColors.canvas },
  dragHandleWrap: { alignItems: 'center', paddingVertical: 10 },
  dragHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#D1D5DB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: 12 },
  headerCopy: { flex: 1 },
  eyebrow: { color: HeronColors.brand, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 4 },
  title: { color: HeronColors.inkPrimary, fontSize: 22, lineHeight: 27, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: HeronColors.granite, fontSize: 13, lineHeight: 18, marginTop: 3 },
  closeButton: { minWidth: 56, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECECE8', borderRadius: Radius.full, paddingHorizontal: 14 },
  closeText: { color: HeronColors.inkPrimary, fontSize: 14, fontWeight: '800' },
  searchBar: { height: 46, flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, paddingHorizontal: 13, borderRadius: Radius.md, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border },
  searchGlyph: { color: HeronColors.granite, fontSize: 22, marginRight: 9 },
  searchInput: { flex: 1, color: HeronColors.inkPrimary, fontSize: 14 },
  clearSearch: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  clearSearchText: { color: HeronColors.granite, fontSize: 22 },
  inventoryHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 19, paddingBottom: 10 },
  sectionTitle: { color: HeronColors.inkPrimary, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  sectionHint: { color: HeronColors.granite, fontSize: 12, marginTop: 3 },
  clearAllButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  clearAllText: { color: HeronColors.brand, fontSize: 12, fontWeight: '800' },
  ingredientList: { paddingHorizontal: Spacing.lg, paddingBottom: 3, gap: 8, alignItems: 'center' },
  ingredientChip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: HeronColors.border, borderRadius: Radius.full, paddingHorizontal: 12, backgroundColor: '#FFFFFF' },
  ingredientChipSelected: { borderColor: HeronColors.brand, backgroundColor: HeronColors.brandLight },
  chipCheck: { color: HeronColors.granite, fontSize: 16, fontWeight: '800' },
  chipCheckSelected: { color: HeronColors.brand },
  ingredientChipText: { color: HeronColors.inkPrimary, fontSize: 12, fontWeight: '700' },
  ingredientChipTextSelected: { color: HeronColors.brandHover },
  noIngredients: { color: HeronColors.granite, fontSize: 13, paddingVertical: 12 },
  resultsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 19, marginHorizontal: Spacing.lg, marginBottom: 10 },
  resultsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accentDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: HeronColors.brand },
  resultCount: { color: HeronColors.surface, fontSize: 11, fontWeight: '800' },
  resultsList: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: 9 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25, paddingVertical: 32, backgroundColor: '#FFFFFF', borderRadius: Radius.lg, borderWidth: 1, borderColor: HeronColors.border },
  emptyMark: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: HeronColors.brandLight, marginBottom: 12 },
  emptyMarkText: { color: HeronColors.brand, fontSize: 23, fontWeight: '500' },
  emptyTitle: { color: HeronColors.inkPrimary, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  emptyCopy: { color: HeronColors.granite, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 5, maxWidth: 300 },
  recipeCard: { backgroundColor: '#FFFFFF', borderRadius: Radius.md, borderWidth: 1, borderColor: HeronColors.border, overflow: 'hidden', ...HeronShadow.subtle },
  recipeMain: { flexDirection: 'row', alignItems: 'center', minHeight: 72, paddingHorizontal: 13, paddingVertical: 11 },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: HeronColors.amber, marginRight: 11 },
  statusDotComplete: { backgroundColor: HeronColors.emerald },
  recipeCopy: { flex: 1 },
  recipeTitle: { color: HeronColors.inkPrimary, fontSize: 14, fontWeight: '800', lineHeight: 19 },
  recipeMeta: { color: HeronColors.granite, fontSize: 12, marginTop: 4 },
  chevron: { color: HeronColors.disable, fontSize: 25, marginLeft: 8 },
  addMissingButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: HeronColors.borderLight, backgroundColor: '#FCFCFB' },
  addMissingText: { color: HeronColors.brand, fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.72 }
});
