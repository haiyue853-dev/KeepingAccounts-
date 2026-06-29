import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Keyboard, Animated, Platform, Dimensions, Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

const NUM_ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['.', '0', '⌫'],
];
const OP_ROW = ['+', '-', '×', '÷'];

interface TransactionInputPanelProps {
  // 金额相关
  amount: string;
  onAmountChange: (amount: string) => void;
  // 备注相关
  note: string;
  onNoteChange: (note: string) => void;
  // 日期相关
  date: string;
  isToday: boolean;
  onDatePress: () => void;
  // 推荐标签
  frequentNotes: string[];
  // 计算器状态
  prevValue: number | null;
  pendingOp: string | null;
  freshOp: boolean;
  // 计算器操作
  onKey: (key: string) => void;
  onOp: (op: string) => void;
  onEquals: () => void;
  // 保存操作
  onSave: () => void;
  onBatchSave: () => void;
  // 构建提示
  buildHint: () => string | null;
  // 动画值
  amountScale: Animated.Value;
  keyboardAnim: Animated.Value;
  overlayAnim: Animated.Value;
  // 键盘相关
  noteFocused: boolean;
  onNoteFocus: () => void;
  onNoteBlur: () => void;
  dismissNote: () => void;
  keyboardHeight: number;
  // 安全区域
  insetsBottom: number;
}

export default function TransactionInputPanel({
  amount,
  onAmountChange,
  note,
  onNoteChange,
  date,
  isToday,
  onDatePress,
  frequentNotes,
  prevValue,
  pendingOp,
  freshOp,
  onKey,
  onOp,
  onEquals,
  onSave,
  onBatchSave,
  buildHint,
  amountScale,
  keyboardAnim,
  overlayAnim,
  noteFocused,
  onNoteFocus,
  onNoteBlur,
  dismissNote,
  keyboardHeight,
  insetsBottom,
}: TransactionInputPanelProps) {
  // ⚠️ 关键代码锁（受 PROJECT_NOTES.md #3 保护 - Lock-1）
  // 不要加 maxHeight 限制！否则在小屏设备上 keyboard 会被 overflow:hidden 裁掉
  // 包括底部白色安全区 View，导致虚拟按键遮住键盘
  // 让 container 高度由内容自然决定
  const noteInputRef = useRef<TextInput>(null);

  return (
    <View style={[styles.container]}>
      {/* 金额显示 + 备注/日期栏 */}
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
                if (text.length <= 50) onNoteChange(text);
              }}
              placeholder="添加备注"
              placeholderTextColor={COLORS.textLight}
              onFocus={onNoteFocus}
              returnKeyType="done"
              blurOnSubmit
              maxLength={50}
            />
            {note.length > 0 && (
              <>
                <Text style={styles.noteCount}>{note.length}/50</Text>
                <TouchableOpacity onPress={() => onNoteChange('')} style={styles.noteClear}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
                </TouchableOpacity>
              </>
            )}
          </View>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => { dismissNote(); onDatePress(); }}
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
              pointerEvents: noteFocused && (frequentNotes.length > 0 || !!note.trim()) ? 'auto' : 'none',
            },
          ]}
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
                  onNoteChange(fn);
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
                onPress={() => onNoteChange(fn)}
              >
                <Text style={[styles.tagText, note === fn && styles.tagTextActive]}>{fn}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 数字键盘 */}
      <Animated.View
        style={[
          styles.keyboard,
          {
            // ⚠️ 关键代码锁（受 PROJECT_NOTES.md #3 保护 - Lock-1）
            // 收起状态高度 = 0（完全收起，不占位空间，避免大块空白）
            // 展开状态高度 = 222 + insetsBottom（精确等于内容高度，无顶部空白）
            //   组成: opRow 38px + numArea 184px + 底部白底 insetsBottom = 222 + insetsBottom
            // Web 平台额外增加 8px 缓冲，防止浏览器渲染差异导致底部按键被截断
            // 禁止修改：除非更新 PROJECT_NOTES.md 并记录原因
            // 参考文档：PROJECT_NOTES.md #3 虚拟按键遮挡记账菜单 + 键盘收起空白
            // 背景色由 styles.keyboard 提供 = '#ECECEC'，禁止用 inline 覆盖为白色
            height: keyboardAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 222 + (insetsBottom || 0) + (Platform.OS === 'web' ? 8 : 0)],
            }),
            opacity: keyboardAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            }),
            overflow: 'hidden',
            pointerEvents: 'auto',
          },
        ]}
      >
        {noteFocused ? null : (
          // 完整数字键盘
          <>
            <View style={styles.opRow}>
              {OP_ROW.map((op) => (
                <TouchableOpacity key={op} style={styles.opBtn} onPress={() => onOp(op)}>
                  <Text style={styles.opText}>{op}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.numArea}>
              <View style={styles.numGrid}>
                {NUM_ROWS.map((row, ri) => (
                  <View key={ri} style={styles.numRow}>
                    {row.map((key) => (
                      <TouchableOpacity key={key} style={styles.numBtn} onPress={() => onKey(key)} activeOpacity={0.6}>
                        <Text style={[styles.numText, key === '⌫' && styles.delText]}>{key}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
              <View style={styles.doneBtnWrap}>
                {prevValue !== null && pendingOp && !freshOp ? (
                  // 有两个数字时显示"="
                  <>
                    <TouchableOpacity
                      style={[styles.doneBtn, styles.equalsBtn]}
                      onPress={onEquals}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.equalsText}>=</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  // 只有一个数字或刚按运算符时显示"保存"
                  <>
                    <TouchableOpacity
                      style={styles.doneBtn}
                      onPress={onSave}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.doneText}>保存</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.batchBtn}
                      onPress={onBatchSave}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.batchText}>保存并再记一笔</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
            {/* 底部安全区域：适配虚拟按键 */}
            <View style={{ height: insetsBottom || 0, backgroundColor: '#FFFFFF' }} />
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
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
  keyboard: { backgroundColor: '#ECECEC', paddingBottom: 0 },
  // 键盘底部安全区域撑高
  keyboardSafeArea: {
    backgroundColor: '#FFFFFF',
    height: 0,  // ⚠️ 锁 Lock-1 - 高度由调用处 insetsBottom 动态赋值
  },
  keyboardSwitchBar: {
    height: 80,
    backgroundColor: '#FFFFFF',
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

  // 标签栏
  tagBar: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.divider,
  },
  tagContent: { gap: 6, alignItems: 'center' },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
  },
  tagChipActive: {
    backgroundColor: COLORS.primary,
  },
  tagText: { fontSize: 11, color: COLORS.textSecondary },
  tagTextActive: { color: '#fff', fontWeight: '600' },
});
