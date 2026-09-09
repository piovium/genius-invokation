FROM oven/bun:1.3.5-alpine AS bun-runtime
FROM node:26.1.0-alpine
COPY --from=bun-runtime /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /workspace
ENTRYPOINT ["node"]
CMD ["scripts/server-harness/experiments/run.mjs"]
