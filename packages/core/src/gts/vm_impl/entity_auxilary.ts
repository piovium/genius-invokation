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
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { type TypeInfer, type } from "@gi-tcg/utils";
import { GtsVariableOptions } from "./variables";
import { defineSimpleViewModel } from "@gi-tcg/gts-runtime";
import type { CreateEntityOptions } from "../../utils";
import type { StatusHandle } from "../../builder";

const GtsNightsoulOptions = GtsVariableOptions.merge({
  /**
   * 是否在夜魂值为 0 时退出夜魂加持
   * @default false
   */
  "autoDispose?": "boolean",
})
export type GtsNightsoulOptions = TypeInfer<typeof GtsNightsoulOptions>;

export const NightsoulVM = defineSimpleViewModel(GtsNightsoulOptions, {
  booleanSwitch: true,
  recursive: true,
});

const GtsGlobalUsageOptions = GtsVariableOptions.merge({
  /**
   * 是否在 consumeUsage() 且变量到达 0 时时自动弃置实体。
   * 默认为 true
   */
  "autoDispose?": "boolean",
})
export type GtsGlobalUsageOptions = TypeInfer<typeof GtsGlobalUsageOptions>;

export const GlobalUsageVM = defineSimpleViewModel(GtsGlobalUsageOptions, {
  booleanSwitch: true,
  recursive: true,
});

const GtsPrepareOption = type({
  "hintCount?": "number",
  "nextStatus?": type.unknown.as<StatusHandle>(),
  "nextStatusCreateOpt?": type.unknown.as<CreateEntityOptions>(),
});
export const PrepareVM = defineSimpleViewModel(GtsPrepareOption, {
  booleanSwitch: false,
  recursive: false,
});
