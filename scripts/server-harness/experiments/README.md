# 真实 WebSocket 控制流程实验

用户已选择直接使用二进制游戏消息。本目录通过真实 Bun 服务与 Node 原生 WebSocket 验证认证和 ACK 机制；不使用 mock socket 替代网络，不修改生产服务，不把脚本游戏的结果当作真实引擎/数据库/内存验收。

本机运行（Node 24+、Bun 1.3.5；可用 `HARNESS_BUN` 指定可执行文件）：

```powershell
node scripts/server-harness/experiments/run.mjs --output temp/server-harness/experiments/windows.json
```

缺少 Bun、任一场景失败、或真实服务未启动，均退出 1。报告保留每个场景的实际执行计数、关闭码、缓存规模、运行时和源码摘要，不输出测试 token。

在 Linux/Docker 运行同一套实验：

```sh
# 工作树根目录；构建上下文只包含实验目录，避免发送 temp 下的数据库/WSL文件
docker build -t gi-server-harness-experiments:local -f scripts/server-harness/experiments/Dockerfile scripts/server-harness/experiments
docker run --rm --network=none --memory=384m --cpus=1 \
  --mount "type=bind,source=$PWD,target=/workspace" \
  gi-server-harness-experiments:local \
  scripts/server-harness/experiments/run.mjs --output temp/server-harness/experiments/linux-docker.json
```

Windows 本机已准备独立 WSL2 发行版 `gi-server-harness`，Docker daemon 位于该发行版内，镜像/卷与其它路线分开。以上命令可在其中运行；不是原来磁盘缺失的 `Ubuntu` 发行版。发行版磁盘位于本工作树的 `temp/server-harness/linux/distro`，因此移动或删除整个工作树前应先处理这套实验环境。

认证实验覆盖合法身份、错误签名/过期/缺失/串号、认证前动作、拒绝后的连续帧、重复认证、重连重新认证、未认证连接超时与超大帧。算法头篡改也被拒绝，但该实验同时破坏签名，不能独立证明生产库的算法策略。连接中途 token 到期、Origin、TLS、代理与真实账户查询不属于这些 fixture 结论。

确认实验刻意在不同时间断线：客户端尚未发送、服务端尚未接受、已接受但 ACK 未发送、ACK 发出后关闭。它读取服务器计数来区分“没有执行”和“已经执行”，并验证相同命令重发、冲突、未来 ID、缓存淘汰、两条连接同玩家，以及不同玩家的 ID 隔离。额外两项用真正的 `connectTransport` 适配器验证二进制读写和丢 ACK 后重连。

本目录的 JWT 校验、房间存储和命令计数都是测试 fixture。实验支持“首帧认证后才 ready”和“明确接受 ACK + 有界去重”的可行性，不能直接把这些实现移入生产或宣称持久的 exactly-once 执行。详细实测结果由 `run.mjs` 生成，结论见 [RESULTS.md](RESULTS.md)。
