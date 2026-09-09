FROM node:26.1.0-alpine
COPY package*.json /opt/harness-ws/
RUN npm ci --prefix /opt/harness-ws --ignore-scripts --no-audit --no-fund
ENV NODE_PATH=/opt/harness-ws/node_modules
WORKDIR /workspace
ENTRYPOINT ["node"]
CMD ["scripts/server-harness/experiments/run.mjs"]
