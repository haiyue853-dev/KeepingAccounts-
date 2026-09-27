import pathlib
import re
import sqlite3

source = pathlib.Path('src/repositories/AssetAccountRepo.ts').read_text(encoding='utf-8')
balance_sql = re.search(r'`(SELECT a\.id, a\.name, a\.provider,.*?FROM asset_accounts a ORDER BY a\.id)`', source, re.S).group(1)
totals_sql = re.search(r'`(SELECT COALESCE\(SUM\(CASE WHEN t\.type.*?WHERE t\.id > \? AND t\.date >= \?)`', source, re.S).group(1)
refund_sql = re.search(r'`(SELECT COALESCE\(SUM\(ROUND\(cr\.amount.*?cr\.date >= \?)`', source, re.S).group(1)

db = sqlite3.connect(':memory:')
db.row_factory = sqlite3.Row
db.executescript('''
CREATE TABLE asset_accounts (id INTEGER PRIMARY KEY, name TEXT, provider TEXT, opening_balance_cents INTEGER, adjustment_cents INTEGER);
CREATE TABLE transactions (id INTEGER PRIMARY KEY, asset_account_id INTEGER, amount REAL, type TEXT, date TEXT);
CREATE TABLE cashback_records (id INTEGER PRIMARY KEY, transaction_id INTEGER, asset_account_id INTEGER, amount REAL, date TEXT);
INSERT INTO asset_accounts VALUES (1, 'Bank', 'bank', 100000, 0), (2, 'WeChat', 'wechat', 20000, 0);
INSERT INTO transactions VALUES
  (1, 1, 100, 'expense', '2026-09-27'),
  (2, 1, 30, 'expense', '2026-09-27'),
  (3, 2, 50, 'income', '2026-09-27'),
  (4, 1, 70, 'expense', '2026-09-26');
INSERT INTO cashback_records VALUES
  (1, 1, 1, 9, '2026-09-27'),
  (2, 2, 2, 5, '2026-09-27');
''')
date = '2026-09-27'
params = (1, date, 1, date, 1, date)

def balances():
    return {row['name']: row['balance_cents'] for row in db.execute(balance_sql, params)}

assert balances() == {'Bank': 97000, 'WeChat': 25500}, balances()
assert tuple(db.execute(totals_sql, (1, date)).fetchone()) == (5000, 3000)
assert db.execute(refund_sql, (1, date, 1, date)).fetchone()[0] == 500
db.execute('UPDATE transactions SET amount = 40 WHERE id = 2')
assert balances()['Bank'] == 96000
db.execute('UPDATE transactions SET asset_account_id = 2 WHERE id = 2')
assert balances() == {'Bank': 100000, 'WeChat': 21500}, balances()
db.execute('DELETE FROM cashback_records WHERE transaction_id = 2')
db.execute('DELETE FROM transactions WHERE id = 2')
assert balances() == {'Bank': 100000, 'WeChat': 25000}, balances()
db.execute('UPDATE asset_accounts SET adjustment_cents = 700 WHERE id = 1')
assert balances()['Bank'] == 100700
print('Asset tracking SQL scenarios passed')
