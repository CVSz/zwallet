export function fraudScore(tx: any): number {
  let score = 0;

  if (tx.amount > 10000) score += 30;
  if (tx.geoMismatch) score += 40;
  if (tx.deviceChanged) score += 20;

  return score;
}

export function fraudDecision(score: number) {
  if (score >= 70) return 'block';
  if (score >= 40) return 'review';
  return 'allow';
}
