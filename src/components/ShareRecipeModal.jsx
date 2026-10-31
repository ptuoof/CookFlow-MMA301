import React, { useMemo, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Pressable, Share, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { HeronColors, Radius, HeronShadow, Spacing } from '../constants/theme';
import { AppleButton } from './ui/AppleButton';
import { RecipeStoryCard } from './ui/RecipeStoryCard';
import { encodeRecipeForQr } from '../services/recipeQr';
import { showAlert } from '../utils/dialog';
// QR version 40 at ECC level L holds 2953 bytes; larger payloads make the QR library throw
const QR_HARD_LIMIT_BYTES = 2900;
const STORY_EXPORT = {
  width: 1080,
  height: 1920
};
const toFileName = title => `cookflow-${title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'recipe'}.png`;
export const ShareRecipeModal = ({
  visible,
  onClose,
  recipe
}) => {
  const [tab, setTab] = useState('story');
  const [isImageReady, setIsImageReady] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const cardRef = useRef(null);
  const qr = useMemo(() => recipe ? encodeRecipeForQr(recipe) : null, [recipe]);
  if (!recipe) return null;
  const handleExportStory = async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      if (Platform.OS === 'web') {
        const dataUri = await captureRef(cardRef, {
          format: 'png',
          quality: 1,
          result: 'data-uri',
          ...STORY_EXPORT
        });
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = toFileName(recipe.title);
        link.click();
        return;
      }
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        ...STORY_EXPORT
      });
      if (!(await Sharing.isAvailableAsync())) {
        showAlert('Không hỗ trợ chia sẻ', 'Thiết bị này chưa hỗ trợ hộp thoại chia sẻ file.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: `Chia sẻ thẻ công thức "${recipe.title}"`
      });
    } catch (e) {
      console.log('Story export error', e);
      showAlert('Xuất ảnh thất bại', 'Không thể tạo ảnh thẻ công thức. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };
  const handleShareText = async () => {
    try {
      const ingredientList = recipe.ingredients.map(i => `• ${i.name}: ${i.amount} ${i.unit}`).join('\n');
      await Share.share({
        message: `🍳 Công thức món "${recipe.title}" từ CookFlow:\n\n${recipe.description}\n\nNguyên liệu:\n${ingredientList}\n\nChúc bạn nấu ngon miệng! ✨`
      });
    } catch (e) {
      console.log('Share error', e);
    }
  };
  const handleShareQrCode = async () => {
    try {
      await Share.share({
        message: qr.payload
      });
    } catch (e) {
      console.log('Share error', e);
    }
  };
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.dragHandleWrap}>
          <View style={styles.dragHandle} />
        </View>

        <View style={styles.header}>
          <View style={{
          flex: 1
        }}>
            <Text style={styles.headerTag}>SHARE // EXPORT</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Chia sẻ công thức
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.iconCircle}>
            <Text style={styles.iconText}>✕</Text>
          </Pressable>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabSwitcher}>
          <Pressable onPress={() => setTab('story')} style={[styles.tabBtn, tab === 'story' && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === 'story' && styles.tabTextActive]}>📸 ẢNH STORY</Text>
          </Pressable>
          <Pressable onPress={() => setTab('qr')} style={[styles.tabBtn, tab === 'qr' && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === 'qr' && styles.tabTextActive]}>▦ MÃ QR</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {tab === 'story' ? <>
              <View style={styles.cardStage}>
                <View style={styles.cardFrame}>
                  <RecipeStoryCard ref={cardRef} recipe={recipe} onImageLoad={() => setIsImageReady(true)} />
                </View>
              </View>
              <Text style={styles.hint}>
                Ảnh PNG 1080×1920 (tỉ lệ 9:16) — đăng thẳng lên Instagram / Facebook Story hoặc lưu vào máy.
              </Text>
              <AppleButton title={isExporting ? 'ĐANG TẠO ẢNH...' : isImageReady ? Platform.OS === 'web' ? 'TẢI ẢNH STORY (PNG)' : 'XUẤT ẢNH & CHIA SẺ' : 'ĐANG TẢI ẢNH MÓN...'} size="lg" variant="primary" onPress={handleExportStory} disabled={!isImageReady || isExporting} style={{
            width: '100%'
          }} />
              <AppleButton title="Chia sẻ dạng văn bản" variant="outline" onPress={handleShareText} style={{
            width: '100%',
            marginTop: 10
          }} />
            </> : <>
              <View style={styles.qrCard}>
                <Text style={styles.qrTitle} numberOfLines={2}>
                  {recipe.title}
                </Text>
                <View style={styles.qrFrame}>
                  {qr.bytes <= QR_HARD_LIMIT_BYTES ? <QRCode value={qr.payload} size={260} ecl="L" quietZone={8} color={HeronColors.primary} backgroundColor="#FFFFFF" /> : <Text style={styles.noticeText}>
                      Công thức quá dài để tạo mã QR. Hãy dùng nút “Gửi mã dạng văn bản” bên dưới — người nhận dán mã vào mục Quét QR.
                    </Text>}
                </View>
                <Text style={styles.qrMeta}>
                  {recipe.ingredients.length} NGUYÊN LIỆU • {recipe.steps.length} BƯỚC • {(qr.bytes / 1024).toFixed(1)} KB
                </Text>
              </View>

              {qr.truncated ? <View style={styles.noticeBox}>
                  <Text style={styles.noticeText}>
                    {qr.tooLarge ? '⚠ Mã QR rất dày, một số điện thoại có thể khó quét. ' : ''}✂ Mã QR đã rút gọn bớt video / mẹo / mô tả chi tiết để điện thoại quét được dễ dàng. Ảnh hoặc video chọn từ máy không được gửi kèm.
                  </Text>
                </View> : null}

              <View style={styles.stepsBox}>
                <Text style={styles.stepsTitle}>CÁCH NHẬN MÓN (KHÔNG CẦN SERVER)</Text>
                <Text style={styles.stepsText}>1. Bạn bè mở CookFlow → bấm “📷 QUÉT QR” ở thanh tìm kiếm.</Text>
                <Text style={styles.stepsText}>2. Hướng camera vào mã QR này.</Text>
                <Text style={styles.stepsText}>3. Bấm “Lưu vào Món của tôi” — xong!</Text>
              </View>

              <AppleButton title="Gửi mã dạng văn bản" variant="outline" onPress={handleShareQrCode} style={{
            width: '100%'
          }} />
            </>}
          <View style={{
          height: 40
        }} />
        </ScrollView>
      </View>
    </Modal>;
};
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
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: HeronColors.border,
    marginHorizontal: Spacing.lg,
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'stretch'
  },
  cardStage: {
    alignItems: 'center',
    paddingVertical: Spacing.md
  },
  cardFrame: {
    borderRadius: Radius.lg,
    overflow: 'hidden'
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: HeronColors.granite,
    textAlign: 'center',
    marginVertical: Spacing.md
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.card
  },
  qrTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: HeronColors.primary,
    textAlign: 'center',
    marginBottom: 14
  },
  qrFrame: {
    padding: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: HeronColors.borderLight
  },
  qrMeta: {
    fontSize: 10,
    fontWeight: '800',
    color: HeronColors.surface,
    letterSpacing: 0.6,
    marginTop: 12
  },
  noticeBox: {
    backgroundColor: HeronColors.amberLight,
    borderRadius: Radius.md,
    padding: 12,
    marginTop: Spacing.md
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: HeronColors.primary
  },
  stepsBox: {
    backgroundColor: HeronColors.cardAlt,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: HeronColors.border,
    padding: 14,
    marginVertical: Spacing.md,
    gap: 4
  },
  stepsTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: HeronColors.brand,
    letterSpacing: 0.8,
    marginBottom: 4
  },
  stepsText: {
    fontSize: 13,
    lineHeight: 19,
    color: HeronColors.primary
  }
});
