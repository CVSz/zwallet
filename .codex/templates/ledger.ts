export type Entry = { accountId: string; amount: number; type: 'debit' | 'credit' };

export class LedgerService {
  validate(entries: Entry[]) {
    const sum = entries.reduce((acc, e) => acc + (e.type === 'debit' ? e.amount : -e.amount), 0);
    if (sum !== 0) {
      throw new Error('Unbalanced transaction');
    }
  }
}
