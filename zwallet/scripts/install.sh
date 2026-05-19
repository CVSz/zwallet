#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CONFIG_PATH="${ZWALLET_INSTALLER_CONFIG:-scripts/installer.config.json}"

echo "Running zWallet installer with config: ${CONFIG_PATH}"
node scripts/run-installer.mjs "--config=${CONFIG_PATH}"
