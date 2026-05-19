import crypto from 'crypto';

export function immutableAudit(event: string, payload: any, prevHash = '') {
  const data = JSON.stringify({ event, payload, prevHash, ts: Date.now() });

  const hash = crypto.createHash('sha256').update(data).digest('hex');

  const record = {
    event,
    payload,
    prevHash,
    hash,
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify(record));

  return hash;
}
