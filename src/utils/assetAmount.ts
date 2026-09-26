export const MAX_ASSET_CENTS = 999999999999;
const OPERATOR = /[+\-×÷]/;

/** Round symmetrically to cents, including negative balances and binary float ties. */
export function toAssetCents(value: number): number {
  if (!Number.isFinite(value)) throw new Error('请输入有效的金额');
  const absolute = Math.abs(value);
  const cents = Math.sign(value) * Math.round((absolute + Number.EPSILON * absolute) * 100);
  if (!Number.isSafeInteger(cents) || Math.abs(cents) > MAX_ASSET_CENTS) {
    throw new Error('金额不能超过 9,999,999,999.99');
  }
  return cents === 0 ? 0 : cents;
}

/** Parse numbers and four arithmetic operators; never execute user input as code. */
export function evaluateAssetAmount(expression: string): number {
  const input = expression.replace(/\s/g, '');
  const tokens = input.match(/(?:\d+(?:\.\d*)?|\.\d+)|[+\-×÷]/g) ?? [];
  if (!input || tokens.join('') !== input) throw new Error('请输入有效的金额');
  let index = 0;
  const number = (): number => {
    let sign = 1;
    if (tokens[index] === '-') { sign = -1; index++; }
    const token = tokens[index++];
    if (!token || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) {
      throw new Error('请完成金额计算');
    }
    return sign * Number(token);
  };
  const term = (): number => {
    let value = number();
    while (tokens[index] === '×' || tokens[index] === '÷') {
      const op = tokens[index++];
      const next = number();
      if (op === '÷' && next === 0) throw new Error('除数不能为 0');
      value = op === '×' ? value * next : value / next;
    }
    return value;
  };
  let result = term();
  while (index < tokens.length) {
    const op = tokens[index++];
    if (op !== '+' && op !== '-') throw new Error('请输入有效的金额');
    const next = term();
    result = op === '+' ? result + next : result - next;
  }
  return toAssetCents(result);
}

export function appendAssetKey(expression: string, key: string, replace = false): string {
  if (key === 'C') return '';
  if (key === '⌫') return expression.slice(0, -1);
  if (OPERATOR.test(key)) {
    if (!expression || expression === '-') return key === '-' ? '-' : expression;
    return OPERATOR.test(expression.slice(-1)) ? expression.slice(0, -1) + key : expression + key;
  }
  if (!/^[\d.]$/.test(key)) return expression;
  const current = replace ? '' : expression;
  if (current.length >= 80) return current;
  const operand = current.split(/[+\-×÷]/).pop() ?? '';
  if (key === '.') return operand.includes('.') ? current : current + (operand ? '.' : '0.');
  if ((operand.split('.')[1]?.length ?? 0) >= 2) return current;
  if (!operand.includes('.') && operand.length >= 10) return current;
  return operand === '0' ? current.slice(0, -1) + key : current + key;
}

export function sumAssetBalances(accounts: ReadonlyArray<{ balance_cents: number }>): number {
  return accounts.reduce((total, account) => total + account.balance_cents, 0);
}
