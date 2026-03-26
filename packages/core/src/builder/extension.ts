import type { Draft } from "immer";
import type { GameState } from "../base/state";
import type {
  EventArgOf,
  EventNames,
  SkillDescription,
  TriggeredSkillDefinition,
} from "../base/skill";
import { SkillContext } from "./context/skill";
import { registerExtension, builderWeakRefs } from "./registry";
import { wrapSkillInfoWithExt, type WritableMetaOf } from "./skill";
import type { ExtensionHandle } from "./type";
import { DEFAULT_VERSION_INFO } from "../base/version";

type ExtensionBuilderMeta<ExtStateType, Event extends EventNames> = {
  callerType: "character";
  callerVars: never;
  eventArgType: EventArgOf<Event>;
  associatedExtension: ExtensionHandle<ExtStateType>;
};

export const EXTENSION_ID_OFFSET = 50_000_000;

export class ExtensionBuilder<ExtStateType> {
  private _skillNo = 0;
  private _skillList: TriggeredSkillDefinition[] = [];
  public readonly id: number;
  private _description = "";

  constructor(
    idHint: number,
    private readonly schema: unknown,
    private readonly initialState: ExtStateType,
  ) {
    this.id = idHint + EXTENSION_ID_OFFSET;
    builderWeakRefs.add(new WeakRef(this));
  }

  description(description: string) {
    this._description = description;
    return this;
  }

  private generateSkillId() {
    const thisSkillNo = ++this._skillNo;
    return this.id + thisSkillNo / 100;
  }

  mutateWhen<E extends EventNames>(
    event: E,
    operation: (
      extensionState: Draft<ExtStateType>,
      eventArg: EventArgOf<E>,
      currentGameState: GameState,
    ) => void,
  ) {
    const extId = this.id;
    const action: SkillDescription<any> = (state, skillInfo, arg) => {
      const ctx = new SkillContext<
        WritableMetaOf<ExtensionBuilderMeta<ExtStateType, E>>
      >(state, wrapSkillInfoWithExt(skillInfo, extId), arg);
      ctx.setExtensionState((st) => operation(st, arg, state));
      return ctx._terminate();
    };
    const def: TriggeredSkillDefinition = {
      type: "skill",
      initiativeSkillConfig: null,
      id: this.generateSkillId(),
      ownerType: "extension",
      skillType: null,
      triggerOn: event,
      filter: () => true,
      action,
      usagePerRoundVariableName: null,
    };
    this._skillList.push(def);
    return this;
  }

  done(): ExtensionHandle<ExtStateType> {
    registerExtension({
      __definition: "extensions",
      type: "extension",
      id: this.id,
      description: this._description,
      version: DEFAULT_VERSION_INFO,
      schema: this.schema,
      initialState: this.initialState,
      skills: this._skillList,
    });
    return this.id as ExtensionHandle<ExtStateType>;
  }
}

import {
  type,
  type TypeInfer,
  type TypeValidate,
} from "@gi-tcg/utils";

type ExtensionFactory2<T> = {
  initialState: (initialState: T) => ExtensionBuilder<T>;
};

export function extension<const Def, R = TypeInfer<Def>>(
  idHint: number,
  def: TypeValidate<Def>,
): ExtensionFactory2<R> {
  const schema = type(def as any).toJsonSchema();
  return {
    initialState: (initialState) =>
      new ExtensionBuilder(idHint, schema, initialState),
  };
}
