import React, { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
// react-native's SafeAreaView only works on iOS: on Android the header slid under the status bar
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeronColors as C, HeronShadow, Radius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useRecipes } from '../context/RecipeContext';
import { CreateRecipeModal } from './CreateRecipeModal';
import { REQUEST_TYPE_TINT } from './RequestRecipeModal';
import { AppleButton } from './ui/AppleButton';
import { confirmAction, showAlert } from '../utils/dialog';
import { matchesSearch } from '../utils/text';
import { addDays, dateKey, weekdayLabel } from '../utils/mealPlan';
import { REQUEST_STATUSES, countByStatus, requestStatus, requestType } from '../utils/recipeRequests';
import { formatCookedDay } from '../utils/history';
import { ALL_CATEGORY } from '../utils/categories';

const DANGER = '#D92D20';
const TABS = [
  { id: 'overview', icon: '📊', label: 'Tổng quan', tag: 'QUẢN TRỊ' },
  { id: 'categories', icon: '🗂️', label: 'Danh mục', tag: 'KHO CÔNG THỨC' },
  { id: 'recipes', icon: '📖', label: 'Công thức', tag: 'KHO CÔNG THỨC' },
  { id: 'users', icon: '👥', label: 'Người dùng', tag: 'TÀI KHOẢN' },
  { id: 'requests', icon: '📮', label: 'Yêu cầu', tag: 'GÓP Ý' }
];
const initialsOf = name => String(name || '?').trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase();

/** Admin console: data from the CookFlow API, with CRUD on every catalog. Same look as the user app. */
export function AdminScreen() {
  const { user, signOut } = useAuth();
  const { recipeRequests } = useRecipes();
  const [tab, setTab] = useState('overview');
  const pending = recipeRequests.filter(r => r.status === 'pending').length;
  const current = TABS.find(item => item.id === tab);
  const askSignOut = () => confirmAction({ title: 'Đăng xuất?', message: 'Bạn sẽ quay về màn hình đăng nhập.', confirmText: 'Đăng xuất', destructive: true, onConfirm: signOut });

  return <SafeAreaView style={styles.safe}>
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tag}>🛡️ {current.tag}</Text>
          <Text style={styles.title} numberOfLines={1}>{tab === 'overview' ? `Xin chào, ${user?.name || 'Quản trị viên'}` : current.label}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Tài khoản quản trị — đăng xuất" onPress={askSignOut} style={({ pressed }) => [styles.avatarBtn, pressed && styles.pressed]}>
          <Text style={styles.avatarBtnText}>{initialsOf(user?.name)}</Text>
        </Pressable>
      </View>

      {tab === 'overview' ? <OverviewTab onOpen={setTab} onSignOut={askSignOut} /> : tab === 'categories' ? <CategoriesTab /> : tab === 'recipes' ? <RecipesTab /> : tab === 'users' ? <UsersTab /> : <RequestsTab />}

      {/* Bottom dock, same as the user app */}
      <View style={styles.dockWrap}>
        <View style={styles.dock}>
          {TABS.map(item => {
            const active = tab === item.id;
            const badge = item.id === 'requests' ? pending : 0;
            return <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={badge ? `${item.label}, ${badge} chờ duyệt` : item.label} onPress={() => setTab(item.id)} style={({ pressed }) => [styles.dockItem, active && styles.dockItemActive, pressed && styles.pressed]}>
                <View>
                  <Text style={[styles.dockIcon, active && styles.dockIconActive]}>{item.icon}</Text>
                  {badge ? <View style={styles.dockBadge}><Text style={styles.dockBadgeText}>{badge > 99 ? '99+' : badge}</Text></View> : null}
                </View>
                <Text style={[styles.dockLabel, active && styles.dockLabelActive]} numberOfLines={1}>{item.label}</Text>
              </Pressable>;
          })}
        </View>
      </View>
    </View>
  </SafeAreaView>;
}

// ---------------------------------------------------------------- Overview
function OverviewTab({ onOpen, onSignOut }) {
  const { listUsers } = useAuth();
  const { recipes, categories, recipeRequests } = useRecipes();
  const users = listUsers().filter(u => u.role !== 'admin');
  const catalog = recipes.filter(r => !r.isCustom);
  const counts = countByStatus(recipeRequests);
  const missingKcal = catalog.filter(r => !r.calories).length;
  const lockedUsers = users.filter(u => u.locked).length;
  const today = dateKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  // Shared data only: each account's meal journal is private to that account
  const activity = days.map(day => recipeRequests.filter(r => dateKey(r.createdAt) === day).length
    + recipes.filter(r => r.createdAt && dateKey(new Date(r.createdAt).getTime()) === day).length);
  const max = Math.max(1, ...activity);
  const weekTotal = activity.reduce((sum, value) => sum + value, 0);
  const stats = [
    { label: 'Người dùng', value: users.length, tab: 'users' },
    { label: 'Công thức', value: catalog.length, tab: 'recipes' },
    { label: 'Danh mục', value: categories.length, tab: 'categories' },
    { label: 'Chờ duyệt', value: counts.pending, tab: 'requests', hot: counts.pending > 0 }
  ];
  const attention = [
    counts.pending ? { icon: '📮', tint: C.brandLight, title: `${counts.pending} yêu cầu chờ duyệt`, detail: counts.in_progress ? `${counts.in_progress} yêu cầu khác đang xử lý` : 'Người dùng đang chờ phản hồi', tab: 'requests' } : null,
    missingKcal ? { icon: '🔥', tint: C.amberLight, title: `${missingKcal} công thức chưa có kcal`, detail: 'Bổ sung để thanh calo ở Lịch ăn chính xác', tab: 'recipes' } : null,
    lockedUsers ? { icon: '🔒', tint: C.cardAlt, title: `${lockedUsers} tài khoản đang bị khóa`, detail: 'Xem lại và mở khóa nếu cần', tab: 'users' } : null
  ].filter(Boolean);

  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View pointerEvents="none" style={styles.heroGlow} />
        <Text style={styles.heroTitle}>Bảng điều khiển</Text>
        <Text style={styles.heroSub}>Dữ liệu trực tiếp từ máy chủ CookFlow</Text>
        <View style={styles.heroStats}>
          {stats.map((item, index) => <Pressable key={item.label} accessibilityRole="button" onPress={() => onOpen(item.tab)} style={({ pressed }) => [styles.heroStat, index > 0 && styles.heroDivider, pressed && styles.pressed]}>
              <Text style={[styles.heroValue, item.hot && { color: '#FF8A65' }]}>{item.value}</Text>
              <Text style={styles.heroLabel} numberOfLines={1}>{item.label}</Text>
            </Pressable>)}
        </View>
      </View>

      <Text style={styles.section}>Cần chú ý</Text>
      {attention.length ? <View style={styles.listCard}>
          {attention.map((item, index) => <Pressable key={item.title} accessibilityRole="button" onPress={() => onOpen(item.tab)} style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: C.cardAlt }]}>
              <View style={[styles.iconBox, { backgroundColor: item.tint }]}><Text style={styles.iconBoxText}>{item.icon}</Text></View>
              <View style={[styles.menuBody, index > 0 && styles.divider]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>{item.detail}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            </Pressable>)}
        </View> : <View style={[styles.card, styles.allGood]}>
          <View style={[styles.iconBox, { backgroundColor: C.emeraldLight }]}><Text style={styles.iconBoxText}>✅</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Mọi thứ đều ổn</Text>
            <Text style={styles.rowSub}>Không có yêu cầu chờ hay công thức thiếu dữ liệu.</Text>
          </View>
        </View>}

      <Text style={styles.section}>Hoạt động 7 ngày</Text>
      <View style={styles.card}>
        <View style={styles.chartHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{weekTotal} hoạt động</Text>
            <Text style={styles.rowSub}>Yêu cầu mới + công thức mới mỗi ngày</Text>
          </View>
          <View style={styles.legend}><View style={styles.legendDot} /><Text style={styles.legendText}>Hôm nay</Text></View>
        </View>
        <View style={styles.chart}>
          {activity.map((value, index) => <View key={days[index]} style={styles.barColumn}>
              <Text style={styles.barValue}>{value || ''}</Text>
              <View style={[styles.bar, index === 6 && styles.barActive, { height: 6 + value / max * 84 }]} />
              <Text style={[styles.day, index === 6 && styles.dayActive]}>{weekdayLabel(days[index])}</Text>
            </View>)}
        </View>
      </View>

      <Pressable accessibilityRole="button" onPress={onSignOut} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </Pressable>
      <Text style={styles.footer}>CookFlow • bảng quản trị</Text>
    </ScrollView>;
}

// ---------------------------------------------------------------- Categories
function CategoriesTab() {
  const { categories, addCategory, renameCategory, deleteCategory, moveCategory, countRecipesInCategory } = useRecipes();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  const handleAdd = async () => {
    const error = await addCategory(newName);
    if (error) return showAlert('Chưa thêm được', error);
    setNewName('');
  };
  const handleRename = async () => {
    const error = await renameCategory(editing, draft);
    if (error) return showAlert('Chưa đổi tên được', error);
    setEditing(null);
  };
  const handleDelete = name => {
    const count = countRecipesInCategory(name);
    confirmAction({
      title: `Xóa danh mục "${name}"?`,
      message: count ? `${count} công thức trong danh mục này sẽ chuyển sang danh mục mặc định.` : 'Danh mục đang trống.',
      confirmText: 'Xóa',
      destructive: true,
      onConfirm: async () => {
        const error = await deleteCategory(name);
        if (error) showAlert('Không xóa được', error);
      }
    });
  };
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🗂️</Text>
          <TextInput style={styles.searchInput} placeholder="Tên danh mục mới, vd: Đồ nướng 🔥" placeholderTextColor={C.disable} value={newName} onChangeText={setNewName} onSubmitEditing={handleAdd} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Thêm danh mục" onPress={handleAdd} style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}><Text style={styles.addBtnText}>＋</Text></Pressable>
      </View>
      <Text style={styles.hint}>“{ALL_CATEGORY}” luôn có sẵn trên trang Khám phá. Thứ tự dưới đây là thứ tự hiển thị — dùng ▲▼ để sắp xếp.</Text>
      <View style={styles.listCard}>
        {categories.map((name, index) => <View key={name} style={styles.menuRow}>
            <View style={[styles.orderBox]}>
              <Pressable accessibilityLabel="Lên" disabled={index === 0} hitSlop={4} onPress={() => moveCategory(name, -1)} style={[styles.orderBtn, index === 0 && styles.dim]}><Text style={styles.arrow}>▲</Text></Pressable>
              <Pressable accessibilityLabel="Xuống" disabled={index === categories.length - 1} hitSlop={4} onPress={() => moveCategory(name, 1)} style={[styles.orderBtn, index === categories.length - 1 && styles.dim]}><Text style={styles.arrow}>▼</Text></Pressable>
            </View>
            <View style={[styles.menuBody, index > 0 && styles.divider]}>
              {editing === name ? <>
                  <TextInput style={[styles.input, { flex: 1 }]} value={draft} onChangeText={setDraft} autoFocus onSubmitEditing={handleRename} />
                  <ActionPill label="Lưu" tone="brand" onPress={handleRename} />
                  <ActionPill label="Hủy" onPress={() => setEditing(null)} />
                </> : <>
                  <View style={styles.indexBadge}><Text style={styles.indexText}>{index + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{name}</Text>
                    <Text style={styles.rowSub}>{countRecipesInCategory(name)} công thức</Text>
                  </View>
                  <ActionPill label="Sửa" onPress={() => { setEditing(name); setDraft(name); }} />
                  <ActionPill label="Xóa" tone="danger" disabled={categories.length <= 1} onPress={() => handleDelete(name)} />
                </>}
            </View>
          </View>)}
      </View>
    </ScrollView>;
}

// ---------------------------------------------------------------- Recipes
const SOURCES = [['catalog', 'Kho chung'], ['user', 'Người dùng'], ['nokcal', 'Thiếu kcal'], ['all', 'Tất cả']];
function RecipesTab() {
  const { recipes, categories, deleteRecipe } = useRecipes();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL_CATEGORY);
  const [source, setSource] = useState('catalog');
  const [editing, setEditing] = useState(null);
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const list = useMemo(() => recipes
    .filter(r => source === 'all' || (source === 'catalog' ? !r.isCustom : source === 'user' ? r.isCustom : !r.calories))
    .filter(r => category === ALL_CATEGORY || r.category === category)
    .filter(r => matchesSearch([r.title, r.category, ...(r.ingredients || []).map(i => i.name)], query)), [recipes, source, category, query]);
  const handleDelete = recipe => confirmAction({
    title: `Xóa "${recipe.title}"?`,
    message: recipe.isCustom ? 'Đây là công thức do người dùng tự tạo. Thao tác không thể hoàn tác.' : 'Công thức sẽ biến mất khỏi trang Khám phá của mọi người dùng.',
    confirmText: 'Xóa',
    destructive: true,
    onConfirm: () => deleteRecipe(recipe.id)
  });
  return <View style={{ flex: 1 }}>
      <View style={styles.toolbar}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput style={styles.searchInput} placeholder="Tìm theo tên, nguyên liệu..." placeholderTextColor={C.disable} value={query} onChangeText={setQuery} autoCorrect={false} />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Thêm công thức" onPress={() => { setEditing(null); setIsCreateVisible(true); }} style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}><Text style={styles.addBtnText}>＋</Text></Pressable>
        </View>
        <View style={styles.segment}>
          {SOURCES.map(([id, label]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: source === id }} onPress={() => setSource(id)} style={[styles.segmentBtn, source === id && styles.segmentActive]}>
              <Text style={[styles.segmentText, source === id && styles.segmentTextActive]} numberOfLines={1}>{label}</Text>
            </Pressable>)}
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.chipRow}>
        {[ALL_CATEGORY, ...categories].map(cat => <Chip key={cat} label={cat} active={category === cat} onPress={() => setCategory(cat)} />)}
      </ScrollView>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.hint}>{list.length} công thức</Text>
        {list.map(recipe => <View key={recipe.id} style={styles.recipeCard}>
            <Image source={{ uri: recipe.imageUrl }} style={styles.recipeImage} />
            <View style={{ flex: 1 }}>
              <View style={styles.pillRow}>
                <Pill label={recipe.category} tone="brand" />
                <Pill label={recipe.isCustom ? 'Người dùng' : 'Kho chung'} tone={recipe.isCustom ? 'blue' : 'green'} />
              </View>
              <Text style={styles.recipeTitle} numberOfLines={1}>{recipe.title}</Text>
              <Text style={[styles.rowSub, !recipe.calories && { color: C.amber, fontWeight: '700' }]} numberOfLines={1}>
                {recipe.calories ? `🔥 ${recipe.calories} kcal/phần` : '⚠ Chưa có kcal'} • {(recipe.ingredients || []).length} nguyên liệu
              </Text>
              <View style={styles.actionRow}>
                <ActionPill label="✎ Sửa" onPress={() => { setEditing(recipe); setIsCreateVisible(true); }} />
                <ActionPill label="Xóa" tone="danger" onPress={() => handleDelete(recipe)} />
              </View>
            </View>
          </View>)}
        {!list.length ? <EmptyBox icon="📖" title="Không có công thức phù hợp" text="Thử đổi bộ lọc hoặc từ khóa tìm kiếm." /> : null}
      </ScrollView>
      <CreateRecipeModal visible={isCreateVisible} onClose={() => setIsCreateVisible(false)} editingRecipe={editing} asCatalog />
    </View>;
}

// ---------------------------------------------------------------- Users
const EMPTY_USER = { id: null, email: '', name: '', role: 'user', verified: true, locked: false, password: '' };
function UsersTab() {
  const { user: me, listUsers, adminSaveUser, adminDeleteUser } = useAuth();
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(null);
  const users = listUsers().filter(u => matchesSearch([u.name, u.email], query));
  const save = async () => {
    try {
      await adminSaveUser(form);
      setForm(null);
    } catch (e) {
      showAlert('Chưa lưu được', e.message);
    }
  };
  const toggleLock = async u => {
    try {
      await adminSaveUser({ ...u, locked: !u.locked });
    } catch (e) {
      showAlert('Không thực hiện được', e.message);
    }
  };
  const remove = u => confirmAction({
    title: `Xóa tài khoản ${u.email}?`,
    message: 'Người dùng sẽ không đăng nhập được nữa. Công thức cá nhân, danh sách đi chợ, lịch sử và kế hoạch của tài khoản này cũng bị xóa.',
    confirmText: 'Xóa',
    destructive: true,
    onConfirm: () => adminDeleteUser(u.id).catch(e => showAlert('Không xóa được', e.message))
  });
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput style={styles.searchInput} placeholder="Tìm theo tên hoặc email..." placeholderTextColor={C.disable} value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Thêm tài khoản" onPress={() => setForm({ ...EMPTY_USER })} style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}><Text style={styles.addBtnText}>＋</Text></Pressable>
      </View>
      <Text style={styles.hint}>{users.length} tài khoản</Text>
      {users.map(u => {
        const isMe = u.email === me?.email;
        return <View key={u.id} style={[styles.userCard, u.locked && styles.userLocked]}>
            <View style={styles.userTop}>
              <View style={[styles.userAvatar, u.role === 'admin' && { backgroundColor: C.primary }]}><Text style={[styles.userAvatarText, u.role === 'admin' && { color: '#FFFFFF' }]}>{initialsOf(u.name)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{u.name}{isMe ? ' (bạn)' : ''}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>{u.email}</Text>
                <View style={styles.pillRow}>
                  <Pill label={u.role === 'admin' ? 'Quản trị' : 'Người dùng'} tone={u.role === 'admin' ? 'dark' : 'neutral'} />
                  <Pill label={u.verified ? '✓ Đã xác minh' : 'Chờ xác minh'} tone={u.verified ? 'green' : 'amber'} />
                  {u.locked ? <Pill label="🔒 Đã khóa" tone="red" /> : null}
                </View>
              </View>
            </View>
            <View style={styles.userActions}>
              <ActionPill label="✎ Sửa" onPress={() => setForm({ ...u, password: '' })} />
              {!isMe ? <ActionPill label={u.locked ? '🔓 Mở khóa' : '🔒 Khóa'} onPress={() => toggleLock(u)} /> : null}
              {!isMe ? <ActionPill label="Xóa" tone="danger" onPress={() => remove(u)} /> : null}
            </View>
          </View>;
      })}
      {!users.length ? <EmptyBox icon="👥" title="Chưa có tài khoản phù hợp" text="Thử từ khóa khác, hoặc bấm ＋ để thêm tài khoản." /> : null}

      <Modal visible={!!form} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setForm(null)}>
        <View style={styles.backdrop}>
          <ScrollView contentContainerStyle={styles.sheetScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.sheet}>
              <Text style={styles.sheetTag}>👤 TÀI KHOẢN</Text>
              <Text style={styles.sheetTitle}>{form?.id ? 'Sửa tài khoản' : 'Thêm tài khoản'}</Text>
              <Text style={styles.label}>Tên hiển thị</Text>
              <TextInput style={styles.input} value={form?.name} onChangeText={name => setForm(f => ({ ...f, name }))} />
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={form?.email} autoCapitalize="none" keyboardType="email-address" onChangeText={email => setForm(f => ({ ...f, email }))} />
              <Text style={styles.label}>{form?.id ? 'Đặt lại mật khẩu (để trống nếu giữ nguyên)' : 'Mật khẩu ban đầu (≥ 8 ký tự)'}</Text>
              <TextInput style={styles.input} value={form?.password} secureTextEntry onChangeText={password => setForm(f => ({ ...f, password }))} />
              <Text style={styles.label}>Vai trò</Text>
              <View style={[styles.segment, { marginBottom: 0 }]}>
                {[['user', '👤  Người dùng'], ['admin', '🛡️  Quản trị']].map(([role, label]) => {
                  const active = (form?.role === 'admin' ? 'admin' : 'user') === role;
                  return <Pressable key={role} onPress={() => setForm(f => ({ ...f, role }))} style={[styles.segmentBtn, active && styles.segmentActive]}>
                      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
                    </Pressable>;
                })}
              </View>
              <View style={styles.switchCard}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}><Text style={styles.rowTitle}>Đã xác minh email</Text><Text style={styles.rowSub}>Bỏ qua bước nhập mã OTP</Text></View>
                  <Switch value={!!form?.verified} onValueChange={verified => setForm(f => ({ ...f, verified }))} thumbColor="#FFFFFF" trackColor={{ false: C.border, true: C.brand }} />
                </View>
                <View style={[styles.switchRow, styles.divider]}>
                  <View style={{ flex: 1 }}><Text style={styles.rowTitle}>Khóa tài khoản</Text><Text style={styles.rowSub}>Không cho đăng nhập</Text></View>
                  <Switch value={!!form?.locked} onValueChange={locked => setForm(f => ({ ...f, locked }))} thumbColor="#FFFFFF" trackColor={{ false: C.border, true: DANGER }} />
                </View>
              </View>
              <View style={styles.sheetActions}>
                <AppleButton title="Hủy" variant="secondary" onPress={() => setForm(null)} style={{ flex: 1 }} />
                <AppleButton title="Lưu" onPress={save} style={{ flex: 1 }} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>;
}

// ---------------------------------------------------------------- Requests
function RequestsTab() {
  const { recipeRequests, updateRecipeRequest, deleteRecipeRequest, getRecipeById } = useRecipes();
  const [filter, setFilter] = useState('pending');
  const [replies, setReplies] = useState({});
  const [createFor, setCreateFor] = useState(null);
  const [editing, setEditing] = useState(null);
  const counts = countByStatus(recipeRequests);
  const list = recipeRequests.filter(r => filter === 'all' || r.status === filter);
  const clearDraft = id => setReplies(prev => { const next = { ...prev }; delete next[id]; return next; });
  const saveReply = request => {
    updateRecipeRequest(request.id, { adminReply: replies[request.id] ?? request.adminReply });
    clearDraft(request.id);
  };
  const remove = request => confirmAction({
    title: 'Xóa yêu cầu?',
    message: request.title,
    confirmText: 'Xóa',
    destructive: true,
    onConfirm: () => deleteRecipeRequest(request.id)
  });
  const filters = [...REQUEST_STATUSES.map(s => ({ id: s.id, label: s.label, count: counts[s.id], color: s.color })), { id: 'all', label: 'Tất cả', count: recipeRequests.length }];
  return <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.chipRow}>
        {filters.map(item => {
          const active = filter === item.id;
          return <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => setFilter(item.id)} style={[styles.chip, active && styles.chipActive]}>
              {item.color ? <View style={[styles.chipDot, { backgroundColor: item.color }]} /> : null}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
              <Text style={[styles.chipCount, active && styles.chipTextActive]}>{item.count}</Text>
            </Pressable>;
        })}
      </ScrollView>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {list.length === 0 ? <EmptyBox icon="📮" title="Không có yêu cầu" text="Không có yêu cầu nào ở trạng thái này." /> : null}
        {list.map(request => {
          const type = requestType(request.type);
          const status = requestStatus(request.status);
          const recipe = request.recipeId ? getRecipeById(request.recipeId) : null;
          const reply = replies[request.id] ?? request.adminReply;
          const dirty = replies[request.id] != null && replies[request.id] !== request.adminReply;
          return <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestTop}>
                <View style={[styles.iconBox, { backgroundColor: REQUEST_TYPE_TINT[request.type] || C.cardAlt }]}><Text style={styles.iconBoxText}>{type.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.requestType}>{type.label}</Text>
                  <Text style={styles.requestTitle} numberOfLines={2}>{request.title}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                  <View style={[styles.chipDot, { backgroundColor: status.color }]} />
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
              <Text style={styles.rowSub} numberOfLines={1}>👤 {request.userName} · {request.userEmail} · {formatCookedDay(request.createdAt).toLowerCase()}</Text>
              {request.recipeTitle && request.type !== 'new_recipe' ? <View style={styles.recipeTag}><Text style={styles.recipeTagText} numberOfLines={1}>📖 {request.recipeTitle}{recipe ? '' : ' (đã bị xóa)'}</Text></View> : null}
              <Text style={styles.details}>{request.details}</Text>

              <Text style={styles.label}>Trạng thái</Text>
              <View style={styles.statusPicker}>
                {REQUEST_STATUSES.map(s => {
                  const active = request.status === s.id;
                  return <Pressable key={s.id} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => {
                    // A reply typed but not saved yet goes along with the new status
                    updateRecipeRequest(request.id, { status: s.id, adminReply: replies[request.id] ?? request.adminReply });
                    clearDraft(request.id);
                  }} style={[styles.statusOption, active && { backgroundColor: s.bg, borderColor: s.color }]}>
                      <Text style={[styles.statusOptionText, active && { color: s.color }]} numberOfLines={1}>{s.label}</Text>
                    </Pressable>;
                })}
              </View>

              <Text style={styles.label}>Phản hồi cho người dùng</Text>
              <TextInput style={[styles.input, styles.replyInput]} multiline placeholder="Viết phản hồi..." placeholderTextColor={C.disable} value={reply} onChangeText={text => setReplies(prev => ({ ...prev, [request.id]: text }))} />
              <View style={styles.requestActions}>
                {dirty ? <ActionPill label="Lưu phản hồi" tone="brand" onPress={() => saveReply(request)} /> : null}
                {request.type === 'new_recipe' ? <ActionPill label="＋ Tạo công thức" onPress={() => setCreateFor(request)} /> : null}
                {recipe ? <ActionPill label="✎ Sửa công thức" onPress={() => setEditing(recipe)} /> : null}
                <ActionPill label="Xóa" tone="danger" onPress={() => remove(request)} />
              </View>
            </View>;
        })}
      </ScrollView>
      <CreateRecipeModal
        visible={!!createFor || !!editing}
        onClose={() => {
          // Creating the requested recipe moves the request forward
          if (createFor && createFor.status === 'pending') updateRecipeRequest(createFor.id, { status: 'in_progress' });
          setCreateFor(null);
          setEditing(null);
        }}
        editingRecipe={editing}
        prefillTitle={createFor?.title || ''}
        asCatalog
      />
    </View>;
}

// ---------------------------------------------------------------- Small UI
const Chip = ({ label, active, onPress }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </Pressable>;
const PILL_TONES = {
  neutral: ['#F1F1EC', C.granite], dark: [C.primary, '#FFFFFF'], green: [C.emeraldLight, C.emerald],
  amber: [C.amberLight, '#9A6100'], red: ['#FFF0EC', '#B02500'], blue: [C.blueLight, C.blue], brand: [C.brandLight, C.brandHover]
};
const Pill = ({ label, tone = 'neutral' }) => {
  const [background, text] = PILL_TONES[tone];
  return <View style={[styles.pill, { backgroundColor: background }]}><Text style={[styles.pillText, { color: text }]} numberOfLines={1}>{label}</Text></View>;
};
const ACTION_TONES = {
  neutral: [C.cardAlt, C.border, C.primary],
  brand: [C.brand, C.brand, '#FFFFFF'],
  danger: ['#FFF1F0', '#FFD5D1', DANGER]
};
const ActionPill = ({ label, tone = 'neutral', onPress, disabled }) => {
  const [bg, border, color] = ACTION_TONES[tone];
  return <Pressable accessibilityRole="button" disabled={disabled} hitSlop={4} onPress={onPress} style={({ pressed }) => [styles.actionPill, { backgroundColor: bg, borderColor: border }, disabled && styles.dim, pressed && styles.pressed]}>
      <Text style={[styles.actionPillText, { color }]}>{label}</Text>
    </Pressable>;
};
const EmptyBox = ({ icon, title, text }) => <View style={styles.emptyBox}>
    <View style={styles.emptyIcon}><Text style={{ fontSize: 28 }}>{icon}</Text></View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyText}>{text}</Text>
  </View>;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  page: { flex: 1, width: '100%', maxWidth: 860, alignSelf: 'center' },
  pressed: { opacity: 0.72 },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 },
  tag: { color: C.brand, fontWeight: '900', fontSize: 10, letterSpacing: 1.2 },
  title: { color: C.primary, fontSize: 26, fontWeight: '900', letterSpacing: -0.8, marginTop: 4 },
  avatarBtn: { width: 44, height: 44, borderRadius: 15, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  avatarBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  // Dock
  dockWrap: { position: 'absolute', bottom: 20, left: 12, right: 12, alignItems: 'center' },
  dock: { flexDirection: 'row', width: '100%', maxWidth: 440, padding: 6, borderRadius: Radius.xl, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border, ...HeronShadow.dock },
  dockItem: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: Radius.md, gap: 2 },
  dockItemActive: { backgroundColor: C.brandLight },
  dockIcon: { fontSize: 18, textAlign: 'center', opacity: 0.6 },
  dockIconActive: { opacity: 1 },
  dockLabel: { fontSize: 10, fontWeight: '800', color: C.surface },
  dockLabelActive: { color: C.brandHover },
  dockBadge: { position: 'absolute', top: -4, right: -10, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  dockBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  // Shared layout
  content: { paddingHorizontal: 20, paddingBottom: 140, gap: 10 },
  toolbar: { paddingHorizontal: 20, gap: 10 },
  section: { fontSize: 12, fontWeight: '800', color: C.granite, marginTop: 12, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  hint: { fontSize: 12, lineHeight: 17, color: C.granite, marginLeft: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, padding: 16 },
  cardTitle: { color: C.primary, fontSize: 16, fontWeight: '900' },
  listCard: { backgroundColor: '#FFFFFF', borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14 },
  menuBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingRight: 14 },
  divider: { borderTopWidth: 1, borderTopColor: C.borderLight },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconBoxText: { fontSize: 18 },
  rowTitle: { color: C.primary, fontSize: 14, fontWeight: '800' },
  rowSub: { color: C.granite, fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 22, color: C.disable, marginTop: -2 },
  dim: { opacity: 0.3 },
  // Overview
  hero: { borderRadius: 24, backgroundColor: C.primary, padding: 18, overflow: 'hidden', ...HeronShadow.card },
  heroGlow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, right: -110, top: -150, backgroundColor: 'rgba(250,54,0,0.16)' },
  heroTitle: { fontSize: 19, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  heroStats: { flexDirection: 'row', marginTop: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.07)' },
  heroStat: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  heroDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.12)' },
  heroValue: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  heroLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  allGood: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  chartHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.brand },
  legendText: { fontSize: 11, fontWeight: '700', color: C.granite },
  chart: { height: 130, marginTop: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  barColumn: { height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
  barValue: { fontSize: 10, color: C.granite, fontWeight: '800' },
  bar: { width: 22, borderRadius: 8, backgroundColor: '#F8D8CE' },
  barActive: { backgroundColor: C.brand },
  day: { color: C.granite, fontSize: 10, fontWeight: '700' },
  dayActive: { color: C.brandHover, fontWeight: '900' },
  logout: { marginTop: 14, height: 50, borderRadius: Radius.lg, borderWidth: 1, borderColor: '#FFD8CF', backgroundColor: C.brandLight, alignItems: 'center', justifyContent: 'center' },
  logoutText: { fontSize: 14, fontWeight: '800', color: C.brandHover },
  footer: { marginTop: 4, textAlign: 'center', fontSize: 11, color: C.disable },
  // Search / add
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBox: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: Radius.full, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border },
  searchIcon: { fontSize: 16, color: C.granite },
  searchInput: { flex: 1, fontSize: 14, color: C.primary, paddingVertical: 0 },
  addBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', ...HeronShadow.subtle },
  addBtnText: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: -2 },
  input: { backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.primary },
  // Segments & chips
  segment: { flexDirection: 'row', padding: 4, borderRadius: Radius.full, backgroundColor: C.borderLight },
  segmentBtn: { flex: 1, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segmentActive: { backgroundColor: '#FFFFFF', ...HeronShadow.subtle },
  segmentText: { fontSize: 12, fontWeight: '800', color: C.granite },
  segmentTextActive: { color: C.primary },
  chipRow: { gap: 8, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: Radius.full, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: 12, fontWeight: '800', color: C.secondary },
  chipTextActive: { color: '#FFFFFF' },
  chipCount: { fontSize: 12, fontWeight: '800', color: C.disable },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  pill: { maxWidth: 160, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  pillText: { fontSize: 10, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionPill: { height: 30, paddingHorizontal: 13, justifyContent: 'center', borderRadius: Radius.full, borderWidth: 1 },
  actionPillText: { fontSize: 12, fontWeight: '800' },
  // Categories
  orderBox: { gap: 4, paddingVertical: 8 },
  orderBtn: { width: 26, height: 22, borderRadius: 8, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.borderLight, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 9, color: C.granite },
  indexBadge: { width: 28, height: 28, borderRadius: 9, backgroundColor: C.brandLight, alignItems: 'center', justifyContent: 'center' },
  indexText: { fontSize: 12, fontWeight: '900', color: C.brandHover },
  // Recipes
  recipeCard: { flexDirection: 'row', gap: 12, padding: 10, borderRadius: Radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border, ...HeronShadow.subtle },
  recipeImage: { width: 84, height: 84, borderRadius: 14, backgroundColor: C.borderLight, alignSelf: 'center' },
  recipeTitle: { marginTop: 5, fontSize: 15, fontWeight: '800', color: C.primary },
  // Users
  userCard: { padding: 14, borderRadius: Radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border, ...HeronShadow.subtle },
  userLocked: { backgroundColor: '#FFFBFA', borderColor: '#FFD8CF' },
  userTop: { flexDirection: 'row', gap: 12 },
  userAvatar: { width: 46, height: 46, borderRadius: 15, backgroundColor: C.brandLight, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { color: C.brandHover, fontSize: 15, fontWeight: '900' },
  userActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.borderLight },
  backdrop: { flex: 1, backgroundColor: 'rgba(17,17,17,0.5)', justifyContent: 'center' },
  sheetScroll: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingVertical: 48 },
  sheet: { width: '100%', maxWidth: 460, alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, ...HeronShadow.card },
  sheetTag: { fontSize: 10, fontWeight: '900', color: C.brand, letterSpacing: 1.2 },
  sheetTitle: { fontSize: 21, fontWeight: '900', color: C.primary, marginTop: 4, marginBottom: 4 },
  label: { fontSize: 12, fontWeight: '800', color: C.granite, marginTop: 12, marginBottom: 6 },
  switchCard: { marginTop: 14, paddingHorizontal: 12, borderRadius: 14, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.borderLight },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  // Requests
  requestCard: { padding: 14, borderRadius: Radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border, gap: 8, ...HeronShadow.subtle },
  requestTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  requestType: { fontSize: 11, fontWeight: '800', color: C.granite },
  requestTitle: { marginTop: 2, fontSize: 15, fontWeight: '800', color: C.primary, lineHeight: 20 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.full },
  statusText: { fontSize: 11, fontWeight: '800' },
  recipeTag: { alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.borderLight },
  recipeTagText: { fontSize: 12, fontWeight: '700', color: C.secondary },
  details: { fontSize: 13, color: C.secondary, lineHeight: 19 },
  statusPicker: { flexDirection: 'row', gap: 6 },
  statusOption: { flex: 1, height: 32, borderRadius: Radius.full, borderWidth: 1, borderColor: C.border, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  statusOptionText: { fontSize: 11, fontWeight: '800', color: C.granite },
  replyInput: { minHeight: 70, textAlignVertical: 'top' },
  requestActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.borderLight },
  // Empty
  emptyBox: { alignItems: 'center', marginTop: 10, paddingVertical: 28, paddingHorizontal: 22, borderRadius: Radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.brandLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: C.primary },
  emptyText: { fontSize: 13, lineHeight: 19, color: C.granite, textAlign: 'center', marginTop: 5 }
});

