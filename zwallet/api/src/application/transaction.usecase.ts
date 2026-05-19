import { executeTransaction, Entry } from '../domain/ledger.service';
import { sendEvent } from '../infrastructure/kafka.producer';

export async function processTransaction(entries: Entry[], idemKey: string) {
  const result = await executeTransaction(entries, idemKey);

  await sendEvent('transactions.completed', {
    txId: result.txId,
    entries
  });

  return result;
}
