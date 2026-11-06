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
export const ProfileScreen = ({ view, onChangeView, onSelectRecipe, onEditRecipe, onOpenSettings, onOpenQr, onOpenPantry }) => {
  const { user, signOut, updateProfile, changePassword } = useAuth();
  const { recipes, favoriteIds, cookHistory, mealPlan, recipeRequests, deleteRecipeRequest, settings, updateSettings, pantryIngredients } = useRecipes();
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

  const myRecipeCount = recipes.filter(r => r.isCustom && r.isOwner).length;
  const sections = [
    {
      title: 'Bếp của tôi',
      items: [
        { icon: '📒', tint: HeronColors.amberLight, label: 'Món của tôi', detail: `${favoriteIds.length} đã lưu • ${myRecipeCount} tự tạo`, onPress: () => onChangeView('myRecipes') },
        { icon: '🧊', tint: HeronColors.blueLight, label: 'Tủ lạnh nhà tôi', detail: pantryIngredients.length ? `${pantryIngredients.length} nguyên liệu • xem món nấu được` : 'Chọn nguyên liệu đang có để tìm món', onPress: onOpenPantry }
      ]
    },
    {
      title: 'Cộng đồng',
      items: [
        { icon: '📮', tint: HeronColors.brandLight, label: 'Yêu cầu & báo cáo', detail: unreadReplies ? `${unreadReplies} phản hồi mới từ quản trị viên` : `${myRequests.length} yêu cầu đã gửi`, onPress: () => onChangeView('requests'), badge: unreadReplies },
        { icon: '✍️', tint: HeronColors.emeraldLight, label: 'Gửi yêu cầu công thức mới', detail: 'Món bạn muốn CookFlow bổ sung', onPress: () => setIsRequestVisible(true) },
        { icon: '📷', tint: HeronColors.cardAlt, label: 'Quét QR công thức', detail: 'Nhận công thức bạn bè chia sẻ', onPress: onOpenQr }
      ]
    },
    {
      title: 'Tài khoản',
      items: [
        { icon: '⚙️', tint: HeronColors.cardAlt, label: 'Cài đặt', detail: 'Dị ứng, hẹn giờ, sao lưu dữ liệu', onPress: onOpenSettings },
        { icon: '🔒', tint: HeronColors.cardAlt, label: 'Đổi mật khẩu', detail: 'Bảo mật tài khoản', onPress: () => setIsPasswordVisible(true) }
      ]
    }
  ];
  const stats = [[cookHistory.length, 'Lần nấu'], [favoriteIds.length, 'Món đã lưu'], [streak, 'Ngày liên tục']];

  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <Text style={styles.tag}>CÁ NHÂN</Text>
      <Text style={styles.pageTitle}>Hồ sơ</Text>

      <View style={styles.profileCard}>
        {/* Decorative glow, behind the content */}
        <View pointerEvents="none" style={styles.glow} />
        <View style={styles.profileTop}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initialsOf(user?.name)}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{user?.name}</Text>
            <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
            {user?.verified ? <View style={styles.verified}><Text style={styles.verifiedText}>✓ Đã xác minh</Text></View> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Sửa hồ sơ" hitSlop={6} onPress={() => setIsEditVisible(true)} style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7 }]}>
            <Text style={styles.editText}>✎ Sửa</Text>
          </Pressable>
        </View>
        <View style={styles.statsRow}>
          {stats.map(([value, label], index) => <View key={label} style={[styles.stat, index > 0 && styles.statDivider]}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>)}
        </View>
      </View>

      <View style={styles.goalCard}>
        <View style={styles.goalIcon}><Text style={{ fontSize: 20 }}>🎯</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.goalLabel}>Mục tiêu calo / ngày</Text>
          <Text style={styles.goalHint}>Thanh tiến độ ở Lịch ăn</Text>
        </View>
        <View style={styles.stepper}>
          <Pressable accessibilityLabel="Giảm mục tiêu" hitSlop={6} disabled={goal <= CALORIE_GOAL_MIN} onPress={() => changeGoal(-100)} style={({ pressed }) => [styles.goalBtn, goal <= CALORIE_GOAL_MIN && styles.goalBtnOff, pressed && { opacity: 0.7 }]}><Text style={styles.goalBtnText}>−</Text></Pressable>
          <View style={styles.goalValueBox}>
            <Text style={styles.goalValue}>{goal.toLocaleString('vi-VN')}</Text>
            <Text style={styles.goalUnit}>kcal</Text>
          </View>
          <Pressable accessibilityLabel="Tăng mục tiêu" hitSlop={6} disabled={goal >= CALORIE_GOAL_MAX} onPress={() => changeGoal(100)} style={({ pressed }) => [styles.goalBtn, goal >= CALORIE_GOAL_MAX && styles.goalBtnOff, pressed && { opacity: 0.7 }]}><Text style={styles.goalBtnText}>+</Text></Pressable>
        </View>
      </View>

      {sections.map(section => <View key={section.title}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.menuCard}>
            {section.items.map((item, index) => <Pressable key={item.label} accessibilityRole="button" onPress={item.onPress} style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: HeronColors.cardAlt }]}>
                <View style={[styles.menuIconBox, { backgroundColor: item.tint }]}><Text style={styles.menuIcon}>{item.icon}</Text></View>
                <View style={[styles.menuBody, index > 0 && styles.menuDivider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuLabel} numberOfLines={1}>{item.label}</Text>
                    <Text style={[styles.menuDetail, item.badge ? styles.menuDetailHot : null]} numberOfLines={1}>{item.detail}</Text>
                  </View>
                  {item.badge ? <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{item.badge}</Text></View> : null}
                  <Text style={styles.chevron}>›</Text>
                </View>
              </Pressable>)}
          </View>
        </View>)}

      <Pressable accessibilityRole="button" onPress={() => confirmAction({ title: 'Đăng xuất?', message: 'Dữ liệu nấu ăn vẫn được giữ trên máy này.', confirmText: 'Đăng xuất', destructive: true, onConfirm: signOut })} style={({ pressed }) => [styles.logout, pressed && { opacity: 0.7 }]}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </Pressable>
      <Text style={styles.footer}>CookFlow • nấu ngon mỗi ngày</Text>
      <View style={{ height: 150 }} />

      <RequestRecipeModal visible={isRequestVisible} onClose={() => setIsRequestVisible(false)} />
      <EditProfileModal visible={isEditVisible} onClose={() => setIsEditVisible(false)} initialName={user?.name} onSave={updateProfile} />
      <PasswordModal visible={isPasswordVisible} onClose={() => setIsPasswordVisible(false)} onSave={changePassword} />
    </ScrollView>;
};

const SubHeader = ({ title, onBack, action, onAction }) => <View style={styles.subHeader}>
    <Pressable accessibilityRole="button" accessibilityLabel="Quay lại Hồ sơ" hitSlop={8} onPress={onBack} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}>
      <Text style={styles.backText}>‹</Text>
    </Pressable>
    <Text style={styles.subTitle} numberOfLines={1}>{title}</Text>
    {action ? <Pressable accessibilityRole="button" hitSlop={8} onPress={onAction} style={({ pressed }) => [styles.subActionBtn, pressed && { opacity: 0.7 }]}><Text style={styles.subAction}>{action}</Text></Pressable> : <View style={styles.subSpacer} />}
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
  tag: { fontSize: 10, fontWeight: '900', color: HeronColors.brand, letterSpacing: 1 },
  pageTitle: { fontSize: 26, fontWeight: '900', color: HeronColors.primary, letterSpacing: -0.8, marginBottom: Spacing.md },
  profileCard: { borderRadius: 24, backgroundColor: HeronColors.primary, overflow: 'hidden', ...HeronShadow.card },
  glow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, right: -110, top: -150, backgroundColor: 'rgba(250,54,0,0.13)' },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, paddingBottom: 16 },
  avatar: { width: 60, height: 60, borderRadius: 20, backgroundColor: HeronColors.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.18)' },
  avatarText: { fontSize: 21, fontWeight: '900', color: '#FFFFFF' },
  name: { fontSize: 19, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3 },
  email: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  verified: { alignSelf: 'flex-start', marginTop: 7, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, backgroundColor: 'rgba(43,138,62,0.25)' },
  verifiedText: { fontSize: 10, fontWeight: '800', color: '#8CE99A' },
  editBtn: { height: 34, paddingHorizontal: 14, justifyContent: 'center', borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  editText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  statsRow: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 12, paddingVertical: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.07)' },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.12)' },
  statValue: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  goalCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 14, borderRadius: Radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border },
  goalIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: HeronColors.brandLight, alignItems: 'center', justifyContent: 'center' },
  goalLabel: { fontSize: 14, fontWeight: '800', color: HeronColors.primary },
  goalHint: { fontSize: 11, color: HeronColors.granite, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', padding: 4, borderRadius: Radius.full, backgroundColor: HeronColors.cardAlt, borderWidth: 1, borderColor: HeronColors.borderLight },
  goalBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, alignItems: 'center', justifyContent: 'center' },
  goalBtnOff: { opacity: 0.4 },
  goalBtnText: { fontSize: 17, fontWeight: '900', color: HeronColors.brand, lineHeight: 20 },
  goalValueBox: { minWidth: 58, alignItems: 'center' },
  goalValue: { fontSize: 15, fontWeight: '900', color: HeronColors.primary, fontVariant: ['tabular-nums'] },
  goalUnit: { fontSize: 9, fontWeight: '700', color: HeronColors.granite, marginTop: -1 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: HeronColors.granite, marginTop: 20, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  menuCard: { borderRadius: Radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14 },
  menuIconBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
  menuIcon: { fontSize: 18 },
  menuBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingRight: 14 },
  menuDivider: { borderTopWidth: 1, borderTopColor: HeronColors.borderLight },
  menuLabel: { fontSize: 14, fontWeight: '800', color: HeronColors.primary },
  menuDetail: { fontSize: 12, color: HeronColors.granite, marginTop: 2 },
  menuDetailHot: { color: HeronColors.brand, fontWeight: '700' },
  menuBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: HeronColors.brand, alignItems: 'center', justifyContent: 'center' },
  menuBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  chevron: { fontSize: 22, color: HeronColors.disable, marginTop: -2 },
  logout: { marginTop: 22, height: 50, borderRadius: Radius.lg, borderWidth: 1, borderColor: '#FFD8CF', backgroundColor: HeronColors.brandLight, alignItems: 'center', justifyContent: 'center' },
  logoutText: { fontSize: 14, fontWeight: '800', color: HeronColors.brandHover },
  footer: { marginTop: 14, textAlign: 'center', fontSize: 11, color: HeronColors.disable },
  subHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 26, fontWeight: '600', color: HeronColors.primary, lineHeight: 28, marginTop: -2, marginLeft: -2 },
  subTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '900', color: HeronColors.primary, letterSpacing: -0.3 },
  subActionBtn: { height: 36, paddingHorizontal: 12, justifyContent: 'center', borderRadius: Radius.full, backgroundColor: HeronColors.brandLight, borderWidth: 1, borderColor: '#FFD8CF' },
  subAction: { fontSize: 12, fontWeight: '800', color: HeronColors.brandHover },
  subSpacer: { width: 40 },
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
