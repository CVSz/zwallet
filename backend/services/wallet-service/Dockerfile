FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/wallet-service/package.json ./services/wallet-service/package.json
RUN npm ci

COPY packages ./packages
COPY services/wallet-service ./services/wallet-service

RUN npm run build -w services/wallet-service

WORKDIR /app/services/wallet-service
CMD ["npm", "run", "start"]
