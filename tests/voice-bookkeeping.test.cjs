const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const vm = require('node:vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

function loader(mocks = {}) {
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(__dirname, '..', relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = new Module(filename, module);
    cache.set(filename, mod);
    mod.filename = filename;
    mod.paths = Module._nodeModulePaths(path.dirname(filename));
    mod.require = (id) => {
      if (id in mocks) return mocks[id];
      if (id.endsWith('/db/database') && mocks.database) return mocks.database;
      if (id.startsWith('.')) return load(path.resolve(path.dirname(filename), id) + '.ts');
      return require(id);
    };
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    mod._compile(source, filename);
    return mod.exports;
  }
  return load;
}

const base = '2026-11-07';
const expense = (overrides = {}) => ({ amount: 35, type: 'expense', categoryName: '餐饮', note: '午饭', date: base, status: 'completed', ...overrides });
const refund = (overrides = {}) => expense({ type: 'refund', amount: 30, categoryName: '', note: '退鞋', originalDate: '2026-10-20', originalNote: '鞋', accountName: '微信', ...overrides });
const draft = (item, overrides = {}) => ({ ...item, amountText: item.amount == null ? '' : String(item.amount), categoryId: item.type === 'expense' ? 1 : 2, assetAccountId: 2, originalTransactionId: item.type === 'refund' ? 1 : null, ...overrides });

test('dates handle Chinese numerals, relative dates and month/year boundaries without rolling invalid days', () => {
  const { parseChineseDate, isValidDate } = loader()('src/utils/dateParser.ts');
  for (const [text, expected] of [
    ['大前天午饭35', '2026-11-04'], ['三天前午饭35', '2026-11-04'],
    ['十一月三号退款', '2026-11-03'], ['2026-11-01退款', '2026-11-01'],
    ['上个月二十号买鞋', '2026-10-20'], ['上周五午饭', '2026-10-30'],
    ['2月30日午饭', null], ['2026-02-30午饭', null],
  ]) assert.equal(parseChineseDate(text, base), expected, text);
  assert.equal(parseChineseDate('昨天', '2026-01-01'), '2025-12-31');
  assert.equal(isValidDate('2024-02-29'), true);
  assert.equal(isValidDate('2026-02-29'), false);
});

test('AI normalization keeps refund dates separate and rejects invalid amounts, dates and types', () => {
  const { normalizeParsedTransactions: normalize } = loader()('src/services/deepseek/DeepSeekTransactionParser.ts');
  const [item] = normalize([refund({ date: '2026-11-03', originalDate: '2026-10-20' })], '11月3日收到10月20日买鞋退款30元', base);
  assert.equal(item.type, 'refund');
  assert.equal(item.date, '2026-11-03');
  assert.equal(item.originalDate, '2026-10-20');
  assert.equal(item.accountName, '微信');
  assert.equal(normalize([expense({ date: '2020-01-01', dateText: '大前天' })], '大前天午饭35', base)[0].date, '2026-11-04');
  for (const changes of [{ amount: 'Infinity' }, { amount: true }, { amount: -1 }, { amount: 0 }, { amount: 1.234 }, { date: '2026-02-30' }, { type: 'mystery' }]) {
    assert.throws(() => normalize([expense(changes)], '午饭35', base));
  }
  assert.equal(normalize([expense({ date: undefined })], '昨天午饭35', base)[0].date, '2026-11-06');
  assert.throws(() => normalize([refund({ date: undefined })], '退了昨天买的鞋', base), /日期/);
  assert.equal(normalize([refund({ amount: null, fullRefund: true })], '鞋全退了', base)[0].fullRefund, true);
  assert.equal(normalize([refund({ status: 'pending' })], '退款还没到账', base)[0].status, 'pending');
  assert.equal(normalize([expense({ type: 'unsupported', status: 'unclear', amount: null, issue: '请通过转账功能处理' })], '提现100元', base)[0].type, 'unsupported');
  assert.equal(normalize([expense({ type: 'income', categoryName: '退款', note: '退鞋50元', amount: 50 })], '收到买鞋退款50元', base)[0].type, 'refund');
  assert.equal(normalize([expense({ type: 'expense', note: '退鞋50元', amount: 50 })], '11月3日退款50元', base)[0].type, 'refund');
  assert.equal(normalize([refund({ status: 'completed' })], '退款50元还没到账', base)[0].status, 'pending');
  assert.equal(normalize([expense({ amount: 100, status: 'completed' })], '从微信转到现金100元', base)[0].type, 'unsupported');
});

test('AI request supplies local date, real categories/accounts and preserves separate dates for multiple entries', async () => {
  const originalFetch = global.fetch;
  let request;
  global.fetch = async (_url, options) => {
    request = JSON.parse(options.body);
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify([expense({ date: '2026-11-06' }), refund({ date: '2026-11-03' })]) } }] }) };
  };
  try {
    const { DeepSeekTransactionParser } = loader({ './DeepSeekConfig': { DeepSeekConfig: { getApiKey: async () => 'test-only', getBaseUrl: async () => 'https://test.invalid' } } })('src/services/deepseek/DeepSeekTransactionParser.ts');
    const parsed = await DeepSeekTransactionParser.parse('昨天午饭35，11月3日退鞋30', { today: base, expenseCategories: ['自定义午饭'], incomeCategories: ['工资'], accountNames: ['零钱钱包'] });
    const prompt = request.messages[0].content;
    for (const value of [base, '自定义午饭', '零钱钱包', 'originalDate', 'pending']) assert.ok(prompt.includes(value), value);
    assert.deepEqual(parsed.map(item => item.date), ['2026-11-06', '2026-11-03']);
  } finally { global.fetch = originalFetch; }
});

test('account matching never guesses among several bank cards and refund candidates use original date', () => {
  const { makeVoiceDraft, getOriginalCandidates } = loader({ database: {} })('src/services/VoiceBookkeepingService.ts');
  const accounts = [{ id: 1, name: '工资卡', provider: 'cmb' }, { id: 2, name: '备用卡', provider: 'cmb' }, { id: 3, name: '零钱钱包', provider: 'wechat' }];
  assert.equal(makeVoiceDraft(expense({ accountName: '招商银行' }), [], accounts).assetAccountId, null);
  assert.equal(makeVoiceDraft(expense({ accountName: '微信' }), [], accounts).assetAccountId, 3);
  assert.equal(makeVoiceDraft(expense({ accountName: '不存在' }), [], accounts).assetAccountId, null);
  assert.equal(makeVoiceDraft(expense({ accountName: '' }), [], accounts).assetAccountId, null);
  const transactions = [{ id: 1, book_id: 1, type: 'expense', date: '2026-10-20', note: '买鞋', amount: 100 }, { id: 2, book_id: 1, type: 'expense', date: '2026-11-03', note: '买鞋', amount: 100 }, { id: 3, type: 'income', date: '2026-10-20', note: '买鞋', amount: 100 }];
  assert.deepEqual(getOriginalCandidates(refund({ date: '2026-11-03' }), transactions).map(tx => tx.id), [1]);
  assert.deepEqual(getOriginalCandidates(refund({ date: '2026-11-03' }), transactions, '11-03').map(tx => tx.id), [2]);
});

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const schema = fs.readFileSync(path.resolve(__dirname, '../src/db/database.ts'), 'utf8');
  for (const name of ['account_books', 'categories', 'transactions', 'app_settings', 'asset_accounts']) {
    const match = schema.match(new RegExp('`(CREATE TABLE IF NOT EXISTS ' + name + ' \\([\\s\\S]*?\\))`'));
    sqlite.exec(match[1]);
  }
  sqlite.exec(`CREATE TABLE cashback_records (id INTEGER PRIMARY KEY, transaction_id INTEGER, type TEXT, amount REAL, date TEXT, note TEXT, asset_account_id INTEGER, created_at TEXT, updated_at TEXT);
    INSERT INTO account_books (id,name) VALUES (1,'日常'),(2,'旅行');
    INSERT INTO categories (id,name,type) VALUES (1,'餐饮','expense'),(2,'工资','income'),(3,'购物','expense');
    INSERT INTO asset_accounts (id,name,provider,balance_cents,opening_balance_cents) VALUES (1,'现金','cash',10000,10000),(2,'微信','wechat',20000,20000);
    INSERT INTO transactions (id,book_id,category_id,amount,type,note,date,asset_account_id) VALUES (1,1,3,100,'expense','买鞋','2026-10-20',1);
    INSERT INTO app_settings (key,value) VALUES ('asset_accounts_migrated_v1','1'),('asset_default_cash_initialized_v1','1'),('asset_tracking_start_date','2026-11-01'),('asset_tracking_baseline_tx_id','1'),('asset_tracking_baseline_adjustment_id','0');`);
  const db = {
    runAsync: async (sql, args = []) => { const r = sqlite.prepare(sql).run(...args); return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) }; },
    getFirstAsync: async (sql, args = []) => sqlite.prepare(sql).get(...args) ?? null,
    getAllAsync: async (sql, args = []) => sqlite.prepare(sql).all(...args),
    withTransactionAsync: async work => { sqlite.exec('BEGIN'); try { await work(); sqlite.exec('COMMIT'); } catch (e) { sqlite.exec('ROLLBACK'); throw e; } },
  };
  const load = loader({ database: { getDatabase: async () => db } });
  return { sqlite, load, service: load('src/services/VoiceBookkeepingService.ts').VoiceBookkeepingService };
}

test('a dated refund links an old expense and credits its destination account; partial refunds accumulate', async () => {
  const { sqlite, load, service } = fixture();
  try {
    await service.save([draft(refund({ date: '2026-11-03' }))], 1);
    await service.save([draft(refund({ date: '2026-11-04', amount: 20 }))], 1);
    const records = sqlite.prepare('SELECT * FROM cashback_records ORDER BY id').all();
    assert.deepEqual(records.map(r => [r.transaction_id, r.type, r.date, r.amount, r.asset_account_id]), [[1, 'refund', '2026-11-03', 30, 2], [1, 'refund', '2026-11-04', 20, 2]]);
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM transactions').get().n, 1);
    const { TransactionRepo } = load('src/repositories/TransactionRepo.ts');
    assert.equal((await TransactionRepo.getById(1)).net_amount, 50);
    const { AssetAccountRepo } = load('src/repositories/AssetAccountRepo.ts');
    assert.deepEqual((await AssetAccountRepo.getAll()).map(a => a.balance_cents), [10000, 25000]);
    assert.deepEqual(await AssetAccountRepo.getPeriodTotals(), { income_cents: 5000, expense_cents: 0 });
    await AssetAccountRepo.restartAutoTracking();
    assert.deepEqual((await AssetAccountRepo.getAll()).map(a => a.balance_cents), [10000, 25000]);
    assert.deepEqual(await AssetAccountRepo.getPeriodTotals(), { income_cents: 0, expense_cents: 0 });
    const restartedDate = (await AssetAccountRepo.getTrackingStatus()).startDate;
    await service.save([draft(refund({ amount: 10, date: restartedDate }))], 1);
    assert.deepEqual((await AssetAccountRepo.getAll()).map(a => a.balance_cents), [10000, 26000]);
    assert.deepEqual(await AssetAccountRepo.getPeriodTotals(), { income_cents: 1000, expense_cents: 0 });
  } finally { sqlite.close(); }
});

test('full refund uses remaining amount, and editing the latest refund preserves other installments', async () => {
  const { sqlite, load, service } = fixture();
  try {
    await service.save([draft(refund()), draft(refund({ amount: null, fullRefund: true }))], 1);
    assert.deepEqual(sqlite.prepare('SELECT amount FROM cashback_records ORDER BY id').all().map(r => r.amount), [30, 70]);
    const { TransactionAdjustmentRepo } = load('src/repositories/TransactionAdjustmentRepo.ts');
    await TransactionAdjustmentRepo.upsertForTransaction({ transaction_id: 1, type: 'refund', amount: 60, date: base, asset_account_id: 2 });
    assert.deepEqual(sqlite.prepare('SELECT amount FROM cashback_records ORDER BY id').all().map(r => r.amount), [30, 60]);
  } finally { sqlite.close(); }
});

test('a mixed batch writes distinct accounts and rolls back completely on a later write failure', async () => {
  const { sqlite, service } = fixture();
  try {
    sqlite.exec("CREATE TRIGGER fail_refund BEFORE INSERT ON cashback_records BEGIN SELECT RAISE(ABORT,'simulated write failure'); END");
    const entries = [draft(expense(), { assetAccountId: 1 }), draft(refund())];
    await assert.rejects(service.save(entries, 1), /simulated write failure/);
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM transactions').get().n, 1);
    sqlite.exec('DROP TRIGGER fail_refund');
    await service.save(entries, 1);
    assert.equal(sqlite.prepare('SELECT asset_account_id FROM transactions WHERE id = 2').get().asset_account_id, 1);
    assert.equal(sqlite.prepare('SELECT asset_account_id FROM cashback_records').get().asset_account_id, 2);
  } finally { sqlite.close(); }
});

test('unresolved or invalid entries never get silently saved to a default category or account', async () => {
  const { sqlite, service } = fixture();
  try {
    for (const entry of [
      draft(refund(), { originalTransactionId: null }), draft(refund(), { originalTransactionId: 99 }),
      draft(refund({ status: 'pending' })), draft(expense({ type: 'unsupported', status: 'unclear' })),
      draft(expense(), { categoryId: 2 }), draft(expense(), { assetAccountId: 99 }),
      draft(expense(), { assetAccountId: null }), draft(expense(), { amountText: 'Infinity' }),
      draft(expense({ date: '2026-02-30' })), draft(refund({ date: '2026-10-19' })),
    ]) await assert.rejects(service.save([entry], 1));
    await assert.rejects(service.save([draft(refund())], 2));
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM transactions').get().n, 1);
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM cashback_records').get().n, 0);
  } finally { sqlite.close(); }
});

function screenHandler(name, context) {
  const filename = path.resolve(__dirname, '../src/screens/DiscoverScreen.tsx');
  const source = fs.readFileSync(filename, 'utf8');
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) expression = node.initializer.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(expression, `missing ${name}`);
  const js = ts.transpileModule(`const handler = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return vm.runInNewContext(`(() => { ${js}\nreturn handler; })()`, context);
}

test('voice screen ignores a second save tap and stale AI results after text changes', async () => {
  let writes = 0;
  let releaseSave;
  const pendingSave = new Promise(resolve => { releaseSave = resolve; });
  const versions = { current: 1 };
  const saved = { current: null };
  const lock = { current: false };
  const results = [];
  const saveContext = {
    saveLock: lock, loading: false, savedVersion: saved, parseVersion: versions,
    parsedResults: [draft(expense())], bookId: 1,
    VoiceBookkeepingService: { save: async () => { writes++; await pendingSave; } },
    setSaving: () => {}, setParsedResults: value => results.push(value), setInputText: () => {},
    setErrorMsg: () => {}, showThemedAlert: () => {},
  };
  const save = screenHandler('handleSaveAll', saveContext);
  const first = save();
  await save();
  assert.equal(writes, 1);
  releaseSave();
  await first;
  await save();
  assert.equal(writes, 1);
  assert.equal(saved.current, 1);
  assert.equal(results.at(-1).length, 0);

  let finishParse;
  const parsedLater = new Promise(resolve => { finishParse = resolve; });
  const parseResults = [];
  const parseContext = {
    saveLock: { current: false }, inputText: '午饭35元', parseVersion: { current: 0 },
    setParsedResults: value => parseResults.push(value), setLoading: () => {}, setErrorMsg: () => {}, setInputText: () => {},
    AccountBookRepo: { getAll: async () => [{ id: 1 }] }, CategoryRepo: { getAll: async () => [] },
    AssetAccountRepo: { getAll: async () => [], getTrackingStatus: async () => null },
    DeepSeekTransactionParser: { parse: () => parsedLater },
    TransactionRepo: { getAll: async () => [] }, isAdjustment: () => false, makeVoiceDraft: item => item,
    setBookId: () => {}, setCategories: () => {}, setAssetAccounts: () => {}, setTrackingStatus: () => {},
    setExpenses: () => {}, setExpensesLoaded: () => {}, showThemedAlert: () => {},
  };
  const parse = screenHandler('handleParse', parseContext);
  const change = screenHandler('handleInputChange', parseContext);
  const running = parse();
  await new Promise(resolve => setImmediate(resolve));
  change('午饭改成40元');
  finishParse([expense()]);
  await running;
  assert.equal(parseResults.every(items => items.length === 0), true);
});
