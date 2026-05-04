import { executeTransaction } from '../../api/src/domain/ledger.service';

async function run() {
  const entries = [
    { accountId: 'A', amount: 100, direction: 'debit' as const },
    { accountId: 'B', amount: 100, direction: 'credit' as const }
  ];

  const promises = [];

  for (let i = 0; i < 100; i++) {
    promises.push(executeTransaction(entries, `test-${i}`));
  }

  await Promise.all(promises);

  console.log('Stress test completed');
}

run().catch(console.error);
