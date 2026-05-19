import fs from 'fs';

export function loadSecrets() {
  try {
    const dbPassword = fs.readFileSync('/vault/secrets/db-password', 'utf8');
    process.env.DB_PASSWORD = dbPassword.trim();

    const redisPassword = fs.readFileSync('/vault/secrets/redis-password', 'utf8');
    process.env.REDIS_PASSWORD = redisPassword.trim();

    console.log('Vault secrets loaded');
  } catch (err) {
    console.error('Vault injection failed', err);
    process.exit(1);
  }
}
