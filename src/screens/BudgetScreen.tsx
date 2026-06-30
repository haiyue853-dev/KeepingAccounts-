import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { showThemedAlert, showThemedConfirm } from "../components/AlertProvider";
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../utils/constants';
import { formatAmount } from '../utils/formatters';
import { BudgetRepo, Budget, CategoryBudget } from '../repositories/BudgetRepo';
import { AccountBookRepo } from '../repositories/AccountBookRepo';
import { TransactionRepo } from '../repositories/TransactionRepo';
import { CategoryIcon } from '../components/AppIcon';
import { CategoryRepo } from '../repositories/CategoryRepo';
import { Category } from '../models/Category';

const NUM_ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['.', '0', '⌫'],
];

export default function BudgetScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [spent, setSpent] = useState(0);
  const [categorySpending, setCategorySpending] = useState<{ category_id?: number; name: string; icon: string; total: number }[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);

  // 弹窗状态
  const [showPopup, setShowPopup] = useState(false);
  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  const [inputAmount, setInputAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    const books = await AccountBookRepo.getAll();
    if (!books.length) return;
    const bookId = books[0].id;

    // 加载预算
    const b = await BudgetRepo.get(bookId, year, month);
    setBudget(b);

    // 加载本月支出
    const summary = await TransactionRepo.getMonthlySummary(bookId, year, month);
    setSpent(summary.expense);

    // 加载分类支出
    const cats = await TransactionRepo.getCategorySummary(bookId, year, month);
    const expenseCats = cats
      .filter((c) => c.type === 'expense')
      .map((c: any) => ({ category_id: c.category_id, name: c.category_name, icon: c.category_icon, total: c.total }));
    setCategorySpending(expenseCats);
    setCategoryBudgets(await BudgetRepo.getCategoryBudgets(bookId, year, month));
    setExpenseCategories(await CategoryRepo.getAll('expense'));
  }, [year, month]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m);
    setYear(y);
  };

  const budgetAmount = budget?.amount ?? 0;
  const remaining = budgetAmount - spent;
  const progressPercent = budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0;
  const isOverBudget = budgetAmount > 0 && spent > budgetAmount;

  // --- 弹窗键盘 ---
  const handleKey = (key: string) => {
    if (key === '⌫') { setInputAmount((p) => p.slice(0, -1)); return; }
    if (key === '.') {
      if (inputAmount.includes('.')) return;
      if (!inputAmount) { setInputAmount('0.'); return; }
    }
    if (key === '0' && inputAmount === '0') return;
    const parts = inputAmount.split('.');
    if (parts[1]?.length >= 2) return;
    setInputAmount((p) => p + key);
  };

  const openPopup = () => {
    setInputAmount(budgetAmount > 0 ? String(budgetAmount) : '');
    setShowPopup(true);
  };

  const openCategoryPopup = (categoryId?: number, amount?: number) => {
    setSelectedCategoryId(categoryId ?? expenseCategories[0]?.id ?? null);
    setInputAmount(amount && amount > 0 ? String(amount) : '');
    setShowCategoryPopup(true);
  };

  const handleConfirm = async () => {
    const num = parseFloat(inputAmount);
    if (!inputAmount || isNaN(num) || num <= 0) return;

    const books = await AccountBookRepo.getAll();
    if (!books.length) return;

    await BudgetRepo.set(books[0].id, year, month, num);
    setShowPopup(false);
    loadData();
  };

  const handleCategoryConfirm = async () => {
    const num = parseFloat(inputAmount);
    if (!selectedCategoryId || !inputAmount || isNaN(num) || num <= 0) return;

    const books = await AccountBookRepo.getAll();
    if (!books.length) return;

    await BudgetRepo.setCategoryBudget(books[0].id, selectedCategoryId, year, month, num);
    setShowCategoryPopup(false);
    loadData();
  };

  const handleCategoryBudgetDelete = async (categoryId: number) => {
    showThemedConfirm('删除分类预算', '确定要删除这个分类的预算设置吗？', async () => {
      const books = await AccountBookRepo.getAll();
      if (!books.length) return;

      await BudgetRepo.deleteCategoryBudget(books[0].id, categoryId, year, month);
      loadData();
    });
  };

  const getCategorySpent = (categoryId: number) => {
    return categorySpending.find((item) => item.category_id === categoryId)?.total ?? 0;
  };

  return (
    <View style={styles.container}>
      {/* 顶部黄色导航栏 */}
      <View style={[styles.header, { paddingTop: (insets.top || 24) + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>月预算</Text>
        <View style={styles.headerBack} />
      </View>

      {/* 月份切换 */}
      <View style={styles.monthBar}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}>
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{year}年{month}月</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* 预算卡片 */}
        <TouchableOpacity style={styles.budgetCard} onPress={openPopup} activeOpacity={0.8}>
          {budgetAmount > 0 ? (
            <>
              <View style={styles.budgetTopRow}>
                <Text style={styles.budgetLabel}>月预算</Text>
                <TouchableOpacity onPress={openPopup} style={styles.editBtn}>
                  <Ionicons name="create-outline" size={16} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>

              <Text style={styles.budgetAmount}>¥{formatAmount(budgetAmount)}</Text>

              {/* 进度条 */}
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: isOverBudget ? COLORS.danger : COLORS.primary,
                    },
                  ]}
                />
              </View>

              <View style={styles.budgetInfoRow}>
                <View style={styles.budgetInfoItem}>
                  <Text style={styles.budgetInfoLabel}>已支出</Text>
                  <Text style={[styles.budgetInfoValue, { color: COLORS.expense }]}>
                    ¥{formatAmount(spent)}
                  </Text>
                </View>
                <View style={styles.budgetInfoItem}>
                  <Text style={styles.budgetInfoLabel}>剩余</Text>
                  <Text style={[styles.budgetInfoValue, { color: isOverBudget ? COLORS.danger : COLORS.income }]}>
                    {isOverBudget ? '-' : ''}¥{formatAmount(Math.abs(remaining))}
                  </Text>
                </View>
                <View style={styles.budgetInfoItem}>
                  <Text style={styles.budgetInfoLabel}>使用比例</Text>
                  <Text style={styles.budgetInfoValue}>{progressPercent.toFixed(0)}%</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyBudget}>
              <Ionicons name="wallet-outline" size={40} color={COLORS.textLight} />
              <Text style={styles.emptyText}>尚未设置预算</Text>
              <Text style={styles.emptyHint}>点击设置每月预算，合理控制开支</Text>
              <View style={styles.setBtn}>
                <Text style={styles.setBtnText}>设置预算</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.categoryBudgetCard}>
          <View style={styles.categoryBudgetHeader}>
            <Text style={styles.rankTitle}>分类预算</Text>
            <TouchableOpacity style={styles.categoryBudgetAdd} onPress={() => openCategoryPopup()}>
              <Ionicons name="add" size={15} color={COLORS.text} />
              <Text style={styles.categoryBudgetAddText}>添加</Text>
            </TouchableOpacity>
          </View>

          {categoryBudgets.length > 0 ? categoryBudgets.map((item) => {
            const categorySpent = getCategorySpent(item.category_id);
            const percent = item.amount > 0 ? Math.min((categorySpent / item.amount) * 100, 100) : 0;
            const over = categorySpent > item.amount;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.categoryBudgetRow}
                onPress={() => openCategoryPopup(item.category_id, item.amount)}
                onLongPress={() => handleCategoryBudgetDelete(item.category_id)}
                activeOpacity={0.75}
              >
                <View style={styles.rankIconBg}>
                  <CategoryIcon categoryName={item.category_name} iconKey={item.category_icon} size={18} color={COLORS.text} />
                </View>
                <View style={styles.rankInfo}>
                  <View style={styles.rankNameRow}>
                    <Text style={styles.rankName}>{item.category_name}</Text>
                    <Text style={[styles.rankPercent, over && { color: COLORS.danger }]}>
                      {formatAmount(categorySpent)} / {formatAmount(item.amount)}
                    </Text>
                  </View>
                  <View style={styles.rankBarBg}>
                    <View
                      style={[
                        styles.rankBar,
                        { width: `${percent}%`, backgroundColor: over ? COLORS.danger : COLORS.primary },
                      ]}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }) : (
            <TouchableOpacity style={styles.categoryBudgetEmpty} onPress={() => openCategoryPopup()}>
              <Text style={styles.emptyHint}>可以设置餐饮、居住、水电等单项预算</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 分类支出排行 */}
        {budgetAmount > 0 && categorySpending.length > 0 && (
          <View style={styles.rankCard}>
            <Text style={styles.rankTitle}>支出分类</Text>
            {categorySpending.map((cat, i) => {
              const percent = budgetAmount > 0 ? (cat.total / budgetAmount) * 100 : 0;
              return (
                <View key={cat.name} style={styles.rankRow}>
                  <View style={styles.rankIconBg}>
                    <CategoryIcon categoryName={cat.name} iconKey={cat.icon} size={18} color={COLORS.text} />
                  </View>
                  <View style={styles.rankInfo}>
                    <View style={styles.rankNameRow}>
                      <Text style={styles.rankName}>{cat.name}</Text>
                      <Text style={styles.rankPercent}>{percent.toFixed(1)}%</Text>
                    </View>
                    <View style={styles.rankBarBg}>
                      <View
                        style={[
                          styles.rankBar,
                          { width: `${Math.min(percent, 100)}%` },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.rankAmount}>¥{formatAmount(cat.total)}</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* 预算设置弹窗 */}
      <Modal visible={showPopup} transparent animationType="fade" onRequestClose={() => setShowPopup(false)}>
        <View style={styles.popupOverlay}>
          <TouchableOpacity style={styles.popupOverlayBg} activeOpacity={1} onPress={() => setShowPopup(false)} />

          <View style={styles.popupSheet}>
            {/* 关闭按钮 */}
            <TouchableOpacity style={styles.popupClose} onPress={() => setShowPopup(false)}>
              <Ionicons name="close" size={22} color={COLORS.textLight} />
            </TouchableOpacity>

            {/* 标题 */}
            <Text style={styles.popupTitle}>每月总预算</Text>

            {/* 输入框 */}
            <View style={styles.popupInputWrap}>
              <Text style={styles.popupCurrency}>¥</Text>
              <Text style={styles.popupInputText}>
                {inputAmount || ''}
                <Text style={styles.popupPlaceholder}>{inputAmount ? '' : '请输入预算金额'}</Text>
              </Text>
            </View>

            {/* 确定按钮 */}
            {(() => {
              const canConfirm = inputAmount.length > 0 && parseFloat(inputAmount) > 0;
              return (
                <TouchableOpacity
                  style={[styles.popupConfirm, canConfirm && styles.popupConfirmEnabled]}
                  onPress={handleConfirm}
                  disabled={!canConfirm}
                >
                  <Text style={[styles.popupConfirmText, canConfirm && styles.popupConfirmTextEnabled]}>
                    确定
                  </Text>
                </TouchableOpacity>
              );
            })()}

            {/* 数字键盘 */}
            <View style={styles.popupKeyboard}>
              {NUM_ROWS.map((row, ri) => (
                <View key={ri} style={styles.popupKeyRow}>
                  {row.map((key) => (
                    <TouchableOpacity
                      key={key}
                      style={styles.popupKeyBtn}
                      onPress={() => handleKey(key)}
                      activeOpacity={0.6}
                    >
                      <Text style={[styles.popupKeyText, key === '⌫' && styles.popupKeyDel]}>{key}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCategoryPopup} transparent animationType="fade" onRequestClose={() => setShowCategoryPopup(false)}>
        <View style={styles.popupOverlay}>
          <TouchableOpacity style={styles.popupOverlayBg} activeOpacity={1} onPress={() => setShowCategoryPopup(false)} />

          <View style={styles.popupSheet}>
            <TouchableOpacity style={styles.popupClose} onPress={() => setShowCategoryPopup(false)}>
              <Ionicons name="close" size={22} color={COLORS.textLight} />
            </TouchableOpacity>

            <Text style={styles.popupTitle}>分类预算</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPickerContent}>
              {expenseCategories.map((cat) => {
                const active = selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryPickerChip, active && styles.categoryPickerChipActive]}
                    onPress={() => setSelectedCategoryId(cat.id)}
                  >
                    <CategoryIcon categoryName={cat.name} iconKey={cat.icon} size={18} color={active ? COLORS.text : COLORS.textSecondary} />
                    <Text style={[styles.categoryPickerText, active && styles.categoryPickerTextActive]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.popupInputWrap}>
              <Text style={styles.popupCurrency}>¥</Text>
              <Text style={styles.popupInputText}>
                {inputAmount || ''}
                <Text style={styles.popupPlaceholder}>{inputAmount ? '' : '请输入分类预算金额'}</Text>
              </Text>
            </View>

            {(() => {
              const canConfirm = !!selectedCategoryId && inputAmount.length > 0 && parseFloat(inputAmount) > 0;
              return (
                <TouchableOpacity
                  style={[styles.popupConfirm, canConfirm && styles.popupConfirmEnabled]}
                  onPress={handleCategoryConfirm}
                  disabled={!canConfirm}
                >
                  <Text style={[styles.popupConfirmText, canConfirm && styles.popupConfirmTextEnabled]}>
                    确定
                  </Text>
                </TouchableOpacity>
              );
            })()}

            <View style={styles.popupKeyboard}>
              {NUM_ROWS.map((row, ri) => (
                <View key={ri} style={styles.popupKeyRow}>
                  {row.map((key) => (
                    <TouchableOpacity
                      key={key}
                      style={styles.popupKeyBtn}
                      onPress={() => handleKey(key)}
                      activeOpacity={0.6}
                    >
                      <Text style={[styles.popupKeyText, key === '⌫' && styles.popupKeyDel]}>{key}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // 顶部
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBack: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  // 月份切换
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  arrowBtn: { paddingHorizontal: 20, paddingVertical: 4 },
  monthText: { fontSize: 16, fontWeight: '600', color: COLORS.text, minWidth: 120, textAlign: 'center' },

  // 预算卡片
  budgetCard: {
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  budgetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  budgetLabel: { fontSize: 14, color: COLORS.textSecondary },
  editBtn: { padding: 4 },
  budgetAmount: { fontSize: 32, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  progressBg: {
    height: 10,
    backgroundColor: COLORS.background,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: { height: '100%', borderRadius: 5 },
  budgetInfoRow: { flexDirection: 'row' },
  budgetInfoItem: { flex: 1, alignItems: 'center' },
  budgetInfoLabel: { fontSize: 12, color: COLORS.textLight, marginBottom: 4 },
  budgetInfoValue: { fontSize: 16, fontWeight: '600', color: COLORS.text },

  // 空状态
  emptyBudget: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 8 },
  emptyHint: { fontSize: 13, color: COLORS.textLight },
  setBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  setBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  categoryBudgetCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  categoryBudgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryBudgetAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFF3D0',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryBudgetAddText: { fontSize: 12, color: COLORS.text, fontWeight: '700' },
  categoryBudgetRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  categoryBudgetEmpty: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },

  // 分类排行
  rankCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  rankTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 16 },
  rankRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  rankIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankInfo: { flex: 1 },
  rankNameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rankName: { fontSize: 14, color: COLORS.text },
  rankPercent: { fontSize: 13, color: COLORS.textSecondary },
  rankBarBg: { height: 8, backgroundColor: COLORS.background, borderRadius: 4, overflow: 'hidden' },
  rankBar: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  rankAmount: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginLeft: 12, minWidth: 70, textAlign: 'right' },

  // 弹窗
  popupOverlay: { flex: 1, justifyContent: 'flex-end' },
  popupOverlayBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  popupSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
    position: 'relative',
  },
  popupClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  popupTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  popupInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 16,
  },
  popupCurrency: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginRight: 8 },
  popupInputText: { fontSize: 20, fontWeight: '600', color: COLORS.text, flex: 1 },
  popupPlaceholder: { fontSize: 16, fontWeight: '400', color: COLORS.textLight },
  popupConfirm: {
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  popupConfirmDisabled: { backgroundColor: '#E0E0E0' },
  popupConfirmEnabled: { backgroundColor: COLORS.primary },
  popupConfirmText: { fontSize: 16, fontWeight: '600', color: '#AAA' },
  popupConfirmTextDisabled: { color: '#AAA' },
  popupConfirmTextEnabled: { color: '#fff' },
  categoryPickerContent: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  categoryPickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  categoryPickerChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  categoryPickerText: { fontSize: 13, color: COLORS.textSecondary },
  categoryPickerTextActive: { color: COLORS.text, fontWeight: '700' },
  popupKeyboard: { backgroundColor: '#F5F5F5', paddingTop: 1 },
  popupKeyRow: { flexDirection: 'row' },
  popupKeyBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8E8',
    backgroundColor: '#FAFAFA',
  },
  popupKeyText: { fontSize: 20, fontWeight: '500', color: COLORS.text },
  popupKeyDel: { fontSize: 18 },
});
