import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CategoryRepo } from '../repositories/CategoryRepo';
import { Category, TransactionType } from '../models/Category';
import { COLORS } from '../utils/constants';
import { CategoryIcon, ICON_POOL_LIST } from '../components/AppIcon';
import { showThemedAlert, showThemedConfirm } from '../components/AlertProvider';

const ICONS_PER_ROW = 5;
const DEFAULT_ICON_KEY = 'ion:ellipsis-horizontal-circle-outline';
const ICON_TABS: { key: 'income' | 'expense'; label: string }[] = [
  { key: 'income', label: '收入图标' },
  { key: 'expense', label: '支出图标' },
];

export default function CategoryScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterType, setFilterType] = useState<TransactionType>('expense');
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState(DEFAULT_ICON_KEY);
  const [iconTab, setIconTab] = useState<'income' | 'expense'>('expense');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // 打开新建弹窗
  const openModal = () => {
    setEditingCategory(null);
    setNewName('');
    setNewIcon(DEFAULT_ICON_KEY);
    setIconTab(filterType);
    setModalVisible(true);
  };

  // 打开编辑弹窗
  const openEditModal = (cat: Category) => {
    if (cat.is_default) { showThemedAlert('提示', '默认分类不能编辑'); return; }
    setEditingCategory(cat);
    setNewName(cat.name);
    setNewIcon(cat.icon);
    setIconTab(filterType);
    setModalVisible(true);
  };

  const loadData = useCallback(async () => {
    const data = await CategoryRepo.getAll(filterType);
    setCategories(data);
  }, [filterType]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleAdd = async () => {
    if (!newName.trim()) { showThemedAlert('提示', '请输入分类名称'); return; }

    if (editingCategory) {
      // 编辑模式：更新分类
      await CategoryRepo.update(editingCategory.id, { name: newName.trim(), icon: newIcon });
    } else {
      // 新建模式：创建分类
      await CategoryRepo.create({ name: newName.trim(), icon: newIcon, type: filterType });
    }
    setModalVisible(false);
    loadData();
  };

  const handleDelete = (cat: Category) => {
    if (cat.is_default) { showThemedAlert('提示', '默认分类不能删除'); return; }
    showThemedConfirm('确认删除', `删除分类"${cat.name}"？`, async () => {
      await CategoryRepo.delete(cat.id);
      loadData();
    }, '删除');
  };

  const INCOME_ICON_KEYS = new Set([
    'ion:wallet-outline','ion:card-outline','ion:cash-outline','ion:trending-up-outline',
    'ion:gift-outline','ion:diamond-outline','ion:trophy-outline','ion:ribbon-outline',
    'ion:briefcase-outline','ion:receipt-outline','ion:bag-handle-outline',
    'ion:earth-outline','ion:business-outline','ion:bar-chart-outline','ion:rose-outline',
    'ion:logo-usd','ion:logo-euro','ion:logo-yen','ion:logo-bitcoin',
    'ion:pricetags-outline','ion:calculator-outline','ion:stats-chart-outline',
    'ion:save-outline','ion:arrow-up-circle-outline','ion:repeat-outline',
    'ion:time-outline','ion:calendar-outline',
    'ion:mail-outline','ion:mail-unread-outline','ion:heart-outline',
  ]);
  const usedIconKeys = new Set(categories.map(c => c.icon));
  const filteredIconList = (iconTab === 'income'
    ? ICON_POOL_LIST.filter(k => INCOME_ICON_KEYS.has(k))
    : ICON_POOL_LIST.filter(k => !INCOME_ICON_KEYS.has(k))
  ).filter(k => {
    // 编辑模式下，保留当前编辑的图标
    if (editingCategory && k === editingCategory.icon) return true;
    return !usedIconKeys.has(k);
  });

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, filterType === 'expense' && styles.tabActive]}
          onPress={() => setFilterType('expense')}
        >
          <Text style={[styles.tabText, filterType === 'expense' && styles.tabTextActive]}>支出</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filterType === 'income' && styles.tabActive]}
          onPress={() => setFilterType('income')}
        >
          <Text style={[styles.tabText, filterType === 'income' && styles.tabTextActive]}>收入</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 48 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => openEditModal(item)}
            onLongPress={() => handleDelete(item)}
          >
            <View style={styles.iconWrap}>
              <CategoryIcon categoryName={item.name} iconKey={item.icon} size={22} color={COLORS.text} />
            </View>
            <Text style={styles.name}>{item.name}</Text>
            {item.is_default ? <Text style={styles.badge}>默认</Text> : null}
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <TouchableOpacity style={styles.addButton} onPress={openModal}>
            <Text style={styles.addIcon}>+</Text>
            <Text style={styles.addText}>添加分类</Text>
          </TouchableOpacity>
        }
      />

      {/* 添加弹窗 */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>{editingCategory ? '编辑分类' : '新建分类'}</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="分类名称"
              placeholderTextColor={COLORS.textLight}
            />
            <Text style={styles.modalLabel}>选择图标</Text>
            <View style={styles.iconTabs}>
              {ICON_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.iconTabBtn, iconTab === tab.key && styles.iconTabBtnActive]}
                  onPress={() => setIconTab(tab.key)}
                >
                  <Text style={[styles.iconTabText, iconTab === tab.key && styles.iconTabTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView style={styles.iconPickerScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.iconGrid}>
                {filteredIconList.map((key) => {
                  const active = newIcon === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.iconCell, active && styles.iconCellSelected]}
                      onPress={() => setNewIcon(key)}
                    >
                      <CategoryIcon categoryName="" iconKey={key} size={22} color={active ? COLORS.primary : COLORS.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAdd}>
                <Text style={styles.confirmText}>{editingCategory ? '保存' : '确定'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabRow: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.divider },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  tabText: { fontSize: 15, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  name: { flex: 1, fontSize: 16, color: COLORS.text },
  badge: { fontSize: 11, color: COLORS.textLight, backgroundColor: COLORS.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    marginTop: 8,
  },
  addIcon: { fontSize: 20, color: COLORS.primary, marginRight: 8 },
  addText: { fontSize: 15, color: COLORS.primary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 16 },
  modalInput: { backgroundColor: COLORS.background, borderRadius: 8, padding: 12, fontSize: 15, color: COLORS.text, marginBottom: 16 },
  modalLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  iconTabs: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  iconTabBtn: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border,
  },
  iconTabBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  iconTabText: { fontSize: 12, color: COLORS.textSecondary },
  iconTabTextActive: { color: COLORS.onPrimary, fontWeight: '600' },
  iconPickerScroll: { maxHeight: 300, marginBottom: 16 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  iconCellSelected: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: COLORS.background, alignItems: 'center' },
  cancelText: { fontSize: 15, color: COLORS.textSecondary },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: COLORS.primary, alignItems: 'center' },
  confirmText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
