# path: infra/observability/elasticsearch/init.sh

curl -u elastic:$ELASTIC_PASSWORD -k \
  -X PUT "https://localhost:9200/_index_template/logs-template" \
  -H "Content-Type: application/json" \
  -d @index-template.json

curl -u elastic:$ELASTIC_PASSWORD -k \
  -X PUT "https://localhost:9200/_ilm/policy/logs-policy" \
  -H "Content-Type: application/json" \
  -d @ilm-policy.json
