const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

// Run the application's TypeScript and SQL without requiring a native Expo runtime.
function loadTs(relative, mocks = {}) {
  const filename = path.resolve(__dirname, '..', relative);
  const source = fs.readFileSync(filename, 'utf8');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod.require = (id) => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('.')) return loadTs(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), id)) + '.ts', mocks);
    return require(id);
  };
  mod._compile(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText, filename);
  return mod.exports;
}

test('asset calculation evaluates precedence and rounds balances to cents', () => {
  const { evaluateAssetAmount, sumAssetBalances } = loadTs('src/utils/assetAmount.ts');
  assert.equal(evaluateAssetAmount('5000+800'), 580000);
  assert.equal(evaluateAssetAmount('100+20×3'), 16000);
  assert.equal(evaluateAssetAmount('100÷4-30'), -500);
  assert.equal(evaluateAssetAmount('-20+5'), -1500);
  assert.equal(evaluateAssetAmount('0.1+0.2'), 30);
  assert.equal(evaluateAssetAmount('1÷3'), 33);
  assert.equal(evaluateAssetAmount('1.005'), 101);
  assert.equal(evaluateAssetAmount('-1.005'), -101);
  assert.equal(evaluateAssetAmount('0'), 0);
  assert.equal(sumAssetBalances([{ balance_cents: 500000 }, { balance_cents: 80000 }, { balance_cents: -20 }]), 579980);
  assert.equal(sumAssetBalances([]), 0);
});

test('invalid and unfinished expressions cannot silently change a balance', () => {
  const { evaluateAssetAmount } = loadTs('src/utils/assetAmount.ts');
  for (const value of ['', ' ', '.', '2+', '1÷0', '12abc', '1..2', '1+×2', '99999999999']) {
    assert.throws(() => evaluateAssetAmount(value), undefined, value);
  }
});

test('keypad replaces edited balances, limits decimals and supports operator correction', () => {
  const { appendAssetKey } = loadTs('src/utils/assetAmount.ts');
  assert.equal(appendAssetKey('500', '8', true), '8');
  assert.equal(appendAssetKey('500', '+', true), '500+');
  assert.equal(appendAssetKey('0', '5'), '5');
  assert.equal(appendAssetKey('1.23', '4'), '1.23');
  assert.equal(appendAssetKey('5+', '×'), '5×');
  assert.equal(appendAssetKey('5+', '.'), '5+0.');
  assert.equal(appendAssetKey('5+20', '⌫'), '5+2');
  assert.equal(appendAssetKey('', '-'), '-');
});

async function fixture(initial, totals = { income: 200, expense: 50 }) {
  const sqlite = new DatabaseSync(':memory:');
  const db = {
    runAsync: async (sql, args = []) => {
      const r = sqlite.prepare(sql).run(...args);
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    getFirstAsync: async (sql, args = []) => sqlite.prepare(sql).get(...args) ?? null,
    getAllAsync: async (sql, args = []) => sqlite.prepare(sql).all(...args),
    withTransactionAsync: async (work) => {
      sqlite.exec('BEGIN');
      try { await work(); sqlite.exec('COMMIT'); } catch (e) { sqlite.exec('ROLLBACK'); throw e; }
    },
  };
  const schema = fs.readFileSync(path.resolve(__dirname, '../src/db/database.ts'), 'utf8');
  for (const table of ['app_settings', 'asset_accounts']) {
    const match = schema.match(new RegExp('`(CREATE TABLE IF NOT EXISTS ' + table + ' \\([\\s\\S]*?\\))`'));
    assert.ok(match, `missing ${table} schema`);
    sqlite.exec(match[1]);
  }
  if (initial !== null) sqlite.prepare('INSERT INTO app_settings (key,value) VALUES (?,?)').run('initial_balance', String(initial));
  const { AssetAccountRepo } = loadTs('src/repositories/AssetAccountRepo.ts', {
    '../db/database': { getDatabase: async () => db },
    './SettingsRepo': { SettingsRepo: { getInitialBalance: async () => initial } },
    './TransactionRepo': { TransactionRepo: { getGlobalTotals: async () => totals } },
  });
  return { repo: AssetAccountRepo, sqlite };
}

test('old remaining balance migrates once and never returns after deleting all accounts', async () => {
  const { repo, sqlite } = await fixture(1000);
  try {
    const accounts = await repo.getAll();
    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].name, '原有资产');
    assert.equal(accounts[0].balance_cents, 115000);
    assert.equal((await repo.getAll()).length, 1);
    await repo.remove(accounts[0].id);
    assert.deepEqual(await repo.getAll(), []);
    assert.equal(sqlite.prepare('SELECT value FROM app_settings WHERE key = ?').get('initial_balance').value, '1000');
  } finally { sqlite.close(); }
});

test('accounts persist independently, allow multiple cards per bank and validate before writing', async () => {
  const { repo, sqlite } = await fixture(null);
  try {
    assert.deepEqual(await repo.getAll(), []);
    await repo.create({ name: ' 招商银行·工资卡 ', provider: 'cmb', balance_cents: 500000 });
    await repo.create({ name: '招商银行·储蓄卡', provider: 'cmb', balance_cents: 80000 });
    let accounts = await repo.getAll();
    assert.equal(accounts.length, 2);
    assert.equal(accounts[0].name, '招商银行·工资卡');
    await repo.update(accounts[0].id, { name: '微信', provider: 'wechat', balance_cents: 0 });
    accounts = await repo.getAll();
    assert.equal(accounts[0].balance_cents, 0);
    assert.equal(accounts[1].balance_cents, 80000);
    for (const balance_cents of [NaN, Infinity, 0.5, 1000000000000]) {
      await assert.rejects(repo.create({ name: '现金', provider: 'cash', balance_cents }));
    }
    await assert.rejects(repo.create({ name: '  ', provider: 'cash', balance_cents: 0 }));
    await assert.rejects(repo.create({ name: '现金', provider: 'invalid', balance_cents: 0 }));
    await repo.remove(accounts[0].id);
    assert.equal((await repo.getAll()).length, 1);
  } finally { sqlite.close(); }
});

test('migration rolls back on storage failure and a retry never duplicates the old balance', async () => {
  const { repo, sqlite } = await fixture(1000);
  try {
    sqlite.exec(`CREATE TRIGGER fail_migration BEFORE INSERT ON app_settings
      WHEN NEW.key = 'asset_accounts_migrated_v1'
      BEGIN SELECT RAISE(ABORT, 'simulated storage failure'); END`);
    await assert.rejects(repo.getAll(), /simulated storage failure/);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM asset_accounts').get().count, 0);
    sqlite.exec('DROP TRIGGER fail_migration');
    const [first, concurrent] = await Promise.all([repo.getAll(), repo.getAll()]);
    assert.equal(first.length, 1);
    assert.deepEqual(first, concurrent);
    assert.equal(first[0].balance_cents, 115000);
  } finally { sqlite.close(); }
});

test('later income and expenses never change manually managed asset balances', async () => {
  const totals = { income: 200, expense: 50 };
  const { repo, sqlite } = await fixture(1000, totals);
  try {
    const [legacy] = await repo.getAll();
    await repo.update(legacy.id, { name: '现金', provider: 'cash', balance_cents: 580000 });
    totals.income = 9999;
    totals.expense = 8888;
    const [account] = await repo.getAll();
    assert.equal(account.balance_cents, 580000);
  } finally { sqlite.close(); }
});
