# `@gi-tcg/server` 对战平台后端

## 本地开发与调试

1. 安装构建依赖：根目录执行 `pnpm build server...`）。
2. 在 `packages/server/.env` 设置 `JWT_SECRET=任意字符串`。

- 可选： `GH_CLIENT_ID`、`GH_CLIENT_SECRET` 启用 GitHub OAuth

3. 在 `packages/server` 执行 `pnpm dev`

未设置 `DATABASE_URL` 时，本地数据保存于 `packages/server/.pglite`；设置 `DATABASE_URL` 时使用指定 Postgres 数据库。

## HTTP 服务与测试

HTTP 层使用 Hono，各 `*.controller.ts` 导出子应用，由 `*.module.ts` 装配。`src/services.ts` 统一创建 Service 单例，入口显式初始化并在房间结束后关闭连接。DTO 使用 ArkType，通过 Hono Standard Schema validator 校验和转换。

在当前目录运行 `pnpm check` 和 `pnpm test`，检查类型及路由、鉴权、验证、SSE、数据库生命周期和静态资源行为。测试使用内存 PGlite，并隔离 GitHub、Redis 和远程静态数据依赖。

错误响应采用 Hono 和 Standard Schema validator 的默认格式。前端现有的 `data.message` 读取尚未适配。可选字段允许省略，只有 `chessboardColor` 明确允许 `null`。

## ORM 迁移

修改 `src/db/schema.ts` 后执行 `pnpm db:generate` 和 `pnpm db:migrate`。

## 部署

- 使用 Docker。在 Monorepo 根目录下执行 `docker build -f packages/server/Dockerfile .` 构建 Docker 镜像。运行时，设置 `JWT_SECRET` 等环境变量并将 `DATABASE_URL` 指向 Postgres 数据库链接串。

- 使用 Docker Compose。在当前目录 (`packages/server`) 创建 `.env` 文件，设置 `JWT_SECRET` 等环境变量，并运行运行 `docker compose up`。

- 或者，通过 Railway 一键部署对战平台。Railway 非免费部署平台；如果想要在 Railway 上降低部署对战平台的成本，可以开启 `genius-invokation` 服务的 Serverless 选项，详情可参见 [Railway Serverless](https://docs.railway.com/reference/app-sleeping)。

  [![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/genius-invokation?referralCode=JF0EXE&utm_medium=integration&utm_source=template&utm_campaign=generic)
