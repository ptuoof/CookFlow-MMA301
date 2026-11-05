import React, { useMemo, useState } from 'react';
import { Image, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { HeronColors as C, Radius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useRecipes } from '../context/RecipeContext';
import { CreateRecipeModal } from './CreateRecipeModal';
import { AppleButton } from './ui/AppleButton';
import { confirmAction, showAlert } from '../utils/dialog';
import { matchesSearch } from '../utils/text';
import { addDays, dateKey, weekdayLabel } from '../utils/mealPlan';
import { REQUEST_STATUSES, countByStatus, requestStatus, requestType } from '../utils/recipeRequests';
import { formatCookedDay } from '../utils/history';
import { ALL_CATEGORY } from '../utils/categories';

const TABS = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'categories', label: 'Danh mục' },
  { id: 'recipes', label: 'Công thức' },
  { id: 'users', label: 'Người dùng' },
  { id: 'requests', label: 'Yêu cầu' }
];

/** Admin console: data from the CookFlow API, with CRUD on every catalog. */
export function AdminScreen() {
  const { user, signOut } = useAuth();
  const { recipeRequests } = useRecipes();
  const [tab, setTab] = useState('overview');
  const pending = recipeRequests.filter(r => r.status === 'pending').length;
  return <SafeAreaView style={styles.safe}>
    <View style={styles.page}>
      <View style={styles.topline}>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>COOKFLOW / QUẢN TRỊ</Text>
          <Text style={styles.title} numberOfLines={1}>Xin chào, {user?.name || 'Quản trị viên'}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={signOut} style={({ pressed }) => [styles.exit, pressed && { opacity: 0.7 }]}><Text style={styles.exitText}>Đăng xuất</Text></Pressable>
      </View>
      <View style={styles.tabs}>
        {TABS.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: tab === item.id }} onPress={() => setTab(item.id)} style={[styles.tab, tab === item.id && styles.tabActive]}>
            <Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>{item.label}</Text>
            {item.id === 'requests' && pending ? <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{pending}</Text></View> : null}
          </Pressable>)}
      </View>
      {tab === 'overview' ? <OverviewTab onOpen={setTab} /> : tab === 'categories' ? <CategoriesTab /> : tab === 'recipes' ? <RecipesTab /> : tab === 'users' ? <UsersTab /> : <RequestsTab />}
    </View>
  </SafeAreaView>;
}

// ---------------------------------------------------------------- Overview
function OverviewTab({ onOpen }) {
  const { listUsers } = useAuth();
  const { recipes, categories, recipeRequests } = useRecipes();
  const users = listUsers().filter(u => u.role !== 'admin');
  const catalog = recipes.filter(r => !r.isCustom);
  const counts = countByStatus(recipeRequests);
  const missingKcal = catalog.filter(r => !r.calories).length;
  const today = dateKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  // Shared data only: each account's meal journal is private to that account
  const activity = days.map(day => recipeRequests.filter(r => dateKey(r.createdAt) === day).length
    + recipes.filter(r => r.createdAt && dateKey(new Date(r.createdAt).getTime()) === day).length);
  const max = Math.max(1, ...activity);
  const stats = [
    { label: 'Người dùng', value: users.length, sub: `${users.filter(u => u.locked).length} bị khóa`, tab: 'users' },
    { label: 'Công thức', value: catalog.length, sub: `${recipes.length - catalog.length} do người dùng tạo`, tab: 'recipes' },
    { label: 'Danh mục', value: categories.length, sub: 'đang hiển thị', tab: 'categories' },
    { label: 'Yêu cầu chờ', value: counts.pending, sub: `${counts.in_progress} đang xử lý`, tab: 'requests', alert: counts.pending > 0 }
  ];
  return <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.statsGrid}>
        {stats.map(item => <Pressable key={item.label} onPress={() => onOpen(item.tab)} style={[styles.statCard, item.alert && styles.statAlert]}>
            <Text style={styles.statLabel}>{item.label}</Text>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statSub}>{item.sub}</Text>
          </Pressable>)}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hoạt động 7 ngày</Text>
        <Text style={styles.cardSub}>Yêu cầu mới + công thức mới được tạo mỗi ngày</Text>
        <View style={styles.chart}>
          {activity.map((value, index) => <View key={days[index]} style={styles.barColumn}>
              <Text style={styles.barValue}>{value || ''}</Text>
              <View style={[styles.bar, index === 6 && styles.barActive, { height: 6 + value / max * 84 }]} />
              <Text style={styles.day}>{weekdayLabel(days[index])}</Text>
            </View>)}
        </View>
      </View>
      {missingKcal ? <Pressable onPress={() => onOpen('recipes')} style={styles.notice}>
          <View style={styles.noticeDot} />
          <Text style={styles.noticeText}>{missingKcal} công thức chưa có thông số kcal — chạm để cập nhật.</Text>
        </Pressable> : null}
      <Text style={styles.footer}>Dữ liệu từ máy chủ CookFlow.</Text>
    </ScrollView>;
}

// ---------------------------------------------------------------- Categories
function CategoriesTab() {
  const { categories, addCategory, renameCategory, deleteCategory, moveCategory, countRecipesInCategory } = useRecipes();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  const handleAdd = () => {
    const error = addCategory(newName);
    if (error) return showAlert('Chưa thêm được', error);
    setNewName('');
  };
  const handleRename = () => {
    const error = renameCategory(editing, draft);
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
      onConfirm: () => {
        const error = deleteCategory(name);
        if (error) showAlert('Không xóa được', error);
      }
    });
  };
  return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.addRow}>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Tên danh mục mới, vd: Đồ nướng 🔥" placeholderTextColor={C.disable} value={newName} onChangeText={setNewName} onSubmitEditing={handleAdd} />
        <AppleButton title="Thêm" onPress={handleAdd} />
      </View>
      <Text style={styles.hint}>"{ALL_CATEGORY}" luôn có sẵn trên trang Khám phá. Thứ tự dưới đây là thứ tự hiển thị.</Text>
      <View style={styles.listCard}>
        {categories.map((name, index) => <View key={name} style={[styles.row, index > 0 && styles.separator]}>
            {editing === name ? <>
                <TextInput style={[styles.input, { flex: 1 }]} value={draft} onChangeText={setDraft} autoFocus onSubmitEditing={handleRename} />
                <Pressable hitSlop={6} onPress={handleRename}><Text style={styles.linkStrong}>Lưu</Text></Pressable>
                <Pressable hitSlop={6} onPress={() => setEditing(null)}><Text style={styles.link}>Hủy</Text></Pressable>
              </> : <>
                <View style={styles.orderBtns}>
                  <Pressable accessibilityLabel="Lên" disabled={index === 0} hitSlop={4} onPress={() => moveCategory(name, -1)}><Text style={[styles.arrow, index === 0 && styles.dim]}>▲</Text></Pressable>
                  <Pressable accessibilityLabel="Xuống" disabled={index === categories.length - 1} hitSlop={4} onPress={() => moveCategory(name, 1)}><Text style={[styles.arrow, index === categories.length - 1 && styles.dim]}>▼</Text></Pressable>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{name}</Text>
                  <Text style={styles.rowSub}>{countRecipesInCategory(name)} công thức</Text>
                </View>
                <Pressable hitSlop={6} onPress={() => { setEditing(name); setDraft(name); }}><Text style={styles.link}>Sửa</Text></Pressable>
                <Pressable hitSlop={6} disabled={categories.length <= 1} onPress={() => handleDelete(name)}><Text style={[styles.linkDanger, categories.length <= 1 && styles.dim]}>Xóa</Text></Pressable>
              </>}
          </View>)}
      </View>
    </ScrollView>;
}

// ---------------------------------------------------------------- Recipes
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
        <View style={styles.addRow}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Tìm theo tên, nguyên liệu..." placeholderTextColor={C.disable} value={query} onChangeText={setQuery} />
          <AppleButton title="+ Thêm" onPress={() => { setEditing(null); setIsCreateVisible(true); }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {[['catalog', 'Kho chung'], ['user', 'Người dùng tạo'], ['nokcal', 'Thiếu kcal'], ['all', 'Tất cả']].map(([id, label]) => <Chip key={id} label={label} active={source === id} onPress={() => setSource(id)} />)}
          <View style={styles.chipDivider} />
          {[ALL_CATEGORY, ...categories].map(cat => <Chip key={cat} label={cat} active={category === cat} onPress={() => setCategory(cat)} />)}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>{list.length} công thức</Text>
        <View style={styles.listCard}>
          {list.map((recipe, index) => <View key={recipe.id} style={[styles.row, index > 0 && styles.separator]}>
              <Image source={{ uri: recipe.imageUrl }} style={styles.thumb} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{recipe.title}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {recipe.category} • {recipe.calories ? `${recipe.calories} kcal` : '⚠ chưa có kcal'} • {recipe.isCustom ? 'người dùng' : 'kho chung'}
                </Text>
              </View>
              <Pressable hitSlop={6} onPress={() => { setEditing(recipe); setIsCreateVisible(true); }}><Text style={styles.link}>Sửa</Text></Pressable>
              <Pressable hitSlop={6} onPress={() => handleDelete(recipe)}><Text style={styles.linkDanger}>Xóa</Text></Pressable>
            </View>)}
          {!list.length ? <Text style={[styles.hint, { padding: 14 }]}>Không có công thức phù hợp.</Text> : null}
        </View>
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
  return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.addRow}>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Tìm theo tên hoặc email..." placeholderTextColor={C.disable} value={query} onChangeText={setQuery} />
        <AppleButton title="+ Thêm" onPress={() => setForm({ ...EMPTY_USER })} />
      </View>
      <View style={styles.listCard}>
        {users.map((u, index) => <View key={u.id} style={[styles.row, index > 0 && styles.separator]}>
            <View style={[styles.avatar, u.role === 'admin' && { backgroundColor: C.primary }]}><Text style={[styles.avatarText, u.role === 'admin' && { color: '#FFFFFF' }]}>{u.name[0]?.toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{u.name}{u.email === me?.email ? ' (bạn)' : ''}</Text>
              <Text style={styles.rowSub} numberOfLines={1}>{u.email}</Text>
              <View style={styles.pillRow}>
                <Pill label={u.role === 'admin' ? 'Quản trị' : 'Người dùng'} tone={u.role === 'admin' ? 'dark' : 'neutral'} />
                <Pill label={u.verified ? 'Đã xác minh' : 'Chờ xác minh'} tone={u.verified ? 'green' : 'amber'} />
                {u.locked ? <Pill label="Đã khóa" tone="red" /> : null}
              </View>
            </View>
            <View style={styles.rowActions}>
              <Pressable hitSlop={6} onPress={() => setForm({ ...u, password: '' })}><Text style={styles.link}>Sửa</Text></Pressable>
              {u.email !== me?.email ? <Pressable hitSlop={6} onPress={() => toggleLock(u)}><Text style={styles.link}>{u.locked ? 'Mở khóa' : 'Khóa'}</Text></Pressable> : null}
              {u.email !== me?.email ? <Pressable hitSlop={6} onPress={() => remove(u)}><Text style={styles.linkDanger}>Xóa</Text></Pressable> : null}
            </View>
          </View>)}
        {!users.length ? <Text style={[styles.hint, { padding: 14 }]}>Chưa có tài khoản phù hợp.</Text> : null}
      </View>

      <Modal visible={!!form} transparent animationType="fade" onRequestClose={() => setForm(null)}>
        <View style={styles.backdrop}>
          <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
            <Text style={styles.sheetTitle}>{form?.id ? 'Sửa tài khoản' : 'Thêm tài khoản'}</Text>
            <Text style={styles.label}>Tên hiển thị</Text>
            <TextInput style={styles.input} value={form?.name} onChangeText={name => setForm(f => ({ ...f, name }))} />
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={form?.email} autoCapitalize="none" keyboardType="email-address" onChangeText={email => setForm(f => ({ ...f, email }))} />
            <Text style={styles.label}>{form?.id ? 'Đặt lại mật khẩu (để trống nếu giữ nguyên)' : 'Mật khẩu ban đầu (≥ 8 ký tự)'}</Text>
            <TextInput style={styles.input} value={form?.password} secureTextEntry onChangeText={password => setForm(f => ({ ...f, password }))} />
            <Text style={styles.label}>Vai trò</Text>
            <View style={styles.pillRow}>
              <Chip label="Người dùng" active={form?.role !== 'admin'} onPress={() => setForm(f => ({ ...f, role: 'user' }))} />
              <Chip label="Quản trị" active={form?.role === 'admin'} onPress={() => setForm(f => ({ ...f, role: 'admin' }))} />
            </View>
            <View style={styles.switchRow}><Text style={styles.rowTitle}>Đã xác minh email</Text><Switch value={!!form?.verified} onValueChange={verified => setForm(f => ({ ...f, verified }))} trackColor={{ true: C.brand }} /></View>
            <View style={styles.switchRow}><Text style={styles.rowTitle}>Khóa tài khoản</Text><Switch value={!!form?.locked} onValueChange={locked => setForm(f => ({ ...f, locked }))} trackColor={{ true: C.brand }} /></View>
            <View style={styles.sheetActions}>
              <AppleButton title="Hủy" variant="secondary" onPress={() => setForm(null)} style={{ flex: 1 }} />
              <AppleButton title="Lưu" onPress={save} style={{ flex: 1 }} />
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
  const saveReply = request => {
    updateRecipeRequest(request.id, { adminReply: replies[request.id] ?? request.adminReply });
    setReplies(prev => { const next = { ...prev }; delete next[request.id]; return next; });
  };
  const remove = request => confirmAction({
    title: 'Xóa yêu cầu?',
    message: request.title,
    confirmText: 'Xóa',
    destructive: true,
    onConfirm: () => deleteRecipeRequest(request.id)
  });
  return <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, { paddingHorizontal: 22, paddingTop: 4, paddingBottom: 12 }]} style={{ flexGrow: 0 }}>
        {REQUEST_STATUSES.map(s => <Chip key={s.id} label={`${s.label} (${counts[s.id]})`} active={filter === s.id} onPress={() => setFilter(s.id)} />)}
        <Chip label={`Tất cả (${recipeRequests.length})`} active={filter === 'all'} onPress={() => setFilter('all')} />
      </ScrollView>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {list.length === 0 ? <View style={styles.card}><Text style={styles.cardSub}>Không có yêu cầu nào ở trạng thái này.</Text></View> : null}
        {list.map(request => {
          const type = requestType(request.type);
          const status = requestStatus(request.status);
          const recipe = request.recipeId ? getRecipeById(request.recipeId) : null;
          const reply = replies[request.id] ?? request.adminReply;
          return <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHead}>
                <Text style={styles.rowSub}>{type.icon} {type.label}</Text>
                <Pill label={status.label} tone="custom" color={status.color} bg={status.bg} />
              </View>
              <Text style={styles.cardTitle}>{request.title}</Text>
              <Text style={styles.rowSub}>{request.userName} · {request.userEmail} · {formatCookedDay(request.createdAt).toLowerCase()}</Text>
              {request.recipeTitle && request.type !== 'new_recipe' ? <Text style={styles.rowSub}>Công thức: {request.recipeTitle}{recipe ? '' : ' (đã bị xóa)'}</Text> : null}
              <Text style={styles.details}>{request.details}</Text>
              <View style={styles.pillRow}>
                {REQUEST_STATUSES.map(s => <Chip key={s.id} small label={s.label} active={request.status === s.id} onPress={() => {
                  // A reply typed but not saved yet goes along with the new status
                  updateRecipeRequest(request.id, { status: s.id, adminReply: replies[request.id] ?? request.adminReply });
                  setReplies(prev => { const next = { ...prev }; delete next[request.id]; return next; });
                }} />)}
              </View>
              <TextInput style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]} multiline placeholder="Phản hồi cho người dùng..." placeholderTextColor={C.disable} value={reply} onChangeText={text => setReplies(prev => ({ ...prev, [request.id]: text }))} />
              <View style={styles.requestActions}>
                {replies[request.id] != null && replies[request.id] !== request.adminReply ? <Pressable hitSlop={6} onPress={() => saveReply(request)}><Text style={styles.linkStrong}>Lưu phản hồi</Text></Pressable> : null}
                {request.type === 'new_recipe' ? <Pressable hitSlop={6} onPress={() => setCreateFor(request)}><Text style={styles.link}>Tạo công thức</Text></Pressable> : null}
                {recipe ? <Pressable hitSlop={6} onPress={() => setEditing(recipe)}><Text style={styles.link}>Sửa công thức</Text></Pressable> : null}
                <Pressable hitSlop={6} onPress={() => remove(request)}><Text style={styles.linkDanger}>Xóa</Text></Pressable>
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
const Chip = ({ label, active, onPress, small }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.chip, small && styles.chipSmall, active && styles.chipActive]}>
    <Text style={[styles.chipText, small && { fontSize: 11 }, active && styles.chipTextActive]}>{label}</Text>
  </Pressable>;
const PILL_TONES = { neutral: ['#F1F1EC', C.granite], dark: [C.primary, '#FFFFFF'], green: ['#EBFBEE', '#287A49'], amber: ['#FFF4DB', '#9A6100'], red: ['#FFF0EC', '#B02500'] };
const Pill = ({ label, tone = 'neutral', color, bg }) => {
  const [background, text] = tone === 'custom' ? [bg, color] : PILL_TONES[tone];
  return <View style={[styles.pill, { backgroundColor: background }]}><Text style={[styles.pillText, { color: text }]}>{label}</Text></View>;
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  page: { flex: 1, width: '100%', maxWidth: 860, alignSelf: 'center' },
  topline: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingTop: 18 },
  brand: { color: C.brand, fontWeight: '800', fontSize: 11, letterSpacing: 1.1 },
  title: { color: C.primary, fontSize: 22, lineHeight: 30, fontWeight: '800', marginTop: 6 },
  exit: { minHeight: 40, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingHorizontal: 14, justifyContent: 'center' },
  exitText: { color: C.granite, fontSize: 13, fontWeight: '600' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 22, paddingVertical: 14 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  tabActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: C.granite },
  tabTextActive: { color: '#FFFFFF' },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  content: { paddingHorizontal: 22, paddingBottom: 40, gap: 12 },
  toolbar: { paddingHorizontal: 22, gap: 10, paddingBottom: 6 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flexGrow: 1, width: '46%', backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.borderLight, padding: 14 },
  statAlert: { borderColor: C.brand, backgroundColor: '#FFF8F5' },
  statLabel: { fontSize: 12, color: C.granite },
  statValue: { marginTop: 6, fontSize: 26, color: C.primary, fontWeight: '800' },
  statSub: { marginTop: 4, fontSize: 11, color: C.granite },
  card: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.borderLight, padding: 16 },
  cardTitle: { color: C.primary, fontSize: 15, fontWeight: '800' },
  cardSub: { color: C.granite, fontSize: 12, marginTop: 4 },
  chart: { height: 130, marginTop: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: C.borderLight },
  barColumn: { height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
  barValue: { fontSize: 10, color: C.granite, fontWeight: '700' },
  bar: { width: 20, borderRadius: 7, backgroundColor: '#F8D8CE' },
  barActive: { backgroundColor: C.brand },
  day: { color: C.granite, fontSize: 10, marginBottom: 6 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 13, backgroundColor: '#FFF0EC', borderRadius: 14 },
  noticeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.brand },
  noticeText: { color: '#83321F', fontSize: 12, flexShrink: 1 },
  footer: { color: '#909089', fontSize: 11, textAlign: 'center', marginTop: 12 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.primary },
  hint: { fontSize: 12, color: C.granite },
  listCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.borderLight, paddingHorizontal: 14 },
  row: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  separator: { borderTopWidth: 1, borderTopColor: C.borderLight },
  rowTitle: { color: C.primary, fontSize: 14, fontWeight: '700' },
  rowSub: { color: C.granite, fontSize: 12, marginTop: 3 },
  rowActions: { alignItems: 'flex-end', gap: 8 },
  link: { color: C.primary, fontSize: 13, fontWeight: '700' },
  linkStrong: { color: C.brand, fontSize: 13, fontWeight: '800' },
  linkDanger: { color: '#B02500', fontSize: 13, fontWeight: '700' },
  dim: { opacity: 0.25 },
  orderBtns: { gap: 4, alignItems: 'center' },
  arrow: { fontSize: 11, color: C.granite },
  thumb: { width: 46, height: 46, borderRadius: 10, backgroundColor: C.borderLight },
  chips: { gap: 6, alignItems: 'center' },
  chipDivider: { width: 1, height: 20, backgroundColor: C.border, marginHorizontal: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  chipSmall: { paddingHorizontal: 10, paddingVertical: 5 },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: C.granite },
  chipTextActive: { color: '#FFFFFF' },
  avatar: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#FCEFE8', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.primary, fontWeight: '800' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  pillText: { fontSize: 10, fontWeight: '800' },
  requestCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.borderLight, padding: 14, gap: 6 },
  requestHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  details: { fontSize: 13, color: C.secondary, lineHeight: 19, marginTop: 4 },
  requestActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'flex-end', marginTop: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,20,20,0.45)', justifyContent: 'center' },
  sheet: { width: '92%', maxWidth: 460, alignSelf: 'center', backgroundColor: C.card, borderRadius: Radius.lg, padding: 20, marginVertical: 40 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: C.primary },
  label: { fontSize: 12, fontWeight: '700', color: C.granite, marginTop: 12, marginBottom: 6 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 20 }
});
