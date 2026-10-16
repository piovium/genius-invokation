# `@gi-tcg/server` 对战平台后端

Nest.js 模块、Controller、依赖注入与 Fastify 结构保持不变。数据库通过 `DbModule` 导出的 `DbService` 使用 Drizzle ORM v1（固定 `1.0.0-rc.4`）。PostgreSQL 用 `pg` 连接池，本地无数据库配置时使用 PGlite。

## 本地开发与调试

1. 安装依赖并构建依赖 packages（根目录执行 `pnpm build server`）。
2. 在 `packages/server/.env` 设置 `JWT_SECRET=任意字符串`。可选 `GH_CLIENT_ID`、`GH_CLIENT_SECRET` 启用 GitHub OAuth。
3. 在 `packages/server` 执行 `pnpm dev`。启动前运行已提交的数据库迁移，然后通过 Node watch + ts-node/SWC 启动 Nest，保留 `emitDecoratorMetadata`。
4. 断点调试执行 `pnpm debug`，在 VS Code 使用 Node Attach 连接 `localhost:9229`，可直接在 `src/**/*.ts` 设置断点；修改代码后自动重启。

未设置 `DATABASE_URL` 时，本地数据保存于 `packages/server/.pglite`（可用 `PGLITE_DATA_DIR` 覆盖）。停止服务后删除该目录即可重置。此目录与旧 Prisma dev 数据目录独立；不会自动导入旧开发数据。需要保留旧数据时，先从旧服务导出 PostgreSQL 数据，再恢复到独立 PostgreSQL，并配置 `DATABASE_URL`。

设置 `DATABASE_URL` 时使用指定 PostgreSQL；`pnpm dev/debug` 会应用已提交迁移，因此应使用专用开发数据库。`DATABASE_CONNECTION_LIMIT` 可配置连接池大小。

修改 `src/db/schema.ts` 后执行 `pnpm db:generate`，审阅生成的 SQL 并提交 `drizzle/`。执行 `pnpm db:migrate` 应用迁移（本地 PGlite 需提供 `PGLITE_DATA_DIR`，`dev/debug` 自动设置）。不在服务启动时自动推送 schema。

验证：`pnpm check`、`pnpm test:db`、`pnpm build`。

## 从 Prisma 生产环境切换

本次保留 `User`、`Game`、`PlayerOnGames`、`Deck` 的原始表名、列名、序列、JSONB、`timestamp(3)`、主键和外键。`Deck.updatedAt` 仍由应用设置，游戏日志仍以原有 JSON 字符串格式存储。无需搬迁业务数据。

1. 备份数据库，在生产库副本上演练；确认旧版的三个 Prisma migration 已成功完成（历史 SQL 保留于 `prisma/migrations`，仅作审计和兼容测试）。
2. 使用新构建产物和相同 `DATABASE_URL` 执行 `node dist/migrate.js`（Docker 中是 `node migrate.js`）。迁移会识别旧库，验证迁移历史及基础结构，然后只登记 Drizzle 基线，保留 `_prisma_migrations`。空库则创建相同业务表。
3. 迁移成功后部署新服务。后续只使用 Drizzle migration；不要再运行 Prisma migrate 或 `drizzle-kit push`。

不完整、缺字段或缺历史记录的已有库会拒绝接管。先查明并修复差异，不要删除业务表或伪造迁移记录。迁移应由单个部署任务运行。可重复执行迁移命令。由于此次基线不修改已有业务表，可回退旧版应用；未来 schema 变更的回退需另行评估。

## 部署

- 根目录执行 `docker build -f packages/server/Dockerfile .`。镜像包含服务、迁移入口与 SQL，不需要在启动时下载 Prisma/Drizzle CLI。
- Docker Compose：在 `packages/server/.env` 设置 `JWT_SECRET` 等变量，执行 `docker compose up --build`；数据库健康后运行迁移，成功后启动服务。现有 Compose 数据目录配置应原样保留，不要通过删卷重建数据库来升级。
- 独立 PostgreSQL / Railway：配置 `DATABASE_URL`、`JWT_SECRET` 等环境变量，在部署前运行上述迁移入口，再启动 `node --experimental-vm-modules --enable-source-maps dist/main.js`。
