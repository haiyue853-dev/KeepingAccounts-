import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Keyboard, Animated, Platform, Dimensions, Vibration,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { showThemedAlert } from '../components/AlertProvider';
import { Ionicons } from '@expo/vector-icons';
import { TransactionRepo } from '../repositories/TransactionRepo';
import { CategoryRepo } from '../repositories/CategoryRepo';
import { AccountBookRepo } from '../repositories/AccountBookRepo';
import { Category, TransactionType } from '../models/Category';
import { COLORS } from '../utils/constants';
import { getToday } from '../utils/formatters';
import { CategoryIcon } from '../components/AppIcon';
import DatePickerWheel from '../components/DatePickerWheel';

const NUM_ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['.', '0', '⌫'],
];
const OP_ROW = ['+', '-', '×', '÷'];

export default function AddTransactionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editId = route.params?.transactionId as number | undefined;

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getToday());
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [frequentNotes, setFrequentNotes] = useState<string[]>([]);
  const [noteFocused, setNoteFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showTagPanel, setShowTagPanel] = useState(false);

  const insets = useSafeAreaInsets();
  const windowHeight = Dimensions.get('window').height;

  // 计算器状态
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<string | null>(null);
  const [freshOp, setFreshOp] = useState(false);
  const [showEquals, setShowEquals] = useState(false);

  // 金额跳动动画
  const amountScale = useRef(new Animated.Value(1)).current;
  const flashAmount = () => {
    Animated.sequence([
      Animated.timing(amountScale, { toValue: 1.15, duration: 120, useNativeDriver: true }),
      Animated.timing(amountScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const noteInputRef = useRef<TextInput>(null);

  // 备注聚焦过渡动画
  const keyboardAnim = useRef(new Animated.Value(1)).current;   // 1=键盘可见, 0=键盘隐藏
  const overlayAnim = useRef(new Animated.Value(0)).current;    // 0=遮罩隐藏, 1=遮罩可见

  // 记录键盘高度，用于备注聚焦时压缩分类网格；键盘收起后恢复自定义键盘
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event: any) => {
      const h = event?.endCoordinates?.height;
      if (typeof h === 'number') setKeyboardHeight(h);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      if (dismissTimerRef.current) { clearTimeout(dismissTimerRef.current); dismissTimerRef.current = null; }
      setKeyboardHeight(0);
      // 延迟重置 noteFocused，避免与 onFocus 冲突导致第一次点击无法弹出键盘
      setTimeout(() => {
        setNoteFocused(false);
      }, 100);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (noteFocused) {
      Animated.parallel([
        Animated.timing(keyboardAnim, { toValue: 0, duration: 220, useNativeDriver: false }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(keyboardAnim, { toValue: 1, duration: 220, useNativeDriver: false }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [noteFocused]);

  const isToday = date === getToday();
  const [transactionLoaded, setTransactionLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
      // 只在首次加载时读取交易数据，避免 type 变化时覆盖用户的选择
      if (editId && !transactionLoaded) {
        loadTransaction();
        setTransactionLoaded(true);
      }
      loadFrequentNotes();
    }, [type, categoryId])
  );

  const loadFrequentNotes = async () => {
    const notes = await TransactionRepo.getFrequentNotes(10, categoryId || undefined);
    setFrequentNotes(notes);
  };

  const loadCategories = async () => {
    const cats = await CategoryRepo.getAll(type);
    setCategories(cats);

    // 如果当前分类不在新类型的分类列表中，自动选择第一个
    if (cats.length > 0) {
      const categoryExists = cats.some(cat => cat.id === categoryId);
      if (!categoryId || !categoryExists) {
        setCategoryId(cats[0].id);
      }
    }
  };

  const loadTransaction = async () => {
    if (!editId) return;
    const t = await TransactionRepo.getById(editId);
    if (t) {
      setType(t.type);
      setAmount(String(t.amount));
      setNote(t.note || '');
      setDate(t.date);
      setCategoryId(t.category_id);
    }
  };

  /** 计算两个值的结果 */
  const calc = (a: number, b: number, op: string): number => {
    let result: number;
    switch (op) {
      case '+': result = a + b; break;
      case '-': result = a - b; break;
      case '×': result = a * b; break;
      case '÷': result = b !== 0 ? a / b : a; break;
      default: result = b;
    }

    // 检查结果是否在安全范围内
    const MAX_SAFE_AMOUNT = 9999999999; // 10位数上限
    if (result > MAX_SAFE_AMOUNT) return MAX_SAFE_AMOUNT;
    if (result < -MAX_SAFE_AMOUNT) return -MAX_SAFE_AMOUNT;

    return result;
  };

  /** 格式化数字：去掉末尾多余的 0，并限制长度 */
  const fmtResult = (n: number): string => {
    if (!isFinite(n) || isNaN(n)) return '0';
    const s = parseFloat(n.toFixed(10)).toString();

    // 如果数字太长，截断到10位有效数字
    if (s.replace(/[^0-9]/g, '').length > 10) {
      return parseFloat(n.toFixed(2)).toString();
    }

    return s;
  };

  const handleKey = (key: string) => {
    Vibration.vibrate(10);
    // 刚按了运算符，开始输入新数字
    if (freshOp) {
      setFreshOp(false);
      if (key === '⌫') return;
      if (key === '.') {
        setAmount('0.');
        return;
      }
      setAmount(key);
      return;
    }

    if (key === '⌫') {
      setAmount((p) => p.slice(0, -1));
      return;
    }
    if (key === '.') {
      if (amount.includes('.')) return;
      if (!amount) { setAmount('0.'); return; }
    }
    if (key === '0' && amount === '0') return;
    const parts = amount.split('.');

    // 整数位数限制：最多10位
    if (!amount.includes('.') && amount.replace(/[^0-9]/g, '').length >= 10) return;

    // 小数位数限制：最多2位
    if (parts[1]?.length >= 2) return;

    // 总长度限制：最多13个字符（10位整数 + 小数点 + 2位小数）
    if (amount.length >= 13) return;

    setAmount((p) => p + key);
  };

  const handleOp = (op: string) => {
    Vibration.vibrate(10);
    const current = parseFloat(amount) || 0;

    // 防止除以0的提示
    if (op === '÷' && current === 0 && freshOp === false) {
      showThemedAlert('提示', '除数不能为0');
      return;
    }

    if (prevValue !== null && pendingOp && !freshOp) {
      // 已有上一步运算且输入了新数字 → 先算出中间结果，大字跳动
      const result = calc(prevValue, current, pendingOp);
      setAmount(fmtResult(result));
      setPrevValue(result);
      flashAmount();
    } else {
      setPrevValue(current);
    }

    setPendingOp(op);
    setFreshOp(true);
    setShowEquals(true);
  };

  /** 按下等号 — 算出最终结果，然后自动保存 */
  const handleEquals = async () => {
    if (prevValue !== null && pendingOp) {
      const current = parseFloat(amount) || 0;
      const result = calc(prevValue, current, pendingOp);
      const resultStr = fmtResult(result);
      setAmount(resultStr);
      flashAmount();
      setPrevValue(null);
      setPendingOp(null);
      setFreshOp(false);
      setShowEquals(false);
      // 等状态更新后再保存
      setTimeout(() => {
        // 直接用计算结果保存，不依赖 state
        saveWithAmount(resultStr);
      }, 100);
    } else {
      // 没有运算，直接保存
      handleSave();
    }
  };

  const saveWithAmount = async (amountStr: string) => {
    try {
      const num = parseFloat(amountStr);
      if (!amountStr || isNaN(num) || num <= 0) {
        showThemedAlert('提示', '请先输入金额');
        return;
      }

      // 金额上限检测
      const MAX_AMOUNT = 9999999999; // 10位数上限
      if (num > MAX_AMOUNT) {
        showThemedAlert('提示', '金额超出最大限制（99亿）');
        return;
      }

      if (!categoryId) {
        showThemedAlert('提示', '请选择分类');
        return;
      }
      const books = await AccountBookRepo.getAll();
      const bookId = books.length > 0 ? books[0].id : 1;
      if (editId) {
        await TransactionRepo.update(editId, { category_id: categoryId, amount: num, type, note, date });
      } else {
        await TransactionRepo.create({ book_id: bookId, category_id: categoryId, amount: num, type, note, date });
      }
      navigation.goBack();
    } catch (e: any) {
      showThemedAlert('保存失败', String(e?.message || e));
    }
  };

  /** 构建小字提示：显示完整运算过程 */
  const buildHint = (): string | null => {
    if (prevValue === null || !pendingOp) return null;
    const left = fmtResult(prevValue);
    if (freshOp) {
      // 刚按了运算符，还没输入新数字 → "35 +"
      return `${left} ${pendingOp}`;
    }
    // 正在输入第二个数 → "35 + 10"
    return `${left} ${pendingOp} ${amount || '0'}`;
  };

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissNote = () => {
    Keyboard.dismiss();
    // 如果系统键盘根本没有弹出来，keyboardDidHide 不会触发，用 300ms 保底重置
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setNoteFocused(false);
    }, 300);
  };

  const handleSave = async () => {
    try {
      // 如果有未完成的运算，先算出结果
      let finalAmount = amount;
      if (prevValue !== null && pendingOp && !freshOp) {
        const current = parseFloat(amount) || 0;
        const result = calc(prevValue, current, pendingOp);
        finalAmount = String(parseFloat(result.toFixed(10)));
        setAmount(finalAmount);
      }

      const num = parseFloat(finalAmount);
      if (!finalAmount || isNaN(num) || num <= 0) {
        showThemedAlert('提示', '请先输入金额');
        return;
      }

      // 金额上限检测
      const MAX_AMOUNT = 9999999999; // 10位数上限
      if (num > MAX_AMOUNT) {
        showThemedAlert('提示', '金额超出最大限制（99亿）');
        return;
      }

      if (!categoryId) {
        showThemedAlert('提示', '请选择分类');
        return;
      }

      const books = await AccountBookRepo.getAll();
      const bookId = books.length > 0 ? books[0].id : 1;

      if (editId) {
        await TransactionRepo.update(editId, { category_id: categoryId, amount: num, type, note, date });
      } else {
        await TransactionRepo.create({ book_id: bookId, category_id: categoryId, amount: num, type, note, date });
      }

      // 导航到明细页
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
      });
    } catch (e: any) {
      showThemedAlert('保存失败', String(e?.message || e));
    }
  };

  /** 批量记账：保存后清空输入，保留分类和日期 */
  const handleBatchSave = async () => {
    try {
      // 如果有未完成的运算，先算出结果
      let finalAmount = amount;
      if (prevValue !== null && pendingOp && !freshOp) {
        const current = parseFloat(amount) || 0;
        const result = calc(prevValue, current, pendingOp);
        finalAmount = String(parseFloat(result.toFixed(10)));
        setAmount(finalAmount);
      }

      const num = parseFloat(finalAmount);
      if (!finalAmount || isNaN(num) || num <= 0) {
        showThemedAlert('提示', '请先输入金额');
        return;
      }

      // 金额上限检测
      const MAX_AMOUNT = 9999999999; // 10位数上限
      if (num > MAX_AMOUNT) {
        showThemedAlert('提示', '金额超出最大限制（99亿）');
        return;
      }

      if (!categoryId) {
        showThemedAlert('提示', '请选择分类');
        return;
      }

      const books = await AccountBookRepo.getAll();
      const bookId = books.length > 0 ? books[0].id : 1;

      await TransactionRepo.create({ book_id: bookId, category_id: categoryId, amount: num, type, note, date });

      // 清空金额和备注，保留类型、分类和日期
      setAmount('');
      setNote('');
      setPrevValue(null);
      setPendingOp(null);
      setFreshOp(false);
      setShowEquals(false);
      flashAmount();

      showThemedAlert('保存成功', '已保存，可继续记账', undefined, 'checkmark-circle');
    } catch (e: any) {
      showThemedAlert('保存失败', String(e?.message || e));
    }
  };

  return (
    <View style={styles.container}>
      {/* 顶部 AppBar */}
      <View style={[styles.appBar, { paddingTop: (insets.top || 24) + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Ionicons name="close" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.tabWrap}>
          <TouchableOpacity
            style={[styles.tab, type === 'expense' && styles.tabActive]}
            onPress={() => { setType('expense'); setCategoryId(null); }}
          >
            <Text style={[styles.tabText, type === 'expense' && styles.tabTextActive]}>支出</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, type === 'income' && styles.tabActive]}
            onPress={() => { setType('income'); setCategoryId(null); }}
          >
            <Text style={[styles.tabText, type === 'income' && styles.tabTextActive]}>收入</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cancelBtn} />
      </View>

      {/* 分类网格 — 上方区域，备注聚焦时压缩高度确保标签栏可见 */}
      <Animated.View
        style={[
          styles.categoryGrid,
          noteFocused && keyboardHeight > 0 && {
            maxHeight: Math.max(80, windowHeight - keyboardHeight - 320),
          },
          {
            opacity: overlayAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.3],
            }),
          },
        ]}
      >
        <ScrollView contentContainerStyle={styles.gridContent} showsVerticalScrollIndicator={false}>
          {categories.map((cat) => {
            const active = cat.id === categoryId;
            return (
              <TouchableOpacity
                key={cat.id}
                style={styles.gridItem}
                onPress={() => setCategoryId(cat.id)}
                activeOpacity={0.7}
                disabled={noteFocused}
              >
                <View style={[styles.iconCircle, active && styles.iconCircleActive]}>
                  <CategoryIcon categoryName={cat.name} iconKey={cat.icon} size={22} color={active ? '#333' : '#666'} />
                </View>
                <Text style={[styles.catLabel, active && styles.catLabelActive]} numberOfLines={1}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* 备注聚焦时的遮罩 — 使用动画淡入淡出，避免闪烁 */}
      <Animated.View
        style={[styles.noteOverlay, { opacity: overlayAnim }]}
        pointerEvents={noteFocused ? 'auto' : 'none'}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={dismissNote} />
      </Animated.View>

      {/* 金额显示 + 备注/日期栏 — 始终在正常文档流 */}
      <View style={styles.bottomSection}>
        {/* 金额 */}
        <View style={styles.amountArea}>
          {/* 运算过程提示 */}
          {buildHint() && (
            <Text style={styles.calcHint}>{buildHint()}</Text>
          )}
          <Text style={styles.currency}>¥</Text>
          <Animated.Text
            style={[styles.amountDisplay, { transform: [{ scale: amountScale }] }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {amount || '0'}
          </Animated.Text>
        </View>

        {/* 备注 + 日期 */}
        <View style={styles.actionBar}>
          <View style={[styles.noteInputWrap, noteFocused && styles.noteInputWrapFocused]}>
            <Ionicons name="create-outline" size={15} color={COLORS.textLight} style={styles.noteIcon} />
            <TextInput
              ref={noteInputRef}
              style={styles.noteInput}
              value={note}
              onChangeText={(text) => {
                // 备注长度限制：最多50个字符
                if (text.length <= 50) setNote(text);
              }}
              placeholder="添加备注"
              placeholderTextColor={COLORS.textLight}
              onFocus={() => setNoteFocused(true)}
              returnKeyType="done"
              blurOnSubmit
              maxLength={50}
            />
            {note.length > 0 && (
              <>
                <Text style={styles.noteCount}>{note.length}/50</Text>
                <TouchableOpacity onPress={() => setNote('')} style={styles.noteClear}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
                </TouchableOpacity>
              </>
            )}
          </View>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => { dismissNote(); setShowDatePicker(true); }}
          >
            <Ionicons name="calendar-outline" size={15} color={COLORS.textLight} />
            <Text style={styles.dateBtnText}>{isToday ? '今天' : date}</Text>
          </TouchableOpacity>
        </View>

        {/* 推荐词 — 备注聚焦时平滑展开（无推荐词时始终折叠） */}
        <Animated.View
          style={[
            styles.recommendBar,
            {
              height: overlayAnim.interpolate({
                inputRange: [0, 1],
                outputRange: frequentNotes.length > 0 || note.trim() ? [0, 56] : [0, 0],
              }),
              opacity: overlayAnim,
              overflow: 'hidden',
            },
          ]}
          pointerEvents={noteFocused && (frequentNotes.length > 0 || !!note.trim()) ? 'auto' : 'none'}
        >
          <View style={styles.recommendHeader}>
            <Text style={styles.recommendLabel}>常用标签</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendContent}>
            {frequentNotes.map((fn) => (
              <TouchableOpacity
                key={fn}
                style={[styles.recommendChip, note === fn && styles.recommendChipActive]}
                onPress={() => {
                  // 直接设置标签内容
                  setNote(fn);
                  // 关闭键盘
                  Keyboard.dismiss();
                }}
              >
                <Text style={[styles.recommendText, note === fn && styles.recommendTextActive]}>{fn}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </View>

      {/* 标签选择区域 — 固定在数字键盘上方 */}
      {frequentNotes.length > 0 && !noteFocused && (
        <View style={styles.tagBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagContent}>
            {frequentNotes.map((fn) => (
              <TouchableOpacity
                key={fn}
                style={[styles.tagChip, note === fn && styles.tagChipActive]}
                onPress={() => {
                  // 直接设置标签内容
                  setNote(fn);
                }}
              >
                <Text style={[styles.tagText, note === fn && styles.tagTextActive]}>{fn}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 数字键盘 — 备注聚焦时折叠为切换条，避免两个键盘抢位置 */}
      <Animated.View
        style={[
          styles.keyboard,
          {
            height: keyboardAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 280 + (insets.bottom || 0)],
            }),
            paddingBottom: insets.bottom || 0,
            backgroundColor: '#FFFFFF',
            opacity: keyboardAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 1],
            }),
            overflow: 'hidden',
          },
        ]}
        pointerEvents="auto"
      >
        {noteFocused ? (
          // 备注聚焦时：显示可点击的切换条
          <TouchableOpacity style={styles.keyboardSwitchBar} onPress={dismissNote} activeOpacity={0.6}>
            <Ionicons name="calculator-outline" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        ) : (
          // 完整数字键盘
          <>
            <View style={styles.opRow}>
              {OP_ROW.map((op) => (
                <TouchableOpacity key={op} style={styles.opBtn} onPress={() => handleOp(op)}>
                  <Text style={styles.opText}>{op}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.numArea}>
              <View style={styles.numGrid}>
                {NUM_ROWS.map((row, ri) => (
                  <View key={ri} style={styles.numRow}>
                    {row.map((key) => (
                      <TouchableOpacity key={key} style={styles.numBtn} onPress={() => handleKey(key)} activeOpacity={0.6}>
                        <Text style={[styles.numText, key === '⌫' && styles.delText]}>{key}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
              <View style={styles.doneBtnWrap}>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <Text style={styles.doneText}>保存</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.batchBtn}
                  onPress={handleBatchSave}
                  activeOpacity={0.8}
                >
                  <Text style={styles.batchText}>保存并再记一笔</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </Animated.View>

      {/* 日期滚轮选择器 */}
      <DatePickerWheel
        visible={showDatePicker}
        date={date}
        onConfirm={(d) => { setDate(d); setShowDatePicker(false); }}
        onCancel={() => setShowDatePicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // AppBar
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cancelBtn: { width: 40, alignItems: 'center' },
  logoWrap: { marginRight: 6, justifyContent: 'center', alignItems: 'center' },
  tabWrap: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 8,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  tab: { flex: 1, paddingVertical: 7, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.text, borderRadius: 8 },
  tabText: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  tabTextActive: { color: COLORS.primary },

  // 分类网格
  categoryGrid: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  gridItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconCircleActive: { backgroundColor: COLORS.primary },
  catLabel: { fontSize: 11, color: COLORS.textSecondary },
  catLabelActive: { color: COLORS.text, fontWeight: '600' },

  // 备注遮罩
  noteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.01)',
    zIndex: 1,
  },

  // 底部区域：金额 + 备注
  bottomSection: {
    backgroundColor: COLORS.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.divider,
    zIndex: 2,
  },
  amountArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  currency: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginRight: 4, marginBottom: 3 },
  amountDisplay: { fontSize: 36, fontWeight: '700', color: COLORS.text, maxWidth: '80%' },
  calcHint: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    position: 'absolute',
    left: 20,
    top: 10,
  },

  // 备注栏
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 8,
    gap: 8,
  },
  noteInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    height: 36,
  },
  noteInputWrapFocused: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    backgroundColor: '#fff',
  },
  noteIcon: { marginRight: 4 },
  noteInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 0,
  },
  noteCount: { fontSize: 10, color: COLORS.textLight, marginRight: 2 },
  noteClear: { marginLeft: 2, padding: 2 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    height: 36,
    gap: 4,
  },
  dateBtnText: { fontSize: 13, color: COLORS.text },

  // 推荐词
  recommendBar: {
    paddingHorizontal: 10,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.divider,
    paddingTop: 2,
  },
  recommendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  recommendLabel: { fontSize: 12, color: COLORS.textLight, marginRight: 8 },
  addTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFF3D0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addTagText: { fontSize: 11, color: COLORS.text, fontWeight: '700' },
  recommendContent: { gap: 8, paddingRight: 10, alignItems: 'center' },
  recommendChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendChipActive: {
    backgroundColor: COLORS.primary,
  },
  recommendText: { fontSize: 13, lineHeight: 15, color: COLORS.textSecondary, includeFontPadding: false, textAlignVertical: 'center' },
  recommendTextActive: { color: '#fff', fontWeight: '600' },

  // 键盘
  keyboard: { backgroundColor: '#ECECEC' },
  // 备注聚焦时的键盘切换条
  keyboardSwitchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    gap: 6,
    backgroundColor: '#ECECEC',
  },
  opRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDD',
  },
  opBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#DDD',
  },
  opText: { fontSize: 18, color: COLORS.text, fontWeight: '500' },
  numArea: {
    flexDirection: 'row',
  },
  numGrid: { flex: 3 },
  numRow: { flexDirection: 'row' },
  numBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DDD',
    backgroundColor: '#FAFAFA',
  },
  numText: { fontSize: 20, fontWeight: '500', color: COLORS.text },
  delText: { fontSize: 18 },
  doneBtnWrap: {
    flex: 1,
  },
  doneBtn: {
    flex: 1,
    backgroundColor: '#F5C543',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DDD',
  },
  batchBtn: {
    flex: 1,
    backgroundColor: '#FFE8A3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DDD',
  },
  equalsBtn: {
    backgroundColor: '#FF9500',
  },
  doneText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  batchText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  equalsText: { color: '#fff', fontSize: 22 },
  // 标签栏样式
  tagBar: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.divider,
  },
  tagContent: { gap: 8, alignItems: 'center' },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
  },
  tagChipActive: {
    backgroundColor: COLORS.primary,
  },
  tagText: { fontSize: 13, color: COLORS.text },
  tagTextActive: { color: '#fff', fontWeight: '600' },
});
