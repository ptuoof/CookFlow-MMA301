import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { HeronColors, Radius, Spacing } from '../constants/theme';
import { useRecipes } from '../context/RecipeContext';
import { useAuth } from '../context/AuthContext';
import { AppleButton } from './ui/AppleButton';
import { showAlert } from '../utils/dialog';
import { matchesSearch } from '../utils/text';
import { REQUEST_DETAILS_MAX, REQUEST_TITLE_MAX, REQUEST_TYPES } from '../utils/recipeRequests';

/**
 * Lets a user request a new recipe or report a problem with an existing one.
 * Opened from a recipe (that recipe is preselected) or from the profile (free choice).
 */
export const RequestRecipeModal = ({ visible, onClose, recipe: presetRecipe = null }) => {
  const { recipes, submitRecipeRequest } = useRecipes();
  const { user } = useAuth();
  const [type, setType] = useState('new_recipe');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [recipe, setRecipe] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) return;
    setType(presetRecipe ? 'wrong_info' : 'new_recipe');
    setRecipe(presetRecipe);
    setTitle('');
    setDetails('');
    setQuery('');
  }, [visible, presetRecipe]);

  const needsRecipe = type !== 'new_recipe';
  const matches = useMemo(() => needsRecipe && !recipe
    ? recipes.filter(r => !r.isCustom && matchesSearch([r.title, r.category], query)).slice(0, 6)
    : [], [needsRecipe, recipe, recipes, query]);

  const handleSubmit = () => {
    const result = submitRecipeRequest({ type, title, details, recipe: needsRecipe ? recipe : null, user });
    if (result.errors) {
      showAlert('Chưa gửi được', result.errors.map(e => `• ${e}`).join('\n'));
      return;
    }
    onClose();
    showAlert('Đã gửi yêu cầu ✓', 'Quản trị viên sẽ xem xét. Bạn theo dõi trạng thái trong Hồ sơ → Yêu cầu của tôi.');
  };

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tag}>GÓP Ý // YÊU CẦU CÔNG THỨC</Text>
            <Text style={styles.title}>{presetRecipe ? 'Báo cáo công thức' : 'Gửi yêu cầu'}</Text>
          </View>
          <Pressable accessibilityLabel="Đóng" onPress={onClose} style={styles.close}><Text style={styles.closeText}>✕</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Loại yêu cầu</Text>
          <View style={styles.typeGrid}>
            {REQUEST_TYPES.filter(t => !presetRecipe || t.id !== 'new_recipe').map(t => {
              const active = type === t.id;
              return <Pressable key={t.id} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => setType(t.id)} style={[styles.typeCard, active && styles.typeCardActive]}>
                  <Text style={styles.typeIcon}>{t.icon}</Text>
                  <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{t.label}</Text>
                  <Text style={styles.typeHint} numberOfLines={2}>{t.hint}</Text>
                </Pressable>;
            })}
          </View>

          {needsRecipe ? <>
              <Text style={styles.label}>Công thức</Text>
              {recipe ? <View style={styles.pickedRecipe}>
                  <Text style={styles.pickedTitle} numberOfLines={1}>{recipe.title}</Text>
                  {!presetRecipe ? <Pressable hitSlop={8} onPress={() => setRecipe(null)}><Text style={styles.change}>Đổi</Text></Pressable> : null}
                </View> : <>
                  <TextInput style={styles.input} placeholder="Tìm công thức cần báo cáo..." placeholderTextColor={HeronColors.disable} value={query} onChangeText={setQuery} />
                  {matches.map(r => <Pressable key={r.id} onPress={() => setRecipe(r)} style={styles.matchRow}>
                      <Text style={styles.matchTitle} numberOfLines={1}>{r.title}</Text>
                      <Text style={styles.matchMeta}>{r.category}</Text>
                    </Pressable>)}
                  {!matches.length ? <Text style={styles.hint}>Không tìm thấy công thức phù hợp.</Text> : null}
                </>}
            </> : null}

          <Text style={styles.label}>{type === 'new_recipe' ? 'Tên món bạn muốn có (*)' : 'Tiêu đề (tùy chọn)'}</Text>
          <TextInput style={styles.input} maxLength={REQUEST_TITLE_MAX} placeholder={type === 'new_recipe' ? 'Ví dụ: Bún bò Huế' : 'Ví dụ: Kcal ghi sai'} placeholderTextColor={HeronColors.disable} value={title} onChangeText={setTitle} />

          <Text style={styles.label}>Mô tả chi tiết (*)</Text>
          <TextInput style={[styles.input, styles.textArea]} multiline maxLength={REQUEST_DETAILS_MAX} placeholder={type === 'new_recipe' ? 'Khẩu vị, vùng miền, nguyên liệu bạn có...' : 'Chỗ nào chưa đúng? Nên sửa thế nào?'} placeholderTextColor={HeronColors.disable} value={details} onChangeText={setDetails} />
          <Text style={styles.counter}>{details.trim().length}/{REQUEST_DETAILS_MAX}</Text>

          <AppleButton title="Gửi cho quản trị viên" onPress={handleSubmit} style={{ marginTop: 8 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HeronColors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 18, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: HeronColors.border },
  tag: { fontSize: 10, fontWeight: '900', color: HeronColors.brand, letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: '900', color: HeronColors.primary, marginTop: 2 },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 15, fontWeight: '800', color: HeronColors.primary },
  content: { padding: Spacing.lg, paddingBottom: 48 },
  label: { fontSize: 12, fontWeight: '800', color: HeronColors.primary, marginTop: 16, marginBottom: 8 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: { width: '48%', flexGrow: 1, padding: 12, borderRadius: Radius.md, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, gap: 3 },
  typeCardActive: { borderColor: HeronColors.brand, backgroundColor: HeronColors.brandLight },
  typeIcon: { fontSize: 18 },
  typeLabel: { fontSize: 13, fontWeight: '800', color: HeronColors.primary },
  typeLabelActive: { color: HeronColors.brandHover },
  typeHint: { fontSize: 11, color: HeronColors.granite, lineHeight: 15 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: HeronColors.primary },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end', fontSize: 11, color: HeronColors.disable, marginTop: 4 },
  pickedRecipe: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: Radius.sm, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.brand },
  pickedTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: HeronColors.primary },
  change: { fontSize: 12, fontWeight: '800', color: HeronColors.brand },
  matchRow: { paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: HeronColors.borderLight },
  matchTitle: { fontSize: 14, fontWeight: '700', color: HeronColors.primary },
  matchMeta: { fontSize: 11, color: HeronColors.granite, marginTop: 2 },
  hint: { fontSize: 12, color: HeronColors.granite, marginTop: 8 }
});
