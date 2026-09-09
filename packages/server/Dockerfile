FROM ghcr.io/pnpm/pnpm:12 AS build
RUN pnpm runtime set node 26.1.0 -g
WORKDIR /app
ARG DEFAULT_ASSETS_API_ENDPOINT
COPY . .
ENV FROM_SOURCE=1
RUN pnpm --filter @gi-tcg/server... install --frozen-lockfile && pnpm build:no-typing server...

FROM node:26.1.0-alpine AS deploy
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/packages/server/dist/ ./
EXPOSE 3000

CMD ["node", "main.js"]
