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

import { defineSimpleViewModel, type AR } from "@gi-tcg/gts-runtime";
import { type, type TypeInfer } from "@gi-tcg/utils";

const GtsAppendOptions = type({
  /** 重复创建时的累积值上限 */
  "limit?": "number",
  /** 重复创建时累积的值 */
  "value?": "number",
});
export type GtsAppendOptions = TypeInfer<typeof GtsAppendOptions>;

export const GtsVariableOptions = type({
  /** 该值在重复创建时是否允许叠加。 */
  "append?": GtsAppendOptions.or("boolean | number"),
  /**
   * 该值在重复创建时将强制重置为默认值（而非默认值和当前值的最大值）。
   * 指定 `append` 时此选项无效。
   */
  "forceOverwrite?": "boolean",
  "visible?": "boolean",
});
export type GtsVariableOptions = TypeInfer<typeof GtsVariableOptions>;

export const VariablesVM = defineSimpleViewModel(GtsVariableOptions, {
  booleanSwitch: true,
  recursive: true,
});

const GtsUsageOptionsBase = GtsVariableOptions.merge({
  /** 是否在每次技能执行完毕后自动 -1。默认值为 `true`。 */
  "autoDecrease?": "boolean",
  /** 是否在扣除到 0 后自动弃置实体，默认值为 `true` */
  "autoDispose?": "boolean",
});

const UsageBaseVM = defineSimpleViewModel(GtsUsageOptionsBase, {
  booleanSwitch: true,
  recursive: true,
});

export interface GtsUsageOptions extends TypeInfer<typeof GtsUsageOptionsBase> {
  name?: string;
}
class GtsUsageModel extends UsageBaseVM.Model implements GtsUsageOptions {
  name?: string;
}

export interface UsageVMMeta {
  name: string;
}
type DefaultUsageVMMeta = {
  name: "usage";
};

export const UsageVM = UsageBaseVM.bind<DefaultUsageVMMeta>().extend(
  GtsUsageModel,
  (h) => ({
    name: h.attribute<{
      <const Meta extends UsageVMMeta, const Name extends string>(
        this: AR.This<Meta>,
        name: Name,
      ): AR.DoneRewriteMeta<Omit<Meta, "name"> & { name: Name }>;
    }>((model, [name]) => {
      model.name = name;
    }),
  }),
);
