# 自定义资产账户实现计划

**目标：** 以带银行及钱包图标的账户卡片管理当前余额，通过计算键盘编辑并汇总总资产。
**架构：** AssetScreen 负责列表与编辑；AssetAccountRepo 负责持久化及一次性旧余额迁移；独立金额工具和键盘供资产编辑使用，保留既有记账输入面板。
**技术栈：** React Native / Expo、expo-sqlite、现有矢量图标、Node 测试运行器。

## 任务与验收

- [x] 金额与数据层：新增 `src/models/AssetAccount.ts`、`src/utils/assetAmount.ts`、`src/repositories/AssetAccountRepo.ts`，在 `src/db/database.ts` 添加表。先用 `tests/asset-accounts.test.cjs` 验证金额精度、运算优先级、迁移和 CRUD，再实现。
- [x] 图标及金额输入：新增 `src/utils/assetProviders.ts`、`src/components/AssetAccountIcon.tsx`、`src/components/AssetAmountKeyboard.tsx`。使用常用银行徽标、微信/支付宝/现金图标，金额表达式交给已测试工具处理。
- [x] 资产页面：改写 `src/screens/AssetScreen.tsx`，显示总额、账户列表、添加/编辑表单和删除确认；保存后刷新，返回取消编辑，金额编辑禁用系统数字键盘。
- [x] 验证：`node --test tests/asset-accounts.test.cjs`；应用目录范围 TypeScript 检查；Expo Web 编译及浏览器新增、修改、删除、刷新保存的验证。

## 执行记录

- 已确认用户所选规则，不另设设计审批。工作分支为 `feat/asset-accounts`。
- 原始全仓 `npx tsc --noEmit` 已失败：参考项目的 JavaScript 文件含类型注解。后续检查针对应用源码，保留参考项目。
- 银行图标采用本地文字徽标，避免引入网络图像依赖；不是银行官方标志素材。

## 验证结果

- `node --test tests/asset-accounts.test.cjs`：7 项通过。覆盖金额精度、运算、输入、CRUD、迁移回滚/重试/并发、记账与资产独立。
- `npx tsc --noEmit --pretty false -p .expo/tsconfig.assets-only.json`：通过；检查入口为 AssetScreen，包含本次全部源码依赖。
- Web 在 390×844 与 320×568 视口完成：银行卡与微信汇总、四则运算、刷新保留、删除取消及确认、同银行双卡、负数、零余额、非法运算阻止保存、删除全部账户。
- 浏览器没有捕获到页面异常；已目视核对列表、编辑页、小屏键盘截图。
- 全应用类型检查仍有既有错误：StatisticsScreen 图表样式及导航类型、ImportExportService 的 const 重赋值。本次没有修改这些文件。
- 独立审查代理因额度限制未能执行；主代理已直接审查金额、持久化、迁移及页面流程。
- Android 真机和 APK 打包未执行；新功能尚未发布到 Release。