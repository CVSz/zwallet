# Multi-Region Architecture

- Active-Active regions (ap-southeast-1, eu-west-1)
- Global Load Balancer (Geo DNS)
- Regional API Gateways
- Sharded PostgreSQL (Citus)
- Kafka Cluster (multi-broker, cross-region replication)
- Redis Cluster (per region)

## Flow
Client → GeoDNS → Region → API → Ledger → Outbox → Kafka → Consumers
