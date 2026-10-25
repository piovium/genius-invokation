# `@gi-tcg/server` 对战平台后端

## 本地开发与调试

1. 安装构建依赖：根目录执行 `pnpm build server...`）。
2. 在 `packages/server/.env` 设置 `JWT_SECRET=任意字符串`。

- 可选： `GH_CLIENT_ID`、`GH_CLIENT_SECRET` 启用 GitHub OAuth

3. 在 `packages/server` 执行 `pnpm dev`

未设置 `DATABASE_URL` 时，本地数据保存于 `packages/server/.pglite`；设置 `DATABASE_URL` 时使用指定 Postgres 数据库。

## ORM 迁移

修改 `src/db/schema.ts` 后执行 `pnpm db:generate` 和 `pnpm db:migrate`。

## 房间规则 Profile

启动时会编译并校验所有 Profile；配置错误会阻止服务启动。内置所有
`official/vX.Y.Z`、默认别名 `official/latest`、`piovium/moyu-s7` 和
`piovium/lianyu-s1`。赛事规则来源见 [presets/README.md](presets/README.md)。

通过环境变量 `ROOM_PRESETS` 添加 Preset，值为 JSON 字符串数组，例如：

```dotenv
SERVER_CONFIG_DIR=/srv/gi-tcg
ROOM_PRESETS=["./my-rules/preset.yaml","@my-org/rules/preset"]
```

入口相对路径以 `SERVER_CONFIG_DIR` 为准，缺省为本 server 包目录；嵌套引用以声明
该引用的配置文件为准。支持 YAML、TOML、JSON/JSONC/JSON5、JS/TS（含 C/M 变体），
以及 GTS Mod。JS/TS 默认导出对象或同步/异步函数。远程 HTTP(S) 仅支持静态配置及
GTS，不能导入本地文件、包或可执行配置。配置格式见
[RFC](../../docs/development/server_profile_rfc.md)。

`GET /profiles` 返回摘要列表及 `defaultProfileId`；
`GET /profile/piovium%2Fmoyu-s7` 返回具体 Profile 和 `profileHash`。
创建房间使用 `profileId`，省略时使用默认 Profile。客户端以哈希与语言缓存资源；
房间固定使用创建时的 Profile。自定义新角色/卡牌目前不支持用于服务器房间。

升级时运行 `pnpm db:migrate`，为 `Game` 添加可空的 `profile` 列。历史记录保持原样，
新对局在该列及日志 `profile` 字段保存完整配置，`gameVersion` / `gv` 保存 Profile ID。
Standalone 可读取 `official/vX.Y.Z` 日志，也可根据归档的 `baseVersion` 读取
`official/latest` 日志。

运行 Profile 和房间协议测试：

```sh
pnpm test
```

## 部署

- 使用 Docker。在 Monorepo 根目录下执行 `docker build -f packages/server/Dockerfile .` 构建 Docker 镜像。运行时，设置 `JWT_SECRET` 等环境变量并将 `DATABASE_URL` 指向 Postgres 数据库链接串。

- 使用 Docker Compose。在当前目录 (`packages/server`) 创建 `.env` 文件，设置 `JWT_SECRET` 等环境变量，并运行运行 `docker compose up`。

- 或者，通过 Railway 一键部署对战平台。Railway 非免费部署平台；如果想要在 Railway 上降低部署对战平台的成本，可以开启 `genius-invokation` 服务的 Serverless 选项，详情可参见 [Railway Serverless](https://docs.railway.com/reference/app-sleeping)。

  [![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/genius-invokation?referralCode=JF0EXE&utm_medium=integration&utm_source=template&utm_campaign=generic)
