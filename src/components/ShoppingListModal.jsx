import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { HeronColors, Radius, HeronShadow, Spacing } from '../constants/theme';
import { useRecipes } from '../context/RecipeContext';
export const ShoppingListModal = ({
  visible,
  onClose
}) => {
  const {
    shoppingList,
    toggleShoppingItem,
    deleteShoppingItem,
    clearCheckedShoppingItems,
    addCustomShoppingItem
  } = useRecipes();
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const completedCount = shoppingList.filter(item => item.checked).length;
  const totalCount = shoppingList.length;
  const handleAddItem = () => {
    if (!newName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nguyên liệu');
      return;
    }
    addCustomShoppingItem(newName, newAmount, newUnit);
    setNewName('');
    setNewAmount('');
    setNewUnit('');
  };
  const handleShareList = () => {
    if (shoppingList.length === 0) {
      Alert.alert('Thông báo', 'Danh sách đi chợ đang trống!');
      return;
    }
    const textList = shoppingList.map(i => `${i.checked ? '[x]' : '[ ]'} ${i.name} (${i.amount} ${i.unit}) - ${i.recipeTitle}`).join('\n');
    Alert.alert('📋 Danh Sách Đi Chợ CookFlow', textList);
  };
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* iOS Drag Handle */}
        <View style={styles.dragHandleWrap}>
          <View style={styles.dragHandle} />
        </View>

        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View style={styles.titleWrap}>
            <Text style={styles.headerTitle}>Danh Sách Đi Chợ 🛒</Text>
            <Text style={styles.headerSub}>
              {completedCount} / {totalCount} nguyên liệu đã mua
            </Text>
          </View>

          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Xong</Text>
          </Pressable>
        </View>

        {/* Progress Bar */}
        {totalCount > 0 ? <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {
          width: `${completedCount / totalCount * 100}%`
        }]} />
          </View> : null}

        {/* Quick Add Form Row */}
        <View style={styles.addFormCard}>
          <Text style={styles.addFormTitle}>THÊM NGUYÊN LIỆU MUA TỰ DO:</Text>
          <View style={styles.addInputRow}>
            <TextInput style={[styles.input, {
            flex: 2
          }]} placeholder="Tên nguyên liệu..." placeholderTextColor={HeronColors.disable} value={newName} onChangeText={setNewName} />
            <TextInput style={[styles.input, {
            flex: 1
          }]} placeholder="Số lượng" placeholderTextColor={HeronColors.disable} value={newAmount} onChangeText={setNewAmount} />
            <TextInput style={[styles.input, {
            flex: 1
          }]} placeholder="Đơn vị" placeholderTextColor={HeronColors.disable} value={newUnit} onChangeText={setNewUnit} />
            <Pressable onPress={handleAddItem} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* Main List */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {shoppingList.length === 0 ? <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🧺</Text>
              <Text style={styles.emptyTitle}>Chưa có nguyên liệu nào</Text>
              <Text style={styles.emptySub}>
                Bấm nút "Thêm vào Danh sách đi chợ" từ chi tiết bất kỳ món ăn nào!
              </Text>
            </View> : <View style={styles.itemsList}>
              {shoppingList.map(item => <Pressable key={item.id} onPress={() => toggleShoppingItem(item.id)} style={[styles.itemCard, item.checked && styles.itemCardChecked]}>
                  <View style={styles.checkbox}>
                    <Text style={styles.checkIcon}>{item.checked ? '✓' : ''}</Text>
                  </View>

                  <View style={styles.itemTextWrap}>
                    <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemSub}>
                      {item.amount} {item.unit} • {item.recipeTitle}
                    </Text>
                  </View>

                  <Pressable onPress={e => {
              e.stopPropagation();
              deleteShoppingItem(item.id);
            }} style={styles.deleteBtn}>
                    <Text style={styles.deleteText}>✕</Text>
                  </Pressable>
                </Pressable>)}
            </View>}

          {/* Action Row */}
          {totalCount > 0 ? <View style={styles.actionsRow}>
              <Pressable onPress={handleShareList} style={styles.shareBtn}>
                <Text style={styles.shareBtnText}>📋 Xuất / Gửi danh sách</Text>
              </Pressable>

              {completedCount > 0 ? <Pressable onPress={clearCheckedShoppingItems} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>🧹 Xóa món đã mua</Text>
                </Pressable> : null}
            </View> : null}

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
    backgroundColor: HeronColors.canvas
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
    paddingBottom: Spacing.md
  },
  titleWrap: {
    flex: 1
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: HeronColors.inkPrimary
  },
  headerSub: {
    fontSize: 13,
    color: HeronColors.disable,
    fontWeight: '600',
    marginTop: 2
  },
  closeBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full
  },
  closeBtnText: {
    color: HeronColors.inkPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E2E8F0',
    width: '100%'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981'
  },
  addFormCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...HeronShadow.soft
  },
  addFormTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.disable,
    marginBottom: 8,
    letterSpacing: 0.5
  },
  addInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: HeronColors.inkPrimary
  },
  addBtn: {
    backgroundColor: HeronColors.accentFlame,
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800'
  },
  scrollContent: {
    padding: Spacing.lg
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: HeronColors.inkPrimary,
    marginBottom: 6
  },
  emptySub: {
    fontSize: 13,
    color: HeronColors.disable,
    textAlign: 'center',
    maxWidth: 280
  },
  itemsList: {
    gap: 10
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...HeronShadow.soft
  },
  itemCardChecked: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    opacity: 0.75
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: HeronColors.accentFlame,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  checkIcon: {
    color: HeronColors.accentFlame,
    fontWeight: '900',
    fontSize: 14
  },
  itemTextWrap: {
    flex: 1
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: HeronColors.inkPrimary
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: HeronColors.disable
  },
  itemSub: {
    fontSize: 12,
    color: HeronColors.disable,
    marginTop: 2
  },
  deleteBtn: {
    padding: 6
  },
  deleteText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '700'
  },
  actionsRow: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    gap: 12
  },
  shareBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center'
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  clearBtn: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    alignItems: 'center'
  },
  clearBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13
  }
});