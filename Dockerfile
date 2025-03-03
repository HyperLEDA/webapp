FROM node:22-slim AS builder
WORKDIR /app
COPY package.json ./
RUN yarn install
COPY . .
RUN yarn build

FROM node:22-slim
WORKDIR /app
RUN yarn add serve
COPY --from=builder /app/dist ./dist
CMD ["yarn", "serve", "-s", "dist", "-l", "3000"]
