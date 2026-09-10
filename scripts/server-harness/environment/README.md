# 隔离 Linux/Docker 测试环境

在本工作树根目录的 PowerShell 中执行：

```powershell
wsl -d gi-server-harness --exec env HARNESS_BASELINE_SQL_DIR=/opt/gi-server-harness/baseline-source/packages/server/prisma/migrations node scripts/server-harness/environment/prepare.mjs
```

也可以在专用 `gi-server-harness` WSL 发行版内，进入此工作树根目录后执行：

```sh
export HARNESS_BASELINE_SQL_DIR=/opt/gi-server-harness/baseline-source/packages/server/prisma/migrations
node scripts/server-harness/environment/prepare.mjs
```

需要运行中的 Docker daemon（`unix:///var/run/docker.sock`）、Docker Compose 以及 Node 24.10+。脚本只操作固定 Compose 项目 `gi-server-harness`。PostgreSQL 使用 `postgres:17-alpine`，本地身份服务使用 `node:26.1.0-alpine`；数据库和身份服务各自位于单独容器，不纳入待测游戏服务的 RSS。

## 机器重启后的恢复

先从 PowerShell 检查专用发行版中的 Docker：

```powershell
wsl -d gi-server-harness --exec docker info
```

若提示无法连接 Docker daemon，在一个单独的 PowerShell 终端运行以下命令，并保持该终端打开：

```powershell
wsl -d gi-server-harness --exec dockerd --host=unix:///var/run/docker.sock
```

然后回到工作树根目录的另一个终端，重新执行 `prepare.mjs`。已有 volume 与 `runtime.env` 会继续使用；无需重新安装 WSL 或创建账号。

## 准备结果

- PostgreSQL 只发布在 `127.0.0.1:15432`，库名 `gi_server_harness`、数据库账号 `harness`，密码随机生成。
- 基线库按 `HARNESS_BASELINE_SQL_DIR` 指向的冻结旧服务源码中 `prisma/migrations/*/migration.sql` 的时间顺序执行 SQL，记录每份原文件的 SHA-256，不依赖 Prisma 编译。重复运行只补未执行迁移；已执行 SQL 变动会报错。候选服务清退 Prisma 后不再自带这份 SQL，因此该变量必须显式给出绝对路径；未设置、路径下没有迁移或迁移文件缺失时 `prepare.mjs` 明确失败，不回退到候选服务目录。
- 自动创建账号 `91000001`、`91000002`，存入纯测试用途的随机假 GitHub token。
- 身份服务只发布在 `127.0.0.1:19090`。`GET /github/user` 仅接受这两个假 token，返回对应 `{id, login, name, avatar_url}`；`GET /healthz` 返回带明确 fixture 标识的健康状态。服务没有外部请求代码，不会访问 GitHub；两个容器使用本项目独有的 bridge 网络。
- 自动生成专用随机 JWT 密钥，并签发符合旧服务 `{user: 1, sub: id}` 格式、有效期 42 天的 HS256 JWT。
- 通过容器服务地址验证数据库正确密码成功、错误密码拒绝，避免本地 loopback 的 trust 规则产生假阳性；同时验证两行账号、原 SQL 校验和、身份接口、未认证拒绝及两份 JWT 签名，写入脱敏的 `temp/server-harness/environment/report.json`。

凭据只保存在已被根 `.gitignore` 的 `temp` 规则排除的 `temp/server-harness/environment/runtime.env`，不要复制到报告或提交版本控制。重复执行保留原密码、密钥、假 token、有效 JWT 和数据库内容；JWT 到期后沿用原密钥续签。脚本不会 drop/reset 数据、删除 volume 或覆盖已有账号。若 volume 仍在但凭据文件丢失，脚本停止并要求恢复原凭据，防止生成不匹配的新密码。

`prepare.mjs` 会显式把已验证的 fixture 变量传给 Docker Compose，因此当前终端的同名密码、token 或数据库地址不能覆盖隔离配置。需要复现这一负测时，在已准备好环境的工作树根目录执行：

```powershell
wsl -d gi-server-harness --exec env HARNESS_DOCKER_ENVIRONMENT_SELFTEST=1 node --test scripts/server-harness/environment/prepare.test.mjs
```

## 给待测服务和 harness 使用

Linux 中用 Node 的 env-file 支持加载凭据，不需要用户手工提供 token：

```sh
node --env-file=temp/server-harness/environment/runtime.env path/to/server-entry.mjs
node --env-file=temp/server-harness/environment/runtime.env scripts/server-harness/run.mjs --config path/to/config.json
```

文件提供 `DATABASE_URL`、`JWT_SECRET`、`GH_GET_USER_API_URL`、`HARNESS_USER_A_TOKEN`、`HARNESS_USER_B_TOKEN`，用于同一 WSL 主机中的待测服务和 harness。harness 配置使用 `"storageTokenEnvs": ["HARNESS_USER_A_TOKEN", "HARNESS_USER_B_TOKEN"]`。

若待测游戏服务运行在 Docker 中，加入 `gi-server-harness_default` 网络，并将 `DATABASE_URL_CONTAINER` 的值设为该服务的 `DATABASE_URL`、`GH_GET_USER_API_URL_CONTAINER` 的值设为该服务的 `GH_GET_USER_API_URL`。此时服务通过 `postgres:5432` 和 `identity:9090` 访问同一组隔离依赖。`runtime.env` 中的 `JWT_SECRET` 仍用于服务验签。

结束测试时，从工作树根目录执行以下命令可停止本项目容器并保留数据：

```sh
docker compose --project-name gi-server-harness --env-file temp/server-harness/environment/runtime.env --file scripts/server-harness/environment/compose.yaml stop
```

这里准备的是旧服务基线及候选服务验收共用的隔离依赖。它不会启动生产服务；应用迁移与 100/50 MiB 内存验收结果见 [MIGRATION.md](../MIGRATION.md)。
