import React, { useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image, Alert, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { HeronColors, Radius, HeronShadow, Spacing } from '../constants/theme';
import { AppleButton } from './ui/AppleButton';
import { useRecipes } from '../context/RecipeContext';
import { decodeRecipeFromQr } from '../services/recipeQr';
export const QrScannerModal = ({
  visible,
  onClose,
  onImported
}) => {
  const {
    addRecipe
  } = useRecipes();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState('camera');
  const [pastedCode, setPastedCode] = useState('');
  const [scannedRecipe, setScannedRecipe] = useState(null);
  const [scanError, setScanError] = useState('');
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
  const handleBarcodeScanned = ({
    data
  }) => {
    if (isHandlingScanRef.current) return;
    isHandlingScanRef.current = true;
    handleCode(data);
  };
  const handleRescan = () => {
    setScannedRecipe(null);
    setScanError('');
    isHandlingScanRef.current = false;
  };
  const handleSave = () => {
    const saved = addRecipe(scannedRecipe);
    handleClose();
    if (onImported) onImported(saved);
    // Wait for the sheet to dismiss so the alert is not torn down with it on iOS
    setTimeout(() => {
      Alert.alert('Đã nhận món! 🎉', `"${saved.title}" đã được lưu vào mục Món của tôi.`);
    }, 450);
  };
  const renderPreview = () => <View style={styles.previewCard}>
      <Image source={{
      uri: scannedRecipe.imageUrl
    }} style={styles.previewImage} resizeMode="cover" />
      <View style={styles.previewBody}>
        <Text style={styles.previewTag}>ĐÃ QUÉT THÀNH CÔNG ✓</Text>
        <Text style={styles.previewTitle}>{scannedRecipe.title}</Text>
        <Text style={styles.previewDesc} numberOfLines={3}>
          {scannedRecipe.description}
        </Text>
        <Text style={styles.previewMeta}>
          {scannedRecipe.category} • {scannedRecipe.prepTimeMinutes + scannedRecipe.cookTimeMinutes} PHÚT •{' '}
          {scannedRecipe.ingredients.length} NGUYÊN LIỆU • {scannedRecipe.steps.length} BƯỚC
        </Text>
        <AppleButton title="LƯU VÀO MÓN CỦA TÔI" size="lg" variant="primary" onPress={handleSave} style={{
        width: '100%',
        marginTop: 16
      }} />
        <AppleButton title="Quét mã khác" variant="outline" onPress={handleRescan} style={{
        width: '100%',
        marginTop: 10
      }} />
      </View>
    </View>;
  const renderCamera = () => {
    if (!permission) return <View style={styles.cameraPlaceholder} />;
    if (!permission.granted) {
      return <View style={[styles.cameraPlaceholder, styles.permissionBox]}>
          <Text style={styles.permissionEmoji}>📷</Text>
          <Text style={styles.permissionTitle}>Cần quyền truy cập camera</Text>
          <Text style={styles.permissionDesc}>
            CookFlow dùng camera để quét mã QR công thức từ bạn bè. Ảnh không được lưu lại.
          </Text>
          {permission.canAskAgain ? <AppleButton title="CHO PHÉP CAMERA" variant="primary" onPress={requestPermission} /> : <Text style={styles.permissionDesc}>
              Bạn đã từ chối quyền camera. Hãy bật lại trong Cài đặt của máy, hoặc dùng tab “Dán mã”.
            </Text>}
        </View>;
    }
    return <View style={styles.cameraWrap}>
        <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{
        barcodeTypes: ['qr']
      }} onBarcodeScanned={scannedRecipe ? undefined : handleBarcodeScanned} />
        <View style={styles.viewfinder} pointerEvents="none">
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>;
  };
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.dragHandleWrap}>
          <View style={styles.dragHandle} />
        </View>

        <View style={styles.header}>
          <View style={{
          flex: 1
        }}>
            <Text style={styles.headerTag}>QR // PEER-TO-PEER</Text>
            <Text style={styles.headerTitle}>Quét QR nhận món</Text>
          </View>
          <Pressable onPress={handleClose} style={styles.iconCircle}>
            <Text style={styles.iconText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {scannedRecipe ? renderPreview() : <>
              <View style={styles.tabSwitcher}>
                <Pressable onPress={() => setMode('camera')} style={[styles.tabBtn, mode === 'camera' && styles.tabBtnActive]}>
                  <Text style={[styles.tabText, mode === 'camera' && styles.tabTextActive]}>📷 QUÉT CAMERA</Text>
                </Pressable>
                <Pressable onPress={() => setMode('paste')} style={[styles.tabBtn, mode === 'paste' && styles.tabBtnActive]}>
                  <Text style={[styles.tabText, mode === 'paste' && styles.tabTextActive]}>📋 DÁN MÃ</Text>
                </Pressable>
              </View>

              {mode === 'camera' ? <>
                  {renderCamera()}
                  <Text style={styles.hint}>
                    Hướng camera vào mã QR trong mục “Chia sẻ → Mã QR” trên máy bạn bè.
                    {Platform.OS === 'web' ? ' (Trên web, nếu trình duyệt không hỗ trợ quét, hãy dùng tab “Dán mã”.)' : ''}
                  </Text>
                </> : <View style={styles.pasteBox}>
                  <TextInput style={styles.pasteInput} placeholder="Dán mã công thức bắt đầu bằng CF1:..." placeholderTextColor={HeronColors.disable} value={pastedCode} onChangeText={setPastedCode} multiline autoCapitalize="none" autoCorrect={false} />
                  <AppleButton title="ĐỌC MÃ" variant="primary" onPress={() => handleCode(pastedCode)} disabled={!pastedCode.trim()} style={{
              width: '100%'
            }} />
                </View>}

              {scanError ? <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠ {scanError}</Text>
                </View> : null}
            </>}
        </ScrollView>
      </View>
    </Modal>;
};
const FINDER_SIZE = 220;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HeronColors.canvas
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingVertical: 10
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: HeronColors.disable
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: 12
  },
  headerTag: {
    fontSize: 10,
    fontWeight: '900',
    color: HeronColors.brand,
    letterSpacing: 1
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: -0.5,
    marginTop: 2
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.subtle
  },
  iconText: {
    fontSize: 15
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: HeronColors.border,
    marginBottom: Spacing.md
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: Radius.full,
    alignItems: 'center'
  },
  tabBtnActive: {
    backgroundColor: HeronColors.primary
  },
  tabText: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.surface,
    letterSpacing: 0.5
  },
  tabTextActive: {
    color: '#FFFFFF'
  },
  cameraWrap: {
    height: 340,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cameraPlaceholder: {
    height: 340,
    borderRadius: Radius.lg,
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderColor: HeronColors.border
  },
  permissionBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10
  },
  permissionEmoji: {
    fontSize: 36
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: HeronColors.primary
  },
  permissionDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: HeronColors.granite,
    textAlign: 'center'
  },
  viewfinder: {
    width: FINDER_SIZE,
    height: FINDER_SIZE
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: HeronColors.brand
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: HeronColors.granite,
    textAlign: 'center',
    marginTop: Spacing.md
  },
  pasteBox: {
    gap: 12
  },
  pasteInput: {
    minHeight: 140,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: HeronColors.border,
    borderRadius: Radius.md,
    padding: 14,
    fontSize: 12,
    color: HeronColors.primary,
    textAlignVertical: 'top'
  },
  errorBox: {
    backgroundColor: HeronColors.brandLight,
    borderRadius: Radius.md,
    padding: 12,
    marginTop: Spacing.md
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: HeronColors.brandHover
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.card
  },
  previewImage: {
    width: '100%',
    height: 190
  },
  previewBody: {
    padding: 18
  },
  previewTag: {
    fontSize: 10,
    fontWeight: '900',
    color: HeronColors.emerald,
    letterSpacing: 0.8,
    marginBottom: 6
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: -0.4,
    marginBottom: 6
  },
  previewDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: HeronColors.granite,
    marginBottom: 10
  },
  previewMeta: {
    fontSize: 10,
    fontWeight: '800',
    color: HeronColors.surface,
    letterSpacing: 0.5
  }
});
