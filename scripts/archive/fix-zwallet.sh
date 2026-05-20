#!/bin/bash
set -e

echo "🛠️ Starting zwallet structural fix and duplicate cleanup..."

# 1. Fix nested folder duplication
if [ -d "zwallet" ]; then
    echo "🔄 Merging nested zwallet/ directory to root..."
    rsync -av --update zwallet/ ./
    echo "🗑️ Removing duplicate nested zwallet/ directory..."
    rm -rf zwallet/
else
    echo "✅ No nested 'zwallet' directory found. Skipping."
fi

# 2. Combine unmerged versioned duplicates
echo "🔀 Resolving version drift and file duplicates..."

if [ -f "api/src/security/hmac.v2.middleware.ts" ]; then
    mv api/src/security/hmac.v2.middleware.ts api/src/security/hmac.middleware.ts
    echo "  -> Updated hmac.middleware.ts"
fi

if [ -f "security/controller/main_hardened.go" ]; then
    mv security/controller/main_hardened.go security/controller/main.go
    echo "  -> Updated main.go (Hardened)"
fi

if [ -f "formal/ledger_fixed.tla" ]; then
    mv formal/ledger_fixed.tla formal/ledger.tla
    echo "  -> Updated ledger.tla (Fixed Invariants)"
fi

# 3. Patch replay.protection.ts and remove the v2 duplicate
if [ -f "api/src/security/replay.v2.ts" ]; then
    echo "✍️ Patching replay.protection.ts with v2 combined logic..."
    cat << 'EOF' > api/src/security/replay.protection.ts
import Redis from 'ioredis';

const redis = new Redis();

export async function preventReplay(userId: string, nonce: string): Promise<void> {
  const key = `nonce:${userId}:${nonce}`;
  const isNew = await redis.set(key, '1', 'EX', 900, 'NX');
  if (!isNew) {
    throw new Error('Replay attack detected: Nonce has already been used.');
  }
}
EOF
    rm api/src/security/replay.v2.ts
    echo "  -> Patched replay.protection.ts and cleaned up v2"
fi

echo "🚀 zwallet repository fixes applied successfully!"
