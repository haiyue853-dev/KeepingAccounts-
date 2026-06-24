import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Linking, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, MASCOTS, SHADOWS } from '../utils/constants';

const APP_VERSION = '1.1.0';

const UPDATE_LOG = [
  {
    version: '1.1.0',
    date: '2026-06-24',
    changes: [
      '新增时间戳显示（24小时制）',
      '新增批量记账功能（保存并再记一笔）',
      '图表时间选择器不显示未来时间',
      '修复编辑账单无法切换收支类型',
      '常用标签自动按使用频率排序',
      '修复备注输入框第一次点击不弹出键盘',
    ],
  },
];

const MENU_ITEMS = [
  { icon: 'pricetag-outline' as const, label: '分类管理', screen: 'Category' },
  { icon: 'wallet-outline' as const, label: '预算管理', screen: 'Budget' },
  { icon: 'briefcase-outline' as const, label: '资产管理', screen: null },
  { icon: 'swap-horizontal-outline' as const, label: '导入导出', screen: 'ImportExport' },
  { icon: 'cloud-upload-outline' as const, label: '数据备份', screen: null },
  { icon: 'settings-outline' as const, label: '设置', screen: 'Settings' },
];

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: (insets.top || 24) + 10 }]}>
        <View style={styles.profileRow}>
          <Image source={MASCOTS.avatar} style={styles.avatar} resizeMode="contain" />
          <View style={styles.userInfo}>
            <Text style={styles.username}>铲屎官</Text>
            <Text style={styles.subtitle}>喵喵理财中级用户</Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.menuList}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, index === MENU_ITEMS.length - 1 && styles.menuItemLast]}
              onPress={() => {
                if (item.screen) {
                  navigation.navigate(item.screen);
                } else {
                  Alert.alert('提示', '功能开发中');
                }
              }}
              activeOpacity={0.75}
            >
              <View style={styles.menuIconWrap}>
                <Ionicons name={item.icon} size={19} color={COLORS.text} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={17} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* 关于 */}
        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>关于哈基咪记账</Text>
          <Text style={styles.aboutVersion}>版本 {APP_VERSION}</Text>
          <Text style={styles.aboutText}>一款可爱猫咪主题的记账应用 🐱</Text>
          <TouchableOpacity
            style={styles.emailRow}
            onPress={() => Linking.openURL('mailto:hibozeng@qq.com')}
          >
            <Ionicons name="mail-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.emailText}>hibozeng@qq.com</Text>
          </TouchableOpacity>
          <Text style={styles.aboutHint}>如有问题或建议，欢迎发送邮件反馈</Text>
        </View>

        {/* 更新日志 */}
        <View style={styles.updateSection}>
          <Text style={styles.updateTitle}>📝 更新日志</Text>
          {UPDATE_LOG.map((log) => (
            <View key={log.version} style={styles.updateItem}>
              <View style={styles.updateHeader}>
                <Text style={styles.updateVersion}>v{log.version}</Text>
                <Text style={styles.updateDate}>{log.date}</Text>
              </View>
              {log.changes.map((change, index) => (
                <View key={index} style={styles.changeRow}>
                  <Text style={styles.changeDot}>•</Text>
                  <Text style={styles.changeText}>{change}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF8DF',
    marginRight: 12,
  },
  userInfo: { flex: 1 },
  username: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontWeight: '600' },
  menuList: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF5D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '700' },
  aboutSection: {
    marginHorizontal: 16,
    marginTop: 32,
    marginBottom: 32,
    padding: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  aboutTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  aboutVersion: { fontSize: 12, color: COLORS.textLight, marginBottom: 8 },
  aboutText: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF5D6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 6,
  },
  emailText: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  aboutHint: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  updateSection: {
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    ...SHADOWS.card,
  },
  updateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  updateItem: {
    marginBottom: 16,
  },
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  updateVersion: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  updateDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingLeft: 4,
  },
  changeDot: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginRight: 8,
    marginTop: 2,
  },
  changeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});
