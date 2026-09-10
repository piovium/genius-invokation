# @gi-tcg/server 对战平台后端

服务在 Node.js 上运行 Elysia，通过 Drizzle 访问 PostgreSQL。HTTP API、OAuth 凭证以及数据库表名、列和约束属于对外稳定接口。实时对局使用二进制 WebSocket：游戏状态传输 protobuf 字节，控制消息使用 JSON，不提供 SSE 回退。

## 实现约定

路由、校验、鉴权、错误处理与插件组合都使用 Elysia 原生写法：路由以插件组合，校验使用 `t`，鉴权与共享状态使用 `macro` 与 `resolve`，错误使用 `status` 与 `error`。运行时固定 Node.js，数据访问统一经由 Drizzle 与 PostgreSQL。

## 开发与构建

安装、构建和运行需要 Node.js 26.1+ 与 pnpm 12。在仓库根目录安装服务及其依赖并构建：

    pnpm --filter @gi-tcg/server... install --frozen-lockfile
    pnpm build:no-typing server...

在 `packages/server/.env` 设置 `DATABASE_URL` 和 `JWT_SECRET`；GitHub 登录还需要 `GH_CLIENT_ID` 和 `GH_CLIENT_SECRET`。随后在 `packages/server` 执行 `pnpm migrate`，再运行 `pnpm dev`。开发和生产均连接 PostgreSQL。

开发、类型检查和测试都需要 assets-manager 的本地数据快照，上面的构建命令会先生成它。`pnpm prepare:metadata` 从 `assets-manager/dist/data` 提取牌组校验字段，并生成记录来源哈希的清单；设置 `FROM_SOURCE=1` 时改用 `src/data`。该步骤只读取本地文件，不访问 CDN。`pnpm dev`、`pnpm check` 和 `pnpm test` 会自动完成这一步，单独运行房间测试前需要先手动执行。

生产构建位于 `dist/`，包含 `main.js`、`migrate.js`、`frontend/`，以及 `drizzle/` 下的迁移 SQL。入口是 `dist/main.js`，启动命令额外传入 `--expose-gc`，以便在对局结束后主动归还空闲内存。前端 JS、CSS 和图片按请求通过 Node 文件流返回，无需将整个文件读入内存。`WEB_CLIENT_BASE_PATH` 控制资源与 API 前缀，未知路径回退到 SPA 入口（仅 `index.html` 读入内存）；响应携带 MIME 与 ETag，`sw.js` 与 SPA 入口使用 `no-cache`，其余静态资源使用 `immutable` 缓存。

## 数据库升级

对已有 PostgreSQL 数据库执行 `node dist/migrate.js`，源码环境执行 `pnpm migrate`。迁移器先取一把按库名与 schema 命名的事务级 advisory lock，多实例同时启动时只有一方执行；随后在同一个事务内按 `drizzle/meta/_journal.json` 的顺序执行 `drizzle/` 中的 SQL，并把已执行迁移的名称与校验和写入 `__drizzle_migrations`。这是本服务自己的 Drizzle 迁移集：表名、列、默认值、主键、外键动作与约束名都与既有部署一致。

空库按 journal 顺序执行全部 SQL，重复执行不会重新建表、重置序列或改动已有用户、牌组和对局。已经建好表、却没有任何迁移记录的库（由本服务早期版本或其它工具建立）会先与本服务的 SQL 逐列、逐主键、逐外键比对，完全一致时整体接管并登记，不执行任何 SQL。库中记录了本构建未附带的迁移、已登记迁移的校验和与 SQL 不符，或校验发现列、主键、外键与默认值发生漂移时，迁移器报错并回滚事务。`MIGRATIONS_DIRECTORY` 可覆盖 SQL 目录，默认使用发行包内的 `drizzle/`。

`DATABASE_URL` 的 `schema` 参数选定要使用的 schema（实现为连接上的 `search_path`），需在迁移前创建好它。`DATABASE_CONNECTION_LIMIT` 设置连接池上限，默认为 2。

## 部署

在仓库根目录执行 `docker build -f packages/server/Dockerfile .`，运行镜像时提供 `JWT_SECRET` 与 `DATABASE_URL`。构建阶段使用 Node 与 pnpm，运行层只保留 Node.js。Compose 依次等待 PostgreSQL 就绪、运行迁移容器、启动服务。数据库使用持久化 volume；升级已有部署时继续挂载原 volume。

数据库健康检查连接 TCP，避免把 initdb 期间仅监听 Unix socket 的临时实例当作可用服务；首次初始化 volume 提供 120 秒启动宽限。TCP 就绪后即可执行迁移，无需等满宽限期。

WebSocket 与 HTTP 共用端口 3000。反向代理需要转发 `Upgrade`，空闲超时应大于服务的心跳周期。指标位于 `/metrics`，API 前缀为 `WEB_CLIENT_BASE_PATH` 加 `api`。Redis、房间回放/S3 和部署健康检查沿用现有环境变量。收到退出信号后，服务等待已有房间结束；Compose 提供 10 分钟退出宽限。

## 验证

协议、真实对局、数据库写入和 RSS 由[独立 harness](../../scripts/server-harness/README.md) 验证。先运行其中的 `environment/prepare.mjs` 创建隔离数据库和账号，再使用 `candidate.json` 对候选服务运行验收；静态约束由仓库根目录的 `npm run harness:constraints` 检查，规则见 harness 说明。内存门槛为常驻 RSS 100 MiB、单局峰值增量 50 MiB。

以下命令在 `packages/server` 执行。`pnpm test` 覆盖 HTTP、前端静态资源、认证、牌组元数据、房间和 WebSocket；`test:rooms` 与 `test:http` 可单独验证对应部分：

    pnpm prepare:metadata
    pnpm check
    pnpm test
    pnpm test:rooms
    pnpm test:http
    pnpm test:db

数据库测试须显式设置 `SERVER_DB_TEST_URL`，指向隔离的 `gi_server_harness` 数据库。测试会创建并回收独立的随机 schema，覆盖既有 schema 的接管、校验和与约束校验、Drizzle 写入、事务回滚，以及独立进程重启后的持久化。构建和功能测试通过后，仍需单独验证真实内存是否达标。
