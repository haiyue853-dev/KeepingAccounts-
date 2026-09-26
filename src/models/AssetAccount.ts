export interface AssetAccount {
  id: number;
  name: string;
  provider: string;
  balance_cents: number;
}

export type AssetAccountInput = Omit<AssetAccount, 'id'>;
