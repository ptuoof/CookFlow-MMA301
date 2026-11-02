import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { confirmAction, showAlert } from '../utils/dialog';
import { parseIntInRange } from '../utils/quantity';
import { normalizeVi } from '../utils/text';
import { DEFAULT_RECIPE_IMAGE, makeId } from '../utils/recipeModel';
import { persistMedia } from '../utils/media';
import { MINUTES_MAX, SERVINGS_MAX, SERVINGS_MIN, TIMER_MINUTES_MAX } from '../constants/limits';
import { CATEGORIES as ALL_CATEGORIES } from '../types/recipe';
import { DIET_TAGS, detectAllergens } from '../utils/dietary';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeronColors, Radius, HeronShadow, Spacing } from '../constants/theme';
import { useRecipes } from '../context/RecipeContext';
const CATEGORIES = ALL_CATEGORIES.filter(cat => cat !== 'Tất cả');
const DIFFICULTIES = ['Dễ', 'Vừa', 'Khó'];
const COPY_SUFFIX = ' (bản sao)';
const emptyIngredient = () => ({ id: makeId('i'), name: '', amount: '', unit: 'gram' });
const emptyStep = title => ({ id: makeId('s'), title, instruction: '', timerMinutes: '', tip: '' });

// Form values for a recipe being edited, or for a blank new recipe
const toFormState = recipe => recipe ? {
  title: recipe.title,
  description: recipe.description,
  imageUrl: recipe.imageUrl,
  videoUrl: recipe.videoUrl || '',
  category: recipe.category,
  prepTime: recipe.prepTimeMinutes.toString(),
  cookTime: recipe.cookTimeMinutes.toString(),
  servings: recipe.servings.toString(),
  difficulty: recipe.difficulty,
  tags: recipe.tags || [],
  ingredients: recipe.ingredients,
  steps: recipe.steps.map(s => ({
    id: s.id,
    title: s.title,
    instruction: s.instruction,
    timerMinutes: s.timerSeconds ? Math.max(1, Math.round(s.timerSeconds / 60)).toString() : '',
    tip: s.tip || '',
    image: s.image,
    videoUrl: s.videoUrl
  }))
} : {
  title: '',
  description: '',
  imageUrl: '',
  videoUrl: '',
  category: 'Món nhanh ⚡',
  prepTime: '10',
  cookTime: '15',
  servings: '2',
  difficulty: 'Dễ',
  tags: [],
  ingredients: [emptyIngredient()],
  steps: [emptyStep('Chuẩn bị nguyên liệu')]
};

// Comparable text of everything the user can change; ids and UI-only flags are ignored
const snapshotOf = form => JSON.stringify([
  form.title, form.description, form.imageUrl, form.videoUrl, form.category,
  form.prepTime, form.cookTime, form.servings, form.difficulty, [...(form.tags || [])].sort(),
  form.ingredients.map(i => [i.name, i.amount, i.unit].map(v => String(v ?? '').trim())),
  form.steps.map(s => [s.title, s.instruction, s.timerMinutes, s.tip, s.image, s.videoUrl].map(v => String(v ?? '').trim()))
].map(v => typeof v === 'string' ? v.trim() : v));

export const CreateRecipeModal = ({
  visible,
  onClose,
  editingRecipe,
  templateRecipe
}) => {
  const {
    addRecipe,
    updateRecipe,
    findDuplicateRecipe
  } = useRecipes();

  // Recipe basic info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageSourceMode, setImageSourceMode] = useState('album');
  const [videoSourceMode, setVideoSourceMode] = useState('album');
  const [category, setCategory] = useState('Món nhanh ⚡');
  const [prepTime, setPrepTime] = useState('10');
  const [cookTime, setCookTime] = useState('15');
  const [servings, setServings] = useState('2');
  const [difficulty, setDifficulty] = useState('Dễ');
  const [tags, setTags] = useState([]);

  // Ingredients
  const [ingredients, setIngredients] = useState(() => [emptyIngredient()]);

  // Steps
  const [steps, setSteps] = useState(() => [emptyStep('Chuẩn bị nguyên liệu')]);
  const [isSaving, setIsSaving] = useState(false);
  // Live preview of allergens found in the ingredient names being typed
  const detectedAllergens = detectAllergens({ ingredients: ingredients.filter(i => (i.name || '').trim()) });
  // Snapshot of the values the form was opened with, to detect unsaved changes
  const initialSnapshotRef = useRef(snapshotOf(toFormState(null)));
  const applyFormState = form => {
    setTitle(form.title);
    setDescription(form.description);
    setImageUrl(form.imageUrl);
    setVideoUrl(form.videoUrl);
    // If it's a web URL, default to link, else album
    setImageSourceMode(form.imageUrl?.startsWith('http') ? 'link' : 'album');
    setVideoSourceMode(form.videoUrl?.startsWith('http') ? 'link' : 'album');
    setCategory(form.category);
    setPrepTime(form.prepTime);
    setCookTime(form.cookTime);
    setServings(form.servings);
    setDifficulty(form.difficulty);
    setTags(form.tags || []);
    setIngredients(form.ingredients);
    setSteps(form.steps);
    initialSnapshotRef.current = snapshotOf(form);
  };
  useEffect(() => {
    if (editingRecipe) applyFormState(toFormState(editingRecipe));
    // A copy starts from the template's values; nothing is saved until the user taps Lưu
    else if (templateRecipe) applyFormState({ ...toFormState(templateRecipe), title: `${templateRecipe.title}${COPY_SUFFIX}` });
    else applyFormState(toFormState(null));
  }, [editingRecipe, templateRecipe, visible]);
  const resetForm = () => applyFormState(toFormState(null));

  // Image & Video Picker Handlers
  const pickMainImageFromLibrary = async () => {
    try {
      const {
        status
      } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Cần quyền truy cập Album', 'Vui lòng cấp quyền truy cập thư viện ảnh để tải ảnh món ăn từ máy của bạn.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUrl(result.assets[0].uri);
      }
    } catch (e) {
      showAlert('Lỗi', 'Không thể mở thư viện ảnh: ' + String(e));
    }
  };
  const pickMainVideoFromLibrary = async () => {
    try {
      const {
        status
      } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Cần quyền truy cập Album', 'Vui lòng cấp quyền truy cập thư viện để tải video giới thiệu món ăn từ máy của bạn.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.85
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setVideoUrl(result.assets[0].uri);
      }
    } catch (e) {
      showAlert('Lỗi', 'Không thể mở thư viện video: ' + String(e));
    }
  };
  const pickStepImageFromLibrary = async index => {
    try {
      const {
        status
      } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Cần quyền truy cập', 'Vui lòng cấp quyền mở album ảnh để chọn ảnh cho bước này.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        updateStepField(index, 'image', result.assets[0].uri);
      }
    } catch (e) {
      showAlert('Lỗi', 'Không thể chọn ảnh: ' + String(e));
    }
  };
  const pickStepVideoFromLibrary = async index => {
    try {
      const {
        status
      } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Cần quyền truy cập', 'Vui lòng cấp quyền mở album để chọn video cho bước này.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 0.8
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        updateStepField(index, 'videoUrl', result.assets[0].uri);
      }
    } catch (e) {
      showAlert('Lỗi', 'Không thể chọn video: ' + String(e));
    }
  };

  // Ingredients handlers
  const addIngredientRow = () => {
    setIngredients(prev => [...prev, {
      id: makeId('i'),
      name: '',
      amount: '',
      unit: 'muỗng'
    }]);
  };
  const updateIngredient = (index, field, value) => {
    setIngredients(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };
  const removeIngredient = index => {
    if (ingredients.length > 1) {
      setIngredients(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Steps handlers
  const addStepRow = () => {
    setSteps(prev => [...prev, emptyStep(`Bước ${prev.length + 1}`)]);
  };
  const updateStepField = (index, field, value) => {
    setSteps(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };
  const removeStep = index => {
    if (steps.length > 1) {
      setSteps(prev => prev.filter((_, i) => i !== index));
    }
  };
  const handleSave = async () => {
    if (isSaving) return;
    const errors = [];
    const cleanTitle = title.trim();
    if (!cleanTitle) errors.push('Nhập tên món ăn.');
    const prep = parseIntInRange(prepTime, 0, MINUTES_MAX);
    const cook = parseIntInRange(cookTime, 0, MINUTES_MAX);
    const portions = parseIntInRange(servings, SERVINGS_MIN, SERVINGS_MAX);
    if (prep === null) errors.push(`Thời gian sơ chế phải là số phút từ 0 đến ${MINUTES_MAX}.`);
    if (cook === null) errors.push(`Thời gian nấu phải là số phút từ 0 đến ${MINUTES_MAX}.`);
    if (prep !== null && cook !== null && prep + cook === 0) errors.push('Tổng thời gian sơ chế + nấu phải lớn hơn 0 phút.');
    if (portions === null) errors.push(`Khẩu phần phải từ ${SERVINGS_MIN} đến ${SERVINGS_MAX} người.`);
    const validIngredients = ingredients
      .filter(i => (i.name || '').trim() !== '')
      .map((i, idx) => ({ ...i, id: i.id || `i${idx + 1}`, name: i.name.trim(), amount: String(i.amount ?? '').trim() || 'Vừa đủ', unit: String(i.unit ?? '').trim() }));
    if (validIngredients.length === 0) errors.push('Thêm ít nhất 1 nguyên liệu có tên.');
    const seenNames = new Set();
    validIngredients.forEach(i => {
      const key = normalizeVi(i.name);
      if (seenNames.has(key)) errors.push(`Nguyên liệu "${i.name}" bị nhập trùng.`);
      seenNames.add(key);
    });
    // A step is kept only if it has instructions; a default title alone is not a real step
    const filledSteps = steps.filter(s => (s.instruction || '').trim() !== '');
    if (filledSteps.length === 0) errors.push('Thêm ít nhất 1 bước nấu có nội dung hướng dẫn.');
    const validSteps = [];
    filledSteps.forEach((s, idx) => {
      const minutesText = String(s.timerMinutes ?? '').trim();
      const minutes = minutesText ? parseIntInRange(minutesText, 1, TIMER_MINUTES_MAX) : null;
      if (minutesText && minutes === null) errors.push(`Bước ${idx + 1}: hẹn giờ phải là số phút từ 1 đến ${TIMER_MINUTES_MAX}.`);
      validSteps.push({
        id: s.id,
        stepNumber: idx + 1,
        title: (s.title || '').trim() || `Bước ${idx + 1}`,
        instruction: s.instruction.trim(),
        image: s.image?.trim() || undefined,
        videoUrl: s.videoUrl?.trim() || undefined,
        timerSeconds: minutes ? minutes * 60 : null,
        tip: s.tip?.trim() ? s.tip.trim() : undefined
      });
    });
    if (errors.length) {
      showAlert('Chưa thể lưu công thức', errors.map(e => `• ${e}`).join('\n'));
      return;
    }
    setIsSaving(true);
    // Album picks live in a purgeable cache: copy them next to the app data before saving
    const [finalImageUrl, finalVideoUrl, ...stepMedia] = await Promise.all([
      persistMedia(imageUrl.trim() || DEFAULT_RECIPE_IMAGE),
      persistMedia(videoUrl.trim() || undefined),
      ...validSteps.flatMap(s => [persistMedia(s.image), persistMedia(s.videoUrl)])
    ]);
    setIsSaving(false);
    validSteps.forEach((s, idx) => {
      s.image = stepMedia[idx * 2];
      s.videoUrl = stepMedia[idx * 2 + 1];
    });
    const payload = {
      title: cleanTitle,
      description: description.trim() || 'Món ăn tự sáng tạo thơm ngon bổ dưỡng.',
      imageUrl: finalImageUrl,
      videoUrl: finalVideoUrl,
      category,
      prepTimeMinutes: prep,
      cookTimeMinutes: cook,
      servings: portions,
      difficulty,
      tags,
      ingredients: validIngredients,
      steps: validSteps
    };
    const commit = () => {
      if (editingRecipe) {
        updateRecipe({ ...editingRecipe, ...payload });
        showAlert('Thành công! 🎉', 'Công thức của bạn đã được cập nhật.');
      } else if (templateRecipe) {
        // Keep fields the form does not edit (calories, accent color); the copy stands on its own
        const { id, isCustom, createdAt, updatedAt, variantOf, aiChanges, copiedFrom, ...rest } = templateRecipe;
        addRecipe({ ...rest, ...payload, copiedFrom: id, colorAccent: rest.colorAccent || HeronColors.brand });
        showAlert('Đã tạo bản sao 🎉', `"${payload.title}" đã được lưu vào mục "Của tôi → Tự tạo". Công thức gốc giữ nguyên.`);
      } else {
        addRecipe({ ...payload, colorAccent: HeronColors.brand });
        showAlert('Thành công! 🎉', 'Món mới đã được lưu vào mục "Của tôi → Tự tạo".');
      }
      resetForm();
      onClose();
    };
    // Same title + same ingredient set as an existing recipe: probably saved twice by mistake
    const duplicate = editingRecipe ? null : findDuplicateRecipe(payload);
    if (duplicate) {
      confirmAction({
        title: 'Món này đã có trong danh sách',
        message: `"${duplicate.title}" có cùng tên và bộ nguyên liệu. Vẫn lưu thành món mới?`,
        confirmText: 'Vẫn lưu',
        cancelText: 'Xem lại',
        onConfirm: commit
      });
      return;
    }
    commit();
  };
  const handleRequestClose = () => {
    // Any edited field counts (amounts, timers, tips, media...), not only the title or row count
    const isDirty = snapshotOf({
      title, description, imageUrl, videoUrl, category, prepTime, cookTime, servings, difficulty, tags, ingredients, steps
    }) !== initialSnapshotRef.current;
    if (!isDirty) return onClose();
    return confirmAction({
      title: 'Bỏ thay đổi?',
      message: 'Nội dung bạn vừa nhập sẽ không được lưu.',
      confirmText: 'Bỏ thay đổi',
      cancelText: 'Tiếp tục sửa',
      destructive: true,
      onConfirm: onClose
    });
  };
  return <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" transparent={false} onRequestClose={handleRequestClose}>
      <SafeAreaView style={{
      flex: 1,
      backgroundColor: HeronColors.canvas
    }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{
        flex: 1
      }}>
        <View style={styles.container}>
          {/* Top Bar Header */}
          <View style={styles.topBar}>
            <Pressable onPress={handleRequestClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Hủy</Text>
            </Pressable>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerSubtitle}>COOKFLOW // STUDIO</Text>
              <Text style={styles.headerTitle}>
                {editingRecipe ? 'Sửa Công Thức' : templateRecipe ? 'Tạo Bản Sao' : 'Tạo Món Ăn Mới'}
              </Text>
            </View>
            <Pressable onPress={handleSave} disabled={isSaving} style={styles.saveBtn}>
              <Text style={styles.saveText}>{isSaving ? 'Đang lưu…' : 'Lưu ➔'}</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Card 1: Ảnh đại diện món ăn (Hỗ trợ Thư viện Album & Link) */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLabelWrap}>
                  <View style={styles.accentDot} />
                  <Text style={styles.cardTitle}>ẢNH ĐẠI DIỆN MÓN ĂN</Text>
                </View>
                <Text style={styles.requiredStar}>(*)</Text>
              </View>

              {/* Segmented Switcher: Chọn từ Album vs Nhập Link */}
              <View style={styles.segmentedControl}>
                <Pressable onPress={() => setImageSourceMode('album')} style={[styles.segmentBtn, imageSourceMode === 'album' && styles.segmentBtnActive]}>
                  <Text style={[styles.segmentText, imageSourceMode === 'album' && styles.segmentTextActive]}>
                    🖼️ TỪ ALBUM MÁY
                  </Text>
                </Pressable>

                <Pressable onPress={() => setImageSourceMode('link')} style={[styles.segmentBtn, imageSourceMode === 'link' && styles.segmentBtnActive]}>
                  <Text style={[styles.segmentText, imageSourceMode === 'link' && styles.segmentTextActive]}>
                    🔗 DÙNG LINK URL
                  </Text>
                </Pressable>
              </View>

              {imageSourceMode === 'album' ? <View style={styles.mediaPickerContainer}>
                  {imageUrl ? <View style={styles.imagePreviewWrap}>
                      <Image source={{
                    uri: imageUrl
                  }} style={styles.imagePreview} resizeMode="cover" />
                      <View style={styles.imagePreviewOverlay}>
                        <View style={styles.imageBadge}>
                          <Text style={styles.imageBadgeText}>
                            {imageUrl.startsWith('http') ? 'ẢNH TỪ WEB' : 'ẢNH TỪ ALBUM THIẾT BỊ'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.imagePreviewActions}>
                        <Pressable onPress={pickMainImageFromLibrary} style={styles.repickBtn}>
                          <Text style={styles.repickBtnText}>🖼️ Đổi ảnh khác từ máy</Text>
                        </Pressable>
                        <Pressable onPress={() => setImageUrl('')} style={styles.removeMediaBtn}>
                          <Text style={styles.removeMediaText}>✕ Xóa</Text>
                        </Pressable>
                      </View>
                    </View> : <Pressable onPress={pickMainImageFromLibrary} style={styles.uploadDropzone}>
                      <View style={styles.uploadIconCircle}>
                        <Text style={styles.uploadIcon}>📷</Text>
                      </View>
                      <Text style={styles.uploadTitle}>Chọn ảnh từ Album máy của bạn</Text>
                      <Text style={styles.uploadSubtitle}>
                        Chạm vào đây để mở thư viện ảnh • Hỗ trợ JPG, PNG, WEBP
                      </Text>
                      <View style={styles.uploadActionButton}>
                        <Text style={styles.uploadActionButtonText}>MỞ THƯ VIỆN ẢNH ➔</Text>
                      </View>
                    </Pressable>}
                </View> : <View style={styles.linkInputContainer}>
                  <Text style={styles.subLabel}>Nhập đường dẫn trực tiếp (URL)</Text>
                  <TextInput style={styles.input} placeholder="https://images.unsplash.com/..." placeholderTextColor={HeronColors.disable} value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" />
                  {imageUrl ? <View style={styles.miniPreviewRow}>
                      <Image source={{
                    uri: imageUrl
                  }} style={styles.miniThumbnail} />
                      <Text style={styles.miniPreviewText} numberOfLines={1}>
                        {imageUrl}
                      </Text>
                      <Pressable onPress={() => setImageUrl('')}>
                        <Text style={styles.clearText}>Xóa</Text>
                      </Pressable>
                    </View> : null}
                </View>}

              {/* Tùy chọn Video Trailer Giới thiệu món ăn */}
              <View style={styles.videoSectionWrap}>
                <View style={styles.videoSectionHeader}>
                  <Text style={styles.videoSectionTitle}>
                    🎬 VIDEO TRAILER GIỚI THIỆU (TÙY CHỌN)
                  </Text>
                </View>

                <View style={styles.segmentedControl}>
                  <Pressable onPress={() => setVideoSourceMode('album')} style={[styles.segmentBtn, videoSourceMode === 'album' && styles.segmentBtnActive]}>
                    <Text style={[styles.segmentText, videoSourceMode === 'album' && styles.segmentTextActive]}>
                      🎬 TỪ ALBUM MÁY
                    </Text>
                  </Pressable>

                  <Pressable onPress={() => setVideoSourceMode('link')} style={[styles.segmentBtn, videoSourceMode === 'link' && styles.segmentBtnActive]}>
                    <Text style={[styles.segmentText, videoSourceMode === 'link' && styles.segmentTextActive]}>
                      🔗 LINK VIDEO MP4
                    </Text>
                  </Pressable>
                </View>

                {videoSourceMode === 'album' ? <View style={{
                  marginTop: 8
                }}>
                    {videoUrl ? <View style={styles.videoAttachedCard}>
                        <View style={styles.videoAttachedIconWrap}>
                          <Text style={{
                        fontSize: 18
                      }}>🎬</Text>
                        </View>
                        <View style={{
                      flex: 1
                    }}>
                          <Text style={styles.videoAttachedTitle}>
                            Đã đính kèm Video từ Album
                          </Text>
                          <Text style={styles.videoAttachedUri} numberOfLines={1}>
                            {videoUrl}
                          </Text>
                        </View>
                        <Pressable onPress={pickMainVideoFromLibrary} style={styles.repickChip}>
                          <Text style={styles.repickChipText}>Đổi</Text>
                        </Pressable>
                        <Pressable onPress={() => setVideoUrl('')} style={styles.deleteChip}>
                          <Text style={styles.deleteChipText}>✕</Text>
                        </Pressable>
                      </View> : <Pressable onPress={pickMainVideoFromLibrary} style={styles.videoPickButton}>
                        <Text style={styles.videoPickButtonText}>
                          + CHỌN VIDEO GIỚI THIỆU TỪ ALBUM MÁY
                        </Text>
                      </Pressable>}
                  </View> : <View style={{
                  marginTop: 8
                }}>
                    <TextInput style={styles.input} placeholder="https://.../video.mp4" placeholderTextColor={HeronColors.disable} value={videoUrl} onChangeText={setVideoUrl} autoCapitalize="none" />
                  </View>}
              </View>
            </View>

            {/* Card 2: Thông tin cơ bản */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLabelWrap}>
                  <View style={styles.accentDot} />
                  <Text style={styles.cardTitle}>THÔNG TIN CƠ BẢN</Text>
                </View>
              </View>

              <Text style={styles.label}>Tên món ăn (*)</Text>
              <TextInput style={styles.input} placeholder="Ví dụ: Bò kho bánh mì nóng hổi..." placeholderTextColor={HeronColors.disable} value={title} onChangeText={setTitle} />

              <Text style={styles.label}>Mô tả món ăn</Text>
              <TextInput style={[styles.input, styles.textArea]} placeholder="Hương vị thơm lừng, thịt mềm tan, gia vị hòa quyện đậm đà..." placeholderTextColor={HeronColors.disable} multiline numberOfLines={3} value={description} onChangeText={setDescription} />

              <Text style={styles.label}>Danh mục thực đơn</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
                {CATEGORIES.map(cat => {
                  const isSelected = category === cat;
                  return <Pressable key={cat} onPress={() => setCategory(cat)} style={[styles.chip, isSelected && styles.chipActive]}>
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {cat}
                      </Text>
                    </Pressable>;
                })}
              </ScrollView>

              {/* Hàng số liệu chuẩn bị, nấu, khẩu phần */}
              <View style={styles.rowInputs}>
                <View style={styles.subInputWrap}>
                  <Text style={styles.label}>Chuẩn bị (P)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={prepTime} onChangeText={setPrepTime} />
                </View>

                <View style={styles.subInputWrap}>
                  <Text style={styles.label}>Nấu (P)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={cookTime} onChangeText={setCookTime} />
                </View>

                <View style={styles.subInputWrap}>
                  <Text style={styles.label}>Khẩu phần</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={servings} onChangeText={setServings} />
                </View>
              </View>

              <Text style={styles.label}>Mức độ khó</Text>
              <View style={styles.difficultyRow}>
                {DIFFICULTIES.map(diff => {
                  const isSelected = difficulty === diff;
                  return <Pressable key={diff} onPress={() => setDifficulty(diff)} style={[styles.diffBtn, isSelected && styles.diffBtnActive]}>
                      <Text style={[styles.diffText, isSelected && styles.diffTextActive]}>
                        {diff}
                      </Text>
                    </Pressable>;
                })}
              </View>

              <Text style={styles.label}>Chế độ ăn (tùy chọn)</Text>
              <View style={styles.chipRow}>
                {DIET_TAGS.map(tag => {
                  const isSelected = tags.includes(tag);
                  return <Pressable key={tag} accessibilityRole="checkbox" accessibilityState={{ checked: isSelected }} onPress={() => setTags(prev => isSelected ? prev.filter(t => t !== tag) : [...prev, tag])} style={[styles.chip, isSelected && styles.chipActive]}>
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{tag}</Text>
                    </Pressable>;
                })}
              </View>
              {detectedAllergens.length ? <Text style={styles.allergenHint}>
                  ⚠ Tự nhận diện từ nguyên liệu — có thể chứa: {detectedAllergens.map(a => a.label).join(', ')}
                </Text> : null}
            </View>

            {/* Card 3: Danh sách nguyên liệu */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLabelWrap}>
                  <View style={styles.accentDot} />
                  <Text style={styles.cardTitle}>
                    NGUYÊN LIỆU CHUẨN BỊ ({ingredients.length})
                  </Text>
                </View>
                <Pressable onPress={addIngredientRow} style={styles.addRowBtn}>
                  <Text style={styles.addRowBtnText}>+ Thêm dòng</Text>
                </Pressable>
              </View>

              {ingredients.map((item, idx) => <View key={item.id || idx} style={styles.dynamicRow}>
                  <TextInput style={[styles.input, {
                  flex: 2
                }]} placeholder="Tên nguyên liệu" placeholderTextColor={HeronColors.disable} value={item.name} onChangeText={val => updateIngredient(idx, 'name', val)} />
                  <TextInput style={[styles.input, {
                  flex: 1
                }]} placeholder="Số lượng" placeholderTextColor={HeronColors.disable} value={item.amount} onChangeText={val => updateIngredient(idx, 'amount', val)} />
                  <TextInput style={[styles.input, {
                  flex: 1.2
                }]} placeholder="Đơn vị" placeholderTextColor={HeronColors.disable} value={item.unit} onChangeText={val => updateIngredient(idx, 'unit', val)} />
                  {ingredients.length > 1 ? <Pressable onPress={() => removeIngredient(idx)} style={styles.deleteRowBtn}>
                      <Text style={styles.deleteRowText}>✕</Text>
                    </Pressable> : null}
                </View>)}
            </View>

            {/* Card 4: Các bước thực hiện & Tư liệu Album (Ảnh/Video) & Timer */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLabelWrap}>
                  <View style={styles.accentDot} />
                  <Text style={styles.cardTitle}>
                    TIẾN TRÌNH CÁC BƯỚC ({steps.length})
                  </Text>
                </View>
                <Pressable onPress={addStepRow} style={styles.addRowBtn}>
                  <Text style={styles.addRowBtnText}>+ Thêm bước</Text>
                </Pressable>
              </View>

              {steps.map((step, idx) => <View key={idx} style={styles.stepFormItem}>
                  <View style={styles.stepHeaderRow}>
                    <View style={styles.stepIndexBadge}>
                      <Text style={styles.stepIndexText}>BƯỚC 0{idx + 1}</Text>
                    </View>
                    {steps.length > 1 ? <Pressable onPress={() => removeStep(idx)}>
                        <Text style={styles.deleteStepText}>Xóa bước này</Text>
                      </Pressable> : null}
                  </View>

                  <TextInput style={styles.input} placeholder="Tiêu đề bước (vd: Nấu nước tương xốt thần thánh...)" placeholderTextColor={HeronColors.disable} value={step.title} onChangeText={val => updateStepField(idx, 'title', val)} />

                  <TextInput style={[styles.input, styles.textArea, {
                  minHeight: 70
                }]} placeholder="Hướng dẫn chi tiết từng thao tác cho bước này..." placeholderTextColor={HeronColors.disable} multiline value={step.instruction} onChangeText={val => updateStepField(idx, 'instruction', val)} />

                  {/* Phần đính kèm Tư liệu cho bước (Ảnh hoặc Video từ Album/Link) */}
                  <View style={styles.stepMediaBox}>
                    <Text style={styles.stepMediaBoxLabel}>
                      🎥 TƯ LIỆU BƯỚC (ẢNH / VIDEO HƯỚNG DẪN)
                    </Text>

                    <View style={styles.stepMediaButtonsRow}>
                      <Pressable onPress={() => pickStepImageFromLibrary(idx)} style={styles.stepMediaActionBtn}>
                        <Text style={styles.stepMediaActionBtnText}>🖼️ Ảnh từ Album</Text>
                      </Pressable>

                      <Pressable onPress={() => pickStepVideoFromLibrary(idx)} style={styles.stepMediaActionBtn}>
                        <Text style={styles.stepMediaActionBtnText}>🎬 Video từ Album</Text>
                      </Pressable>

                      <Pressable onPress={() => updateStepField(idx, 'showLinkInput', !step.showLinkInput)} style={[styles.stepMediaActionBtn, step.showLinkInput && styles.stepMediaActionBtnActive]}>
                        <Text style={styles.stepMediaActionBtnText}>🔗 Link</Text>
                      </Pressable>
                    </View>

                    {/* Preview ảnh đính kèm nếu có */}
                    {step.image ? <View style={styles.stepMediaItemRow}>
                        <Image source={{
                      uri: step.image
                    }} style={styles.stepThumb} />
                        <View style={{
                      flex: 1
                    }}>
                          <Text style={styles.stepMediaItemTitle}>🖼️ Ảnh minh họa đã chọn</Text>
                          <Text style={styles.stepMediaItemUri} numberOfLines={1}>
                            {step.image}
                          </Text>
                        </View>
                        <Pressable onPress={() => updateStepField(idx, 'image', undefined)} style={styles.stepMediaItemRemove}>
                          <Text style={styles.stepMediaItemRemoveText}>✕ Xóa ảnh</Text>
                        </Pressable>
                      </View> : null}

                    {/* Preview video đính kèm nếu có */}
                    {step.videoUrl ? <View style={styles.stepMediaItemRow}>
                        <View style={styles.stepVideoIconBadge}>
                          <Text style={{
                        fontSize: 16
                      }}>🎬</Text>
                        </View>
                        <View style={{
                      flex: 1
                    }}>
                          <Text style={styles.stepMediaItemTitle}>🎬 Video hướng dẫn đã chọn</Text>
                          <Text style={styles.stepMediaItemUri} numberOfLines={1}>
                            {step.videoUrl}
                          </Text>
                        </View>
                        <Pressable onPress={() => updateStepField(idx, 'videoUrl', undefined)} style={styles.stepMediaItemRemove}>
                          <Text style={styles.stepMediaItemRemoveText}>✕ Xóa video</Text>
                        </Pressable>
                      </View> : null}

                    {/* Link input toggle */}
                    {step.showLinkInput ? <View style={{
                    gap: 6,
                    marginTop: 4
                  }}>
                        <TextInput style={styles.input} placeholder="Link ảnh: https://...jpg" placeholderTextColor={HeronColors.disable} value={step.image || ''} onChangeText={val => updateStepField(idx, 'image', val)} autoCapitalize="none" />
                        <TextInput style={styles.input} placeholder="Link video: https://...mp4" placeholderTextColor={HeronColors.disable} value={step.videoUrl || ''} onChangeText={val => updateStepField(idx, 'videoUrl', val)} autoCapitalize="none" />
                      </View> : null}
                  </View>

                  {/* Timer & Tip */}
                  <View style={styles.stepExtrasRow}>
                    <View style={{
                    flex: 1
                  }}>
                      <Text style={styles.subLabel}>⏱️ Hẹn giờ Timer (phút)</Text>
                      <TextInput style={styles.input} placeholder="Ví dụ: 3 (để trống nếu không hẹn)" placeholderTextColor={HeronColors.disable} keyboardType="numeric" value={step.timerMinutes} onChangeText={val => updateStepField(idx, 'timerMinutes', val)} />
                    </View>
                  </View>

                  <TextInput style={[styles.input, styles.tipInput]} placeholder="💡 Mẹo nhỏ cho bước này (Kinh nghiệm đầu bếp)..." placeholderTextColor="#B45309" value={step.tip} onChangeText={val => updateStepField(idx, 'tip', val)} />
                </View>)}
            </View>

            <View style={{
              height: 40
            }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>;
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HeronColors.canvas
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: HeronColors.border
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderColor: HeronColors.border
  },
  cancelText: {
    fontSize: 12,
    color: HeronColors.granite,
    fontWeight: '700'
  },
  headerTitleWrap: {
    alignItems: 'center'
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    color: HeronColors.surface,
    letterSpacing: 1,
    marginBottom: 2
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: -0.3
  },
  saveBtn: {
    backgroundColor: HeronColors.brand,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full
  },
  saveText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: 16
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.card
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  cardHeaderLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  accentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: HeronColors.brand
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: 0.8
  },
  requiredStar: {
    fontSize: 14,
    color: HeronColors.brand,
    fontWeight: '900'
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: HeronColors.cardAlt,
    borderRadius: Radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: HeronColors.border,
    marginBottom: 14
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radius.full
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    ...HeronShadow.soft
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
    color: HeronColors.surface,
    letterSpacing: 0.3
  },
  segmentTextActive: {
    color: HeronColors.primary,
    fontWeight: '800'
  },
  mediaPickerContainer: {
    marginBottom: 10
  },
  uploadDropzone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: HeronColors.brand,
    borderRadius: Radius.lg,
    backgroundColor: HeronColors.brandLight,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  uploadIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: HeronColors.border
  },
  uploadIcon: {
    fontSize: 24
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: HeronColors.primary,
    marginBottom: 4
  },
  uploadSubtitle: {
    fontSize: 12,
    color: HeronColors.granite,
    textAlign: 'center',
    marginBottom: 14
  },
  uploadActionButton: {
    backgroundColor: HeronColors.brand,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full
  },
  uploadActionButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  imagePreviewWrap: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: HeronColors.border,
    backgroundColor: HeronColors.cardAlt
  },
  imagePreview: {
    width: '100%',
    height: 180
  },
  imagePreviewOverlay: {
    position: 'absolute',
    top: 10,
    left: 10
  },
  imageBadge: {
    backgroundColor: 'rgba(40,40,40,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full
  },
  imageBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  imagePreviewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: HeronColors.border
  },
  repickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderColor: HeronColors.border
  },
  repickBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: HeronColors.primary
  },
  removeMediaBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  removeMediaText: {
    fontSize: 11,
    fontWeight: '700',
    color: HeronColors.brand
  },
  linkInputContainer: {
    marginBottom: 10
  },
  miniPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 8,
    borderRadius: Radius.md,
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderColor: HeronColors.border
  },
  miniThumbnail: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm
  },
  miniPreviewText: {
    flex: 1,
    fontSize: 11,
    color: HeronColors.surface
  },
  clearText: {
    fontSize: 11,
    color: HeronColors.brand,
    fontWeight: '700',
    paddingHorizontal: 4
  },
  videoSectionWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: HeronColors.borderLight
  },
  videoSectionHeader: {
    marginBottom: 8
  },
  videoSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: HeronColors.surface,
    letterSpacing: 0.6
  },
  videoPickButton: {
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: HeronColors.border,
    alignItems: 'center'
  },
  videoPickButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.secondary,
    letterSpacing: 0.4
  },
  videoAttachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: HeronColors.cardAlt,
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: HeronColors.border
  },
  videoAttachedIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: HeronColors.blueLight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  videoAttachedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: HeronColors.primary
  },
  videoAttachedUri: {
    fontSize: 10,
    color: HeronColors.granite
  },
  repickChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: HeronColors.border
  },
  repickChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: HeronColors.primary
  },
  deleteChip: {
    paddingHorizontal: 6,
    paddingVertical: 4
  },
  deleteChipText: {
    fontSize: 13,
    color: HeronColors.brand,
    fontWeight: '800'
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: HeronColors.primary,
    marginBottom: 6,
    marginTop: 10,
    letterSpacing: 0.2
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: HeronColors.granite,
    marginBottom: 4
  },
  input: {
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderColor: HeronColors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: HeronColors.primary
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top'
  },
  categoryRow: {
    flexDirection: 'row',
    marginVertical: 6
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    marginVertical: 6
  },
  allergenHint: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: '#C2410C'
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderColor: HeronColors.border,
    marginRight: 8
  },
  chipActive: {
    backgroundColor: HeronColors.brandLight,
    borderColor: HeronColors.brand
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: HeronColors.granite
  },
  chipTextActive: {
    color: HeronColors.brand,
    fontWeight: '800'
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6
  },
  subInputWrap: {
    flex: 1
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6
  },
  diffBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: Radius.md,
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderColor: HeronColors.border,
    alignItems: 'center'
  },
  diffBtnActive: {
    backgroundColor: HeronColors.primary,
    borderColor: HeronColors.primary
  },
  diffText: {
    fontSize: 12,
    fontWeight: '700',
    color: HeronColors.granite
  },
  diffTextActive: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  addRowBtn: {
    backgroundColor: HeronColors.emeraldLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: HeronColors.emerald
  },
  addRowBtnText: {
    color: HeronColors.emerald,
    fontSize: 11,
    fontWeight: '800'
  },
  dynamicRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginBottom: 8
  },
  deleteRowBtn: {
    padding: 8
  },
  deleteRowText: {
    color: HeronColors.brand,
    fontWeight: '800',
    fontSize: 14
  },
  stepFormItem: {
    borderTopWidth: 1,
    borderTopColor: HeronColors.borderLight,
    paddingTop: 14,
    marginTop: 12,
    gap: 8
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  stepIndexBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderColor: HeronColors.border
  },
  stepIndexText: {
    fontSize: 10,
    fontWeight: '900',
    color: HeronColors.brand,
    letterSpacing: 0.5
  },
  deleteStepText: {
    fontSize: 11,
    fontWeight: '700',
    color: HeronColors.brand
  },
  stepMediaBox: {
    backgroundColor: HeronColors.cardAlt,
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: HeronColors.border,
    gap: 8
  },
  stepMediaBoxLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: HeronColors.surface,
    letterSpacing: 0.5
  },
  stepMediaButtonsRow: {
    flexDirection: 'row',
    gap: 6
  },
  stepMediaActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: HeronColors.border
  },
  stepMediaActionBtnActive: {
    backgroundColor: HeronColors.brandLight,
    borderColor: HeronColors.brand
  },
  stepMediaActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: HeronColors.primary
  },
  stepMediaItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: HeronColors.border
  },
  stepThumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.xs
  },
  stepVideoIconBadge: {
    width: 44,
    height: 44,
    borderRadius: Radius.xs,
    backgroundColor: HeronColors.blueLight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepMediaItemTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.primary
  },
  stepMediaItemUri: {
    fontSize: 9,
    color: HeronColors.granite
  },
  stepMediaItemRemove: {
    paddingHorizontal: 6,
    paddingVertical: 4
  },
  stepMediaItemRemoveText: {
    fontSize: 10,
    color: HeronColors.brand,
    fontWeight: '800'
  },
  stepExtrasRow: {
    flexDirection: 'row',
    gap: 10
  },
  tipInput: {
    backgroundColor: HeronColors.amberLight,
    borderColor: '#FDE68A'
  }
});