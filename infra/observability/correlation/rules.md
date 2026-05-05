# Correlation Rules (SOC)

## Example Detection Rules

### 1. Brute Force Attack
- condition: > 50 failed requests / minute per identity
- action: block + alert

### 2. Bot Scanning
- condition: multiple endpoints hit rapidly + suspicious UA
- action: shadow ban + alert

### 3. Admin Abuse
- condition: admin actions > threshold
- action: alert + audit

### 4. Anomaly Spike
- condition: sudden increase in 429 or 403
- action: scale + alert
