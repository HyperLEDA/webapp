FROM node:22-slim AS builder
ARG APP
RUN test -n "$APP"
WORKDIR /app
COPY package.json yarn.lock ./
COPY apps/web/package.json ./apps/web/
COPY apps/admin/package.json ./apps/admin/
COPY packages/ui/package.json ./packages/ui/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn workspace @hyperleda/${APP} build

FROM node:22-slim
ARG APP
RUN test -n "$APP"
RUN apt-get update && apt-get install -y curl
WORKDIR /app
COPY package.json yarn.lock ./
COPY apps/web/package.json ./apps/web/
COPY apps/admin/package.json ./apps/admin/
COPY packages/ui/package.json ./packages/ui/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN yarn install --frozen-lockfile --production
COPY --from=builder /app/apps/${APP}/dist ./dist
COPY server.mjs .
CMD ["node", "server.mjs"]
