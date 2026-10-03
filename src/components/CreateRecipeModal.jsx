import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeronColors, Radius, HeronShadow, Spacing } from '../constants/theme';
import { useRecipes } from '../context/RecipeContext';
const CATEGORIES = ['Món nhanh ⚡', 'Món chính 🍲', 'Ăn kiêng 🥗', 'Tráng miệng 🍰', 'Thức uống 🍹'];
const DIFFICULTIES = ['Dễ', 'Vừa', 'Khó'];
export const CreateRecipeModal = ({
  visible,
  onClose,
  editingRecipe
}) => {
  const {
    addRecipe,
    updateRecipe
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

  // Ingredients
  const [ingredients, setIngredients] = useState([{
    id: '1',
    name: '',
    amount: '',
    unit: 'gram'
  }]);

  // Steps
  const [steps, setSteps] = useState([{
    title: 'Chuẩn bị nguyên liệu',
    instruction: '',
    timerMinutes: '',
    tip: ''
  }]);
  useEffect(() => {
    if (editingRecipe) {
      setTitle(editingRecipe.title);
      setDescription(editingRecipe.description);
      setImageUrl(editingRecipe.imageUrl);
      setVideoUrl(editingRecipe.videoUrl || '');
      // If it's a web URL, default to link, else album
      if (editingRecipe.imageUrl?.startsWith('http')) {
        setImageSourceMode('link');
      } else {
        setImageSourceMode('album');
      }
      if (editingRecipe.videoUrl?.startsWith('http')) {
        setVideoSourceMode('link');
      } else {
        setVideoSourceMode('album');
      }
      setCategory(editingRecipe.category);
      setPrepTime(editingRecipe.prepTimeMinutes.toString());
      setCookTime(editingRecipe.cookTimeMinutes.toString());
      setServings(editingRecipe.servings.toString());
      setDifficulty(editingRecipe.difficulty);
      setIngredients(editingRecipe.ingredients);
      setSteps(editingRecipe.steps.map(s => ({
        title: s.title,
        instruction: s.instruction,
        timerMinutes: s.timerSeconds ? Math.floor(s.timerSeconds / 60).toString() : '',
        tip: s.tip || '',
        image: s.image,
        videoUrl: s.videoUrl
      })));
    } else {
      resetForm();
    }
  }, [editingRecipe, visible]);
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setImageUrl('');
    setVideoUrl('');
    setImageSourceMode('album');
    setVideoSourceMode('album');
    setCategory('Món nhanh ⚡');
    setPrepTime('10');
    setCookTime('15');
    setServings('2');
    setDifficulty('Dễ');
    setIngredients([{
      id: '1',
      name: '',
      amount: '',
      unit: 'gram'
    }]);
    setSteps([{
      title: 'Chuẩn bị nguyên liệu',
      instruction: '',
      timerMinutes: '',
      tip: ''
    }]);
  };

  // Image & Video Picker Handlers
  const pickMainImageFromLibrary = async () => {
    try {
      const {
        status
      } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập Album', 'Vui lòng cấp quyền truy cập thư viện ảnh để tải ảnh món ăn từ máy của bạn.');
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
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh: ' + String(e));
    }
  };
  const pickMainVideoFromLibrary = async () => {
    try {
      const {
        status
      } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập Album', 'Vui lòng cấp quyền truy cập thư viện để tải video giới thiệu món ăn từ máy của bạn.');
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
      Alert.alert('Lỗi', 'Không thể mở thư viện video: ' + String(e));
    }
  };
  const pickStepImageFromLibrary = async index => {
    try {
      const {
        status
      } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền mở album ảnh để chọn ảnh cho bước này.');
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
      Alert.alert('Lỗi', 'Không thể chọn ảnh: ' + String(e));
    }
  };
  const pickStepVideoFromLibrary = async index => {
    try {
      const {
        status
      } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền mở album để chọn video cho bước này.');
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
      Alert.alert('Lỗi', 'Không thể chọn video: ' + String(e));
    }
  };

  // Ingredients handlers
  const addIngredientRow = () => {
    setIngredients(prev => [...prev, {
      id: Date.now().toString(),
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
    setSteps(prev => [...prev, {
      title: `Bước ${prev.length + 1}`,
      instruction: '',
      timerMinutes: '',
      tip: ''
    }]);
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
  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Chưa nhập tên món', 'Vui lòng nhập tên món ăn của bạn nhé!');
      return;
    }
    const validIngredients = ingredients.filter(i => i.name.trim() !== '');
    if (validIngredients.length === 0) {
      Alert.alert('Thiếu nguyên liệu', 'Vui lòng nhập ít nhất 1 nguyên liệu!');
      return;
    }
    const validSteps = steps.map((s, idx) => ({
      stepNumber: idx + 1,
      title: s.title || `Bước ${idx + 1}`,
      instruction: s.instruction || 'Thực hiện công đoạn này theo ý thích của bạn.',
      image: s.image?.trim() || undefined,
      videoUrl: s.videoUrl?.trim() || undefined,
      timerSeconds: s.timerMinutes ? parseInt(s.timerMinutes, 10) * 60 : null,
      tip: s.tip ? s.tip : undefined
    }));
    const finalImageUrl = imageUrl.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
    if (editingRecipe) {
      updateRecipe({
        ...editingRecipe,
        title,
        description: description || 'Món ăn tự sáng tạo thơm ngon bổ dưỡng.',
        imageUrl: finalImageUrl,
        videoUrl: videoUrl.trim() || undefined,
        category,
        prepTimeMinutes: parseInt(prepTime, 10) || 10,
        cookTimeMinutes: parseInt(cookTime, 10) || 15,
        servings: parseInt(servings, 10) || 2,
        difficulty,
        ingredients: validIngredients,
        steps: validSteps
      });
      Alert.alert('Thành công! 🎉', 'Công thức của bạn đã được cập nhật.');
    } else {
      addRecipe({
        title,
        description: description || 'Món ăn tự sáng tạo thơm ngon bổ dưỡng.',
        imageUrl: finalImageUrl,
        videoUrl: videoUrl.trim() || undefined,
        category,
        prepTimeMinutes: parseInt(prepTime, 10) || 10,
        cookTimeMinutes: parseInt(cookTime, 10) || 15,
        servings: parseInt(servings, 10) || 2,
        difficulty,
        ingredients: validIngredients,
        steps: validSteps,
        colorAccent: HeronColors.brand
      });
      Alert.alert('Thành công! 🎉', 'Món mới đã được lưu vào danh sách của bạn.');
    }
    resetForm();
    onClose();
  };
  return <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" transparent={false} onRequestClose={onClose}>
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
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Hủy</Text>
            </Pressable>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerSubtitle}>COOKFLOW // STUDIO</Text>
              <Text style={styles.headerTitle}>
                {editingRecipe ? 'Sửa Công Thức' : 'Tạo Món Ăn Mới'}
              </Text>
            </View>
            <Pressable onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveText}>Lưu ➔</Text>
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