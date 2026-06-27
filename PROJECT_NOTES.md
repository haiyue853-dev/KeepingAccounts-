# 记账应用项目注意事项

## 项目概述

这是一个基于 React Native + Expo 开发的记账应用，支持 Android 平台本地打包。

**技术栈：**
- React Native 0.85.3
- Expo 56.0.11
- React Navigation 7.x
- expo-sqlite（SQLite 数据库）

---

## 版本历史

| 版本 | 提交哈希 | 日期 | 主要更新 |
|------|----------|------|----------|
| v1.2.2 | 1d1b132 | 2026-06-27 | 键盘区域优化、标签栏布局调整、编辑页面滚动修复 |
| v1.2.1 | 8f1cdfb | 2026-06-27 | Web平台兼容性优化、APK体积优化、底部标签栏样式优化 |
| v1.2.0 | 9a920c9 | 2026-06-27 | 语音记账日期识别增强、记账键盘优化、折线图样式优化 |
| v1.1.3 | a2142ea | 2026-06-27 | 移除常用标签模块，解决标签选择问题 |
| v1.1.2 | 7f86a0c | 2026-06-27 | 标签按分类显示、修复标签选择问题、移除金额点击回到数字键盘 |
| v1.1.0 | 67a3ee5 | 2026-06-27 | 时间戳显示、批量记账、图表时间限制、编辑账单修复、常用标签优化、键盘弹出修复 |

---

## 已知 Bug 和修复方案

### 1. Tab 导航强制跳转明细页

**问题描述：** 点击任何 Tab 页面都会强制跳转到明细页（Home），无法正常切换其他页面。

**原因：** 使用了自定义的 `SilentTabBarButton` 组件，没有正确转发 React Navigation 的点击事件和状态。

**修复方案：** 移除自定义的 `tabBarButton`，使用 React Navigation 默认实现，或者为每个 Tab 单独配置 `tabBarButton`，使用 `TouchableOpacity` 确保事件正确处理。

**相关文件：**
- `src/navigation/AppNavigator.tsx`

**参考提交：** `678f807 fix: 修复Tab导航强制跳转明细页问题`

---

### 2. 数据库 VFS 状态错误导致白屏

**问题描述：** 应用启动后白屏，日志显示 "Invalid VFS state" 错误，无法加载分类和常用备注。

**原因：** expo-sqlite 在某些情况下数据库连接会失效，但全局单例仍持有无效连接引用。

**修复方案：** 在 `getDatabase()` 函数中添加连接有效性检查，使用 `SELECT 1` 测试连接是否正常，若失败则重置连接并重新初始化。同时添加初始化 Promise 锁防止并发初始化。

**相关文件：**
- `src/db/database.ts`
- `App.tsx`（添加全局初始化和错误处理）

**关键代码：**
```typescript
// database.ts
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    try {
      await db.getFirstAsync('SELECT 1');
      return db;
    } catch {
      db = null;
    }
  }
  // ... 重新初始化逻辑
}
```

---

### 3. 虚拟按键遮挡记账菜单

**问题描述：** 在有虚拟按键的 Android 设备上，记账页面底部的菜单被虚拟按键遮挡，无法完全显示。

**原因：** 键盘区域在收起状态下的高度计算没有包含安全区域底部内边距。

**修复方案：** 在 `TransactionInputPanel.tsx` 中，键盘收起状态的高度也应包含 `insetsBottom`。

**相关文件：**
- `src/components/TransactionInputPanel.tsx`

**关键代码：**
```typescript
height: keyboardAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [50 + (insetsBottom || 0), 280 + (insetsBottom || 0)],
}),
```

**参考提交：** `8b4990d feat: 键盘底部添加安全区域适配虚拟按键`

---

### 4. Tab 按钮涟漪效果

**问题描述：** Android 设备上点击底部 Tab 按钮会出现圆形涟漪效果（Ripple），不符合设计需求。

**原因：** React Navigation 在 Android 上默认使用 `TouchableNativeFeedback`，会产生涟漪效果。

**修复方案：** 为每个 Tab 配置自定义的 `tabBarButton`，使用 `TouchableOpacity` 替代默认实现。

**相关文件：**
- `src/navigation/AppNavigator.tsx`

**关键代码：**
```typescript
tabBarButton: (props) => (
  <TouchableOpacity {...props} activeOpacity={0.7} style={styles.tabBtn} />
),
```

---

### 5. 标签选择问题

**问题描述：** 标签栏（常用备注）选择后状态异常，或导致页面布局错乱。

**原因：** 标签栏展开方向和状态管理逻辑复杂，容易出现冲突。

**修复方案：** 移除常用标签模块，简化页面逻辑。

**参考提交：** `a2142ea v1.1.3: 移除常用标签模块，解决标签选择问题`

---

### 6. 编辑页面滚动动画

**问题描述：** 编辑账单时，页面会自动滚动到选中的分类，但滚动动画不流畅或不符合预期。

**原因：** 使用了 animated scroll 导致动画效果不符合需求。

**修复方案：** 将滚动动画设置为 `animated: false`，直接定位到目标位置。

**关键代码：**
```typescript
categoryScrollRef.current?.scrollTo({ y: targetY, animated: false });
```

---

### 7. 键盘弹出遮挡输入框

**问题描述：** 系统键盘弹出时遮挡备注输入框和其他界面元素。

**原因：** 没有正确处理键盘高度变化和界面布局调整。

**修复方案：** 添加键盘监听，动态调整页面布局，确保输入框可见。

**相关文件：**
- `src/screens/AddTransactionScreen.tsx`

---

## 开发注意事项

### 导航配置

- **Tab Bar 配置：** 所有 Tab 必须使用自定义的 `tabBarButton`，使用 `TouchableOpacity` 避免涟漪效果
- **避免自定义 TabBarButton 组件：** 不要创建单独的 `SilentTabBarButton` 组件，直接在每个 Tab 的 `options` 中配置
- **AddTab 特殊处理：** 中间添加按钮需要使用 `tabPress` listener 的 `preventDefault()` 来阻止默认导航

### 数据库操作

- **连接复用：** 使用全局单例模式管理数据库连接，但必须添加有效性检查
- **初始化顺序：** 在 `App.tsx` 中预初始化数据库，确保应用启动时数据库已就绪
- **错误处理：** 所有数据库操作都需要 try-catch 包裹，避免单个操作失败导致应用崩溃

### Android 平台兼容性

- **安全区域适配：** 所有底部元素（TabBar、键盘、菜单）都必须考虑 `insetsBottom`
- **触摸反馈：** Android 默认会有涟漪效果，需要显式使用 `TouchableOpacity` 替代
- **APK 构建：** 使用 `gradlew.bat assembleRelease` 进行本地构建，需设置 `NODE_ENV=production`

### UI/UX 设计

- **虚拟按键适配：** 在有虚拟按键的设备上，底部元素需要额外的 padding
- **键盘动画：** 自定义键盘和系统键盘切换时需要平滑过渡，避免闪烁
- **备注栏展开：** 备注聚焦时标签栏应向上展开，不要向下推挤内容

---

## 构建流程

### Android 本地构建

```bash
# 1. 确保已初始化 Android 项目
npx expo prebuild --platform android

# 2. 设置环境变量并构建
cd android
$env:NODE_ENV="production"
.\gradlew.bat assembleRelease

# 3. 构建产物位于
# android/app/build/outputs/apk/release/
```

### Debug 模式

```bash
npm run android
```

---

## 目录结构

```
src/
├── components/          # 通用组件
│   ├── AlertProvider.tsx      # 全局弹窗
│   ├── CategoryIcon.tsx       # 分类图标
│   ├── DatePickerWheel.tsx    # 日期选择器
│   └── TransactionInputPanel.tsx  # 记账输入面板（核心）
├── db/
│   └── database.ts      # 数据库初始化和配置
├── models/              # 数据模型
│   ├── Category.ts
│   └── Transaction.ts
├── navigation/
│   └── AppNavigator.tsx # 导航配置（关键文件）
├── repositories/        # 数据访问层
│   ├── AccountBookRepo.ts
│   ├── CategoryRepo.ts
│   └── TransactionRepo.ts
├── screens/             # 页面
│   ├── AddTransactionScreen.tsx  # 添加/编辑交易
│   ├── CategoryScreen.tsx        # 分类管理
│   ├── DiscoverScreen.tsx        # 语音记账
│   ├── HomeScreen.tsx            # 明细首页
│   ├── ProfileScreen.tsx         # 我的页面
│   ├── SettingsScreen.tsx        # 设置
│   └── StatisticsScreen.tsx      # 图表统计
└── utils/
    ├── constants.ts     # 常量定义（颜色等）
    └── formatters.ts    # 格式化工具
```

---

## 关键文件说明

### AppNavigator.tsx

**重要性：** ⭐⭐⭐⭐⭐

导航配置核心文件，所有页面路由和 Tab Bar 配置都在这里。**修改时需特别注意：**
- 不要删除或修改 `AddTab` 的 `tabPress` listener
- 不要使用自定义的 TabBarButton 组件
- 保持所有 Tab 使用一致的 `TouchableOpacity` 配置

### database.ts

**重要性：** ⭐⭐⭐⭐⭐

数据库初始化和连接管理。**修改时需特别注意：**
- 不要移除连接有效性检查
- 不要移除初始化 Promise 锁
- 确保所有 SQL 语句在 Web 和 Android 平台都兼容

### TransactionInputPanel.tsx

**重要性：** ⭐⭐⭐⭐⭐

记账输入面板，包含金额输入、计算器、备注、日期等核心功能。**修改时需特别注意：**
- 键盘高度计算必须包含 `insetsBottom`
- 动画值的使用要正确，避免布局闪烁
- 不要随意修改标签栏的展开逻辑

---

## 禁止操作

以下操作在没有充分测试的情况下禁止执行：

1. ❌ 删除或修改 `src/navigation/AppNavigator.tsx` 中的 Tab 配置
2. ❌ 修改 `src/db/database.ts` 中的数据库初始化逻辑
3. ❌ 在 Tab Bar 中使用 `TouchableNativeFeedback` 或其他会产生涟漪效果的组件
4. ❌ 修改键盘区域的高度计算逻辑
5. ❌ 移除 `App.tsx` 中的数据库预初始化

---

## 推荐做法

1. ✅ 修改导航配置前，先在开发模式下测试所有 Tab 的切换功能
2. ✅ 修改数据库逻辑后，重新构建并测试数据加载功能
3. ✅ 修改 UI 布局后，在有虚拟按键的设备上测试显示效果
4. ✅ 每次修改后，执行 `git diff` 检查变更是否符合预期
5. ✅ 重要修改提交时，使用清晰的 commit message 格式

---

## 提交信息规范

项目使用以下 commit message 格式：

```
<type>: <description>

<body>
```

**类型说明：**
- `fix`: 修复 bug
- `feat`: 新增功能
- `docs`: 更新文档
- `chore`: 构建或工具相关
- `refactor`: 代码重构

**示例：**
```
fix: 修复Tab导航强制跳转明细页问题

- 移除自定义SilentTabBarButton组件
- 使用React Navigation默认tabBarButton实现
- 修复AddTab的onPress事件处理
```
