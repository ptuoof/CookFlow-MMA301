import React, { useEffect, useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeronColors, HeronShadow, Radius, Spacing } from '../constants/theme';
import { useRecipes } from '../context/RecipeContext';
import { useAuth } from '../context/AuthContext';
import { AppleButton } from './ui/AppleButton';
import { showAlert } from '../utils/dialog';
import { matchesSearch } from '../utils/text';
import { REQUEST_DETAILS_MAX, REQUEST_TITLE_MAX, REQUEST_TYPES } from '../utils/recipeRequests';

/** Background tint of each request type's icon (shared with the "Yêu cầu của tôi" list). */
export const REQUEST_TYPE_TINT = {
  new_recipe: HeronColors.brandLight,
  wrong_info: HeronColors.amberLight,
  improve: HeronColors.blueLight,
  inappropriate: '#FFF1F0'
};

/**
 * Lets a user request a new recipe or report a problem with an existing one.
 * Opened from a recipe (that recipe is preselected) or from the profile (free choice).
 */
export const RequestRecipeModal = ({ visible, onClose, recipe: presetRecipe = null }) => {
  const { recipes, submitRecipeRequest } = useRecipes();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  // Android draws the sheet edge-to-edge (no grey status / navigation bands): pad it ourselves
  const padTop = Platform.OS === 'android' ? insets.top : 0;
  const padBottom = Platform.OS === 'android' ? insets.bottom : 0;
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
  const isNew = type === 'new_recipe';
  const matches = useMemo(() => needsRecipe && !recipe
    ? recipes.filter(r => !r.isOwner && matchesSearch([r.title, r.category], query)).slice(0, 6)
    : [], [needsRecipe, recipe, recipes, query]);

  const [isSending, setIsSending] = useState(false);
  const handleSubmit = async () => {
    if (isSending) return;
    setIsSending(true);
    const result = await submitRecipeRequest({ type, title, details, recipe: needsRecipe ? recipe : null, user });
    setIsSending(false);
    if (result.errors) {
      showAlert('Chưa gửi được', result.errors.map(e => `• ${e}`).join('\n'));
      return;
    }
    onClose();
    showAlert('Đã gửi yêu cầu ✓', 'Quản trị viên sẽ xem xét. Bạn theo dõi trạng thái trong Hồ sơ → Yêu cầu & báo cáo.');
  };
  const detailsLength = details.trim().length;

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={[styles.container, { paddingTop: padTop }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tag}>📮 GÓP Ý</Text>
            <Text style={styles.title}>{presetRecipe ? 'Báo cáo công thức' : 'Gửi yêu cầu'}</Text>
            <Text style={styles.subtitle}>Quản trị viên sẽ phản hồi trong Hồ sơ của bạn.</Text>
          </View>
          <Pressable accessibilityLabel="Đóng" hitSlop={6} onPress={onClose} style={({ pressed }) => [styles.close, pressed && styles.pressed]}><Text style={styles.closeText}>✕</Text></Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.section}>Bạn muốn gửi gì?</Text>
          <View style={styles.typeGrid}>
            {REQUEST_TYPES.filter(t => !presetRecipe || t.id !== 'new_recipe').map(t => {
              const active = type === t.id;
              return <Pressable key={t.id} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => setType(t.id)} style={({ pressed }) => [styles.typeCard, active && styles.typeCardActive, pressed && styles.pressed]}>
                  <View style={styles.typeTop}>
                    <View style={[styles.typeIconBox, { backgroundColor: REQUEST_TYPE_TINT[t.id] }]}><Text style={styles.typeIcon}>{t.icon}</Text></View>
                    <View style={[styles.radio, active && styles.radioActive]}>{active ? <Text style={styles.radioCheck}>✓</Text> : null}</View>
                  </View>
                  <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{t.label}</Text>
                  <Text style={styles.typeHint} numberOfLines={2}>{t.hint}</Text>
                </Pressable>;
            })}
          </View>

          {needsRecipe ? <>
              <Text style={styles.section}>Công thức cần báo cáo</Text>
              {recipe ? <View style={styles.pickedRecipe}>
                  <Image source={{ uri: recipe.imageUrl }} style={styles.pickedImage} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickedTitle} numberOfLines={2}>{recipe.title}</Text>
                    <Text style={styles.matchMeta}>{recipe.category}</Text>
                  </View>
                  {!presetRecipe ? <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setRecipe(null)} style={({ pressed }) => [styles.changeBtn, pressed && styles.pressed]}><Text style={styles.change}>Đổi</Text></Pressable> : null}
                </View> : <View style={styles.card}>
                  <View style={styles.searchBox}>
                    <Text style={styles.searchIcon}>⌕</Text>
                    <TextInput style={styles.searchInput} placeholder="Tìm công thức..." placeholderTextColor={HeronColors.disable} value={query} onChangeText={setQuery} autoCorrect={false} />
                  </View>
                  {matches.map((r, index) => <Pressable key={r.id} onPress={() => setRecipe(r)} style={({ pressed }) => [styles.matchRow, index > 0 && styles.matchDivider, pressed && styles.pressed]}>
                      <Image source={{ uri: r.imageUrl }} style={styles.matchImage} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.matchTitle} numberOfLines={1}>{r.title}</Text>
                        <Text style={styles.matchMeta}>{r.category}</Text>
                      </View>
                      <Text style={styles.matchPick}>Chọn</Text>
                    </Pressable>)}
                  {!matches.length ? <Text style={styles.hint}>Không tìm thấy công thức phù hợp.</Text> : null}
                </View>}
            </> : null}

          <Text style={styles.section}>Nội dung</Text>
          <View style={styles.card}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{isNew ? 'Tên món bạn muốn có' : 'Tiêu đề'}{isNew ? <Text style={styles.required}> *</Text> : <Text style={styles.optional}>  (tùy chọn)</Text>}</Text>
              <Text style={styles.counter}>{title.trim().length}/{REQUEST_TITLE_MAX}</Text>
            </View>
            <TextInput style={styles.input} maxLength={REQUEST_TITLE_MAX} placeholder={isNew ? 'Ví dụ: Bún bò Huế' : 'Ví dụ: Kcal ghi sai'} placeholderTextColor={HeronColors.disable} value={title} onChangeText={setTitle} />

            <View style={[styles.labelRow, { marginTop: 14 }]}>
              <Text style={styles.label}>Mô tả chi tiết<Text style={styles.required}> *</Text></Text>
              <Text style={[styles.counter, detailsLength > 0 && detailsLength < 10 && styles.counterWarn]}>{detailsLength}/{REQUEST_DETAILS_MAX}</Text>
            </View>
            <TextInput style={[styles.input, styles.textArea]} multiline maxLength={REQUEST_DETAILS_MAX} placeholder={isNew ? 'Khẩu vị, vùng miền, nguyên liệu bạn có...' : 'Chỗ nào chưa đúng? Nên sửa thế nào?'} placeholderTextColor={HeronColors.disable} value={details} onChangeText={setDetails} />
            <Text style={styles.fieldHint}>Ít nhất 10 ký tự — càng cụ thể, quản trị viên xử lý càng nhanh.</Text>
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: 12 + padBottom }]}>
          <AppleButton title={isSending ? 'Đang gửi…' : 'Gửi cho quản trị viên'} disabled={isSending} onPress={handleSubmit} style={{ width: '100%' }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HeronColors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.lg, paddingTop: 18, paddingBottom: 6 },
  tag: { fontSize: 10, fontWeight: '900', color: HeronColors.brand, letterSpacing: 1.2 },
  title: { fontSize: 24, fontWeight: '900', color: HeronColors.primary, marginTop: 4, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, lineHeight: 18, color: HeronColors.granite, marginTop: 3 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 14, fontWeight: '800', color: HeronColors.primary },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 32 },
  section: { fontSize: 12, fontWeight: '800', color: HeronColors.granite, marginTop: 20, marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: { width: '47%', flexGrow: 1, padding: 14, borderRadius: Radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: HeronColors.border, gap: 4 },
  typeCardActive: { borderColor: HeronColors.brand, backgroundColor: '#FFFAF8', ...HeronShadow.subtle },
  typeTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  typeIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  typeIcon: { fontSize: 19 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: HeronColors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { backgroundColor: HeronColors.brand, borderColor: HeronColors.brand },
  radioCheck: { fontSize: 11, fontWeight: '900', color: '#FFFFFF' },
  typeLabel: { fontSize: 14, fontWeight: '800', color: HeronColors.primary },
  typeLabelActive: { color: HeronColors.brandHover },
  typeHint: { fontSize: 11, color: HeronColors.granite, lineHeight: 15 },
  card: { padding: 14, borderRadius: Radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '800', color: HeronColors.primary },
  required: { color: HeronColors.brand },
  optional: { fontSize: 12, fontWeight: '600', color: HeronColors.granite },
  counter: { fontSize: 11, fontWeight: '700', color: HeronColors.disable, fontVariant: ['tabular-nums'] },
  counterWarn: { color: HeronColors.amber },
  input: { backgroundColor: HeronColors.cardAlt, borderWidth: 1, borderColor: HeronColors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: HeronColors.primary },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  fieldHint: { marginTop: 6, fontSize: 11, lineHeight: 16, color: HeronColors.granite },
  searchBox: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: Radius.full, backgroundColor: HeronColors.cardAlt, borderWidth: 1, borderColor: HeronColors.border, marginBottom: 4 },
  searchIcon: { fontSize: 18, color: HeronColors.granite },
  searchInput: { flex: 1, fontSize: 14, color: HeronColors.primary, paddingVertical: 0 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  matchDivider: { borderTopWidth: 1, borderTopColor: HeronColors.borderLight },
  matchImage: { width: 40, height: 40, borderRadius: 10, backgroundColor: HeronColors.borderLight },
  matchTitle: { fontSize: 14, fontWeight: '700', color: HeronColors.primary },
  matchMeta: { fontSize: 11, color: HeronColors.granite, marginTop: 2 },
  matchPick: { fontSize: 12, fontWeight: '800', color: HeronColors.brand },
  pickedRecipe: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: Radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: HeronColors.brand },
  pickedImage: { width: 56, height: 56, borderRadius: 12, backgroundColor: HeronColors.borderLight },
  pickedTitle: { fontSize: 14, fontWeight: '800', color: HeronColors.primary },
  changeBtn: { height: 32, paddingHorizontal: 14, justifyContent: 'center', borderRadius: Radius.full, backgroundColor: HeronColors.brandLight },
  change: { fontSize: 12, fontWeight: '800', color: HeronColors.brandHover },
  hint: { fontSize: 12, color: HeronColors.granite, marginTop: 10, textAlign: 'center' },
  bottomBar: { paddingHorizontal: Spacing.lg, paddingTop: 12, backgroundColor: HeronColors.canvas, borderTopWidth: 1, borderTopColor: HeronColors.borderLight },
  pressed: { opacity: 0.75 }
});
