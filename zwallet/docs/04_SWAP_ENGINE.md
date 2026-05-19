# 4. SWAP ENGINE
Pipeline:
1. Fetch quotes (1inch, Jupiter)
2. Normalize routes
3. Simulate tx
4. Select optimal route
5. Execute
6. Fallback retry

Constraints:
- handle RPC failure
- handle slippage
- handle partial execution

API:
- POST /quote
- POST /execute
