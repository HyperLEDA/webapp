FROM node:22-slim AS builder
ARG APP
RUN test -n "$APP"
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/web/package.json ./apps/web/
COPY apps/admin/package.json ./apps/admin/
COPY packages/lib/package.json ./packages/lib/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN corepack enable
RUN yarn install --immutable
COPY . .
RUN yarn workspace @hyperleda/${APP} build

FROM node:22-slim
ARG APP
RUN test -n "$APP"
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/web/package.json ./apps/web/
COPY apps/admin/package.json ./apps/admin/
COPY packages/lib/package.json ./packages/lib/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN corepack enable
RUN yarn workspaces focus --all --production
COPY --from=builder /app/apps/${APP}/dist ./dist
COPY server.mjs .
CMD ["yarn", "node", "server.mjs"]
