import { processTransaction } from '../transaction.usecase';

export async function transactionSaga(entries: any[], idemKey: string) {
  try {
    const result = await processTransaction(entries, idemKey);

    return {
      status: 'completed',
      txId: result.txId
    };
  } catch (err) {
    // compensation logic
    return {
      status: 'failed',
      error: err instanceof Error ? err.message : 'unknown'
    };
  }
}
