import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Pressable, Switch, Platform } from 'react-native';
import { AppleColors, Radius, AppleShadow, Spacing } from '../constants/theme';
import { useRecipes } from '../context/RecipeContext';
import { ALLERGENS } from '../utils/dietary';
import { parseBackup } from '../utils/backup';
import { pickBackupFileText, saveBackupFile } from '../utils/backupFile';
import { confirmAction, showAlert } from '../utils/dialog';
export const SettingsModal = ({
  visible,
  onClose,
  onReopenOnboarding
}) => {
  // Persisted in RecipeContext and actually used by Cooking Mode / the timer
  const { settings, updateSettings, exportBackup, restoreBackup, resetAllData } = useRecipes();
  const [isBusy, setIsBusy] = useState(false);
  const allergies = settings.allergies || [];
  const toggleAllergy = id => updateSettings({ allergies: allergies.includes(id) ? allergies.filter(a => a !== id) : [...allergies, id] });
  const handleExport = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const backup = exportBackup();
      await saveBackupFile(backup);
      const { recipes, history } = backup.data;
      if (Platform.OS === 'web') {
        showAlert('Đã tải bản sao lưu', `${recipes.length} món tự tạo, ${history.length} lần nấu. Ảnh/video chọn từ máy không nằm trong tệp.`);
      }
    } catch (e) {
      showAlert('Không xuất được bản sao lưu', e?.message || 'Vui lòng thử lại.');
    } finally {
      setIsBusy(false);
    }
  };
  const handleImport = async () => {
    if (isBusy) return;
    setIsBusy(true);
    let text;
    try {
      text = await pickBackupFileText();
    } catch {
      showAlert('Không mở được tệp', 'Vui lòng chọn lại tệp sao lưu .json.');
    } finally {
      setIsBusy(false);
    }
    if (!text) return;
    let parsed;
    try {
      parsed = parseBackup(text);
    } catch (e) {
      showAlert('Không khôi phục được', e.message);
      return;
    }
    const { summary } = parsed;
    confirmAction({
      title: 'Khôi phục bản sao lưu?',
      message: [
        `Bản sao lưu có ${summary.recipes} món tự tạo, ${summary.shopping} mục đi chợ, ${summary.pantry} nguyên liệu trong tủ và ${summary.history} lần nấu.`,
        'Dữ liệu hiện tại trên máy sẽ bị THAY THẾ (công thức có sẵn của ứng dụng giữ nguyên).',
        summary.localMedia ? `${summary.localMedia} món dùng ảnh từ máy cũ có thể không hiển thị ảnh.` : ''
      ].filter(Boolean).join('\n\n'),
      confirmText: 'Khôi phục',
      destructive: true,
      onConfirm: () => {
        restoreBackup(parsed.data);
        showAlert('Đã khôi phục ✓', 'Dữ liệu từ bản sao lưu đã được áp dụng.');
      }
    });
  };
  const handleReset = () => confirmAction({
    title: 'Xóa toàn bộ dữ liệu?',
    message: 'Mọi món tự tạo, yêu thích, danh sách đi chợ, tủ lạnh, lịch sử nấu và cài đặt sẽ bị xóa vĩnh viễn. Hãy xuất bản sao lưu trước nếu cần.',
    confirmText: 'Xóa tất cả',
    destructive: true,
    onConfirm: () => {
      resetAllData();
      showAlert('Đã xóa dữ liệu', 'Ứng dụng đã trở về trạng thái ban đầu.');
    }
  });
  const keepAwake = settings.keepAwake;
  const soundEnabled = settings.timerSound;
  const vibrationEnabled = settings.vibration;
  const setKeepAwake = value => updateSettings({ keepAwake: value });
  const setSoundEnabled = value => updateSettings({ timerSound: value });
  const setVibrationEnabled = value => updateSettings({ vibration: value });
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* iOS Drag Handle */}
        <View style={styles.dragHandleWrap}>
          <View style={styles.dragHandle} />
        </View>

        {/* Header */}
        <View style={styles.topBar}>
          <Text style={styles.headerTitle}>Cài đặt & Hồ sơ ⚙️</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Xong</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* User Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarEmoji}>🥑</Text>
            </View>
            <View style={styles.profileText}>
              <Text style={styles.userName}>Bếp Trưởng CookFlow</Text>
              <Text style={styles.userRole}>Thành viên yêu ẩm thực ✨</Text>
            </View>
          </View>

          {/* Group 1: Trợ lý nấu ăn */}
          <Text style={styles.groupTitle}>TRỢ LÝ NẤU ĂN (COOKING MODE)</Text>
          <View style={styles.groupCard}>
            <View style={styles.settingRow}>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowIcon}>💡</Text>
                <View>
                  <Text style={styles.rowTitle}>Giữ sáng màn hình</Text>
                  <Text style={styles.rowDesc}>Không tắt màn hình khi đang ở Chế độ nấu</Text>
                </View>
              </View>
              <Switch value={keepAwake} onValueChange={setKeepAwake} trackColor={{
              false: '#CED4DA',
              true: AppleColors.mint
            }} />
            </View>

            <View style={[styles.settingRow, styles.rowDivider]}>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowIcon}>🔔</Text>
                <View>
                  <Text style={styles.rowTitle}>Chuông báo Timer</Text>
                  <Text style={styles.rowDesc}>Đọc thông báo bằng giọng nói khi hết giờ</Text>
                </View>
              </View>
              <Switch value={soundEnabled} onValueChange={setSoundEnabled} trackColor={{
              false: '#CED4DA',
              true: AppleColors.coral
            }} />
            </View>

            <View style={[styles.settingRow, styles.rowDivider]}>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowIcon}>📳</Text>
                <View>
                  <Text style={styles.rowTitle}>Rung phản hồi (Haptics)</Text>
                  <Text style={styles.rowDesc}>Rung khi timer hết giờ (Android/iOS)</Text>
                </View>
              </View>
              <Switch value={vibrationEnabled} onValueChange={setVibrationEnabled} trackColor={{
              false: '#CED4DA',
              true: AppleColors.lavender
            }} />
            </View>

            {Platform.OS !== 'web' ? <View style={[styles.settingRow, styles.rowDivider]}>
                <View style={styles.rowLabelWrap}>
                  <Text style={styles.rowIcon}>🔕</Text>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.rowTitle}>Thông báo khi hết giờ</Text>
                    <Text style={styles.rowDesc}>Báo cả khi ứng dụng chạy nền hoặc đã đóng</Text>
                  </View>
                </View>
                <Switch value={settings.timerNotifications} onValueChange={value => updateSettings({ timerNotifications: value })} trackColor={{
                false: '#CED4DA',
                true: AppleColors.mint
              }} />
              </View> : null}
          </View>

          {/* Group: Dị ứng */}
          <Text style={styles.groupTitle}>DỊ ỨNG CỦA TÔI</Text>
          <View style={[styles.groupCard, styles.allergyCard]}>
            <Text style={styles.rowDesc}>Món có thể chứa các chất đã chọn sẽ được cảnh báo, và AI sẽ tránh gợi ý chúng.</Text>
            <View style={styles.allergyChips}>
              {ALLERGENS.map(allergen => {
              const selected = allergies.includes(allergen.id);
              return <Pressable key={allergen.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => toggleAllergy(allergen.id)} style={[styles.allergyChip, selected && styles.allergyChipActive]}>
                    <Text style={[styles.allergyChipText, selected && styles.allergyChipTextActive]}>{selected ? '✓ ' : ''}{allergen.label}</Text>
                  </Pressable>;
            })}
            </View>
            <View style={styles.inlineSwitchRow}>
              <Text style={[styles.rowTitle, { flexShrink: 1 }]}>Ẩn các món đó ở trang Khám phá</Text>
              <Switch value={settings.hideAllergenRecipes} onValueChange={value => updateSettings({ hideAllergenRecipes: value })} trackColor={{
              false: '#CED4DA',
              true: AppleColors.coral
            }} />
            </View>
          </View>

          {/* Group: Tủ lạnh & đi chợ */}
          <Text style={styles.groupTitle}>TỦ LẠNH & ĐI CHỢ</Text>
          <View style={styles.groupCard}>
            <View style={styles.settingRow}>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowIcon}>🧊</Text>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.rowTitle}>Tự cất vào tủ lạnh khi đã mua</Text>
                  <Text style={styles.rowDesc}>Đánh dấu “đã mua” trong giỏ sẽ thêm nguyên liệu vào tủ lạnh</Text>
                </View>
              </View>
              <Switch value={settings.autoStockPantry} onValueChange={value => updateSettings({ autoStockPantry: value })} trackColor={{
              false: '#CED4DA',
              true: AppleColors.mint
            }} />
            </View>

            <View style={[styles.settingRow, styles.rowDivider]}>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowIcon}>🧂</Text>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.rowTitle}>Coi gia vị cơ bản là có sẵn</Text>
                  <Text style={styles.rowDesc}>Muối, đường, tiêu, dầu ăn… không bị tính là thiếu</Text>
                </View>
              </View>
              <Switch value={settings.assumeStaples} onValueChange={value => updateSettings({ assumeStaples: value })} trackColor={{
              false: '#CED4DA',
              true: AppleColors.coral
            }} />
            </View>
          </View>

          {/* Group: Dữ liệu — everything is stored on this device only */}
          <Text style={styles.groupTitle}>DỮ LIỆU TRÊN MÁY</Text>
          <View style={styles.groupCard}>
            <Pressable accessibilityRole="button" disabled={isBusy} onPress={handleExport} style={styles.settingRow}>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowIcon}>💾</Text>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.rowTitle}>Xuất bản sao lưu</Text>
                  <Text style={styles.rowDesc}>Tệp .json gồm món tự tạo, yêu thích, đi chợ, tủ lạnh, lịch sử nấu, cài đặt</Text>
                </View>
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={isBusy} onPress={handleImport} style={[styles.settingRow, styles.rowDivider]}>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowIcon}>📂</Text>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.rowTitle}>Khôi phục từ bản sao lưu</Text>
                  <Text style={styles.rowDesc}>Chọn tệp đã xuất trước đó (thay thế dữ liệu hiện tại)</Text>
                </View>
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={isBusy} onPress={handleReset} style={[styles.settingRow, styles.rowDivider]}>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowIcon}>🗑️</Text>
                <View style={{ flexShrink: 1 }}>
                  <Text style={[styles.rowTitle, styles.dangerText]}>Xóa toàn bộ dữ liệu</Text>
                  <Text style={styles.rowDesc}>Đưa ứng dụng về trạng thái ban đầu</Text>
                </View>
              </View>
            </Pressable>
          </View>

          {/* Group: Hướng dẫn người dùng */}
          <Text style={styles.groupTitle}>HƯỚNG DẪN ỨNG DỤNG</Text>
          <View style={styles.groupCard}>
            <Pressable onPress={() => {
            onClose();
            if (onReopenOnboarding) onReopenOnboarding();
          }} style={styles.settingRow}>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowIcon}>🚀</Text>
                <View>
                  <Text style={styles.rowTitle}>Xem lại Tour Hướng Dẫn (Onboarding)</Text>
                  <Text style={styles.rowDesc}>Khám phá 4 luồng nghiệp vụ chính của CookFlow</Text>
                </View>
              </View>
              <Text style={{
              fontSize: 18,
              color: '#94A3B8'
            }}>➔</Text>
            </Pressable>
          </View>


          {/* Group 2: Đồ án môn học */}
          <Text style={styles.groupTitle}>THÔNG TIN ĐỒ ÁN MÔN HỌC</Text>
          <View style={styles.groupCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Môn học</Text>
              <Text style={styles.infoVal}>MMA301 - Mobile Multiplatform</Text>
            </View>
            <View style={[styles.infoRow, styles.rowDivider]}>
              <Text style={styles.infoKey}>Trường</Text>
              <Text style={styles.infoVal}>FPT University</Text>
            </View>
            <View style={[styles.infoRow, styles.rowDivider]}>
              <Text style={styles.infoKey}>Framework</Text>
              <Text style={styles.infoVal}>React Native (Expo SDK 57)</Text>
            </View>
            <View style={[styles.infoRow, styles.rowDivider]}>
              <Text style={styles.infoKey}>Cơ sở dữ liệu</Text>
              <Text style={styles.infoVal}>Mock Data & Local AsyncStorage</Text>
            </View>
            <View style={[styles.infoRow, styles.rowDivider]}>
              <Text style={styles.infoKey}>Phiên bản</Text>
              <Text style={styles.infoVal}>v2.0.0 (Apple Aesthetic)</Text>
            </View>
          </View>

          <View style={{
          height: 60
        }} />
        </ScrollView>
      </View>
    </Modal>;
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppleColors.background
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingVertical: 10
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1D5DB'
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: AppleColors.textPrimary
  },
  closeBtn: {
    backgroundColor: AppleColors.coralLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full
  },
  closeBtnText: {
    color: AppleColors.coralDark,
    fontSize: 14,
    fontWeight: '700'
  },
  scrollContent: {
    padding: Spacing.lg
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: 16,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: AppleColors.cardBorder,
    ...AppleShadow.soft
  },
  avatarWrap: {
    width: 58,
    height: 58,
    borderRadius: Radius.full,
    backgroundColor: AppleColors.mintLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  avatarEmoji: {
    fontSize: 32
  },
  profileText: {
    flex: 1
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: AppleColors.textPrimary,
    marginBottom: 2
  },
  userRole: {
    fontSize: 13,
    color: AppleColors.textSecondary,
    fontWeight: '600'
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: AppleColors.textSecondary,
    marginBottom: 8,
    marginLeft: 6,
    textTransform: 'uppercase'
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: AppleColors.cardBorder,
    ...AppleShadow.soft
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14
  },
  rowLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  rowIcon: {
    fontSize: 22
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: AppleColors.textPrimary,
    marginBottom: 2
  },
  rowDesc: {
    fontSize: 12,
    color: AppleColors.textSecondary
  },
  dangerText: {
    color: '#DC2626'
  },
  allergyCard: {
    paddingVertical: 14,
    gap: 10
  },
  allergyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  allergyChip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: AppleColors.cardBorder,
    justifyContent: 'center'
  },
  allergyChipActive: {
    backgroundColor: AppleColors.coral,
    borderColor: AppleColors.coral
  },
  allergyChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppleColors.textPrimary
  },
  allergyChipTextActive: {
    color: '#FFFFFF'
  },
  inlineSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5'
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14
  },
  infoKey: {
    fontSize: 14,
    fontWeight: '600',
    color: AppleColors.textPrimary
  },
  infoVal: {
    fontSize: 14,
    fontWeight: '600',
    color: AppleColors.textSecondary
  }
});