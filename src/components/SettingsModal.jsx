import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { AppleColors, Radius, AppleShadow, Spacing } from '../constants/theme';
export const SettingsModal = ({
  visible,
  onClose,
  onReopenOnboarding
}) => {
  const [keepAwake, setKeepAwake] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
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
                  <Text style={styles.rowDesc}>Phát chuông khi đếm ngược hoàn tất</Text>
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
                  <Text style={styles.rowDesc}>Rung nhẹ khi chạm nút và hết giờ</Text>
                </View>
              </View>
              <Switch value={vibrationEnabled} onValueChange={setVibrationEnabled} trackColor={{
              false: '#CED4DA',
              true: AppleColors.lavender
            }} />
            </View>
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