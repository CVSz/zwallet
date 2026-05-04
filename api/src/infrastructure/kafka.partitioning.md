# Kafka Ordering Guarantee

## Strategy:
- Use transaction_id as partition key
- Ensures ordering per transaction

## Producer Example:

producer.send({
  topic: 'transactions.completed',
  messages: [{
    key: transactionId,
    value: JSON.stringify(payload)
  }]
});

## Result:
- No out-of-order events
- Deterministic processing
