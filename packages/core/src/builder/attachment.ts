import { DiceType, GiTcgDataError, type GameState } from "..";
import type { AttachmentState } from "../base/state";
import type {
  AttachmentModification,
  ModificationGetter,
} from "../base/attachment";
import { getEntityById } from "../utils";
import {
  EntityBuilder,
  type VariableOptions,
  type VariableOptionsWithoutAppend,
} from "./entity";

type CostCount = (state: GameState, self: AttachmentState) => number;

class AttachmentBuilder<CallerVars extends string> extends EntityBuilder<
  "attachment",
  CallerVars,
  never,
  false,
  {}
> {
  private _modifications: (
    | AttachmentModification
    | ((state: GameState, id: number) => AttachmentModification)
  )[] = [];
  constructor(id: number) {
    super("attachment", id);
  }

  addCost(value: number | CostCount): this {
    this._modifications.push(
      typeof value === "number"
        ? {
            type: "increaseCardCost",
            value,
          }
        : (st, id) => {
            const self = getEntityById(st, id) as AttachmentState;
            return {
              type: "increaseCardCost",
              value: value(st, self),
            };
          },
    );
    return this;
  }
  deductCost(value: number | CostCount): this {
    this._modifications.push(
      typeof value === "number"
        ? {
            type: "decreaseCardCost",
            value,
          }
        : (st, id) => {
            const self = getEntityById(st, id) as AttachmentState;
            return {
              type: "decreaseCardCost",
              value: value(st, self),
            };
          },
    );
    return this;
  }
  changeCostType(toType: DiceType): this {
    this._modifications.push({
      type: "changeCardCostType",
      toType,
    });
    return this;
  }
  changeTuningTarget(tuningTarget: DiceType): this {
    this._modifications.push({
      type: "changeCardTuningTarget",
      tuningTarget,
    });
    return this;
  }
  makeEffectless(): this {
    this._modifications.push({
      type: "makeEffectless",
    });
    return this;
  }
  disableTuning(): this {
    this._modifications.push({
      type: "disableCardTuning",
    });
    return this;
  }

  override associateExtension(...args: any[]): never {
    throw new GiTcgDataError(`associateExtension not supported for attachment`);
  }
  override variable<const Name extends string>(
    name: Name,
    value: number,
    opt?: VariableOptions,
  ): AttachmentBuilderPublic<CallerVars | Name> {
    return super.variable(name, value, opt) as any;
  }
  override variableCanAppend<const Name extends string>(
    name: Name,
    value: number,
    max?: number,
    opt?: VariableOptionsWithoutAppend,
  ): AttachmentBuilderPublic<CallerVars | Name>;
  override variableCanAppend<const Name extends string>(
    name: Name,
    value: number,
    max: number,
    appendValue: number,
    opt?: VariableOptionsWithoutAppend,
  ): AttachmentBuilderPublic<CallerVars | Name>;
  override variableCanAppend(
    name: string,
    value: number,
    max: number,
    appendOrOpt?: number | VariableOptionsWithoutAppend,
    opt?: VariableOptionsWithoutAppend,
  ): any {
    return super.variableCanAppend(name, value, max, appendOrOpt as any, opt);
  }

  override usage(...args: any[]): never {
    throw new GiTcgDataError(`usage not supported for attachment`);
  }
  override defineSnippet(...args: any[]): never {
    throw new GiTcgDataError(`defineSnippet not supported for attachment`);
  }

  protected override getAttachmentModifications(): ModificationGetter {
    const modifications = this._modifications;
    return function (state, id) {
      return modifications.map((mod) =>
        typeof mod === "function" ? mod(state, id) : mod,
      );
    };
  }
}

export type AttachmentBuilderPublic<CallerVars extends string> = Omit<
  AttachmentBuilder<CallerVars>,
  `_${string}`
>;

export function attachment(id: number): AttachmentBuilderPublic<never> {
  return new AttachmentBuilder<never>(id);
}
