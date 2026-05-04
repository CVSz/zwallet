import { z } from 'zod';

const PrefundReq = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3),
});

type Quote = { rate: number; fee: number };

export class OfframpService {
  constructor(
    private readonly rfqEndpoints: string[],
    private readonly issuerLedger: { credit: (userId: string, amount: number, currency: string) => Promise<void> }
  ) {}

  async preFund(userId: string, amount: number, currency: string): Promise<boolean> {
    const req = PrefundReq.parse({ userId, amount, currency });
    if (!this.rfqEndpoints.length) return false;

    const quoteCandidates = await Promise.allSettled(this.rfqEndpoints.map((url) => this.fetchQuote(url, req)));
    const quotes = quoteCandidates
      .filter((candidate): candidate is PromiseFulfilledResult<Quote> => candidate.status === 'fulfilled')
      .map((candidate) => candidate.value);

    if (!quotes.length) return false;
    const best = quotes.sort((a, b) => b.rate - a.rate)[0];
    const creditedAmount = Math.max(0, amount - best.fee);
    if (creditedAmount <= 0) return false;

    await this.issuerLedger.credit(userId, creditedAmount, currency);
    return true;
  }

  private async fetchQuote(url: string, req: z.infer<typeof PrefundReq>): Promise<Quote> {
    const res = await fetch(`${url}/sell-crypto-quote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
    });

    if (!res.ok) throw new Error('RFQ_FAIL');
    const parsed = z.object({ rate: z.number().positive(), fee: z.number().nonnegative() }).safeParse(await res.json());
    if (!parsed.success) throw new Error('RFQ_INVALID');
    return parsed.data;
  }
}
