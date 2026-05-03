# ZWallet Enterprise Stack

## Structure
- `api/`: FastAPI clean-architecture backend with JWT auth, rate limiting, Ethereum transfer integration.
- `mobile/`: Expo React Native secure mobile client.
- `k8s/`: Kubernetes deployment artifacts.
- `docker-compose.yml`: Local production-like environment.

## Security Controls
- Input validation with Pydantic and strict regex patterns.
- Password hashing with bcrypt.
- JWT auth with expiration.
- Rate limiting per IP.
- Non-root/read-only filesystem in Kubernetes manifest.
- Secrets pulled from environment / Kubernetes secret.

## Run
```bash
docker compose up --build
```

API: `http://localhost:8080/docs`
