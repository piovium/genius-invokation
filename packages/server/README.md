# @gi-tcg/server 对战平台后端

服务使用 Elysia / Node.js、Drizzle 和 PostgreSQL，实时对局使用二进制 WebSocket。原 HTTP API、OAuth 凭证和 PostgreSQL 表名、字段、约束继续兼容。游戏状态直接传 protobuf 字节，控制消息为 JSON；服务不提供 SSE 回退。

## 开发与构建

使用仓库要求的 Node 26.1+、pnpm 12 安装及构建，使用 Node.js 26.1+ 运行服务。安装服务及依赖：

    pnpm --filter @gi-tcg/server... install --frozen-lockfile
    pnpm build:no-typing server...

在 packages/server/.env 设置 DATABASE_URL、JWT_SECRET；GitHub 登录另需 GH_CLIENT_ID、GH_CLIENT_SECRET。开发启动前执行 pnpm migrate，再运行 pnpm dev。开发和生产均连接真实 PostgreSQL，不再启动 Prisma/PGLite 模拟数据库。

开发、类型检查与测试需要本地 assets-manager 数据快照。上面的完整构建会先生成该依赖；随后在 packages/server 执行 pnpm prepare:metadata，从 assets-manager/dist/data（FROM_SOURCE=1 时使用 src/data）生成牌组校验所需的精简元数据及来源哈希清单。该步骤只读取本地数据，不访问 CDN。pnpm dev、pnpm check 和通用测试命令会自动准备元数据；单独运行房间测试前需先执行此步骤。

生产构建位于 dist/，包含 main.js、migrate.js、frontend/ 和原始 prisma/migrations/ SQL。运行 node dist/main.js。前端 JS、CSS、图片通过 Node 文件流 按请求返回，不内嵌 base64 或整体载入服务内存；保留 WEB_CLIENT_BASE_PATH、SPA 回退、MIME、ETag、sw.js 和 HTML 的 no-cache，以及带 hash 资源的 immutable 缓存行为。

## 数据库升级

已有 PostgreSQL 数据库执行 node dist/migrate.js（源码环境执行 pnpm migrate）。迁移器在事务和 advisory lock 下，验证并认领已完成的 \_prisma_migrations 记录与原始 SQL 校验和；已准备的隔离 harness 数据库可通过 \_HarnessMigration 记录认领。新的记录写入 \_\_drizzle_migrations，旧迁移记录和业务行保留。

空库按时间顺序执行原仓库 SQL。重复执行不重复建表、不重置序列或修改已有用户、牌组、对局；迁移日志不完整、校验和不符、未知已有表或列/主键/外键不一致时拒绝继续。DATABASE_URL 的 schema 参数用于选择现有 schema；迁移前需已创建该 schema。DATABASE_CONNECTION_LIMIT 控制连接池，默认 2。原 prisma/schema.prisma 和 SQL 保留作历史对照，运行时不依赖 Prisma。

## 部署

在仓库根目录执行 docker build -f packages/server/Dockerfile .，运行镜像时提供 JWT_SECRET 与 DATABASE_URL。镜像先以 Node/pnpm 构建，运行层仅需 Node.js。Compose 先检查 PostgreSQL 健康，再运行一次迁移容器，最后启动服务；数据库使用持久化 volume。已有部署升级时继续挂载原数据库 volume，避免切换到空库。

WebSocket 与 HTTP 共用端口 3000。反向代理需要转发 Upgrade，空闲超时应大于服务的心跳周期。metrics 仍位于 /metrics，API 使用 WEB_CLIENT_BASE_PATH + api。Redis、房间回放/S3、部署健康检查保留现有环境变量。收到退出信号后等待已有房间结束，Compose 提供 10 分钟退出宽限。

## 验证

协议、真实对局、数据库写入与 RSS 的判定继续使用 ../../scripts/server-harness/README.md 约定的独立 harness。先运行其 environment/prepare.mjs 创建隔离数据库和账号，真实迁移验收使用 candidate.json；100 MiB 常驻、50 MiB 单局增量门槛未调整。

以下命令在 packages/server 目录执行；pnpm test 覆盖 HTTP、认证、牌组元数据、房间和 WebSocket，test:rooms 与 test:http 可用于单独验证对应部分：

    pnpm prepare:metadata
    pnpm check
    pnpm test
    pnpm test:rooms
    pnpm test:http
    pnpm test:db

数据库测试须显式设置 SERVER_DB_TEST_URL 指向隔离 gi_server_harness 数据库。测试只创建并回收自己随机命名的 schema，验证旧 Prisma 数据认领、约束、Drizzle 写入、事务回滚及独立进程重启后的持久化。测试及构建通过本身不等于真实内存达标。
