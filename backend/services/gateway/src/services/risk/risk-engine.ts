export type CardAuthEvent = {
  userId: string;
  cardId: string;
  amount: number;
  currency: string;
  mcc: string;
  merchant: string;
  ipCountry?: string;
};

export class RiskEngine {
  private readonly mccBlocklist = new Set(['7995']);
  private readonly singleTxnLimitByCurrency: Record<string, number> = { USD: 2000, EUR: 1800, THB: 70000 };

  async evaluate(ev: CardAuthEvent): Promise<{ allow: boolean; reason?: string }> {
    if (this.mccBlocklist.has(ev.mcc)) return { allow: false, reason: 'MCC_BLOCKED' };
    const limit = this.singleTxnLimitByCurrency[ev.currency] ?? 1000;
    if (ev.amount > limit) return { allow: false, reason: 'LIMIT_EXCEEDED' };
    return { allow: true };
  }
}
