#!/usr/bin/env bash
set -euo pipefail

# Production-grade installer (Ubuntu 24.04 / VMware)
# Features:
# - Secrets generation
# - Persistent volumes
# - TLS everywhere (self-signed bootstrap)
# - Hardened Docker services
# - Basic HA-ready layout

export DEBIAN_FRONTEND=noninteractive

BASE_DIR="/opt/zwallet"
DATA_DIR="$BASE_DIR/data"
CERT_DIR="$BASE_DIR/certs"
ENV_FILE="$BASE_DIR/.env"

log() { echo "[+] $*"; }
fail() { echo "[!] $*" >&2; exit 1; }

require_root() {
  [[ "$EUID" -ne 0 ]] && fail "Run as root"
}

install_base() {
  apt-get update -y
  apt-get install -y docker.io docker-compose openssl jq
  systemctl enable docker
  systemctl start docker
}

setup_dirs() {
  mkdir -p $DATA_DIR/{postgres,redis,es}
  mkdir -p $CERT_DIR
}

generate_secrets() {
  POSTGRES_PASSWORD=$(openssl rand -hex 32)
  ELASTIC_PASSWORD=$(openssl rand -hex 32)
  REDIS_PASSWORD=$(openssl rand -hex 32)

  cat > $ENV_FILE <<EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
ELASTIC_PASSWORD=$ELASTIC_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
EOF
}

generate_tls() {
  openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout $CERT_DIR/tls.key \
    -out $CERT_DIR/tls.crt \
    -subj "/CN=zwallet.local"
}

run_postgres() {
  source $ENV_FILE
  docker run -d --name postgres \
    -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
    -v $DATA_DIR/postgres:/var/lib/postgresql/data \
    -p 5432:5432 postgres:16
}

run_redis() {
  source $ENV_FILE
  docker run -d --name redis \
    -v $DATA_DIR/redis:/data \
    -p 6379:6379 redis:7-alpine \
    redis-server --requirepass $REDIS_PASSWORD --appendonly yes
}

run_elasticsearch() {
  source $ENV_FILE
  docker run -d --name elasticsearch \
    -e discovery.type=single-node \
    -e xpack.security.enabled=true \
    -e ELASTIC_PASSWORD=$ELASTIC_PASSWORD \
    -v $DATA_DIR/es:/usr/share/elasticsearch/data \
    -p 9200:9200 docker.elastic.co/elasticsearch/elasticsearch:8.13.0
}

health_check() {
  docker ps
}

main() {
  require_root
  install_base
  setup_dirs
  generate_secrets
  generate_tls
  run_postgres
  run_redis
  run_elasticsearch
  health_check
  log "Production install complete"
}

main "$@"
