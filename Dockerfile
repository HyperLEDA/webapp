FROM node:22-slim AS builder
WORKDIR /app
COPY package.json yarn.lock ./
COPY apps/web/package.json ./apps/web/
RUN yarn install --frozen-lockfile
COPY . .

RUN yarn build

FROM node:22-slim
RUN apt-get update && apt-get install -y curl
WORKDIR /app
COPY package.json yarn.lock ./
COPY apps/web/package.json ./apps/web/
RUN yarn install --frozen-lockfile --production
COPY --from=builder /app/apps/web/dist ./dist
COPY server.mjs .
CMD ["node", "server.mjs"]
