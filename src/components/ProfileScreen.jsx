import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { HeronColors, HeronShadow, Radius, Spacing } from '../constants/theme';
import { useRecipes } from '../context/RecipeContext';
import { useAuth } from '../context/AuthContext';
import { MyRecipesView } from './MyRecipesView';
import { RequestRecipeModal } from './RequestRecipeModal';
import { AppleButton } from './ui/AppleButton';
import { confirmAction, showAlert } from '../utils/dialog';
import { CALORIE_GOAL_MAX, CALORIE_GOAL_MIN } from '../utils/nutrition';
import { addDays, dateKey, loggedDays } from '../utils/mealPlan';
import { requestStatus, requestType } from '../utils/recipeRequests';
import { formatCookedDay } from '../utils/history';

const initialsOf = name => String(name || '?').trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase();

/**
 * "Hồ sơ" tab: account, daily kcal goal, personal recipes, requests sent to the admin, and the
 * shortcuts that used to live in the header (settings, QR scan, sign out).
 * `view` is controlled by the parent so other screens can open "Món của tôi" directly.
 */
export const ProfileScreen = ({ view, onChangeView, onSelectRecipe, onEditRecipe, onOpenSettings, onOpenQr }) => {
  const { user, signOut, updateProfile, changePassword } = useAuth();
  const { recipes, favoriteIds, cookHistory, mealPlan, recipeRequests, deleteRecipeRequest, settings, updateSettings } = useRecipes();
  const [isRequestVisible, setIsRequestVisible] = useState(false);
  const [isEditVisible, setIsEditVisible] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const myRequests = useMemo(() => recipeRequests.filter(r => r.userEmail === user?.email), [recipeRequests, user?.email]);
  const unreadReplies = myRequests.filter(r => r.adminReply && r.status !== 'pending').length;
  const today = dateKey();
  const streak = useMemo(() => {
    // Consecutive logged days ending today (or yesterday, if today has nothing yet)
    const days = new Set(loggedDays(mealPlan, cookHistory, addDays(today, -365), today));
    let day = days.has(today) ? today : addDays(today, -1);
    let count = 0;
    while (days.has(day)) {
      count += 1;
      day = addDays(day, -1);
    }
    return count;
  }, [mealPlan, cookHistory, today]);
  const goal = settings.calorieGoal || 2000;
  const changeGoal = delta => updateSettings({ calorieGoal: Math.min(CALORIE_GOAL_MAX, Math.max(CALORIE_GOAL_MIN, goal + delta)) });

  if (view === 'myRecipes') {
    return <View style={{ flex: 1 }}>
        <SubHeader title="Món của tôi" onBack={() => onChangeView('home')} />
        <MyRecipesView onSelectRecipe={onSelectRecipe} onEditRecipe={onEditRecipe} />
      </View>;
  }
  if (view === 'requests') {
    return <View style={{ flex: 1 }}>
        <SubHeader title="Yêu cầu của tôi" onBack={() => onChangeView('home')} action="+ Gửi mới" onAction={() => setIsRequestVisible(true)} />
        <ScrollView contentContainerStyle={styles.subContent}>
          {myRequests.length === 0 ? <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Chưa có yêu cầu nào</Text>
              <Text style={styles.emptyText}>Muốn CookFlow có thêm món, hay thấy công thức chưa đúng? Gửi cho quản trị viên tại đây.</Text>
              <AppleButton title="Gửi yêu cầu" onPress={() => setIsRequestVisible(true)} style={{ marginTop: 14 }} />
            </View> : myRequests.map(request => {
            const status = requestStatus(request.status);
            const type = requestType(request.type);
            return <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestTop}>
                  <Text style={styles.requestType}>{type.icon} {type.label}</Text>
                  <View style={[styles.statusPill, { backgroundColor: status.bg }]}><Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text></View>
                </View>
                <Text style={styles.requestTitle}>{request.title}</Text>
                {request.recipeTitle && request.type !== 'new_recipe' ? <Text style={styles.requestMeta}>Công thức: {request.recipeTitle}</Text> : null}
                <Text style={styles.requestDetails}>{request.details}</Text>
                {request.adminReply ? <View style={styles.reply}>
                    <Text style={styles.replyLabel}>Phản hồi của quản trị viên</Text>
                    <Text style={styles.replyText}>{request.adminReply}</Text>
                  </View> : null}
                <View style={styles.requestFoot}>
                  <Text style={styles.requestMeta}>Gửi {formatCookedDay(request.createdAt).toLowerCase()}</Text>
                  {request.status === 'pending' ? <Pressable hitSlop={8} onPress={() => confirmAction({
                title: 'Thu hồi yêu cầu?',
                message: request.title,
                confirmText: 'Thu hồi',
                destructive: true,
                onConfirm: () => deleteRecipeRequest(request.id)
              })}><Text style={styles.withdraw}>Thu hồi</Text></Pressable> : null}
                </View>
              </View>;
          })}
          <View style={{ height: 140 }} />
        </ScrollView>
        <RequestRecipeModal visible={isRequestVisible} onClose={() => setIsRequestVisible(false)} />
      </View>;
  }

  const menu = [
    { icon: '📒', label: 'Món của tôi', detail: `${favoriteIds.length} đã lưu • ${recipes.filter(r => r.isCustom && r.isOwner).length} tự tạo`, onPress: () => onChangeView('myRecipes') },
    { icon: '📮', label: 'Yêu cầu & báo cáo công thức', detail: unreadReplies ? `${unreadReplies} phản hồi từ quản trị viên` : `${myRequests.length} yêu cầu đã gửi`, onPress: () => onChangeView('requests'), badge: unreadReplies },
    { icon: '✍️', label: 'Gửi yêu cầu công thức mới', detail: 'Món bạn muốn CookFlow bổ sung', onPress: () => setIsRequestVisible(true) },
    { icon: '📷', label: 'Quét QR công thức', detail: 'Nhận công thức bạn bè chia sẻ', onPress: onOpenQr },
    { icon: '⚙️', label: 'Cài đặt', detail: 'Dị ứng, hẹn giờ, sao lưu dữ liệu', onPress: onOpenSettings },
    { icon: '🔒', label: 'Đổi mật khẩu', detail: 'Bảo mật tài khoản', onPress: () => setIsPasswordVisible(true) }
  ];

  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <Text style={styles.tag}>HỒ SƠ // TÀI KHOẢN</Text>
      <View style={styles.profileCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initialsOf(user?.name)}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{user?.name}</Text>
          <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => setIsEditVisible(true)} style={styles.editBtn}><Text style={styles.editText}>Sửa</Text></Pressable>
      </View>

      <View style={styles.statsRow}>
        {[[cookHistory.length, 'lần nấu'], [favoriteIds.length, 'món đã lưu'], [streak, 'ngày liên tục']].map(([value, label]) => <View key={label} style={styles.stat}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>)}
      </View>

      <View style={styles.goalCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.goalLabel}>Mục tiêu calo mỗi ngày</Text>
          <Text style={styles.goalHint}>Dùng cho thanh tiến độ ở Lịch ăn</Text>
        </View>
        <Pressable accessibilityLabel="Giảm mục tiêu" disabled={goal <= CALORIE_GOAL_MIN} onPress={() => changeGoal(-100)} style={styles.goalBtn}><Text style={styles.goalBtnText}>−</Text></Pressable>
        <Text style={styles.goalValue}>{goal.toLocaleString('vi-VN')}</Text>
        <Pressable accessibilityLabel="Tăng mục tiêu" disabled={goal >= CALORIE_GOAL_MAX} onPress={() => changeGoal(100)} style={styles.goalBtn}><Text style={styles.goalBtnText}>+</Text></Pressable>
      </View>

      <View style={styles.menuCard}>
        {menu.map((item, index) => <Pressable key={item.label} accessibilityRole="button" onPress={item.onPress} style={({ pressed }) => [styles.menuRow, index > 0 && styles.menuDivider, pressed && { backgroundColor: HeronColors.cardAlt }]}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuDetail} numberOfLines={1}>{item.detail}</Text>
            </View>
            {item.badge ? <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{item.badge}</Text></View> : null}
            <Text style={styles.chevron}>›</Text>
          </Pressable>)}
      </View>

      <Pressable accessibilityRole="button" onPress={() => confirmAction({ title: 'Đăng xuất?', message: 'Dữ liệu nấu ăn vẫn được giữ trên máy này.', confirmText: 'Đăng xuất', destructive: true, onConfirm: signOut })} style={styles.logout}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </Pressable>
      <View style={{ height: 150 }} />

      <RequestRecipeModal visible={isRequestVisible} onClose={() => setIsRequestVisible(false)} />
      <EditProfileModal visible={isEditVisible} onClose={() => setIsEditVisible(false)} initialName={user?.name} onSave={updateProfile} />
      <PasswordModal visible={isPasswordVisible} onClose={() => setIsPasswordVisible(false)} onSave={changePassword} />
    </ScrollView>;
};

const SubHeader = ({ title, onBack, action, onAction }) => <View style={styles.subHeader}>
    <Pressable accessibilityRole="button" accessibilityLabel="Quay lại Hồ sơ" hitSlop={8} onPress={onBack} style={styles.backBtn}><Text style={styles.backText}>‹ Hồ sơ</Text></Pressable>
    <Text style={styles.subTitle}>{title}</Text>
    {action ? <Pressable hitSlop={8} onPress={onAction}><Text style={styles.subAction}>{action}</Text></Pressable> : <View style={{ width: 60 }} />}
  </View>;

const FormModal = ({ visible, title, onClose, children }) => <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>{title}</Text>
        {children}
      </View>
    </View>
  </Modal>;

const EditProfileModal = ({ visible, onClose, initialName, onSave }) => {
  const [name, setName] = useState(initialName || '');
  const [busy, setBusy] = useState(false);
  React.useEffect(() => { if (visible) setName(initialName || ''); }, [visible, initialName]);
  const save = async () => {
    setBusy(true);
    try {
      await onSave({ name });
      onClose();
    } catch (e) {
      showAlert('Chưa lưu được', e.message);
    } finally {
      setBusy(false);
    }
  };
  return <FormModal visible={visible} title="Sửa hồ sơ" onClose={onClose}>
      <Text style={styles.inputLabel}>Tên hiển thị</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={40} autoFocus />
      <View style={styles.sheetActions}>
        <AppleButton title="Hủy" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
        <AppleButton title={busy ? 'Đang lưu...' : 'Lưu'} disabled={busy} onPress={save} style={{ flex: 1 }} />
      </View>
    </FormModal>;
};

const PasswordModal = ({ visible, onClose, onSave }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  React.useEffect(() => {
    if (visible) { setOldPassword(''); setNewPassword(''); setConfirm(''); }
  }, [visible]);
  const save = async () => {
    if (newPassword !== confirm) return showAlert('Chưa khớp', 'Mật khẩu xác nhận chưa giống mật khẩu mới.');
    try {
      await onSave(oldPassword, newPassword);
      onClose();
      showAlert('Đã đổi mật khẩu ✓', 'Lần đăng nhập sau hãy dùng mật khẩu mới.');
    } catch (e) {
      showAlert('Chưa đổi được', e.message);
    }
  };
  return <FormModal visible={visible} title="Đổi mật khẩu" onClose={onClose}>
      <Text style={styles.inputLabel}>Mật khẩu hiện tại</Text>
      <TextInput style={styles.input} value={oldPassword} onChangeText={setOldPassword} secureTextEntry />
      <Text style={styles.inputLabel}>Mật khẩu mới (ít nhất 8 ký tự)</Text>
      <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
      <Text style={styles.inputLabel}>Nhập lại mật khẩu mới</Text>
      <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} secureTextEntry />
      <View style={styles.sheetActions}>
        <AppleButton title="Hủy" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
        <AppleButton title="Đổi mật khẩu" onPress={save} style={{ flex: 1 }} />
      </View>
    </FormModal>;
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  tag: { fontSize: 10, fontWeight: '900', color: HeronColors.brand, letterSpacing: 1, marginBottom: 10 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: Radius.lg, backgroundColor: HeronColors.primary, ...HeronShadow.card },
  avatar: { width: 56, height: 56, borderRadius: 18, backgroundColor: HeronColors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  name: { fontSize: 19, fontWeight: '900', color: '#FFFFFF' },
  email: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
  editBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.14)' },
  editText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stat: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: Radius.md, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border },
  statValue: { fontSize: 20, fontWeight: '900', color: HeronColors.primary },
  statLabel: { fontSize: 11, color: HeronColors.granite, marginTop: 2 },
  goalCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, padding: 14, borderRadius: Radius.md, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border },
  goalLabel: { fontSize: 14, fontWeight: '800', color: HeronColors.primary },
  goalHint: { fontSize: 11, color: HeronColors.granite, marginTop: 2 },
  goalBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: HeronColors.brandLight, alignItems: 'center', justifyContent: 'center' },
  goalBtnText: { fontSize: 18, fontWeight: '900', color: HeronColors.brandHover, lineHeight: 20 },
  goalValue: { minWidth: 52, textAlign: 'center', fontSize: 16, fontWeight: '900', color: HeronColors.primary },
  menuCard: { marginTop: 12, borderRadius: Radius.md, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  menuDivider: { borderTopWidth: 1, borderTopColor: HeronColors.borderLight },
  menuIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '800', color: HeronColors.primary },
  menuDetail: { fontSize: 11, color: HeronColors.granite, marginTop: 2 },
  menuBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: HeronColors.brand, alignItems: 'center', justifyContent: 'center' },
  menuBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  chevron: { fontSize: 20, color: HeronColors.disable },
  logout: { marginTop: 16, paddingVertical: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: HeronColors.border, backgroundColor: '#FFFFFF', alignItems: 'center' },
  logoutText: { fontSize: 14, fontWeight: '800', color: HeronColors.brand },
  subHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 10 },
  backBtn: { width: 60 },
  backText: { fontSize: 14, fontWeight: '800', color: HeronColors.brand },
  subTitle: { fontSize: 17, fontWeight: '900', color: HeronColors.primary },
  subAction: { fontSize: 13, fontWeight: '800', color: HeronColors.brand },
  subContent: { paddingHorizontal: Spacing.lg, gap: 10 },
  emptyBox: { padding: 20, borderRadius: Radius.md, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: HeronColors.primary },
  emptyText: { fontSize: 13, color: HeronColors.granite, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  requestCard: { padding: 14, borderRadius: Radius.md, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, gap: 6 },
  requestTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestType: { fontSize: 11, fontWeight: '800', color: HeronColors.granite },
  statusPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.full },
  statusText: { fontSize: 11, fontWeight: '800' },
  requestTitle: { fontSize: 15, fontWeight: '800', color: HeronColors.primary },
  requestDetails: { fontSize: 13, color: HeronColors.secondary, lineHeight: 18 },
  requestMeta: { fontSize: 11, color: HeronColors.granite },
  reply: { padding: 10, borderRadius: Radius.sm, backgroundColor: HeronColors.cardAlt, borderLeftWidth: 3, borderLeftColor: HeronColors.brand },
  replyLabel: { fontSize: 10, fontWeight: '900', color: HeronColors.brand, letterSpacing: 0.5 },
  replyText: { fontSize: 13, color: HeronColors.primary, marginTop: 3, lineHeight: 18 },
  requestFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  withdraw: { fontSize: 12, fontWeight: '800', color: HeronColors.brand },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,20,20,0.45)', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: Radius.lg, padding: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: HeronColors.primary, marginBottom: 6 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: HeronColors.granite, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: HeronColors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: HeronColors.primary, backgroundColor: HeronColors.cardAlt },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 18 }
});
