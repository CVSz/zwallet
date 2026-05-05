#!/bin/sh
set -e

ELASTIC_URL=${ELASTIC_URL:-https://elasticsearch:9200}
USER=elastic
PASS=${ELASTIC_PASSWORD}

# Index template
curl -u $USER:$PASS -k -X PUT "$ELASTIC_URL/_index_template/logs-template" \
  -H "Content-Type: application/json" \
  -d @index-template.json

# ILM policy
curl -u $USER:$PASS -k -X PUT "$ELASTIC_URL/_ilm/policy/logs-policy" \
  -H "Content-Type: application/json" \
  -d @ilm-policy.json

# Bootstrap index
curl -u $USER:$PASS -k -X PUT "$ELASTIC_URL/logs-000001" \
  -H "Content-Type: application/json" \
  -d '{
    "aliases": {
      "logs": { "is_write_index": true }
    },
    "settings": {
      "index.lifecycle.name": "logs-policy"
    }
  }'
