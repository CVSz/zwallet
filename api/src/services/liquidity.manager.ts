type Pool = {
  currency: string;
  available: number;
  reserved: number;
};

const pools: Record<string, Pool> = {};

export function reserveLiquidity(currency: string, amount: number) {
  const pool = pools[currency];
  if (!pool || pool.available < amount) {
    throw new Error('Insufficient liquidity');
  }

  pool.available -= amount;
  pool.reserved += amount;
}

export function releaseLiquidity(currency: string, amount: number) {
  const pool = pools[currency];
  pool.available += amount;
  pool.reserved -= amount;
}
