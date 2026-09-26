export interface AssetProvider {
  id: string;
  name: string;
  short: string;
  color: string;
  kind: 'bank' | 'wechat' | 'alipay' | 'cash' | 'other';
}

export const ASSET_PROVIDERS: AssetProvider[] = [
  { id: 'wechat', name: '微信', short: '微', color: '#18A558', kind: 'wechat' },
  { id: 'alipay', name: '支付宝', short: '支', color: '#1677FF', kind: 'alipay' },
  { id: 'cash', name: '现金', short: '现', color: '#BA8625', kind: 'cash' },
  { id: 'icbc', name: '工商银行', short: '工', color: '#C62828', kind: 'bank' },
  { id: 'ccb', name: '建设银行', short: '建', color: '#245A9B', kind: 'bank' },
  { id: 'abc', name: '农业银行', short: '农', color: '#16836B', kind: 'bank' },
  { id: 'boc', name: '中国银行', short: '中', color: '#B72839', kind: 'bank' },
  { id: 'cmb', name: '招商银行', short: '招', color: '#C83145', kind: 'bank' },
  { id: 'bocom', name: '交通银行', short: '交', color: '#365394', kind: 'bank' },
  { id: 'psbc', name: '邮储银行', short: '邮', color: '#187847', kind: 'bank' },
  { id: 'citic', name: '中信银行', short: '信', color: '#C0323B', kind: 'bank' },
  { id: 'spdb', name: '浦发银行', short: '浦', color: '#284D85', kind: 'bank' },
  { id: 'cib', name: '兴业银行', short: '兴', color: '#246BA3', kind: 'bank' },
  { id: 'cmbc', name: '民生银行', short: '民', color: '#278564', kind: 'bank' },
  { id: 'ceb', name: '光大银行', short: '光', color: '#80519D', kind: 'bank' },
  { id: 'pab', name: '平安银行', short: '平', color: '#E87924', kind: 'bank' },
  { id: 'cgb', name: '广发银行', short: '广', color: '#C63047', kind: 'bank' },
  { id: 'bank', name: '其他银行', short: '银', color: '#5973A0', kind: 'bank' },
  { id: 'other', name: '自定义账户', short: '资', color: '#927451', kind: 'other' },
];

export function getAssetProvider(id: string): AssetProvider {
  return ASSET_PROVIDERS.find((provider) => provider.id === id) ?? ASSET_PROVIDERS[ASSET_PROVIDERS.length - 1];
}
