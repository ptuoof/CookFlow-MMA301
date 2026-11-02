import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Pressable, TextInput, Share, Platform } from 'react-native';
import { HeronColors, Radius, HeronShadow, Spacing } from '../constants/theme';
import { useRecipes } from '../context/RecipeContext';
import { groupShoppingItemsByAisle } from '../utils/groceryAisles';
import { confirmAction, showAlert } from '../utils/dialog';
import { UNIT_SUGGESTIONS } from '../utils/units';
const UNDO_TIMEOUT_MS = 5000;
const AMOUNT_PATTERN = /^\d+([.,]\d+)?(\/\d+)?$/;
const AMOUNT_HINT = 'Nhập số lượng dạng số, ví dụ 2, 0,5 hoặc 1/2 — hoặc để trống.';
export const ShoppingListModal = ({
  visible,
  onClose
}) => {
  const {
    shoppingList,
    toggleShoppingItem,
    updateShoppingItem,
    deleteShoppingItem,
    restoreShoppingItem,
    clearCheckedShoppingItems,
    addCustomShoppingItem
  } = useRecipes();
  // One-tap delete stays fast; the last removed row can be restored for a few seconds
  const [lastRemoved, setLastRemoved] = useState(null);
  const undoTimeoutRef = useRef(null);
  // Row being edited: { id, name, amount, unit } (text values of the form)
  const [editing, setEditing] = useState(null);
  useEffect(() => {
    if (!visible) {
      setLastRemoved(null);
      setEditing(null);
    }
  }, [visible]);
  const startEdit = item => setEditing({
    id: item.id,
    name: item.name,
    amount: item.amount === 'Vừa đủ' ? '' : String(item.amount ?? ''),
    unit: item.unit || ''
  });
  const handleSaveEdit = () => {
    if (!editing.name.trim()) {
      showAlert('Thiếu tên nguyên liệu', 'Tên nguyên liệu không được để trống.');
      return;
    }
    if (editing.amount.trim() && !AMOUNT_PATTERN.test(editing.amount.trim())) {
      showAlert('Số lượng chưa hợp lệ', AMOUNT_HINT);
      return;
    }
    updateShoppingItem(editing.id, editing);
    setEditing(null);
  };
  useEffect(() => () => clearTimeout(undoTimeoutRef.current), []);
  const handleDeleteItem = id => {
    const removed = deleteShoppingItem(id);
    if (!removed) return;
    setLastRemoved(removed);
    clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => setLastRemoved(null), UNDO_TIMEOUT_MS);
  };
  const handleUndoDelete = () => {
    clearTimeout(undoTimeoutRef.current);
    restoreShoppingItem(lastRemoved);
    setLastRemoved(null);
  };
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const completedCount = shoppingList.filter(item => item.checked).length;
  const totalCount = shoppingList.length;
  // Items still to buy stay on top of each aisle; bought ones sink to the bottom
  const aisleGroups = groupShoppingItemsByAisle(shoppingList).map(group => ({
    ...group,
    remaining: group.items.filter(item => !item.checked).length,
    items: [...group.items].sort((a, b) => Number(a.checked) - Number(b.checked))
  }));
  const handleAddItem = () => {
    if (!newName.trim()) {
      showAlert('Thiếu tên nguyên liệu', 'Vui lòng nhập tên nguyên liệu cần mua.');
      return;
    }
    if (newAmount.trim() && !AMOUNT_PATTERN.test(newAmount.trim())) {
      showAlert('Số lượng chưa hợp lệ', AMOUNT_HINT);
      return;
    }
    const { merged } = addCustomShoppingItem(newName, newAmount, newUnit);
    if (merged) showAlert('Đã cộng dồn', `"${newName.trim()}" đã có trong danh sách nên số lượng được cộng thêm.`);
    setNewName('');
    setNewAmount('');
    setNewUnit('');
  };
  const buildShareText = () => {
    const lines = ['🛒 DANH SÁCH ĐI CHỢ — CookFlow', ''];
    aisleGroups.forEach(group => {
      lines.push(`【${group.label}】`);
      group.items.forEach(i => lines.push(`${i.checked ? '☑' : '☐'} ${i.name} — ${i.amount} ${i.unit}`.trim()));
      lines.push('');
    });
    lines.push(`Còn cần mua: ${totalCount - completedCount}/${totalCount}`);
    return lines.join('\n');
  };
  const handleShareList = async () => {
    if (shoppingList.length === 0) {
      showAlert('Thông báo', 'Danh sách đi chợ đang trống!');
      return;
    }
    const message = buildShareText();
    try {
      if (Platform.OS === 'web') {
        const nav = globalThis.navigator;
        if (nav?.share) await nav.share({ title: 'Danh sách đi chợ', text: message });
        else if (nav?.clipboard) {
          await nav.clipboard.writeText(message);
          showAlert('Đã sao chép', 'Danh sách đã được sao chép, bạn có thể dán vào tin nhắn.');
        }
        return;
      }
      await Share.share({ message, title: 'Danh sách đi chợ CookFlow' });
    } catch {
      // user dismissed the share sheet
    }
  };
  const handleClearChecked = () => confirmAction({
    title: 'Xóa các món đã mua?',
    message: `${completedCount} mục đã đánh dấu sẽ bị xóa khỏi danh sách.`,
    confirmText: 'Xóa',
    destructive: true,
    onConfirm: clearCheckedShoppingItems
  });
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
          }]} placeholder="Tên nguyên liệu..." placeholderTextColor={HeronColors.disable} value={newName} onChangeText={setNewName} returnKeyType="next" maxLength={80} />
            <TextInput style={[styles.input, {
            flex: 1
          }]} placeholder="SL" placeholderTextColor={HeronColors.disable} value={newAmount} onChangeText={setNewAmount} keyboardType="decimal-pad" maxLength={8} />
            <TextInput style={[styles.input, {
            flex: 1
          }]} placeholder="Đơn vị" placeholderTextColor={HeronColors.disable} value={newUnit} onChangeText={setNewUnit} returnKeyType="done" onSubmitEditing={handleAddItem} maxLength={20} />
            <Pressable accessibilityRole="button" accessibilityLabel="Thêm vào danh sách" onPress={handleAddItem} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* Main List */}
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
          {shoppingList.length === 0 ? <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🧺</Text>
              <Text style={styles.emptyTitle}>Chưa có nguyên liệu nào</Text>
              <Text style={styles.emptySub}>
                Bấm nút "Thêm vào Danh sách đi chợ" từ chi tiết bất kỳ món ăn nào!
              </Text>
            </View> : <View style={styles.itemsList}>
              {aisleGroups.map(group => <View key={group.id} style={styles.aisleGroup}>
                <View style={styles.aisleHeading}>
                  <Text style={styles.aisleTitle}>{group.label}</Text>
                  <Text style={styles.aisleCount}>{group.remaining}/{group.items.length}</Text>
                </View>
                {group.items.map(item => <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: item.checked }} onPress={() => toggleShoppingItem(item.id)} onLongPress={() => startEdit(item)} style={[styles.itemCard, item.checked && styles.itemCardChecked]}>
                  <View style={styles.checkbox}>
                    <Text style={styles.checkIcon}>{item.checked ? '✓' : ''}</Text>
                  </View>

                  <View style={styles.itemTextWrap}>
                    <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemSub}>
                      {item.amount} {item.unit} • {item.recipeTitle}{item.stockedToPantry ? ' • đã cất vào tủ' : ''}
                    </Text>
                  </View>

                  <Pressable accessibilityRole="button" accessibilityLabel={`Sửa ${item.name}`} hitSlop={4} onPress={e => {
              e.stopPropagation();
              startEdit(item);
            }} style={styles.deleteBtn}>
                    <Text style={styles.editText}>✎</Text>
                  </Pressable>

                  <Pressable accessibilityRole="button" accessibilityLabel={`Xóa ${item.name}`} onPress={e => {
              e.stopPropagation();
              handleDeleteItem(item.id);
            }} style={styles.deleteBtn}>
                    <Text style={styles.deleteText}>✕</Text>
                  </Pressable>
                </Pressable>)}
              </View>)}
            </View>}

          {/* Action Row */}
          {totalCount > 0 ? <View style={styles.actionsRow}>
              <Pressable onPress={handleShareList} style={styles.shareBtn}>
                <Text style={styles.shareBtnText}>📋 Xuất / Gửi danh sách</Text>
              </Pressable>

              {completedCount > 0 ? <Pressable onPress={handleClearChecked} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>🧹 Xóa món đã mua</Text>
                </Pressable> : null}
            </View> : null}

          <View style={{
          height: 60
        }} />
        </ScrollView>

        {/* Edit sheet for one row */}
        {editing ? <View style={styles.editOverlay}>
            <View style={styles.editCard}>
              <Text style={styles.addFormTitle}>SỬA MÓN CẦN MUA</Text>
              <TextInput style={styles.input} placeholder="Tên nguyên liệu..." placeholderTextColor={HeronColors.disable} value={editing.name} onChangeText={name => setEditing(prev => ({ ...prev, name }))} maxLength={80} />
              <View style={styles.addInputRow}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="SL" placeholderTextColor={HeronColors.disable} value={editing.amount} onChangeText={amount => setEditing(prev => ({ ...prev, amount }))} keyboardType="decimal-pad" maxLength={8} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Đơn vị" placeholderTextColor={HeronColors.disable} value={editing.unit} onChangeText={unit => setEditing(prev => ({ ...prev, unit }))} maxLength={20} />
              </View>
              <View style={styles.unitChips}>
                {UNIT_SUGGESTIONS.map(unit => <Pressable key={unit} onPress={() => setEditing(prev => ({ ...prev, unit }))} style={[styles.unitChip, editing.unit === unit && styles.unitChipActive]}>
                    <Text style={[styles.unitChipText, editing.unit === unit && styles.unitChipTextActive]}>{unit}</Text>
                  </Pressable>)}
              </View>
              <View style={styles.actionsRow}>
                <Pressable onPress={() => setEditing(null)} style={[styles.shareBtn, styles.cancelEditBtn]}>
                  <Text style={[styles.shareBtnText, styles.cancelEditText]}>Hủy</Text>
                </Pressable>
                <Pressable onPress={handleSaveEdit} style={[styles.shareBtn, styles.saveEditBtn]}>
                  <Text style={styles.shareBtnText}>Lưu</Text>
                </Pressable>
              </View>
            </View>
          </View> : null}

        {/* Undo bar for the last deleted row */}
        {lastRemoved ? <View style={styles.undoBar} accessibilityLiveRegion="polite">
            <Text style={styles.undoText} numberOfLines={1}>Đã xóa “{lastRemoved.item.name}”</Text>
            <Pressable accessibilityRole="button" onPress={handleUndoDelete} hitSlop={8}>
              <Text style={styles.undoAction}>HOÀN TÁC</Text>
            </Pressable>
          </View> : null}
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
  aisleGroup: {
    gap: 8
  },
  aisleHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 3,
    paddingTop: 8
  },
  aisleTitle: {
    color: HeronColors.inkPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  aisleCount: {
    color: HeronColors.granite,
    fontSize: 11,
    fontWeight: '700'
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
  },
  editText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '700'
  },
  editOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: Spacing.lg
  },
  editCard: {
    backgroundColor: HeronColors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: 10,
    ...HeronShadow.card
  },
  unitChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  unitChip: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: HeronColors.border,
    justifyContent: 'center'
  },
  unitChipActive: {
    backgroundColor: HeronColors.brand,
    borderColor: HeronColors.brand
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: HeronColors.secondary
  },
  unitChipTextActive: {
    color: '#FFFFFF'
  },
  cancelEditBtn: {
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderColor: HeronColors.border
  },
  cancelEditText: {
    color: HeronColors.inkPrimary
  },
  saveEditBtn: {
    backgroundColor: HeronColors.brand
  },
  undoBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: HeronColors.inkPrimary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: Radius.md,
    ...HeronShadow.dock
  },
  undoText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  undoAction: {
    color: HeronColors.brand,
    fontSize: 14,
    fontWeight: '900'
  }
});
