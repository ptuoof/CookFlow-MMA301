import React, { useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { HeronColors, Radius, HeronShadow, Spacing } from '../constants/theme';
import { AppleButton } from './ui/AppleButton';
import { useRecipes } from '../context/RecipeContext';
import { decodeRecipeFromQr } from '../services/recipeQr';
import { confirmAction, showAlert } from '../utils/dialog';

const HOW_TO = [
  ['📱', 'Trên máy bạn bè', 'Mở món → nút Chia sẻ → Mã QR'],
  ['📷', 'Quét hoặc dán mã', 'Đưa mã vào khung, hoặc dán đoạn mã CF1:…'],
  ['💾', 'Xem trước rồi lưu', 'Món vào Hồ sơ → Món của tôi → Tự tạo']
];

/**
 * Receives a recipe shared by QR code (camera) or as a text code (paste), previews it and saves
 * it as the user's own private recipe. `onImported(recipe)` runs after a successful save.
 */
export const QrScannerModal = ({ visible, onClose, onImported }) => {
  const { addRecipe, findDuplicateRecipe } = useRecipes();
  const insets = useSafeAreaInsets();
  // Android draws the sheet edge-to-edge (no grey status / navigation bands): pad it ourselves
  const padTop = Platform.OS === 'android' ? insets.top : 0;
  const padBottom = Platform.OS === 'android' ? insets.bottom : 0;
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState('camera');
  const [pastedCode, setPastedCode] = useState('');
  const [scannedRecipe, setScannedRecipe] = useState(null);
  const [scanError, setScanError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // Camera fires onBarcodeScanned many times per second; a ref blocks repeats synchronously
  const isHandlingScanRef = useRef(false);

  const handleClose = () => {
    setScannedRecipe(null);
    setScanError('');
    setPastedCode('');
    setMode('camera');
    isHandlingScanRef.current = false;
    onClose();
  };
  const handleCode = data => {
    try {
      setScannedRecipe(decodeRecipeFromQr(data));
      setScanError('');
    } catch (e) {
      setScanError(e.message);
      // Let the user aim at another code after a short pause
      setTimeout(() => {
        isHandlingScanRef.current = false;
      }, 1500);
    }
  };
  const handleBarcodeScanned = ({ data }) => {
    if (isHandlingScanRef.current) return;
    isHandlingScanRef.current = true;
    handleCode(data);
  };
  const handleRescan = () => {
    setScannedRecipe(null);
    setScanError('');
    isHandlingScanRef.current = false;
  };
  const saveImported = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const saved = await addRecipe(scannedRecipe);
    setIsSaving(false);
    if (!saved) return; // error already shown; keep the preview so the user can retry
    handleClose();
    if (onImported) onImported(saved);
    // Wait for the sheet to dismiss so the alert is not torn down with it on iOS
    setTimeout(() => {
      showAlert('Đã nhận món! 🎉', `"${saved.title}" đã được lưu vào Hồ sơ → Món của tôi → Tự tạo.`);
    }, 450);
  };
  const handleSave = () => {
    const duplicate = findDuplicateRecipe(scannedRecipe);
    if (!duplicate) return saveImported();
    return confirmAction({
      title: 'Món này đã có trong máy',
      message: `"${duplicate.title}" có cùng tên và nguyên liệu. Bạn vẫn muốn lưu thêm một bản?`,
      confirmText: 'Vẫn lưu bản mới',
      cancelText: 'Không lưu',
      onConfirm: saveImported
    });
  };

  const renderPreview = () => {
    const minutes = (scannedRecipe.prepTimeMinutes || 0) + (scannedRecipe.cookTimeMinutes || 0);
    const facts = [
      ['🏷️', scannedRecipe.category],
      minutes ? ['⏱', `${minutes} phút`] : null,
      ['🥕', `${scannedRecipe.ingredients.length} nguyên liệu`],
      ['📋', `${scannedRecipe.steps.length} bước`],
      scannedRecipe.calories ? ['🔥', `${scannedRecipe.calories} kcal`] : null
    ].filter(Boolean);
    return <View style={styles.previewCard}>
        <View>
          <Image source={{ uri: scannedRecipe.imageUrl }} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.previewBadge}><Text style={styles.previewBadgeText}>✓ Đã đọc mã</Text></View>
        </View>
        <View style={styles.previewBody}>
          <Text style={styles.previewTitle}>{scannedRecipe.title}</Text>
          {scannedRecipe.description ? <Text style={styles.previewDesc} numberOfLines={3}>{scannedRecipe.description}</Text> : null}
          <View style={styles.factRow}>
            {facts.map(([icon, label]) => <View key={label} style={styles.fact}><Text style={styles.factText}>{icon} {label}</Text></View>)}
          </View>
          <View style={styles.privacyNote}>
            <Text style={styles.privacyText}>🔒 Món được lưu thành bản riêng tư của bạn — sửa thoải mái mà không ảnh hưởng người gửi.</Text>
          </View>
        </View>
      </View>;
  };

  const renderCamera = () => {
    if (!permission) return <View style={[styles.cameraBox, styles.cameraIdle]} />;
    if (!permission.granted) {
      return <View style={[styles.cameraBox, styles.cameraIdle, styles.permissionBox]}>
          <View style={styles.permissionIcon}><Text style={{ fontSize: 30 }}>📷</Text></View>
          <Text style={styles.permissionTitle}>Cần quyền truy cập camera</Text>
          <Text style={styles.permissionDesc}>CookFlow chỉ dùng camera để đọc mã QR. Không ảnh nào được lưu lại.</Text>
          {permission.canAskAgain ? <AppleButton title="Cho phép camera" variant="primary" onPress={requestPermission} style={{ marginTop: 6, alignSelf: 'stretch' }} /> : <Text style={[styles.permissionDesc, { color: HeronColors.brandHover }]}>
              Bạn đã từ chối quyền camera. Hãy bật lại trong Cài đặt của máy, hoặc dùng tab “Dán mã”.
            </Text>}
        </View>;
    }
    return <View style={[styles.cameraBox, styles.cameraLive]}>
        <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scannedRecipe ? undefined : handleBarcodeScanned} />
        <View style={styles.viewfinder} pointerEvents="none">
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <View style={styles.cameraHint} pointerEvents="none"><Text style={styles.cameraHintText}>Đưa mã QR vào giữa khung</Text></View>
      </View>;
  };

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent navigationBarTranslucent onRequestClose={handleClose}>
      <View style={[styles.container, { paddingTop: padTop }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTag}>📷 MÃ QR</Text>
            <Text style={styles.headerTitle}>{scannedRecipe ? 'Xem trước món' : 'Quét QR nhận món'}</Text>
            <Text style={styles.headerSub}>{scannedRecipe ? 'Kiểm tra rồi lưu vào bếp của bạn.' : 'Nhận công thức bạn bè chia sẻ cho bạn.'}</Text>
          </View>
          <Pressable accessibilityLabel="Đóng" hitSlop={6} onPress={handleClose} style={({ pressed }) => [styles.iconCircle, pressed && styles.pressed]}>
            <Text style={styles.iconText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, !scannedRecipe && { paddingBottom: 32 + padBottom }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {scannedRecipe ? renderPreview() : <>
              <View style={styles.segment}>
                {[['camera', '📷  Quét camera'], ['paste', '📋  Dán mã']].map(([id, label]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: mode === id }} onPress={() => setMode(id)} style={[styles.segmentBtn, mode === id && styles.segmentActive]}>
                    <Text style={[styles.segmentText, mode === id && styles.segmentTextActive]}>{label}</Text>
                  </Pressable>)}
              </View>

              {mode === 'camera' ? <>
                  {renderCamera()}
                  {Platform.OS === 'web' ? <Text style={styles.hint}>Trên web, nếu trình duyệt không hỗ trợ quét, hãy dùng tab “Dán mã”.</Text> : null}
                </> : <View style={styles.pasteCard}>
                  <Text style={styles.pasteLabel}>Mã công thức</Text>
                  <TextInput style={styles.pasteInput} placeholder="Dán mã bắt đầu bằng CF1:..." placeholderTextColor={HeronColors.disable} value={pastedCode} onChangeText={setPastedCode} multiline autoCapitalize="none" autoCorrect={false} />
                  <Text style={styles.pasteHint}>Người gửi mở món → Chia sẻ → Mã QR → “Gửi mã dạng văn bản”.</Text>
                  <AppleButton title="Đọc mã" variant="primary" onPress={() => handleCode(pastedCode)} disabled={!pastedCode.trim()} style={{ width: '100%', marginTop: 12 }} />
                </View>}

              {scanError ? <View style={styles.errorBox}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>{scanError}</Text>
                </View> : null}

              <Text style={styles.sectionTitle}>Cách nhận món</Text>
              <View style={styles.stepsCard}>
                {HOW_TO.map(([icon, title, text], index) => <View key={title} style={[styles.stepRow, index > 0 && styles.stepDivider]}>
                    <View style={styles.stepIcon}><Text style={{ fontSize: 17 }}>{icon}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stepTitle}>{index + 1}. {title}</Text>
                      <Text style={styles.stepText}>{text}</Text>
                    </View>
                  </View>)}
              </View>
            </>}
        </ScrollView>

        {scannedRecipe ? <View style={[styles.bottomBar, { paddingBottom: 12 + padBottom }]}>
            <AppleButton title={isSaving ? 'Đang lưu…' : 'Lưu vào Món của tôi'} variant="primary" disabled={isSaving} onPress={handleSave} style={{ width: '100%' }} />
            <AppleButton title="Quét mã khác" variant="outline" disabled={isSaving} onPress={handleRescan} style={{ width: '100%', marginTop: 10 }} />
          </View> : null}
      </View>
    </Modal>;
};

const FINDER_SIZE = 210;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HeronColors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.lg, paddingTop: 18, paddingBottom: Spacing.md },
  headerTag: { fontSize: 10, fontWeight: '900', color: HeronColors.brand, letterSpacing: 1.2 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: HeronColors.primary, letterSpacing: -0.5, marginTop: 4 },
  headerSub: { fontSize: 13, color: HeronColors.granite, marginTop: 3 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: HeronColors.border },
  iconText: { fontSize: 14, fontWeight: '800', color: HeronColors.primary },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: 24 },
  segment: { flexDirection: 'row', padding: 4, borderRadius: Radius.full, backgroundColor: HeronColors.borderLight, marginBottom: 14 },
  segmentBtn: { flex: 1, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: '#FFFFFF', ...HeronShadow.subtle },
  segmentText: { fontSize: 13, fontWeight: '800', color: HeronColors.granite },
  segmentTextActive: { color: HeronColors.primary },
  cameraBox: { height: 320, borderRadius: 24, overflow: 'hidden' },
  cameraIdle: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border },
  cameraLive: { backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  permissionBox: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 8 },
  permissionIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: HeronColors.brandLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  permissionTitle: { fontSize: 17, fontWeight: '900', color: HeronColors.primary },
  permissionDesc: { fontSize: 13, lineHeight: 19, color: HeronColors.granite, textAlign: 'center' },
  viewfinder: { width: FINDER_SIZE, height: FINDER_SIZE },
  corner: { position: 'absolute', width: 34, height: 34, borderColor: '#FFFFFF' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
  cameraHint: { position: 'absolute', bottom: 16, paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: 'rgba(0,0,0,0.55)' },
  cameraHintText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  hint: { fontSize: 12, lineHeight: 18, color: HeronColors.granite, textAlign: 'center', marginTop: 12 },
  pasteCard: { padding: 14, borderRadius: Radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border },
  pasteLabel: { fontSize: 13, fontWeight: '800', color: HeronColors.primary, marginBottom: 8 },
  pasteInput: { minHeight: 140, backgroundColor: HeronColors.cardAlt, borderWidth: 1, borderColor: HeronColors.border, borderRadius: 12, padding: 12, fontSize: 12, color: HeronColors.primary, textAlignVertical: 'top' },
  pasteHint: { marginTop: 6, fontSize: 11, lineHeight: 16, color: HeronColors.granite },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: '#FFF1F0', borderWidth: 1, borderColor: '#FFD5D1' },
  errorIcon: { fontSize: 14 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600', color: '#B42318' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: HeronColors.granite, marginTop: 22, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  stepsCard: { borderRadius: Radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, paddingHorizontal: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  stepDivider: { borderTopWidth: 1, borderTopColor: HeronColors.borderLight },
  stepIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: HeronColors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 14, fontWeight: '800', color: HeronColors.primary },
  stepText: { fontSize: 12, color: HeronColors.granite, marginTop: 2 },
  previewCard: { backgroundColor: '#FFFFFF', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: HeronColors.border, ...HeronShadow.card },
  previewImage: { width: '100%', height: 200, backgroundColor: HeronColors.borderLight },
  previewBadge: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, backgroundColor: HeronColors.emerald },
  previewBadgeText: { fontSize: 11, fontWeight: '900', color: '#FFFFFF' },
  previewBody: { padding: 16 },
  previewTitle: { fontSize: 20, fontWeight: '900', color: HeronColors.primary, letterSpacing: -0.4 },
  previewDesc: { fontSize: 13, lineHeight: 19, color: HeronColors.granite, marginTop: 6 },
  factRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  fact: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, backgroundColor: HeronColors.cardAlt, borderWidth: 1, borderColor: HeronColors.borderLight },
  factText: { fontSize: 12, fontWeight: '700', color: HeronColors.secondary },
  privacyNote: { marginTop: 14, padding: 10, borderRadius: 12, backgroundColor: HeronColors.blueLight },
  privacyText: { fontSize: 12, lineHeight: 17, color: HeronColors.blue },
  bottomBar: { paddingHorizontal: Spacing.lg, paddingTop: 12, backgroundColor: HeronColors.canvas, borderTopWidth: 1, borderTopColor: HeronColors.borderLight },
  pressed: { opacity: 0.75 }
});
