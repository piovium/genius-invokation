# @gi-tcg/server 对战平台后端

服务使用 Node.js 运行 Elysia，通过 Drizzle 访问 PostgreSQL。HTTP API、OAuth 凭证以及数据库表名、字段和约束保持兼容。实时对局使用二进制 WebSocket：游戏状态传输 protobuf 字节，控制消息使用 JSON，不提供 SSE 回退。

## 迁移目标（进行中）

本路线要求 HTTP 路由、校验、鉴权、错误与插件组合全部使用 **Elysia 原生写法**，运行时保持 Node.js：依赖、脚本、`Bun.` 全局对象、`bun:` 模块与基础镜像都不得改用 Bun，也不得保留 harness 约束规则禁止的历史兼容层。

可执行检查：在仓库根目录运行 `npm run harness:constraints`，规则与例外见 [harness 说明](../../scripts/server-harness/README.md)。当前检查尚未通过，启动装配、错误处理与模块划分仍是过渡写法。

## 开发与构建

安装、构建和运行需要 Node.js 26.1+，包管理器使用 pnpm 12。在仓库根目录安装服务及其依赖并构建：

    pnpm --filter @gi-tcg/server... install --frozen-lockfile
    pnpm build:no-typing server...

在 `packages/server/.env` 设置 `DATABASE_URL` 和 `JWT_SECRET`；GitHub 登录还需要 `GH_CLIENT_ID` 和 `GH_CLIENT_SECRET`。随后在 `packages/server` 执行 `pnpm migrate`，再运行 `pnpm dev`。开发和生产均连接 PostgreSQL，不再启动嵌入式模拟数据库。

开发、类型检查和测试需要 assets-manager 的本地数据快照。上面的构建命令会先生成该依赖。`pnpm prepare:metadata` 从 `assets-manager/dist/data` 提取牌组校验字段，并生成记录来源哈希的清单；设置 `FROM_SOURCE=1` 时使用 `src/data`。该步骤只读取本地文件，不访问 CDN。`pnpm dev`、`pnpm check` 和 `pnpm test` 会自动准备元数据；单独运行房间测试前需要先准备。

生产构建位于 `dist/`，包含 `main.js`、`migrate.js`、`frontend/` 与 `migrations/` 下的 SQL。使用 `node dist/main.js` 启动。前端 JS、CSS 和图片按请求通过 Node 文件流返回，无需将整个文件载入内存。`WEB_CLIENT_BASE_PATH`、SPA 回退、MIME 和 ETag 行为保持兼容；`sw.js` 与 HTML 使用 `no-cache`，文件名带哈希的资源使用 `immutable` 缓存。

## 数据库升级

对已有 PostgreSQL 数据库执行 `node dist/migrate.js`，源码环境执行 `pnpm migrate`。迁移器在事务和 PostgreSQL advisory lock 保护下执行 `migrations/` 中的 SQL，并把已执行迁移的名称与校验和写入 `__drizzle_migrations`。若 schema 已由同一批 SQL 通过 `_HarnessMigration` 记录创建（隔离测试夹具），迁移器核对记录中的校验和后直接接管，不重复执行；业务数据保留。`MIGRATIONS_DIRECTORY` 可覆盖 SQL 目录，默认使用发行包内的 `migrations/`。

空库按时间顺序执行 `migrations/` 中的 SQL。重复执行不会重新建表、重置序列或修改已有用户、牌组和对局。迁移记录不完整、校验和不符、已有业务表缺少可验证的迁移记录，或列、主键、外键与 SQL 不一致时，迁移器会报错并回滚事务。

`DATABASE_URL` 的 `schema` 参数选择现有 schema，因此需在迁移前创建它。`DATABASE_CONNECTION_LIMIT` 设置连接池上限，默认为 2。

## 部署

在仓库根目录执行 `docker build -f packages/server/Dockerfile .`，运行镜像时提供 `JWT_SECRET` 与 `DATABASE_URL`。镜像使用 Node/pnpm 构建，运行层使用 Node.js。Compose 依次等待 PostgreSQL 就绪、运行迁移容器、启动服务。数据库使用持久化 volume；升级已有部署时继续挂载原 volume。

数据库健康检查连接 TCP，避免把 initdb 期间仅监听 Unix socket 的临时实例当作可用服务；首次初始化 volume 提供 120 秒启动宽限。TCP 就绪后即可执行迁移，无需等满宽限期。

WebSocket 与 HTTP 共用端口 3000。反向代理需要转发 `Upgrade`，空闲超时应大于服务的心跳周期。指标位于 `/metrics`，API 前缀为 `WEB_CLIENT_BASE_PATH` 加 `api`。Redis、房间回放/S3 和部署健康检查沿用现有环境变量。收到退出信号后，服务等待已有房间结束；Compose 提供 10 分钟退出宽限。

## 验证

协议、真实对局、数据库写入和 RSS 使用[独立 harness](../../scripts/server-harness/README.md) 验证。先运行其中的 `environment/prepare.mjs` 创建隔离数据库和账号，再使用 `candidate.json` 进行迁移验收。内存门槛为常驻 RSS 100 MiB、单局峰值增量 50 MiB。

以下命令在 `packages/server` 执行。`pnpm test` 覆盖 HTTP、认证、牌组元数据、房间和 WebSocket；`test:rooms` 与 `test:http` 可单独验证对应部分：

    pnpm prepare:metadata
    pnpm check
    pnpm test
    pnpm test:rooms
    pnpm test:http
    pnpm test:db

数据库测试须显式设置 `SERVER_DB_TEST_URL`，指向隔离的 `gi_server_harness` 数据库。测试创建并回收独立的随机 schema，验证同源 SQL 的接管与校验和、约束、Drizzle 写入、事务回滚，以及独立进程重启后的持久化。构建和功能测试通过后，仍需单独验证真实内存是否达标。
