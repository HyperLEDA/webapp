FROM node:22-slim AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .

RUN yarn build

FROM node:22-slim
RUN apt-get update && apt-get install -y curl
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production
COPY --from=builder /app/dist ./dist
COPY server.mjs .
CMD ["node", "server.mjs"]
