import { DeepSeekConfig } from './DeepSeekConfig';
import { TransactionType } from '../../models/Category';
import { parseChineseDate } from '../../utils/dateParser';

export interface ParsedTransaction {
  amount: number;
  type: TransactionType;
  categoryName: string;
  note: string;
  date?: string;
}

const SYSTEM_PROMPT = `你是一个智能记账助手。用户会告诉你收支情况，可能一段话里包含多条记录。
请只返回 JSON 数组，不要返回解释文字。

返回格式：
[
  {
    "amount": 数字，必须大于 0,
    "type": "expense" 或 "income",
    "categoryName": "从分类列表中选择最匹配的分类",
    "note": "简短备注",
    "date": "YYYY-MM-DD 格式的具体日期"
  }
]

支出分类：餐饮、购物、日用、交通、蔬菜、水果、零食、运动、娱乐、居住、医疗、教育、通讯、服饰、美容、社交、宠物、旅行、数码、汽车、烟酒、其他
收入分类：工资、奖金、理财、兼职、红包、报销、租金、利息、退款、其他

规则：
1. 没有明确说收入、工资、奖金、收到、报销、退款等时，默认支出。
2. 金额必须是数字，不带单位。
3. 尽量拆分每条独立记录。
4. 分类必须从上面的分类列表里选择。
5. 备注简短，保留原始含义。
6. 日期必须返回 YYYY-MM-DD 格式。根据以下规则推算具体日期（以当前日期为基准）：
   - "今天" → 当天日期
   - "昨天/昨日" → 前一天
   - "前天" → 前两天
   - "大前天" → 前三天
   - "N天前/N日前" → 往前推N天
   - "上周X/上星期X/上礼拜X" → 上周的对应星期几
   - "这周X/本周X/这星期X" → 本周的对应星期几
   - "X月X日/X月X号" → 当年的对应日期
   - "XXXX年X月X日" → 具体日期
   - 如果用户没有提到日期，返回当天日期
7. 如果用户提到时间（如"早上"、"中午"、"下午"、"晚上"），在备注中保留时间信息。
8. 只能返回 JSON 数组。`;

export class DeepSeekTransactionParser {
  static async parse(text: string): Promise<ParsedTransaction[]> {
    const apiKey = await DeepSeekConfig.getApiKey();
    if (!apiKey) {
      throw new Error('请先在设置中配置 DeepSeek API Key');
    }

    const baseUrl = await DeepSeekConfig.getBaseUrl();

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        temperature: 0.1,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API 错误: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('DeepSeek 返回结果为空');
    }

    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      return items.map((item: any) => {
        const rawDate = String(item.date || '').trim();
        let date: string;
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
          date = rawDate;
        } else if (rawDate) {
          // 尝试解析中文日期（如"昨天"、"上周五"等）
          const parsed = parseChineseDate(rawDate);
          date = parsed || todayStr;
        } else {
          // 没有提到日期，使用当前日期
          date = todayStr;
        }
        return {
          amount: Number(item.amount) || 0,
          type: (item.type === 'income' ? 'income' : 'expense') as TransactionType,
          categoryName: String(item.categoryName || ''),
          note: String(item.note || ''),
          date,
        };
      }).filter((item) => item.amount > 0);
    } catch {
      throw new Error('AI 解析结果格式错误，请重试');
    }
  }
}
