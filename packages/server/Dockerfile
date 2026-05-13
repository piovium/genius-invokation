FROM ghcr.io/pnpm/pnpm:latest AS build
RUN pnpm runtime set node 26 -g
WORKDIR /app
ARG DEFAULT_ASSETS_API_ENDPOINT
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build:no-typing server...

FROM node:26 AS deploy
COPY --from=build /app/packages/server/dist/* /app/packages/server/prisma /app/packages/server/prisma.config.ts ./

CMD ["node", "main.js"]
