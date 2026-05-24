# `@gi-tcg/server` 对战平台后端

对战平台后端可配合 Web 前端 `@gi-tcg/web-client` 使用。

## 本地开发

1. 安装依赖且构建所有依赖 packages（`core` `data` 等，可在根目录下执行 `pnpm build server` 以自动构建依赖）
2. 在 `packages/server` 下创建 `.env` 文件，存储 `JWT_SECRET=任意字符串`。

   - 也可创建 `GH_CLIENT_ID` 与 `GH_CLIENT_SECRET` 以启用 GitHub OAuth 登录。此功能需要[新建 GitHub Apps](https://docs.github.com/en/apps/creating-github-apps)。

3. 执行 `pnpm dev` 命令：这将尝试启动本地的 PGLite 模拟数据库并使用 `--watch` 运行服务器以支持本地调试。本地数据库数据持久化存储，如需删除可执行 `pnpm prisma dev rm gi-tcg-server-dev`。
   - 如果修改了 `prisma/schema.prisma`，则会在启动数据库前进行 Schema 迁移，请按提示输入迁移名称。

## 部署对战平台

- 使用 Docker。在 Monorepo 根目录下执行 `docker build -f packages/server/Dockerfile .` 构建 Docker 镜像。运行时，设置 `JWT_SECRET` 等环境变量并将 `DATABASE_URL` 指向 Postgres 数据库链接串。

- 使用 Docker Compose。在当前目录 (`packages/server`) 创建 `.env` 文件，设置 `JWT_SECRET` 等环境变量，并运行运行 `docker compose up`。

- 或者，通过 Railway 一键部署对战平台。Railway 非免费部署平台；如果想要在 Railway 上降低部署对战平台的成本，可以开启 `genius-invokation` 服务的 Serverless 选项，详情可参见 [Railway Serverless](https://docs.railway.com/reference/app-sleeping)。

  [![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/genius-invokation?referralCode=JF0EXE&utm_medium=integration&utm_source=template&utm_campaign=generic)
