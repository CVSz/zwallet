FROM node:22-alpine

ARG SERVICE_PATH
ARG SERVICE_NAME

WORKDIR /workspace

COPY package.json pnpm-lock.yaml ./
COPY services ./services
COPY packages ./packages

RUN corepack enable && pnpm install --frozen-lockfile

WORKDIR /workspace/${SERVICE_PATH}

EXPOSE 8080
CMD ["sh", "-c", "node --loader ts-node/esm src/index.ts"]
