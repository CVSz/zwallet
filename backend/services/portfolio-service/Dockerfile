FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/portfolio-service/package.json ./services/portfolio-service/package.json
RUN npm ci

COPY packages ./packages
COPY services/portfolio-service ./services/portfolio-service

RUN npm run build -w services/portfolio-service

WORKDIR /app/services/portfolio-service
CMD ["npm", "run", "start"]
