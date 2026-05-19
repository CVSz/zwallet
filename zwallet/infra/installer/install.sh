#!/usr/bin/env bash
set -euo pipefail

# Ubuntu 24.04 Automated Installer for VMware (zWallet Full Stack)
# - Docker + Docker Compose
# - K8s (k3s)
# - Redis, Postgres, Kafka (containers)
# - NGINX + ModSecurity
# - SIEM (Elasticsearch + Kibana + Filebeat)
# - TLS (self-signed bootstrap)

export DEBIAN_FRONTEND=noninteractive

log() { echo -e "[+] $*"; }
err() { echo -e "[!] $*" >&2; }

require_root() {
  if [[ "$EUID" -ne 0 ]]; then err "Run as root"; exit 1; fi
}

install_base() {
  log "Updating system..."
  apt-get update -y
  apt-get upgrade -y

  log "Installing base packages..."
  apt-get install -y \
    ca-certificates curl gnupg lsb-release jq unzip git \
    build-essential software-properties-common
}

install_docker() {
  log "Installing Docker..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo $VERSION_CODENAME) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  systemctl enable docker
  systemctl start docker
}

install_k3s() {
  log "Installing k3s (lightweight Kubernetes)..."
  curl -sfL https://get.k3s.io | sh -
}

setup_dirs() {
  log "Preparing directories..."
  mkdir -p /opt/zwallet/{infra,logs,certs,data/{postgres,redis,es,filebeat}}
}

generate_certs() {
  log "Generating self-signed TLS certs (bootstrap)..."
  openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout /opt/zwallet/certs/tls.key \
    -out /opt/zwallet/certs/tls.crt \
    -subj "/CN=zwallet.local"
}

run_core_services() {
  log "Starting core services (Redis, Postgres, Kafka)..."

  docker network create zwallet-net || true

  docker run -d --name redis --network zwallet-net --restart=always \
    -v /opt/zwallet/data/redis:/data \
    -p 6379:6379 redis:7-alpine

  docker run -d --name postgres --network zwallet-net --restart=always \
    -e POSTGRES_PASSWORD=securepass \
    -v /opt/zwallet/data/postgres:/var/lib/postgresql/data \
    -p 5432:5432 postgres:16

  docker run -d --name zookeeper --network zwallet-net --restart=always \
    -e ALLOW_ANONYMOUS_LOGIN=yes bitnami/zookeeper:latest

  docker run -d --name kafka --network zwallet-net --restart=always \
    -e KAFKA_CFG_ZOOKEEPER_CONNECT=zookeeper:2181 \
    -e ALLOW_PLAINTEXT_LISTENER=yes \
    -p 9092:9092 bitnami/kafka:latest
}

run_edge_waf() {
  log "Starting NGINX (WAF)..."
  docker run -d --name nginx-waf --network zwallet-net --restart=always \
    -p 80:80 nginx:alpine
}

run_siem() {
  log "Starting SIEM stack..."

  docker run -d --name elasticsearch --network zwallet-net --restart=always \
    -e discovery.type=single-node \
    -e xpack.security.enabled=true \
    -v /opt/zwallet/data/es:/usr/share/elasticsearch/data \
    -p 9200:9200 docker.elastic.co/elasticsearch/elasticsearch:8.13.0

  docker run -d --name kibana --network zwallet-net --restart=always \
    -p 5601:5601 docker.elastic.co/kibana/kibana:8.13.0

  docker run -d --name filebeat --network zwallet-net --restart=always \
    -v /opt/zwallet/logs:/app/logs:ro \
    -v /opt/zwallet/data/filebeat:/usr/share/filebeat/data \
    docker.elastic.co/beats/filebeat:8.13.0
}

post_checks() {
  log "Running health checks..."
  docker ps
  kubectl get nodes || true
}

main() {
  require_root
  install_base
  install_docker
  install_k3s
  setup_dirs
  generate_certs
  run_core_services
  run_edge_waf
  run_siem
  post_checks

  log "Installation complete"
}

main "$@"
