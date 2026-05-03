FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
COPY services/gateway/package.json ./services/gateway/package.json
RUN npm ci

COPY services/gateway ./services/gateway

RUN npm run build -w services/gateway

WORKDIR /app/services/gateway
CMD ["npm", "run", "start"]
