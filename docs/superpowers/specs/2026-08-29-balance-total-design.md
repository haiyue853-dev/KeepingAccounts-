# 余额总计模块设计

**版本**: v1.3.0 规划
**日期**: 2026-08-29

## 目标

让用户能直观看到"我手上还剩多少现金"（手输起始余额 + 后续交易自动加减）。

## 核心决策

| 决策点 | 选择 |
|---|---|
| 计算方式 | 手动设起始余额 + 后续交易自动累加 |
| 显示位置 | 只在「我的 → 资产管理」页面（不暴露到首页） |
| 账本范围 | 全 App 一个总余额（不按账本分） |
| 存储方式 | 新建 `app_settings` 表（key-value） |
| 页面内容 | 大数字 + 公式 + 重设按钮 |

## 数据层

### 新增表 `app_settings`
```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);
```

存 `('initial_balance', '5000.00', '...')`。

### 新增 Repository `src/repositories/SettingsRepo.ts`
- `getInitialBalance(): Promise<number | null>` — 无值返回 `null`
- `setInitialBalance(amount: number): Promise<void>` — `INSERT OR REPLACE`

### 新增 `TransactionRepo.getGlobalTotals()`
不带 `book_id` 过滤，SQL 复用现有 `netExpenseSql`：
```typescript
{ income: number, expense: number }
```

### 最终余额公式
```
remaining = initial_balance + income - expense
```

## UI 层

### 新增页面 `src/screens/AssetScreen.tsx`
- 顶部黄色 header（圆角 24 + 猫咪吉祥物，参考 `ProfileScreen`）
- header 里大字「剩余金额」+ 48px 数字（千分位 + 两位小数）
- 中间白色圆角卡片（`SHADOWS.card`）放一行公式：
  ```
  起始 ¥5,000.00 + 收入 ¥3,200.00 − 支出 ¥1,500.00 = 剩余 ¥6,700.00
  ```
- 底部「重设/设置起始余额」按钮（白底圆角）
- 首次进入（`initial_balance == null`）显示引导占位

### 入口集成
- `ProfileScreen.tsx` 第 13 行 `资产管理` 入口的 `screen: null` → `'Asset'`
- `AppNavigator.tsx` `Stack.Navigator` 注册 `Asset` 页面（`headerShown: false`）

### 主题
- 颜色只用 `COLORS` 常量；收入色如无 `COLORS.income` 则新增
- 圆角 18、阴影 `SHADOWS.card`、字体大小/粗细参考 `ProfileScreen` 与 `HomeScreen`

## 更新与刷新

- `AssetScreen` 用 `useFocusEffect` 在每次进入焦点时重算余额
- 不引入全局 Context / 事件总线（YAGNI）
- 起始余额保存后，导航 pop 回 → useFocusEffect 自然触发刷新

## 边界情况

| 场景 | 行为 |
|---|---|
| `initial_balance == null` | 大数字显示「¥ --」+ 引导文案；按钮文案变「设置起始金额」 |
| 起始余额 0 | 正常显示（剩余可负数） |
| 重设起始余额 | 弹 `ThemedAlert` 确认「重设后余额从新值开始」 |
| 数据库读取失败 | try/catch + 下拉刷新 `RefreshControl` |
| 多账本 | 不影响，全 App 算 |

## 涉及文件

- 新增：`src/repositories/SettingsRepo.ts`
- 新增：`src/screens/AssetScreen.tsx`
- 修改：`src/db/database.ts`（建表 + schema 迁移）
- 修改：`src/repositories/TransactionRepo.ts`（新增 `getGlobalTotals`）
- 修改：`src/screens/ProfileScreen.tsx`（改 `screen: 'Asset'`）
- 修改：`src/navigation/AppNavigator.tsx`（注册路由）
- 修改：`src/utils/formatters.ts`（如无 `formatAmount` 则加千分位格式化）
- 修改：`src/utils/constants.ts`（如无 `COLORS.income` 则加）
