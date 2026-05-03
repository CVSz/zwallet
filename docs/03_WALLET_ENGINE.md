# 3. WALLET ENGINE
Implement:
- BIP39 mnemonic
- BIP44 derivation
- EVM / SOL / BTC support

Functions:
- deriveAddress()
- signTransaction()
- verifySignature()

Security:
- AES-256-GCM encryption
- zero plaintext storage
- memory wipe

Tests:
- valid/invalid signatures
- cross-chain validation
