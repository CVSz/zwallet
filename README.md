# zWallet — Next-Gen Crypto Super App (Wallet + Swap + Payments)

zWallet is a production-grade multi-chain crypto super app with MPC wallet, intent-based swaps, and integrated crypto card + fiat payment rails.

It is a **production-ready, multi-chain crypto ecosystem** that combines:

- 🔐 Non-custodial wallet (MPC + Account Abstraction)
- 🔁 MEV-protected swap engine (DEX + RFQ routing)
- 💳 Crypto card + real-world payment rails
- 🌐 Multi-chain support (EVM, Solana, BTC)
- ⚡ High-performance backend (event-driven, scalable)

---

## 🚀 Core Capabilities

### 🔐 Wallet (MPC + Smart Accounts)
- No single private key exposure
- Threshold signing (MPC-ready)
- ERC-4337 account abstraction support
- Secure storage (mobile keystore + encryption)

---

### 🔁 Swap Engine (Advanced Execution)
- Multi-source routing (DEX + RFQ solvers)
- Intent-based execution model
- Slippage + price impact control
- MEV protection (private mempool / Flashbots)

---

### 💳 Crypto Card + Payments
- Virtual + physical card issuance (via issuer partners)
- Crypto → fiat real-time conversion
- Spend controls (limits, MCC filtering, freeze)
- Bill pay + mobile top-ups

---

### 🌐 Multi-Chain Support
- Ethereum (EVM-compatible)
- Solana
- Bitcoin (UTXO model)

---

### 🧠 Backend Architecture
- Node.js (TypeScript, Fastify/NestJS)
- PostgreSQL + Redis
- Kafka/NATS event streaming
- Multi-RPC provider mesh (failover + circuit breaker)

---

### 🛡️ Security Model
- Non-custodial by default
- MPC / threshold signing
- Input validation (Zod)
- Rate limiting + audit logs
- Mobile hardening (biometric, root detection, pinning)

---

### ⚙️ DevOps & Scalability
- Docker + Kubernetes
- Horizontal auto-scaling (HPA)
- Observability (Prometheus + Grafana + OpenTelemetry)
- CI/CD ready (GitHub Actions)

---

## 🧬 System Design Philosophy

zWallet is built as a **hybrid Web2.5 architecture**:

- Wallet & signing → **client-side / MPC boundary**
- Backend → **stateless orchestration**
- Payments → **regulated provider integration**

---

## ⚠️ Important Constraints

- Private keys never leave secure boundary
- Card data is fully tokenized (PCI isolation)
- All transactions are simulated before execution
- Multi-RPC is mandatory (no single point of failure)

---

## 🏗️ Repository Structure

```bash
/apps        # Client apps (Android + World App)
/services    # Backend APIs + workers
/packages    # Shared crypto + utilities
/infra       # Docker, Kubernetes, Terraform
```

---


## 🛠️ Automated Installer Setup

Use the generated installer configuration to bootstrap and validate the workspace in one command:

```bash
pnpm setup:auto
```

Installer definitions live in `scripts/installer.config.json` and are executed by `scripts/run-installer.mjs`. Override the config path with `--config=<path>` or `ZWALLET_INSTALLER_CONFIG=<path>` for environment-specific bootstrap flows.

---

## 🎯 Vision

To become a **global crypto super app** combining:

- Self-custody
- DeFi execution
- Real-world payments

into a single secure, scalable platform.

---

## 📌 Status

🚧 Under active development — designed for production-scale deployment (100k+ users)

---

## 🤝 Contributions

All contributors and AI agents must follow:
👉 `AGENTS.md` (strict engineering + security protocol)

---

## 📜 License

MIT (or specify your license)
