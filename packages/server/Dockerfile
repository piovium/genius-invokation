FROM ghcr.io/pnpm/pnpm:latest AS build
RUN pnpm runtime set node 26 -g
WORKDIR /app
ARG DEFAULT_STATIC_DATA_API_BASE_URL
COPY . .
# Browser downloads are unnecessary for the server/frontend build.
RUN PUPPETEER_SKIP_DOWNLOAD=true pnpm install --frozen-lockfile && pnpm build:no-typing server...
# The server subset does not use the workspace Puppeteer patch or optional dev peers.
RUN pnpm --filter @gi-tcg/server deploy --legacy --prod \
    --config.allowUnusedPatches=true --config.autoInstallPeers=false /deploy

FROM node:26 AS deploy
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /deploy/ ./

CMD ["node", "--experimental-vm-modules", "--enable-source-maps", "--import", "./scripts/ts_preload.js", "src/main.ts"]
