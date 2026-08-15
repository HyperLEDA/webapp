FROM node:22-slim AS builder
ARG APP
RUN test -n "$APP"
WORKDIR /app
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY apps/admin/package.json ./apps/admin/
COPY packages/lib/package.json ./packages/lib/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN bun install --frozen-lockfile
COPY . .
ENV PATH="/app/node_modules/typescript/bin:/app/node_modules/.bin:$PATH"
WORKDIR /app/apps/${APP}
RUN tsc -b && vite build

FROM node:22-slim
ARG APP
RUN test -n "$APP"
RUN apt-get update && apt-get install -y curl
WORKDIR /app
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY apps/admin/package.json ./apps/admin/
COPY packages/lib/package.json ./packages/lib/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN bun install --frozen-lockfile --production
COPY --from=builder /app/apps/${APP}/dist ./dist
COPY server.mjs .
CMD ["node", "server.mjs"]
