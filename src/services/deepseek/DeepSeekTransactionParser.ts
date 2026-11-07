import { DeepSeekConfig } from './DeepSeekConfig';
import { isValidDate, parseChineseDate } from '../../utils/dateParser';
import { getToday } from '../../utils/formatters';
import { MAX_ASSET_CENTS } from '../../utils/assetAmount';

export type VoiceEntryType = 'expense' | 'income' | 'refund' | 'cashback' | 'reimbursement' | 'unsupported';
export interface ParsedTransaction {
  amount: number | null;
  type: VoiceEntryType;
  categoryName: string;
  note: string;
  date: string;
  accountName?: string;
  originalDate?: string;
  originalAmount?: number;
  originalNote?: string;
  fullRefund?: boolean;
  status: 'completed' | 'pending' | 'unclear';
  issue?: string;
}

interface ParseContext {
  today?: string;
  expenseCategories?: string[];
  incomeCategories?: string[];
  accountNames?: string[];
}

const SYSTEM_PROMPT = `你是记账助手，将用户口述拆成独立的实际收支，返回 JSON 数组，不要解释或 Markdown。
每项格式：
{"type":"expense|income|refund|cashback|reimbursement|unsupported","amount":数字或null,"categoryName":"分类","note":"简短备注","date":"YYYY-MM-DD","dateText":"原文中本笔实际发生/到账日期的短语，没有则空字符串","accountName":"原文付款/到账账户，没有则空字符串","originalDate":"原消费日期YYYY-MM-DD，没有则空字符串","originalDateText":"原文消费日期短语，没有则空字符串","originalAmount":原消费金额或null,"originalNote":"原商品或用途关键词","fullRefund":false,"status":"completed|pending|unclear","issue":"需要补充的信息"}
规则：
1. 区分实际支出 expense、普通收入 income、退款 refund、返现 cashback、报销 reimbursement。退款/返现/报销应关联原消费，不能当普通收入，更不能因提及历史消费而再生成一笔支出。
2. date 是本笔消费或退款实际到账日期，originalDate 是被退/报销的原消费日期，不能混淆。例如“11月3日收到10月20日买鞋的退款50元，退到微信”返回 refund，amount=50，date=当年11月3日，originalDate=当年10月20日，accountName=微信，originalNote=鞋。只说“昨天买的鞋退了”，退款 date=今天，originalDate=昨天。
3. 相对日期按给定当地今天计算。每笔各自日期，不可整段使用同一日期。保留具体日期、跨月/跨年含义；日期含糊或不可能时 status=unclear，不要猜测。dateText 与 originalDateText 分别原样保留各自的日期短语，不能包含另一事件日期。
4. 金额为元，中文金额转换为数字，最多两位小数，不把日期、商品数量或原价当本笔金额。说“原价100退30”只记录30；说“全额退款”且没说退款金额时 amount=null、fullRefund=true，交由用户选择原消费后计算剩余未返还金额。
5. 多笔收支分别返回各自账户，付款和到账账户可以不同。未知账户保留原称呼；不能猜测银行卡。同一银行多张卡时让用户选择。
6. 未到账、申请中、计划、将要发生的款项 status=pending，不记成已到账。金额或到账日期不确定时 status=unclear 并说明 issue。原消费有多笔候选时仍返回 completed，由界面让用户选原消费。没有明确金额可设 amount=null。不要忽略否定句；“不是30是20”以最终更正为准。
7. 提现、存现金、账户间转账、借还款、修改/删除历史记录不能按普通收支新增，返回 type=unsupported、status=unclear、issue说明需单独处理。不要把这些动作默默丢掉；纯闲聊返回空数组。
8. categoryName 只能选对应的可用分类；确实无法匹配时用“其他”，没有“其他”时留空供用户选择。备注保留商品、商家和早晚等有用信息。
9. 不要生成交易ID或账户ID，系统会匹配真实记录。`;

export function parseVoiceAmount(value: unknown): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || !/^\d+(?:\.\d{1,2})?$/.test(String(value).trim())) {
    throw new Error('金额必须是大于 0 的数字，最多两位小数');
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount * 100 > MAX_ASSET_CENTS) throw new Error('请输入有效的正数金额');
  return Math.round(amount * 100) / 100;
}

function dateValue(raw: unknown, expression: unknown, today: string): string | undefined {
  if (typeof expression === 'string' && expression.trim()) {
    const parsed = parseChineseDate(expression, today);
    if (parsed) return parsed;
    if (/\d+(?:月|[-/])\d+/.test(expression)) throw new Error(`日期无效：${expression}`);
  }
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw !== 'string') throw new Error('日期格式不正确');
  const value = raw.trim();
  if (isValidDate(value)) return value;
  const parsed = parseChineseDate(value, today);
  if (!parsed) throw new Error(`日期无效：${value}`);
  return parsed;
}

export function normalizeParsedTransactions(raw: unknown, text: string, today = getToday()): ParsedTransaction[] {
  if (!Array.isArray(raw)) throw new Error('AI 返回格式错误，请重新解析');
  return raw.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`第 ${index + 1} 笔格式错误`);
    if (!['expense', 'income', 'refund', 'cashback', 'reimbursement', 'unsupported'].includes(item.type)) throw new Error('无法确定收支类型，请重新描述');
    let type = item.type as VoiceEntryType;
    let status: ParsedTransaction['status'] = item.status ?? 'completed';
    if (!['completed', 'pending', 'unclear'].includes(status)) throw new Error('无法确定款项是否已到账');
    // A single mistaken AI label must not turn a refund or account transfer into new income/expense.
    if (raw.length === 1) {
      if (/(?:从.+转到|转账|提现|存入现金|账户间转)/.test(text)) {
        type = 'unsupported';
        status = 'unclear';
      } else if (/(?:还没|尚未|未)(?:收到|到账)|申请中|待到账|预计退款/.test(text)) {
        status = 'pending';
      }
      if (type === 'income' && /退款|退货退款|退钱/.test(text)) type = 'refund';
      if (type === 'expense' && /退款(?:\d|[零〇一二两三四五六七八九十百千万]|到账|退到)|(?:收到|退回).{0,20}退款/.test(text)) type = 'refund';
      if (type === 'income' && /返现/.test(text)) type = 'cashback';
      if (type === 'income' && /报销/.test(text)) type = 'reimbursement';
    }
    const fullRefund = type === 'refund' && item.fullRefund === true;
    const unresolved = status !== 'completed' || type === 'unsupported';
    const amount = item.amount == null && (fullRefund || unresolved) ? null : parseVoiceAmount(item.amount);
    let date = dateValue(item.date, item.dateText, today);
    if (!date) {
      if (unresolved) date = today;
      else if (type === 'income' || type === 'expense') {
        if (raw.length !== 1) throw new Error('多笔记录需要分别明确日期，请重新解析');
        date = parseChineseDate(text, today) ?? today;
        if (/\d+(?:月|[-/])\d+/.test(text) && !parseChineseDate(text, today)) throw new Error('日期无效，请检查后重新解析');
      } else throw new Error('请明确退款、返现或报销的到账日期');
    }
    const originalDate = dateValue(item.originalDate, item.originalDateText, today);
    return {
      type, amount, date, status, fullRefund,
      categoryName: typeof item.categoryName === 'string' ? item.categoryName.trim() : '',
      note: typeof item.note === 'string' ? item.note.trim() : '',
      accountName: typeof item.accountName === 'string' ? item.accountName.trim() : '',
      originalDate,
      originalAmount: item.originalAmount == null ? undefined : parseVoiceAmount(item.originalAmount),
      originalNote: typeof item.originalNote === 'string' ? item.originalNote.trim() : '',
      issue: typeof item.issue === 'string' ? item.issue : '',
    };
  });
}

export class DeepSeekTransactionParser {
  static async parse(text: string, context: ParseContext = {}): Promise<ParsedTransaction[]> {
    const apiKey = await DeepSeekConfig.getApiKey();
    if (!apiKey) throw new Error('请先在设置中配置 DeepSeek API Key');
    const today = context.today ?? getToday();
    const prompt = `${SYSTEM_PROMPT}\n当地今天日期：${today}\n可用支出分类：${JSON.stringify(context.expenseCategories ?? [])}\n可用收入分类：${JSON.stringify(context.incomeCategories ?? [])}\n可用资产账户：${JSON.stringify(context.accountNames ?? [])}`;
    const baseUrl = await DeepSeekConfig.getBaseUrl();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: prompt }, { role: 'user', content: text }], temperature: 0.1, max_tokens: 4000 }),
      });
      if (!response.ok) throw new Error(`AI 解析请求失败（${response.status}），请稍后重试`);
      const data = await response.json();
      if (data.choices?.[0]?.finish_reason === 'length') throw new Error('内容太长，请分成几段解析');
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) throw new Error('AI 返回结果为空');
      let raw: unknown;
      try { raw = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
      catch { throw new Error('AI 返回格式错误，请重新解析'); }
      return normalizeParsedTransactions(raw, text, today);
    } catch (error) {
      if (controller.signal.aborted) throw new Error('解析超时，请重试');
      throw error;
    } finally { clearTimeout(timeout); }
  }
}
