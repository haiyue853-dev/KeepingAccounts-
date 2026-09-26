import React from 'react';
import Svg, { Path, Circle, Rect, Line, G, Ellipse, Polygon } from 'react-native-svg';

type SvgIconProps = { size?: number; color?: string };

// ==================== Logo ====================

// ==================== 收入类图标（金币风格） ====================

/** 金币 — 基础金币图标 */
export function IconCoin({ size = 24, color = '#F5A623' }: SvgIconProps) {
  const s = size, c = color, d = '#FFD447';
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="11" fill={c} />
      <Circle cx="12" cy="12" r="9" fill={d} stroke={c} strokeWidth="0.5" />
      <Path d="M11.2 15.2v.5c0 .2.2.4.4.4h.8c.2 0 .4-.2.4-.4v-.5c.6-.2 1.1-.5 1.4-1 .3-.5.3-1-.1-1.5-.3-.3-.6-.5-1-.6V8.5l.5.2c.3.2.5.5.5.9 0 .2.2.4.4.4h.8c.2 0 .4-.2.4-.4 0-.9-.5-1.6-1.3-2l-.3-.1v-.5c0-.2-.2-.4-.4-.4h-.8c-.2 0-.4.2-.4.4v.5c-.6.1-1.1.4-1.4.9-.3.5-.3 1.1.1 1.5.4.4.8.6 1.3.7v3.8l-.6-.3c-.3-.2-.5-.5-.5-.9 0-.2-.2-.4-.4-.4h-.8c-.2 0-.4.2-.4.4 0 .9.5 1.7 1.4 2.1z" fill={c} />
      <Circle cx="12" cy="12" r="8" fill="none" stroke={c} strokeWidth="0.3" />
    </Svg>
  );
}

/** 金币堆 — 多枚金币叠放 */
export function IconCoinsStack({ size = 24, color = '#F5A623' }: SvgIconProps) {
  const s = size, c = color, d = '#FFD447', b = '#E8960C';
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M5 6a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V6z" fill={b} />
      <Circle cx="12" cy="7" r="4.5" fill={c} />
      <Circle cx="12" cy="7" r="3.5" fill={d} stroke={c} strokeWidth="0.4" />
      <Circle cx="12" cy="14" r="4.5" fill={c} />
      <Circle cx="12" cy="14" r="3.5" fill={d} stroke={c} strokeWidth="0.4" />
      <Circle cx="12" cy="21" r="3.5" fill={c} />
      <Circle cx="12" cy="21" r="2.8" fill={d} stroke={c} strokeWidth="0.4" />
      <Path d="M11.5 15.2v.3c0 .1.1.2.2.2h.6c.1 0 .2-.1.2-.2v-.3c.3-.1.7-.3.9-.6.2-.3.2-.7 0-1-.2-.2-.4-.3-.7-.4V10l.3.1c.2.1.3.3.3.6 0 .1.1.2.2.2h.5c.1 0 .2-.1.2-.2 0-.6-.3-1-.8-1.3l-.2-.1v-.3c0-.1-.1-.2-.2-.2h-.6c-.1 0-.2.1-.2.2v.3c-.4.1-.7.3-.9.6-.2.3-.2.7 0 1 .2.3.5.4.8.5v2.4l-.4-.2c-.2-.1-.3-.3-.3-.6 0-.1-.1-.2-.2-.2h-.5c-.1 0-.2.1-.2.2 0 .6.3 1.1.9 1.3z" fill={b} />
    </Svg>
  );
}

/** 钱袋 */
export function IconMoneyBag({ size = 24, color = '#D4A017' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M7 7h10c1 0 2 1 2 2l-1 11c0 1-1 2-2 2H8c-1 0-2-1-2-2L5 9c0-1 1-2 2-2z" fill={c} />
      <Path d="M7 7h10c1 0 2 1 2 2l-1 11c0 1-1 2-2 2H8c-1 0-2-1-2-2L5 9c0-1 1-2 2-2z" fill="none" stroke="#fff" strokeWidth="0.8" />
      <Path d="M8 7V5c0-2 1-3 4-3s4 1 4 3v2" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="8" y1="7" x2="8" y2="22" stroke={c} strokeWidth="2" />
      <Line x1="16" y1="7" x2="16" y2="22" stroke={c} strokeWidth="2" />
      {/* $ 符号用路径绘制 */}
      <Path d="M9 13l2.5-3 2.5 3v2l-2.5 3-2.5-3z" fill={c} opacity="0.6" />
    </Svg>
  );
}

/** 存钱罐 */
export function IconPiggyBank({ size = 24, color = '#FF8383' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Ellipse cx="10" cy="15" rx="7" ry="6" fill={c} />
      <Circle cx="10" cy="14" r="5" fill="#FFB3B3" />
      <Circle cx="10" cy="14" r="3" fill={c} opacity="0.5" />
      <Circle cx="14" cy="12" r="1.2" fill="#333" />
      <Ellipse cx="4" cy="17" rx="1.5" ry="2.5" fill={c} />
      <Circle cx="9" cy="17" r="0.5" fill="#fff" />
      <Circle cx="11" cy="18" r="0.5" fill="#fff" />
      <Path d="M14 11l3-1" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <Rect x="16" y="8" width="2" height="2" rx="0.5" fill="#F5A623" />
    </Svg>
  );
}

/** 红包 */
export function IconRedEnvelope({ size = 24, color = '#E74C3C' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Rect x="3" y="6" width="18" height="14" rx="2" fill={c} />
      <Rect x="3" y="6" width="18" height="6" rx="2" fill="#C0392B" />
      <Rect x="3" y="9" width="18" height="3" fill="#E74C3C" />
      <Circle cx="12" cy="12" r="4" fill="#FFD447" />
      <Path d="M12 8v8M8 12h8" stroke="#E74C3C" strokeWidth="1" />
    </Svg>
  );
}

/** 工资卡 */
export function IconSalaryCard({ size = 24, color = '#3498DB' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Rect x="2" y="5" width="20" height="14" rx="2.5" fill={c} />
      <Rect x="2" y="5" width="20" height="5" rx="2.5" fill="#2980B9" />
      <Rect x="2" y="10" width="20" height="9" rx="2.5" fill={c} />
      <Circle cx="18" cy="15" r="1.5" fill="#FFD447" />
      <Rect x="4" y="13" width="10" height="2" rx="1" fill="#fff" opacity="0.5" />
      <Rect x="4" y="17" width="7" height="2" rx="1" fill="#fff" opacity="0.3" />
    </Svg>
  );
}

/** 上升趋势 */
export function IconTrendUp({ size = 24, color = '#27AE60' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Line x1="4" y1="20" x2="20" y2="4" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Path d="M12 4h8v8" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="20" cy="4" r="1.5" fill={c} />
    </Svg>
  );
}

/** 礼物 */
export function IconGiftBox({ size = 24, color = '#E67E22' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Rect x="3" y="8" width="18" height="13" rx="1" fill={c} />
      <Rect x="3" y="8" width="18" height="4" fill="#D35400" />
      <Line x1="12" y1="8" x2="12" y2="21" stroke="#D35400" strokeWidth="1" />
      <Path d="M12 8V5c0-1.5-1-3-2.5-3S8 3.5 8 5v1" stroke={c} strokeWidth="1.5" fill="none" />
      <Path d="M12 8V5c0-1.5 1-3 2.5-3S16 3.5 16 5v1" stroke={c} strokeWidth="1.5" fill="none" />
      <Path d="M9 8l3-3 3 3" fill={c} />
    </Svg>
  );
}

/** 收款 — 手接金币 */
export function IconHandReceive({ size = 24, color = '#F5A623' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M12 3v10M10 6l2-3 2 3" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="3" r="2" fill={c} />
      <Circle cx="12" cy="12" r="5" fill="#FFD447" stroke={c} strokeWidth="0.5" />
      <Path d="M12 10v4M10 12h4" stroke={c} strokeWidth="1" />
    </Svg>
  );
}

/** 奖金／奖杯 */
export function IconTrophyGold({ size = 24, color = '#F1C40F' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M7 3h10v4c0 3-2 5-5 5s-5-2-5-5V3z" fill={c} />
      <Path d="M5 5H3c-1 0-1 1-1 2s1 3 3 3" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M19 5h2c1 0 1 1 1 2s-1 3-3 3" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Rect x="9" y="12" width="6" height="3" rx="1" fill="#D4A017" />
      <Circle cx="12" cy="15" r="2" fill="#E8C547" />
      <Path d="M8 17l1 4h6l1-4" fill={c} />
    </Svg>
  );
}

// ==================== 支出类图标 ====================

/** 餐饮碗筷 */
export function IconDining({ size = 24, color = '#E67E22' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Ellipse cx="12" cy="16" rx="6" ry="2" fill={c} />
      <Path d="M6 16V10c0-3 2-6 6-6s6 3 6 6v6" fill="none" stroke={c} strokeWidth="2" />
      <Path d="M8 8l4-2 4 2" stroke={c} strokeWidth="1.2" fill="none" />
      <Circle cx="12" cy="10" r="4" fill="#FDEBD0" stroke={c} strokeWidth="0.3" />
    </Svg>
  );
}

/** 购物袋 */
export function IconShoppingBag({ size = 24, color = '#8E44AD' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M5 9h14l-2 13H7L5 9z" fill={c} />
      <Path d="M9 9V7c0-2 1-3 3-3s3 1 3 3v2" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Path d="M5 9h14l-2 13H7L5 9z" fill="none" stroke="#fff" strokeWidth="0.5" />
    </Svg>
  );
}

/** 汽车 */
export function IconCar({ size = 24, color = '#5D6D7E' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M4 13l2-4h12l2 4v4c0 1-1 2-2 2h-1c-1 0-2-1-2-2v-1H9v1c0 1-1 2-2 2H6c-1 0-2-1-2-2v-4z" fill={c} />
      <Rect x="3" y="13" width="18" height="3" rx="1" fill="#46637F" />
      <Circle cx="7" cy="17" r="1.5" fill="#333" />
      <Circle cx="17" cy="17" r="1.5" fill="#333" />
      <Rect x="5" y="10" width="4" height="2" rx="0.5" fill="#A8D8EA" />
      <Rect x="15" y="10" width="4" height="2" rx="0.5" fill="#A8D8EA" />
    </Svg>
  );
}

/** 居家 */
export function IconHome({ size = 24, color = '#E74C3C' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M3 12L12 3l9 9" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 10v11h14V10" fill={c} />
      <Rect x="9" y="16" width="6" height="5" fill="#C0392B" />
      <Rect x="19" y="10" width="2" height="8" fill="#C0392B" opacity="0.5" />
    </Svg>
  );
}

/** 医疗十字 */
export function IconMedical({ size = 24, color = '#E74C3C' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Rect x="2" y="6" width="20" height="12" rx="2" fill="#fff" stroke={c} strokeWidth="2" />
      <Line x1="12" y1="8" x2="12" y2="16" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="8" y1="12" x2="16" y2="12" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

/** 书籍教育 */
export function IconBook({ size = 24, color = '#2980B9' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M4 4h6l2 2 2-2h6v16h-6l-2 2-2-2H4V4z" fill={c} />
      <Path d="M4 4h6l2 2 2-2h6v16h-6l-2 2-2-2H4V4z" fill="none" stroke="#fff" strokeWidth="0.8" />
      <Line x1="9" y1="8" x2="15" y2="8" stroke="#fff" strokeWidth="0.6" />
      <Line x1="9" y1="11" x2="15" y2="11" stroke="#fff" strokeWidth="0.6" />
      <Line x1="9" y1="14" x2="13" y2="14" stroke="#fff" strokeWidth="0.6" />
    </Svg>
  );
}

/** 电影票 */
export function IconMovieTicket({ size = 24, color = '#9B59B6' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Rect x="3" y="4" width="18" height="16" rx="1" fill={c} />
      <Circle cx="5" cy="8" r="1" fill="#fff" />
      <Circle cx="5" cy="16" r="1" fill="#fff" />
      <Line x1="5" y1="5" x2="5" y2="7" stroke="#fff" strokeWidth="1" />
      <Line x1="5" y1="9" x2="5" y2="15" stroke="#fff" strokeWidth="1" />
      <Line x1="5" y1="17" x2="5" y2="19" stroke="#fff" strokeWidth="1" />
      <Polygon points="10,7 14,12 10,17 18,17 18,7" fill="#fff" opacity="0.9" />
    </Svg>
  );
}

/** 数码 — 手机 */
export function IconDevice({ size = 24, color = '#2C3E50' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Rect x="5" y="2" width="14" height="20" rx="3" fill={c} />
      <Rect x="7" y="4" width="10" height="14" rx="1" fill="#5DADE2" />
      <Circle cx="12" cy="20" r="1" fill="#5DADE2" />
      <Line x1="10" y1="7" x2="14" y2="7" stroke="#fff" strokeWidth="0.5" />
      <Line x1="10" y1="10" x2="14" y2="10" stroke="#fff" strokeWidth="0.5" />
      <Line x1="10" y1="13" x2="13" y2="13" stroke="#fff" strokeWidth="0.5" />
    </Svg>
  );
}

/** 服饰 */
export function IconClothing({ size = 24, color = '#16A085' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M12 3l4 4v3H8V7l4-4z" fill={c} />
      <Path d="M8 10l-4 2v2l4-1v10h8V13l4 1v-2l-4-2" fill={c} />
      <Path d="M8 10l-4 2v2l4-1v10h8V13l4 1v-2l-4-2" fill="none" stroke="#fff" strokeWidth="0.6" />
      <Line x1="12" y1="3" x2="12" y2="21" stroke="#fff" strokeWidth="0.6" opacity="0.3" />
    </Svg>
  );
}

/** 交通巴士 */
export function IconBus({ size = 24, color = '#2980B9' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Rect x="3" y="6" width="18" height="12" rx="2" fill={c} />
      <Rect x="2" y="9" width="3" height="4" rx="0.5" fill="#D4E6F1" />
      <Rect x="19" y="9" width="3" height="4" rx="0.5" fill="#D4E6F1" />
      <Rect x="6" y="4" width="12" height="4" rx="1.5" fill="#3498DB" />
      <Circle cx="7" cy="18" r="1.5" fill="#333" />
      <Circle cx="17" cy="18" r="1.5" fill="#333" />
      <Rect x="8" y="8" width="2" height="4" rx="0.5" fill="#D4E6F1" />
      <Rect x="11" y="8" width="2" height="4" rx="0.5" fill="#D4E6F1" />
      <Rect x="14" y="8" width="2" height="4" rx="0.5" fill="#D4E6F1" />
    </Svg>
  );
}

// ==================== 通用图标 ====================

/** 星标 */
export function IconStar({ size = 24, color = '#F1C40F' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3 1.2-6.8-5-4.9 6.9-1L12 2z" fill={c} />
    </Svg>
  );
}

/** 爱心 */
export function IconHeart({ size = 24, color = '#E74C3C' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={c} />
    </Svg>
  );
}

/** 钻石 */
export function IconDiamond({ size = 24, color = '#3498DB' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M12 2L3 10l9 12 9-12L12 2z" fill={c} />
      <Path d="M3 10l9 12 9-12H3z" fill="#5DADE2" opacity="0.5" />
      <Path d="M12 2L3 10h18L12 2z" fill="#85C1E9" />
    </Svg>
  );
}

/** 皇冠 */
export function IconCrown({ size = 24, color = '#F39C12' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M3 18h18v2H3v-2zM4 10l4 6h8l4-6-4 2-4-7-4 7-4-2z" fill={c} />
      <Circle cx="4" cy="10" r="1.5" fill={c} />
      <Circle cx="20" cy="10" r="1.5" fill={c} />
      <Circle cx="12" cy="5" r="1.5" fill={c} />
    </Svg>
  );
}

/** 火焰 */
export function IconFlame({ size = 24, color = '#E67E22' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M12 22c-3.3 0-6-2.7-6-6 0-2.5 1.5-5 3-7 1.3 1.8 1.6 3.5 2 5 .2.7.4 1.4 1 2 1-1 3-3 3-6 0-3-3-8-3-8s6 5 6 9c0 2.8-1.7 5-4 5.5.3-.5.5-1 .5-1.5 0-1-1-2-2-2s-2 1-3 2c-.3.4-.5 1-.5 1.5 0 2.2 1.8 4 4 4s2.5-.8 3-2h2.5c-.7 2.7-3.2 4.5-5.5 4.5z" fill={c} />
    </Svg>
  );
}

/** 日历 */
export function IconCalendar({ size = 24, color = '#E67E22' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Rect x="3" y="4" width="18" height="18" rx="2" fill="#fff" stroke={c} strokeWidth="2" />
      <Path d="M3 9h18" stroke={c} strokeWidth="2" />
      <Line x1="8" y1="2" x2="8" y2="6" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="16" y1="2" x2="16" y2="6" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Rect x="7" y="12" width="3" height="3" rx="0.5" fill={c} />
      <Rect x="14" y="16" width="3" height="3" rx="0.5" fill={c} />
    </Svg>
  );
}

/** 时钟 */
export function IconClock({ size = 24, color = '#7F8C8D' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10" fill="#fff" stroke={c} strokeWidth="2" />
      <Line x1="12" y1="6" x2="12" y2="12" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="12" y1="12" x2="16" y2="14" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="12" cy="12" r="1" fill={c} />
    </Svg>
  );
}

/** 文件夹 */
export function IconFolder({ size = 24, color = '#F39C12' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M2 6h8l2 2h10v11H2V6z" fill={c} />
      <Path d="M2 8h20" stroke="#E67E22" strokeWidth="1" />
    </Svg>
  );
}

/** 灯泡 */
export function IconBulb({ size = 24, color = '#F1C40F' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M10 18h4v2h-4v-2zM10 20h4" stroke={c} strokeWidth="1.2" />
      <Path d="M12 3a7 7 0 0 0-3 13.3V17h6v-.7A7 7 0 0 0 12 3z" fill={c} />
      <Path d="M12 3a7 7 0 0 0-3 13.3V17h6v-.7A7 7 0 0 0 12 3z" fill="none" stroke="#E67E22" strokeWidth="0.8" />
    </Svg>
  );
}

/** 旗帜 */
export function IconFlag({ size = 24, color = '#E74C3C' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Line x1="5" y1="3" x2="5" y2="22" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Path d="M5 3h12l-3 5 3 5H5" fill={c} />
    </Svg>
  );
}

/** 标签 */
export function IconTag({ size = 24, color = '#3498DB' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M3 3h9l9 9-9 9L3 12V3z" fill={c} />
      <Circle cx="7" cy="7" r="1.5" fill="#fff" />
    </Svg>
  );
}

/** 靶心 */
export function IconTarget({ size = 24, color = '#E74C3C' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="11" fill="none" stroke={c} strokeWidth="2" />
      <Circle cx="12" cy="12" r="6" fill="none" stroke={c} strokeWidth="1.5" />
      <Circle cx="12" cy="12" r="2" fill={c} />
    </Svg>
  );
}

/** 火箭 */
export function IconRocket({ size = 24, color = '#9B59B6' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M12 2s-4 5-4 10c0 2 1 4 2 5l2 5 2-5c1-1 2-3 2-5 0-5-4-10-4-10z" fill={c} />
      <Path d="M8 12l-5 2 3 4 3-1M16 12l5 2-3 4-3-1" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Circle cx="12" cy="9" r="2" fill="#fff" opacity="0.7" />
    </Svg>
  );
}

/** 设置齿轮 */
export function IconSettings({ size = 24, color = '#7F8C8D' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="4" fill="none" stroke={c} strokeWidth="2" />
      <G stroke={c} strokeWidth="2" strokeLinecap="round">
        <Line x1="12" y1="2" x2="12" y2="6" />
        <Line x1="12" y1="18" x2="12" y2="22" />
        <Line x1="2" y1="12" x2="6" y2="12" />
        <Line x1="18" y1="12" x2="22" y2="12" />
        <Line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
        <Line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
        <Line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
        <Line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
      </G>
    </Svg>
  );
}

/** 返回/退款箭头 */
export function IconRefund({ size = 24, color = '#27AE60' }: SvgIconProps) {
  const s = size, c = color;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M4 8l-3 4 3 4" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M1 12h14c3 0 5 2 5 5s-2 5-5 5" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// ==================== 图标注册表 ====================

export interface SvgIconDef {
  key: string;
  label: string;
  component: React.FC<SvgIconProps>;
  category: 'income' | 'expense' | 'general';
}

export const SVG_ICONS: SvgIconDef[] = [
  // 收入
  { key: 'svg:coin', label: '金币', component: IconCoin, category: 'income' },
  { key: 'svg:coins-stack', label: '金币堆', component: IconCoinsStack, category: 'income' },
  { key: 'svg:money-bag', label: '钱袋', component: IconMoneyBag, category: 'income' },
  { key: 'svg:piggy-bank', label: '存钱罐', component: IconPiggyBank, category: 'income' },
  { key: 'svg:red-envelope', label: '红包', component: IconRedEnvelope, category: 'income' },
  { key: 'svg:salary-card', label: '工资卡', component: IconSalaryCard, category: 'income' },
  { key: 'svg:trend-up', label: '上涨', component: IconTrendUp, category: 'income' },
  { key: 'svg:gift-box', label: '礼物', component: IconGiftBox, category: 'income' },
  { key: 'svg:hand-receive', label: '收款', component: IconHandReceive, category: 'income' },
  { key: 'svg:trophy-gold', label: '奖金', component: IconTrophyGold, category: 'income' },
  // 支出
  { key: 'svg:dining', label: '餐饮', component: IconDining, category: 'expense' },
  { key: 'svg:shopping-bag', label: '购物', component: IconShoppingBag, category: 'expense' },
  { key: 'svg:car', label: '汽车', component: IconCar, category: 'expense' },
  { key: 'svg:home', label: '居住', component: IconHome, category: 'expense' },
  { key: 'svg:medical', label: '医疗', component: IconMedical, category: 'expense' },
  { key: 'svg:book', label: '教育', component: IconBook, category: 'expense' },
  { key: 'svg:movie-ticket', label: '娱乐', component: IconMovieTicket, category: 'expense' },
  { key: 'svg:device', label: '数码', component: IconDevice, category: 'expense' },
  { key: 'svg:clothing', label: '服饰', component: IconClothing, category: 'expense' },
  { key: 'svg:bus', label: '交通', component: IconBus, category: 'expense' },
  // 通用
  { key: 'svg:star', label: '星标', component: IconStar, category: 'general' },
  { key: 'svg:heart', label: '爱心', component: IconHeart, category: 'general' },
  { key: 'svg:diamond', label: '钻石', component: IconDiamond, category: 'general' },
  { key: 'svg:crown', label: '皇冠', component: IconCrown, category: 'general' },
  { key: 'svg:flame', label: '热门', component: IconFlame, category: 'general' },
  { key: 'svg:calendar', label: '日历', component: IconCalendar, category: 'general' },
  { key: 'svg:clock', label: '时间', component: IconClock, category: 'general' },
  { key: 'svg:folder', label: '文件夹', component: IconFolder, category: 'general' },
  { key: 'svg:bulb', label: '灯泡', component: IconBulb, category: 'general' },
  { key: 'svg:flag', label: '旗帜', component: IconFlag, category: 'general' },
  { key: 'svg:tag', label: '标签', component: IconTag, category: 'general' },
  { key: 'svg:target', label: '目标', component: IconTarget, category: 'general' },
  { key: 'svg:rocket', label: '火箭', component: IconRocket, category: 'general' },
  { key: 'svg:settings', label: '设置', component: IconSettings, category: 'general' },
  { key: 'svg:refund', label: '退款', component: IconRefund, category: 'general' },
];

export function renderSvgIcon(iconKey: string, size: number, color: string): React.ReactNode {
  const def = SVG_ICONS.find((d) => d.key === iconKey);
  if (!def) return null;
  const Comp = def.component;
  return <Comp size={size} color={color} />;
}

export const SVG_ICON_KEYS = SVG_ICONS.map((d) => d.key);
