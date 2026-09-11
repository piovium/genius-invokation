// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { runShard, type ShardConfig } from "./cli";

/**
 * fork 出的分片子进程入口：argv[2] 为 JSON 编码的 ShardConfig。
 * 父进程通过 `execArgv` 继承 gnx 的加载器参数，因此这里可以直接 import .ts/.gts。
 */

const config = JSON.parse(process.argv[2]!) as ShardConfig;
runShard(config).then(
  () => process.exit(0),
  (e) => {
    console?.error?.(e);
    process.exit(1);
  },
);
