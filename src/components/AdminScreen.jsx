import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HeronColors as C } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const stats = [
  { label: 'Tài khoản', value: '1.284', change: '+12,8%', tone: 'green' },
  { label: 'Công thức', value: '356', change: '+8,2%', tone: 'orange' },
  { label: 'Báo cáo', value: '08', change: 'Cần xem', tone: 'amber' }
];
const members = [
  { name: 'Minh Anh', email: 'minhanh@example.com', status: 'Đang hoạt động', color: '#E9F3EE' },
  { name: 'Quốc Bảo', email: 'quocbao@example.com', status: 'Đang hoạt động', color: '#FCEFE8' },
  { name: 'Thu Hà', email: 'thuha@example.com', status: 'Chờ xác minh', color: '#F4F0E8' }
];
const recipes = [
  { title: 'Mì Ý sốt cà chua', owner: 'Minh Anh', category: 'Món chính' },
  { title: 'Salad bơ trứng', owner: 'Thu Hà', category: 'Món nhẹ' },
  { title: 'Canh bí đỏ', owner: 'Quốc Bảo', category: 'Món canh' }
];

export function AdminScreen() {
  const { user, signOut } = useAuth();
  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.topline}>
        <View><Text style={styles.brand}>COOKFLOW / QUẢN TRỊ</Text><Text style={styles.title}>Xin chào, {user?.name || 'Quản trị viên'}</Text></View>
        <Pressable accessibilityRole="button" onPress={signOut} style={({ pressed }) => [styles.exit, pressed && { opacity: 0.7 }]}><Text style={styles.exitText}>Đăng xuất</Text></Pressable>
      </View>
      <View style={styles.demoNotice}><View style={styles.demoDot}/><Text style={styles.demoText}>Bản xem trước quản trị · Số liệu bên dưới là dữ liệu mẫu</Text></View>
      <Text style={styles.sectionTitle}>Tổng quan</Text>
      <View style={styles.stats}>
        {stats.map(item => <View key={item.label} style={styles.statCard}>
          <Text style={styles.statLabel}>{item.label}</Text><Text style={styles.statValue}>{item.value}</Text>
          <Text style={[styles.statChange, item.tone === 'green' ? styles.green : item.tone === 'orange' ? styles.orange : styles.amber]}>{item.change} <Text style={styles.period}>30 ngày</Text></Text>
        </View>)}
      </View>
      <View style={styles.activityCard}>
        <View style={styles.activityHead}><View><Text style={styles.cardTitle}>Hoạt động tuần này</Text><Text style={styles.cardSub}>Tài khoản mới theo ngày</Text></View><Text style={styles.total}>+186</Text></View>
        <View style={styles.chart}>
          {[38, 62, 46, 80, 55, 94, 70].map((height, index) => <View key={index} style={styles.barColumn}><View style={[styles.bar, index === 5 && styles.barActive, { height }]} /><Text style={styles.day}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][index]}</Text></View>)}
        </View>
      </View>
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Tài khoản gần đây</Text><Text style={styles.count}>3 mẫu</Text></View>
      <View style={styles.listCard}>{members.map((member, index) => <View key={member.email} style={[styles.memberRow, index > 0 && styles.separator]}>
        <View style={[styles.avatar, { backgroundColor: member.color }]}><Text style={styles.avatarText}>{member.name[0]}</Text></View>
        <View style={styles.memberInfo}><Text style={styles.memberName}>{member.name}</Text><Text style={styles.memberEmail}>{member.email}</Text></View>
        <Text style={[styles.status, member.status === 'Chờ xác minh' && styles.pending]}>{member.status}</Text>
      </View>)}</View>
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Công thức mới</Text><Text style={styles.count}>3 mẫu</Text></View>
      <View style={styles.listCard}>{recipes.map((recipe, index) => <View key={recipe.title} style={[styles.recipeRow, index > 0 && styles.separator]}>
        <View style={styles.recipeGlyph}><Text style={styles.recipeGlyphText}>{String(index + 1).padStart(2, '0')}</Text></View>
        <View style={styles.memberInfo}><Text style={styles.memberName}>{recipe.title}</Text><Text style={styles.memberEmail}>{recipe.owner} · {recipe.category}</Text></View>
        <Text style={styles.chevron}>›</Text>
      </View>)}</View>
      <Text style={styles.footer}>CookFlow Admin · Chỉ dùng để trình diễn</Text>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas }, content: { width: '100%', maxWidth: 820, alignSelf: 'center', padding: 22, paddingBottom: 36 },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14 }, brand: { color: C.brand, fontWeight: '800', fontSize: 11, letterSpacing: 1.1 }, title: { color: C.primary, fontSize: 24, lineHeight: 32, fontWeight: '800', marginTop: 8 }, exit: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingHorizontal: 14, justifyContent: 'center' }, exitText: { color: C.granite, fontSize: 13, fontWeight: '600' },
  demoNotice: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 13, backgroundColor: '#FFF0EC', borderRadius: 14, marginTop: 20 }, demoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.brand }, demoText: { color: '#83321F', fontSize: 12, flexShrink: 1 }, sectionTitle: { color: C.primary, fontSize: 17, fontWeight: '700', marginTop: 24 }, stats: { flexDirection: 'row', gap: 10, marginTop: 12 }, statCard: { flex: 1, minWidth: 90, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.borderLight, padding: 13 }, statLabel: { fontSize: 11, color: C.granite }, statValue: { marginTop: 9, fontSize: 23, color: C.primary, fontWeight: '800' }, statChange: { marginTop: 7, fontSize: 10, fontWeight: '700' }, green: { color: '#287A49' }, orange: { color: C.brand }, amber: { color: '#9A6100' }, period: { color: '#8B8B84', fontWeight: '400' },
  activityCard: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.borderLight, padding: 17, marginTop: 14 }, activityHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, cardTitle: { color: C.primary, fontSize: 15, fontWeight: '700' }, cardSub: { color: C.granite, fontSize: 12, marginTop: 4 }, total: { color: C.brand, fontSize: 19, fontWeight: '800' }, chart: { height: 120, marginTop: 18, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: C.borderLight }, barColumn: { height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 7 }, bar: { width: 20, borderRadius: 7, backgroundColor: '#F8D8CE' }, barActive: { backgroundColor: C.brand }, day: { color: C.granite, fontSize: 10, marginBottom: 7 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }, count: { color: C.granite, fontSize: 12, marginTop: 23 }, listCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.borderLight, paddingHorizontal: 14, marginTop: 10 }, memberRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10 }, recipeRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 11 }, separator: { borderTopWidth: 1, borderTopColor: C.borderLight }, avatar: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: C.primary, fontWeight: '700' }, memberInfo: { flex: 1 }, memberName: { color: C.primary, fontSize: 13, fontWeight: '700' }, memberEmail: { color: C.granite, fontSize: 11, marginTop: 4 }, status: { color: '#287A49', fontSize: 10, fontWeight: '600' }, pending: { color: '#9A6100' }, recipeGlyph: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#FFF0EC', alignItems: 'center', justifyContent: 'center' }, recipeGlyphText: { color: C.brand, fontWeight: '700', fontSize: 11 }, chevron: { color: C.disable, fontSize: 20 }, footer: { color: '#909089', fontSize: 11, textAlign: 'center', marginTop: 28 }
});
