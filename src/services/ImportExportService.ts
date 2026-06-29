import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDatabase } from '../db/database';
import { autoDetectAndParse } from './parsers';

interface ExportData {
  version: number;
  exportedAt: string;
  book: { name: string };
  categories: { name: string; icon: string; type: string }[];
  transactions: {
    categoryName: string;
    amount: number;
    type: string;
    note: string;
    date: string;
  }[];
}

export class ImportExportService {
  /**
   * 导出账本为 JSON 文件
   */
  static async exportToJson(bookId: number): Promise<void> {
    const db = await getDatabase();

    const book = await db.getFirstAsync<{ name: string }>(
      'SELECT name FROM account_books WHERE id = ?',
      [bookId]
    );
    if (!book) throw new Error('账本不存在');

    const categories = await db.getAllAsync<{ name: string; icon: string; type: string }>(
      'SELECT name, icon, type FROM categories'
    );

    const transactions = await db.getAllAsync<{
      categoryName: string;
      amount: number;
      type: string;
      note: string;
      date: string;
    }>(
      `SELECT c.name as categoryName, t.amount, t.type, t.note, t.date
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.book_id = ?
       ORDER BY t.date DESC`,
      [bookId]
    );

    const exportData: ExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      book: { name: book.name },
      categories,
      transactions,
    };

    const json = JSON.stringify(exportData, null, 2);
    const fileName = `${book.name}_${new Date().toISOString().slice(0, 10)}.json`;
    const filePath = `${Paths.document.uri}${fileName}`;

    const file = new File(filePath);
    await file.write(json);

    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: `导出账本：${book.name}`,
    });
  }

  /**
   * 导出账本为 CSV 文件
   */
  static async exportToCsv(bookId: number): Promise<void> {
    const db = await getDatabase();

    const book = await db.getFirstAsync<{ name: string }>(
      'SELECT name FROM account_books WHERE id = ?',
      [bookId]
    );
    if (!book) throw new Error('账本不存在');

    const transactions = await db.getAllAsync<{
      categoryName: string;
      amount: number;
      type: string;
      note: string;
      date: string;
    }>(
      `SELECT c.name as categoryName, t.amount, t.type, t.note, t.date
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.book_id = ?
       ORDER BY t.date DESC`,
      [bookId]
    );

    // BOM for Excel UTF-8 compatibility
    let csv = '﻿日期,类型,分类,金额,备注\n';
    for (const t of transactions) {
      const typeLabel = t.type === 'income' ? '收入' : '支出';
      const note = (t.note || '').replace(/"/g, '""');
      csv += `${t.date},${typeLabel},${t.categoryName},${t.amount},"${note}"\n`;
    }

    const fileName = `${book.name}_${new Date().toISOString().slice(0, 10)}.csv`;
    const filePath = `${Paths.document.uri}${fileName}`;

    const file = new File(filePath);
    await file.write(csv);

    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: `导出账本：${book.name}`,
    });
  }

  /**
   * 从 JSON 文件导入账本
   */
  static async importFromJson(bookId: number): Promise<{ imported: number; skipped: number }> {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return { imported: 0, skipped: 0 };
    }

    const file = new File(result.assets[0].uri);
    const fileContent = await file.text();

    const data: ExportData = JSON.parse(fileContent);
    if (!data.version || !data.transactions) {
      throw new Error('无效的账本文件格式');
    }

    const db = await getDatabase();
    let imported = 0;
    let skipped = 0;

    // Build category name -> id map
    const categoryMap = new Map<string, number>();
    const existingCategories = await db.getAllAsync<{ id: number; name: string }>(
      'SELECT id, name FROM categories'
    );
    for (const c of existingCategories) {
      categoryMap.set(c.name, c.id);
    }

    // Import missing categories
    if (data.categories) {
      for (const cat of data.categories) {
        if (!categoryMap.has(cat.name)) {
          const res = await db.runAsync(
            'INSERT INTO categories (name, icon, type, is_default, sort_order) VALUES (?, ?, ?, 0, 99)',
            [cat.name, cat.icon || '📦', cat.type]
          );
          categoryMap.set(cat.name, res.lastInsertRowId);
        }
      }
    }

    // Import transactions
    for (const t of data.transactions) {
      const categoryId = categoryMap.get(t.categoryName);
      if (!categoryId) {
        skipped++;
        continue;
      }

      await db.runAsync(
        'INSERT INTO transactions (book_id, category_id, amount, type, note, date) VALUES (?, ?, ?, ?, ?, ?)',
        [bookId, categoryId, t.amount, t.type, t.note || '', t.date]
      );
      imported++;
    }

    return { imported, skipped };
  }

  /**
   * 从 CSV 文件导入账本
   */
  static async importFromCsv(bookId: number): Promise<{ imported: number; skipped: number }> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return { imported: 0, skipped: 0 };
    }

    const file = new File(result.assets[0].uri);
    const arrayBuffer = await file.arrayBuffer();
    const bytes = Array.from(new Uint8Array(arrayBuffer));
    const fileContent = this.detectAndConvertEncoding(bytes);

    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }

    const lines = fileContent.split('\n').filter((line: string) => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV 文件为空或格式不正确');
    }

    // 尝试用自动检测解析器识别特定格式（微信/支付宝/随手记/鲨鱼记账）
    let detectedFormat = '';
    let detectedTransactions: { date: string; type: 'income' | 'expense'; categoryName: string; amount: number; note: string }[] = [];
    try {
      const parseResult = autoDetectAndParse(lines);
      if (parseResult.transactions.length > 0) {
        detectedFormat = parseResult.format;
        detectedTransactions = parseResult.transactions;
      }
    } catch {
      // 自动检测失败，回退到通用解析
    }

    // 如果检测到特定格式，直接使用解析结果
    if (detectedTransactions.length > 0) {
      return this.importParsedTransactions(bookId, detectedTransactions, detectedFormat);
    }

    // 回退到通用 CSV 列解析
    const db = await getDatabase();
    const categoryMap = new Map<string, number>();
    const existingCategories = await db.getAllAsync<{ id: number; name: string }>(
      'SELECT id, name FROM categories'
    );
    for (const c of existingCategories) {
      categoryMap.set(c.name, c.id);
    }

    const parseCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    };

    const headerLine = lines[0];
    const headers = parseCsvLine(headerLine).map(h => h.trim());

    // 扩展列名检测：覆盖主流记账软件的各种变体
    const findCol = (names: string[]): number => {
      for (const name of names) {
        const idx = headers.findIndex(h =>
          h.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(h.toLowerCase())
        );
        if (idx !== -1) return idx;
      }
      return -1;
    };

    // 日期列：覆盖所有常见变体（包括微信/支付宝/银行账单格式）
    const dateCol = findCol([
      '日期', 'date', '交易日期', '时间', '记账日期', '发生日期',
      '交易时间', '入账日期', '消费日期', '收支日期', '账单日期',
      'Transaction Date', 'Time', 'Date', '记账时间', '交易日期时间',
      '账单日期', '结算日期', '过账日期', 'Posting Date', 'Value Date',
      '交易日期', '交易时间', '日期时间', 'DateTime', 'Timestamp'
    ]);
    // 类型列：收入/支出
    const typeCol = findCol([
      '类型', 'type', '收支类型', '收支', '收入支出', '账户类型',
      '交易类型', '收支方向', '借贷', 'Debit/Credit', 'Type',
      '收/支', '收支类别', '借贷方向', 'Dr/Cr', '借贷标志',
      '交易方向', '资金方向', '收支标志', '收付标志', 'Debit Credit',
      'Income/Expense', 'Exp/Inc', '收支性质'
    ]);
    // 分类列：覆盖各种命名习惯
    const categoryCol = findCol([
      '分类', 'category', '类别', '账目分类', '一级分类',
      '支出分类', '收入分类', '项目', '标签', '记账分类',
      '账目分类', '分类名称', 'Category', 'Class',
      '费用类别', '消费分类', '收支分类', '科目', 'Account',
      '账户分类', '交易分类', '业务类型', 'Business Type',
      'Transaction Type', 'Merchant Category', 'MCC', '商户类别',
      '消费类型', '支出类型', '收入类型', '费用类型'
    ]);
    // 子分类列
    const subCategoryCol = findCol([
      '子分类', '二级分类', '详细分类', '分类明细', 'Sub Category',
      '细分', '子类', '具体分类', '备注分类', 'SubCategory',
      'Sub-Class', 'Detail Category', '明细分类', '三级分类'
    ]);
    // 金额列：统一金额字段
    const amountCol = findCol([
      '金额', 'amount', '支出金额', '收入金额', '价格', '费用',
      '支出', '收入', '消费金额', '交易额', '发生额', 'Amount',
      'Money', 'Sum', 'Total', '实际金额', '净额', 'Net Amount',
      '交易金额', '消费金额', '支付金额', '收款金额', '转账金额',
      '金额(元)', '金额（元）', 'Amount(CNY)', '金额/CNY',
      '借方金额', '贷方金额', 'Debit Amount', 'Credit Amount',
      '支出金额', '收入金额', '付款金额', '收款金额'
    ]);
    // 备注列
    const noteCol = findCol([
      '备注', 'note', '说明', '描述', '备注信息', '详情',
      '摘要', '事由', '内容', 'Note', 'Description', 'Memo',
      '注释', '补充说明', '交易说明', '详情说明', '附加信息',
      '备注说明', '交易附言', '附言', 'Remarks', 'Comment',
      '交易备注', '消费说明', '支出说明', '收入说明', '用途',
      'Purpose', 'Usage', '交易用途', '资金用途'
    ]);
    // 账户列（用于识别特定格式）
    const accountCol = findCol([
      '账户', 'account', '资金账户', '付款方式', '支付方式',
      '支付账户', '银行卡', 'Account', 'Payment Method',
      '付款账户', '收款账户', '交易账户', '银行账户', 'Bank Account',
      '信用卡', '储蓄卡', '借记卡', 'Cash', 'Wallet', '钱包',
      '支付宝', '微信', 'Alipay', 'WeChat Pay', '支付工具'
    ]);
    // 对方/商户列（微信支付宝特有）
    const counterpartyCol = findCol([
      '交易对方', '对方', '商户', '收款方', '付款方',
      'Counterparty', 'Merchant', '商家', '商品', '产品名称',
      '交易商户', '收款人', '付款人', '对方账户', '对方户名',
      '商户名称', 'Merchant Name', 'Payee', 'Payer',
      '收款方户名', '付款方户名', '交易对手', '对手方'
    ]);
    // 订单号/流水号列
    const orderIdCol = findCol([
      '订单号', '流水号', '交易号', 'Order ID', 'Transaction ID',
      'Transaction No', 'Ref No', 'Reference', '参考号',
      '商户订单号', '银行流水号', '支付流水号', '账单编号'
    ]);

    if (dateCol === -1) {
      // 没有日期列时，使用当前日期作为默认值
      const today = new Date();
      const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      return this.importFromCsvWithDefaultDate(bookId, lines, headers, typeCol, categoryCol, subCategoryCol, amountCol, noteCol, categoryMap, defaultDate);
    }

    if (amountCol === -1) {
      const hasExpenseCol = findCol(['支出']);
      const hasIncomeCol = findCol(['收入']);
      if (hasExpenseCol !== -1 || hasIncomeCol !== -1) {
        const expenseCol = hasExpenseCol;
        const incomeCol = hasIncomeCol;
        return this.importFromCsvWithSeparateAmounts(bookId, lines, headers, dateCol, typeCol, categoryCol, subCategoryCol, expenseCol, incomeCol, noteCol, categoryMap);
      }
      throw new Error('CSV 格式不兼容：找不到金额列（支持的列名：金额、amount、支出金额、收入金额等）');
    }

    let imported = 0;
    let skipped = 0;
    const skipReasons: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const values = parseCsvLine(line);

      let dateStr = values[dateCol]?.trim() || '';
      let typeLabel = typeCol >= 0 ? values[typeCol]?.trim() : '';
      let categoryName = categoryCol >= 0 ? values[categoryCol]?.trim() : '';
      const subCategoryName = subCategoryCol >= 0 ? values[subCategoryCol]?.trim() : '';
      let amountStr = values[amountCol]?.trim() || '';
      const note = noteCol >= 0 ? values[noteCol]?.trim() : '';

      if (subCategoryName && !categoryMap.has(categoryName) && categoryMap.has(subCategoryName)) {
        categoryName = subCategoryName;
      }

      let type = '';
      if (typeLabel) {
        if (typeLabel.includes('收入') || typeLabel.toLowerCase().includes('income') || typeLabel === '+') {
          type = 'income';
        } else if (typeLabel.includes('支出') || typeLabel.toLowerCase().includes('expense') || typeLabel.toLowerCase().includes('expenditure') || typeLabel === '-') {
          type = 'expense';
        }
      }

      if (!type) {
        const amountNum = parseFloat(amountStr.replace(/[^\d.-]/g, ''));
        if (amountNum < 0) {
          type = 'expense';
          amountStr = Math.abs(amountNum).toString();
        } else {
          type = 'expense';
        }
      }

      const dateMatch = dateStr.match(/(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
      if (dateMatch) {
        const [, y, m, d] = dateMatch;
        dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else {
        const dateMatch2 = dateStr.match(/(\d{4})(\d{2})(\d{2})/);
        if (dateMatch2) {
          const [, y, m, d] = dateMatch2;
          dateStr = `${y}-${m}-${d}`;
        } else {
          // 尝试解析 Excel 日期序列号（如 45832 → 2025-07-01）
          const serialNum = parseFloat(dateStr);
          if (!isNaN(serialNum) && serialNum > 30000 && serialNum < 100000) {
            const excelEpoch = new Date(1899, 11, 30);
            const converted = new Date(excelEpoch.getTime() + serialNum * 86400000);
            dateStr = `${converted.getFullYear()}-${String(converted.getMonth() + 1).padStart(2, '0')}-${String(converted.getDate()).padStart(2, '0')}`;
          } else {
            // 日期无法解析，跳过该行
            skipped++;
            continue;
          }
        }
      }

      const amount = parseFloat(amountStr.replace(/[^\d.]/g, ''));

      let categoryId = categoryMap.get(categoryName);
      if (!categoryId) {
        const matchedCategory = Array.from(categoryMap.keys()).find(
          key => key.includes(categoryName) || categoryName.includes(key)
        );
        if (matchedCategory) {
          categoryId = categoryMap.get(matchedCategory);
        }
      }

      if (!categoryId) {
        categoryId = categoryMap.get('其他') ?? categoryMap.get('其它') ?? Array.from(categoryMap.values()).find(id => id > 0);
      }

      if (!categoryId || isNaN(amount) || amount <= 0) {
        skipped++;
        skipReasons.push(`第${i + 1}行: 分类"${categoryName}"无法匹配, 金额"${amountStr}"`);
        continue;
      }

      await db.runAsync(
        'INSERT INTO transactions (book_id, category_id, amount, type, note, date) VALUES (?, ?, ?, ?, ?, ?)',
        [bookId, categoryId, amount, type, note, dateStr]
      );
      imported++;
    }

    if (skipReasons.length > 0 && imported === 0) {
      throw new Error(`导入失败，全部跳过。\n跳过原因示例：\n${skipReasons.slice(0, 5).join('\n')}`);
    }

    return { imported, skipped };
  }

  private static async importFromCsvWithDefaultDate(
    bookId: number,
    lines: string[],
    headers: string[],
    typeCol: number,
    categoryCol: number,
    subCategoryCol: number,
    amountCol: number,
    noteCol: number,
    categoryMap: Map<string, number>,
    defaultDate: string
  ): Promise<{ imported: number; skipped: number }> {
    const db = await getDatabase();
    let imported = 0;
    let skipped = 0;

    const parseCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const values = parseCsvLine(line);

      const typeLabel = typeCol >= 0 ? values[typeCol]?.trim() || '' : '';
      let categoryName = categoryCol >= 0 ? values[categoryCol]?.trim() || '' : '';
      const subCategoryName = subCategoryCol >= 0 ? values[subCategoryCol]?.trim() || '' : '';
      const amountStr = values[amountCol]?.trim() || '';
      const note = noteCol >= 0 ? values[noteCol]?.trim() || '' : '';

      if (subCategoryName && !categoryMap.has(categoryName) && categoryMap.has(subCategoryName)) {
        categoryName = subCategoryName;
      }

      let type = '';
      if (typeLabel) {
        if (typeLabel.includes('收入') || typeLabel.toLowerCase().includes('income') || typeLabel === '+') {
          type = 'income';
        } else if (typeLabel.includes('支出') || typeLabel.toLowerCase().includes('expense') || typeLabel === '-') {
          type = 'expense';
        }
      }

      const amountNum = parseFloat(amountStr.replace(/[^\d.-]/g, ''));
      if (!type) {
        type = amountNum < 0 ? 'expense' : 'expense';
      }

      if (!categoryMap.has(categoryName)) {
        skipped++;
        continue;
      }

      const categoryId = categoryMap.get(categoryName)!;
      const finalAmount = Math.abs(amountNum);

      await db.runAsync(
        'INSERT INTO transactions (book_id, category_id, amount, type, note, date) VALUES (?, ?, ?, ?, ?, ?)',
        [bookId, categoryId, finalAmount, type, note, defaultDate]
      );
      imported++;
    }

    return { imported, skipped };
  }

  private static async importFromCsvWithSeparateAmounts(
    bookId: number,
    lines: string[],
    headers: string[],
    dateCol: number,
    typeCol: number,
    categoryCol: number,
    subCategoryCol: number,
    expenseCol: number,
    incomeCol: number,
    noteCol: number,
    categoryMap: Map<string, number>
  ): Promise<{ imported: number; skipped: number }> {
    const db = await getDatabase();
    let imported = 0;
    let skipped = 0;

    const parseCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const values = parseCsvLine(line);

      let dateStr = values[dateCol]?.trim() || '';
      let typeLabel = typeCol >= 0 ? values[typeCol]?.trim() : '';
      let categoryName = categoryCol >= 0 ? values[categoryCol]?.trim() : '';
      const subCategoryName = subCategoryCol >= 0 ? values[subCategoryCol]?.trim() : '';
      const expenseStr = expenseCol >= 0 ? values[expenseCol]?.trim() || '' : '';
      const incomeStr = incomeCol >= 0 ? values[incomeCol]?.trim() || '' : '';
      const note = noteCol >= 0 ? values[noteCol]?.trim() : '';

      if (subCategoryName && !categoryMap.has(categoryName) && categoryMap.has(subCategoryName)) {
        categoryName = subCategoryName;
      }

      const expenseAmount = parseFloat(expenseStr.replace(/[^\d.]/g, ''));
      const incomeAmount = parseFloat(incomeStr.replace(/[^\d.]/g, ''));

      let type = '';
      let amount = 0;

      if (typeLabel) {
        if (typeLabel.includes('收入') || typeLabel.toLowerCase().includes('income')) {
          type = 'income';
          amount = incomeAmount || expenseAmount;
        } else if (typeLabel.includes('支出') || typeLabel.toLowerCase().includes('expense')) {
          type = 'expense';
          amount = expenseAmount || incomeAmount;
        }
      }

      if (!type) {
        if (expenseAmount > 0 && incomeAmount <= 0) {
          type = 'expense';
          amount = expenseAmount;
        } else if (incomeAmount > 0 && expenseAmount <= 0) {
          type = 'income';
          amount = incomeAmount;
        }
      }

      if (!type || amount <= 0) {
        skipped++;
        continue;
      }

      const dateMatch = dateStr.match(/(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
      if (dateMatch) {
        const [, y, m, d] = dateMatch;
        dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else {
        skipped++;
        continue;
      }

      let categoryId = categoryMap.get(categoryName);
      if (!categoryId) {
        const matchedCategory = Array.from(categoryMap.keys()).find(
          key => key.includes(categoryName) || categoryName.includes(key)
        );
        if (matchedCategory) {
          categoryId = categoryMap.get(matchedCategory);
        }
      }

      if (!categoryId) {
        categoryId = categoryMap.get('其他') ?? categoryMap.get('其它') ?? Array.from(categoryMap.values()).find(id => id > 0);
      }

      if (!categoryId) {
        skipped++;
        continue;
      }

      await db.runAsync(
        'INSERT INTO transactions (book_id, category_id, amount, type, note, date) VALUES (?, ?, ?, ?, ?, ?)',
        [bookId, categoryId, amount, type, note, dateStr]
      );
      imported++;
    }

    return { imported, skipped };
  }

  /**
   * 导入自动检测解析器返回的交易数据
   * 支持微信账单、支付宝账单、随手记、鲨鱼记账等格式
   */
  private static async importParsedTransactions(
    bookId: number,
    transactions: { date: string; type: 'income' | 'expense'; categoryName: string; amount: number; note: string }[],
    formatName: string
  ): Promise<{ imported: number; skipped: number }> {
    const db = await getDatabase();
    let imported = 0;
    let skipped = 0;
    const skipReasons: string[] = [];

    // Build category name -> id map
    const categoryMap = new Map<string, number>();
    const existingCategories = await db.getAllAsync<{ id: number; name: string }>(
      'SELECT id, name FROM categories'
    );
    for (const c of existingCategories) {
      categoryMap.set(c.name, c.id);
    }

    // 常见分类名称映射：将第三方软件的分类名映射到本软件的分类
    const categoryAliasMap = new Map<string, string>();
    const aliases: [string, string[]][] = [
      ['餐饮', ['餐饮美食', '美食', '吃饭', '餐厅', '外卖', '快餐', '小吃', '早餐', '午餐', '晚餐', 'Food', 'Dining']],
      ['交通', ['交通出行', '出行', '打车', '地铁', '公交', '火车', '飞机', '高铁', 'Transport', 'Travel']],
      ['购物', ['购物消费', '网购', '淘宝', '京东', '超市', 'Shopping']],
      ['日用', ['日用百货', '日用品', '生活', '日常', 'Daily']],
      ['娱乐', ['休闲娱乐', '休闲', '游戏', '电影', 'KTV', 'Entertainment']],
      ['居住', ['住房', '房租', '房贷', '物业', '水电', 'Housing', 'Rent']],
      ['医疗', ['医疗健康', '看病', '药品', '医院', 'Medical', 'Health']],
      ['教育', ['学习教育', '学习', '培训', '学费', '书籍', 'Education']],
      ['通讯', ['通讯物流', '话费', '流量', '手机', 'Communication']],
      ['服饰', ['服装', '衣服', '鞋帽', 'Clothing']],
      ['美容', ['美容美发', '化妆', '护肤', 'Beauty']],
      ['社交', ['人情社交', '社交', '聚会', '礼物', '红包', 'Social']],
      ['宠物', ['宠物用品', '宠物', '猫粮', '狗粮', 'Pet']],
      ['旅行', ['旅游', '旅行', '酒店', '机票', 'Trip']],
      ['数码', ['数码电子', '数码', '电子', '手机', '电脑', 'Digital']],
      ['汽车', ['汽车交通', '汽车', '加油', '停车', 'Car']],
      ['运动', ['运动健身', '运动', '健身', 'Sports']],
      ['水果', ['水果生鲜', '水果', '生鲜', 'Fruit']],
      ['蔬菜', ['蔬菜', '菜', 'Vegetable']],
      ['零食', ['零食', '零食小吃', 'Snack']],
      ['烟酒', ['烟酒', '烟', '酒', 'Tobacco']],
      ['工资', ['薪水', 'Salary', 'Wage', 'Payroll']],
      ['奖金', ['Bonus', 'Award']],
      ['理财', ['投资', '基金', '股票', 'Investment']],
      ['红包', ['红包', 'Red Packet', 'Red Envelope']],
      ['退款', ['退款', '退货', 'Refund']],
      ['报销', ['报销', 'Reimbursement']],
      ['租金', ['租金', '房租收入', 'Rental Income']],
      ['利息', ['利息', 'Interest']],
    ];
    for (const [standard, aliasList] of aliases) {
      for (const alias of aliasList) {
        categoryAliasMap.set(alias, standard);
      }
    }

    for (const t of transactions) {
      // 分类名称映射
      let categoryName = t.categoryName;
      if (!categoryMap.has(categoryName)) {
        const mapped = categoryAliasMap.get(categoryName);
        if (mapped && categoryMap.has(mapped)) {
          categoryName = mapped;
        }
      }

      let categoryId = categoryMap.get(categoryName);
      if (!categoryId) {
        // 模糊匹配
        const matchedCategory = Array.from(categoryMap.keys()).find(
          key => key.includes(categoryName) || categoryName.includes(key)
        );
        if (matchedCategory) {
          categoryId = categoryMap.get(matchedCategory);
        }
      }

      if (!categoryId) {
        categoryId = categoryMap.get('其他') ?? categoryMap.get('其它') ?? Array.from(categoryMap.values()).find(id => id > 0);
      }

      if (!categoryId || isNaN(t.amount) || t.amount <= 0) {
        skipped++;
        skipReasons.push(`分类"${categoryName}"无法匹配, 金额"${t.amount}"`);
        continue;
      }

      await db.runAsync(
        'INSERT INTO transactions (book_id, category_id, amount, type, note, date) VALUES (?, ?, ?, ?, ?, ?)',
        [bookId, categoryId, t.amount, t.type, t.note || '', t.date]
      );
      imported++;
    }

    if (skipReasons.length > 0 && imported === 0) {
      throw new Error(`导入失败，全部跳过。\n跳过原因示例：\n${skipReasons.slice(0, 5).join('\n')}`);
    }

    return { imported, skipped };
  }

  private static detectAndConvertEncoding(bytes: number[]): string {
    // Check BOM first
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      return new TextDecoder('utf-8').decode(new Uint8Array(bytes.slice(3)));
    }
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
      return new TextDecoder('utf-16le').decode(new Uint8Array(bytes.slice(2)));
    }
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
      return new TextDecoder('utf-16be').decode(new Uint8Array(bytes.slice(2)));
    }

    // Try UTF-8 first
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
      // If it contains Chinese characters, verify it's not GBK misidentified as UTF-8
      if (/[\u4e00-\u9fff]/.test(text)) {
        // Check for common GBK false positives
        for (let i = 0; i < bytes.length - 1; i++) {
          const b1 = bytes[i], b2 = bytes[i + 1];
          // GBK lead byte 0x81-0xFE followed by trail byte that makes invalid UTF-8
          if (b1 >= 0x81 && b1 <= 0xFE && b2 >= 0x40 && b2 <= 0xFE && b2 !== 0x7F) {
            // This could be GBK - check if the UTF-8 decoded char is a replacement char or weird
            const utf8Char = text.charAt(i);
            if (utf8Char === '\uFFFD' || utf8Char.charCodeAt(0) > 0xFFFF) {
              throw new Error('GBK detected');
            }
          }
        }
      }
      return text;
    } catch {
      // Try GBK with TextDecoder (React Native supports this on Android/iOS)
      try {
        return new TextDecoder('gbk').decode(new Uint8Array(bytes));
      } catch {
        // Fallback: try gbk, gb2312, gb18030
        for (const enc of ['gb18030', 'gb2312', 'windows-1252']) {
          try {
            return new TextDecoder(enc).decode(new Uint8Array(bytes));
          } catch { /* continue */ }
        }
      }
    }

    // Last resort: treat as UTF-8
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  }
}
