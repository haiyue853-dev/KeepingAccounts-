import { StyleSheet } from 'react-native';

export const COLORS = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  onPrimary: '#FFFFFF',
  accent: '#2563EB',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  cardBg: '#F9FAFB',
  text: '#111827',
  textSecondary: '#374151',
  textLight: '#6B7280',
  border: '#D1D5DB',
  divider: '#E5E7EB',
  income: '#16A34A',
  expense: '#111827',
  danger: '#DC2626',
  warning: '#D97706',
  chartBlue: '#2563EB',
  chartMint: '#16A34A',
};

export const SHADOWS = {
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 1,
  },
  floating: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
};

export const CHART_COLORS = [
  '#2563EB', '#16A34A', '#D97706', '#475569', '#0F766E',
  '#4F46E5', '#6B7280', '#1D4ED8', '#15803D', '#B45309',
  '#64748B', '#0D9488', '#4338CA', '#334155', '#0369A1', '#713F12',
];

export const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

// 分类图标映射（线性简约风格用 emoji 代替，后续可替换为 SVG）
export const CATEGORY_ICONS: Record<string, string> = {
  '餐饮': '🍜',
  '购物': '🛒',
  '日用': '🧴',
  '交通': '🚗',
  '蔬菜': '🥬',
  '水果': '🍎',
  '零食': '🍪',
  '运动': '⚽',
  '娱乐': '🎮',
  '居住': '🏠',
  '医疗': '💊',
  '教育': '📚',
  '通讯': '📱',
  '服饰': '👔',
  '美容': '💅',
  '社交': '🤝',
  '宠物': '🐱',
  '旅行': '✈️',
  '数码': '💻',
  '汽车': '⛽',
  '烟酒': '🚬',
  '工资': '💰',
  '奖金': '🎁',
  '理财': '📈',
  '兼职': '💼',
  '红包': '🧧',
  '报销': '🧾',
  '租金': '🏢',
  '利息': '🏦',
  '退款': '↩️',
  '其他': '📦',
};
