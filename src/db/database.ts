import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    try {
      await db.getFirstAsync('SELECT 1');
      return db;
    } catch {
      db = null;
    }
  }

  if (!initPromise) {
    initPromise = (async () => {
      try {
        db = await SQLite.openDatabaseAsync('bookkeeping.db');
        await initDatabase(db);
      } catch (e) {
        console.error('Database initialization failed:', e);
        db = null;
        throw e;
      }
    })();
  }

  await initPromise;
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export async function resetDatabase(): Promise<void> {
  db = null;
  initPromise = null;
}

async function initDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  // Web 平台的 wa-sqlite 不支持 execAsync 多条语句，需逐条执行
  const statements = [
    'PRAGMA journal_mode = WAL',
    'PRAGMA foreign_keys = ON',
    `CREATE TABLE IF NOT EXISTS account_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📒',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
      is_default INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
      note TEXT,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (book_id) REFERENCES account_books(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )`,
    'CREATE INDEX IF NOT EXISTS idx_transactions_book_id ON transactions(book_id)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)',
    `CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (book_id) REFERENCES account_books(id) ON DELETE CASCADE,
      UNIQUE(book_id, year, month)
    )`,
    `CREATE TABLE IF NOT EXISTS note_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS category_budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (book_id) REFERENCES account_books(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      UNIQUE(book_id, category_id, year, month)
    )`,
  ];

  for (const sql of statements) {
    await database.runAsync(sql);
  }

  // Insert default data if empty
  const bookCount = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM account_books'
  );
  if (bookCount && bookCount.count === 0) {
    await insertDefaultData(database);
  }

}

async function insertDefaultData(database: SQLite.SQLiteDatabase): Promise<void> {
  // Default account book
  await database.runAsync(
    "INSERT INTO account_books (name, icon) VALUES ('日常账本', '📒')"
  );

  // Default expense categories
  const expenseCategories = [
    { name: '餐饮', icon: '🍜', order: 1 },
    { name: '交通', icon: '🚗', order: 2 },
    { name: '购物', icon: '🛒', order: 3 },
    { name: '日用', icon: '🧴', order: 4 },
    { name: '蔬菜', icon: '🥬', order: 5 },
    { name: '水果', icon: '🍎', order: 6 },
    { name: '零食', icon: '🍪', order: 7 },
    { name: '娱乐', icon: '🎮', order: 8 },
    { name: '运动', icon: '⚽', order: 9 },
    { name: '居住', icon: '🏠', order: 10 },
    { name: '医疗', icon: '💊', order: 11 },
    { name: '教育', icon: '📚', order: 12 },
    { name: '通讯', icon: '📱', order: 13 },
    { name: '服饰', icon: '👔', order: 14 },
    { name: '美容', icon: '💅', order: 15 },
    { name: '社交', icon: '🤝', order: 16 },
    { name: '宠物', icon: '🐱', order: 17 },
    { name: '旅行', icon: '✈️', order: 18 },
    { name: '数码', icon: '💻', order: 19 },
    { name: '汽车', icon: '⛽', order: 20 },
    { name: '烟酒', icon: '🚬', order: 21 },
    { name: '其他', icon: '📦', order: 22 },
  ];

  for (const cat of expenseCategories) {
    await database.runAsync(
      'INSERT INTO categories (name, icon, type, is_default, sort_order) VALUES (?, ?, ?, 1, ?)',
      [cat.name, cat.icon, 'expense', cat.order]
    );
  }

  // Default income categories
  const incomeCategories = [
    { name: '工资', icon: '💰', order: 1 },
    { name: '奖金', icon: '🎁', order: 2 },
    { name: '理财', icon: '📈', order: 3 },
    { name: '兼职', icon: '💼', order: 4 },
    { name: '红包', icon: '🧧', order: 5 },
    { name: '报销', icon: '🧾', order: 6 },
    { name: '租金', icon: '🏢', order: 7 },
    { name: '利息', icon: '🏦', order: 8 },
    { name: '退款', icon: '↩️', order: 9 },
    { name: '其他', icon: '💵', order: 10 },
  ];

  for (const cat of incomeCategories) {
    await database.runAsync(
      'INSERT INTO categories (name, icon, type, is_default, sort_order) VALUES (?, ?, ?, 1, ?)',
      [cat.name, cat.icon, 'income', cat.order]
    );
  }
}
