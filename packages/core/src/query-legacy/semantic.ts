// Copyright (C) 2024-2025 Guyutongxue
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

import { flip } from "@gi-tcg/utils";
import type { MatchResult, Node, NonterminalNode } from "ohm-js";

import grammar, { type QueryLangActionDict } from "./query.ohm-bundle";
import type {
  AnyState as AnyStateOriginal,
  CharacterState,
  GameState,
} from "../base/state";
import type { ContextMetaBase, SkillContext } from "../builder/context/skill";
import { CharacterBase } from "../builder/context/character";
import { getEntityArea, toSortedBy } from "../utils";
import type { EntityArea, EntityType } from "../base/entity";
import { GiTcgQueryError } from "../error";

// If we pass an reactive state into it, then area will be presented
type AnyState = AnyStateOriginal & {
  area?: EntityArea;
};

type AnySkillContext = SkillContext<ContextMetaBase>;

type ExternalQueryFn = (c: AnySkillContext) => AnyState;
type ExternalQueryEntry = ExternalQueryFn | ExternalQueryDictionary;
type ExternalQueryDictionary = { [prop: string]: ExternalQueryEntry };

export interface QueryArgs {
  readonly candidates: readonly AnyState[];
  readonly state: GameState;
  readonly allEntities: readonly AnyState[];
  readonly callerWho: 0 | 1;
  readonly externals: ExternalQueryDictionary;
}

declare module "ohm-js" {
  interface Node {
    args: {
      ctx: QueryArgs;
      state: AnyState;
    };
    doQuery(ctx: QueryArgs): AnyState[];
    propName: string;
    whoSpecifier: WhoSpecifierResult;
    typeSpecifier: TypeSpecifierResult;
    tagSpecifier(ctx: QueryArgs): string[];
    withCheck(ctx: QueryArgs, state: AnyState): boolean;
    evalExpr(state: AnyState): number;
  }
}

const semantics = grammar.createSemantics();

function queryCanonical(
  this: NonterminalNode,
  whoRes: WhoSpecifierResult,
  typeRes: TypeSpecifierResult,
  with_?: Node,
): AnyState[] {
  const result: AnyState[] = [];
  const expectWho =
    whoRes === "my" ? this.args.ctx.callerWho : flip(this.args.ctx.callerWho);
  for (const state of this.args.ctx.candidates) {
    const area = state.area ?? getEntityArea(this.args.ctx.state, state.id);
    if (whoRes !== "all" && expectWho !== area.who) {
      continue;
    }
    if (typeRes.type === "card") {
      if (typeRes.area !== "all" && typeRes.area !== area.type) {
        continue;
      }
    } else {
      if (area.type === "hands" || area.type === "pile") {
        continue;
      }
      if (typeRes.type !== "any" && typeRes.type !== state.definition.type) {
        continue;
      }
    }
    if (typeRes.type === "character") {
      const chState = state as CharacterState;
      if (
        (typeRes.defeated === "no" && !chState.variables.alive) ||
        (typeRes.defeated === "only" && chState.variables.alive)
      ) {
        continue;
      }
      if (typeRes.position !== "all") {
        const chCtx = new CharacterBase(this.args.ctx.state, chState.id);
        if (!chCtx.satisfyPosition(typeRes.position)) {
          continue;
        }
      }
    }
    if (with_ && !with_.withCheck(this.args.ctx, state)) {
      continue;
    }
    result.push(state);
  }
  return result;
}

function queryHas(
  this: NonterminalNode,
  subjectResult: AnyState[],
  objectResult: AnyState[],
): AnyState[] {
  const objectAreas = objectResult.flatMap((st) => {
    const area = st.area ?? getEntityArea(this.args.ctx.state, st.id);
    if (area.type === "characters") {
      return [area.characterId];
    } else {
      return [];
    }
  });
  return subjectResult.filter((st) => objectAreas.includes(st.id));
}
function queryAt(
  this: NonterminalNode,
  subjectResult: AnyState[],
  objectResult: AnyState[],
): AnyState[] {
  return subjectResult.filter((st) => {
    const area = st.area ?? getEntityArea(this.args.ctx.state, st.id);
    if (area.type === "characters") {
      return objectResult.map((st) => st.id).includes(area.characterId);
    } else {
      return false;
    }
  });
}

const doQueryDict: QueryLangActionDict<AnyState[]> = {
  Query(orQuery, orderBy, limit) {
    let raw = orQuery.doQuery(this.args.ctx);
    const orderByExprs = orderBy.children.flatMap(
      (node) => node.children[1].asIteration().children,
    );
    if (orderByExprs.length > 0) {
      raw = toSortedBy(
        raw.map(
          (st) => [st, orderByExprs.map((expr) => expr.evalExpr(st))] as const,
        ),
        ([, values]) => values,
      ).map(([st]) => st);
    }
    const limitCount =
      limit.numChildren > 0
        ? limit.children[0].children[1].evalExpr(this.args.state)
        : Infinity;
    return raw.slice(0, limitCount);
  },
  OrQuery_or(orQuery, _, andQuery) {
    const lhsResult = orQuery.doQuery(this.args.ctx);
    const lhsIds = lhsResult.map((st) => st.id);
    const rhsCandidates = this.args.ctx.candidates.filter(
      (st) => !lhsIds.includes(st.id),
    );
    const rhsCtx = { ...this.args.ctx, candidates: rhsCandidates };
    const rhsResult = andQuery.doQuery(rhsCtx);
    return [...lhsResult, ...rhsResult];
  },
  AndQuery_and(andQuery, _, relationalQuery) {
    const lhsResult = andQuery.doQuery(this.args.ctx);
    const rhsCtx = { ...this.args.ctx, candidates: lhsResult };
    const rhsResult = relationalQuery.doQuery(rhsCtx);
    return rhsResult;
  },
  RelationalQuery_has(relationalQuery, _, unaryQuery) {
    const subjectResult = relationalQuery.doQuery(this.args.ctx);
    const objectCtx = {
      ...this.args.ctx,
      candidates: this.args.ctx.allEntities,
    };
    const objectResult = unaryQuery.doQuery(objectCtx);
    return queryHas.call(this, subjectResult, objectResult);
  },
  UnaryQuery_has(_, unaryQuery) {
    const objectCtx = {
      ...this.args.ctx,
      candidates: this.args.ctx.allEntities,
    };
    const objectResult = unaryQuery.doQuery(objectCtx);
    return queryHas.call(this, [...this.args.ctx.allEntities], objectResult);
  },
  RelationalQuery_at(relationalQuery, _, unaryQuery) {
    const subjectResult = relationalQuery.doQuery(this.args.ctx);
    const objectCtx = {
      ...this.args.ctx,
      candidates: this.args.ctx.allEntities,
    };
    const objectResult = unaryQuery.doQuery(objectCtx);
    return queryAt.call(this, subjectResult, objectResult);
  },
  UnaryQuery_at(_, unaryQuery) {
    const objectCtx = {
      ...this.args.ctx,
      candidates: this.args.ctx.allEntities,
    };
    const objectResult = unaryQuery.doQuery(objectCtx);
    return queryAt.call(this, [...this.args.ctx.allEntities], objectResult);
  },
  UnaryQuery_not(_, unaryQuery) {
    const innerCtx = {
      ...this.args.ctx,
      candidates: this.args.ctx.allEntities,
    };
    const result = unaryQuery.doQuery(innerCtx).map((st) => st.id);
    return this.args.ctx.candidates.filter((st) => !result.includes(st.id));
  },
  UnaryQuery_recentFrom(_, unaryQuery) {
    const state = this.args.ctx.state;
    const baseCtx = { ...this.args.ctx, candidates: this.args.ctx.allEntities };
    const baseCandidates = unaryQuery.doQuery(baseCtx);
    const result: CharacterState[] = [];
    for (const baseState of baseCandidates) {
      if (baseState.definition.type !== "character") {
        continue;
      }
      const baseChCtx = new CharacterBase(this.args.ctx.state, baseState.id);
      const baseIdx = baseChCtx.positionIndex();
      const targetWho = flip(baseChCtx.who);
      const targetChs = state.players[targetWho].characters.map(
        (ch, i) => [ch, i] as const,
      );
      if (targetChs.length === 0) {
        continue;
      }
      // 由于“循环”判定距离，第一个也可以以“尾后”位置的方式参与距离计算
      targetChs.unshift([targetChs[0][0], targetChs.length]);
      const orderFn = ([ch, i]: readonly [CharacterState, number]) => {
        if (!ch.variables.alive) {
          return Infinity;
        }
        return Math.abs(i - baseIdx);
      };
      result.push(toSortedBy(targetChs, (e) => orderFn(e))[0][0]);
    }
    return result;
  },
  PrimaryQuery_canonical(who, type, with_) {
    const whoRes = who.numChildren > 0 ? who.children[0].whoSpecifier : "all";
    const typeRes =
      type.numChildren > 0
        ? type.children[0].typeSpecifier
        : { type: "any" as const };
    const withNode = with_.numChildren > 0 ? with_.children[0] : void 0;
    return queryCanonical.call(this, whoRes, typeRes, withNode);
  },
  PrimaryQuery_canonicalAny(who, with_) {
    const whoRes = who.numChildren > 0 ? who.children[0].whoSpecifier : "all";
    const typeRes = { type: "any" as const };
    return queryCanonical.call(this, whoRes, typeRes, with_);
  },
  PrimaryQuery_external(_, propNodes) {
    const props = propNodes.asIteration().children.map((c) => c.propName);
    let dict: any = this.args.ctx.externals;
    while (props.length > 0) {
      const prop = props.shift()!;
      if (typeof dict === "function") {
        throw new Error(
          `External query ${this.sourceString} invalid (too many props)`,
        );
      }
      dict = dict[prop];
      if (typeof dict === "undefined") {
        throw new Error(
          `External query ${this.sourceString} invalid (not found)`,
        );
      }
    }
    if (typeof dict !== "function") {
      throw new Error(
        `External query ${this.sourceString} is invalid (subsequent props needed)`,
      );
    }
    const state: AnyState = dict();
    return [state];
  },
  PrimaryQuery_paren(_l, query, _r) {
    return query.doQuery(this.args.ctx);
  },
};

const propNameDict: QueryLangActionDict<string> = {
  ExternalPropertyName(arg) {
    return arg.sourceString;
  },
  PropertyName(idOrLit) {
    return idOrLit.propName;
  },
  identifier(arg) {
    return arg.sourceString;
  },
  stringLiteral(_l, chars, _r) {
    return JSON.parse(this.sourceString);
  },
};

type WhoSpecifierResult = "all" | "my" | "opp";

const whoSpecifierDict: QueryLangActionDict<WhoSpecifierResult> = {
  WhoSpecifier_all(_) {
    return "all";
  },
  WhoSpecifier_my(_, _kwMy) {
    return "my";
  },
  WhoSpecifier_opp(_, _kwOpp) {
    return "opp";
  },
};

type TypeSpecifierResult =
  | {
      type: "character";
      position: "active" | "next" | "prev" | "standby" | "all";
      defeated: "contains" | "only" | "no";
    }
  | {
      type: EntityType | "any";
    }
  | {
      type: "card";
      area: "hands" | "pile" | "all";
    };

const typeSpecifierDict: QueryLangActionDict<TypeSpecifierResult> = {
  GeneralCharacterSpecifier_mayIncDeath(ch, kwInc, _kwDeath) {
    const defeated = kwInc.numChildren > 0 ? "contains" : "no";
    return { ...ch.typeSpecifier, defeated };
  },
  GeneralCharacterSpecifier_onlyDeath(_kwDeath, ch) {
    return { ...ch.typeSpecifier, defeated: "only" };
  },
  CharacterSpecifier_plain(_) {
    return {
      type: "character",
      position: "all",
      defeated: "no",
    };
  },
  CharacterSpecifier_position(posSpec, _) {
    return {
      type: "character",
      position: posSpec.sourceString as any,
      defeated: "no",
    };
  },
  EntitySpecifier_summon(_) {
    return { type: "summon" };
  },
  EntitySpecifier_combatStatus(_, _2) {
    return { type: "combatStatus" };
  },
  EntitySpecifier_support(_) {
    return { type: "support" };
  },
  EntitySpecifier_equipment(_) {
    return { type: "equipment" };
  },
  EntitySpecifier_status(_) {
    return { type: "status" };
  },
  EntitySpecifier_any(_) {
    return { type: "any" };
  },
  CardSpecifier_all(_) {
    return { type: "card", area: "all" };
  },
  CardSpecifier_hands(_, _2) {
    return { type: "card", area: "hands" };
  },
  CardSpecifier_pile(_, _2) {
    return { type: "card", area: "pile" };
  },
};

const tagSpecifierDict: QueryLangActionDict<string[]> = {
  TagSpecifier_direct(_l, list, _r) {
    return list.asIteration().children.map((c) => c.sourceString);
  },
  TagSpecifier_indirect(qualifier, _kw, _l, query, _r) {
    const queryCtx = {
      ...this.args.ctx,
      candidates: this.args.ctx.allEntities,
    };
    const result = query.doQuery(queryCtx);
    if (result.length !== 1) {
      console?.warn?.(
        `Indirect tag specifier (${query.sourceString}) is expected to be unique, got ${result.length} instead`,
      );
      console?.trace?.();
    }
    const tags = result.flatMap((st) => st.definition.tags as string[]);

    const category =
      qualifier.numChildren > 0 ? qualifier.children[0].sourceString : "";
    const CATEGORIZED_TAGS: Record<string, string[]> = {
      weapon: ["sword", "claymore", "pole", "catalyst", "bow"],
      element: ["cryo", "hydro", "pyro", "electro", "anemo", "geo", "dendro"],
      nation: [
        "mondstadt",
        "liyue",
        "inazuma",
        "sumeru",
        "monster",
        "fatui",
        "hilichurl",
      ],
    };
    if (category in CATEGORIZED_TAGS) {
      return tags.filter((t) => CATEGORIZED_TAGS[category].includes(t));
    } else {
      return tags;
    }
  },
};

const withCheckDict: QueryLangActionDict<boolean> = {
  WithSpecifier(_, body) {
    return body.withCheck(this.args.ctx, this.args.state);
  },
  WithBody_id(_kw, _eq, expr) {
    return this.args.state.id === expr.evalExpr(this.args.state);
  },
  WithBody_defId(_kwDef, _kwId, _eq, expr) {
    return this.args.state.definition.id === expr.evalExpr(this.args.state);
  },
  WithBody_tag(_kw, tagSpec) {
    const tags = tagSpec.tagSpecifier(this.args.ctx);
    for (const t of this.args.state.definition.tags) {
      if (tags.includes(t)) {
        return true;
      }
    }
    return false;
  },
  WithBody_prop(prop, op, expr) {
    const propVal = prop.evalExpr(this.args.state);
    const exprVal = expr.evalExpr(this.args.state);
    switch (op.sourceString) {
      case "=":
        return propVal === exprVal;
      case "!=":
        return propVal !== exprVal;
      case ">":
        return propVal > exprVal;
      case "<":
        return propVal < exprVal;
      case ">=":
        return propVal >= exprVal;
      case "<=":
        return propVal <= exprVal;
      default:
        throw new Error(`Unknown operator ${op.sourceString}`);
    }
  },
};

const evalExprDict: QueryLangActionDict<number> = {
  AdditiveExpression_add(lhs, _, rhs) {
    return lhs.evalExpr(this.args.state) + rhs.evalExpr(this.args.state);
  },
  AdditiveExpression_sub(lhs, _, rhs) {
    return lhs.evalExpr(this.args.state) - rhs.evalExpr(this.args.state);
  },
  MultiplicativeExpression_mul(lhs, _, rhs) {
    return lhs.evalExpr(this.args.state) * rhs.evalExpr(this.args.state);
  },
  MultiplicativeExpression_div(lhs, _, rhs) {
    return lhs.evalExpr(this.args.state) / rhs.evalExpr(this.args.state);
  },
  UnaryExpression_neg(_, inner) {
    return -inner.evalExpr(this.args.state);
  },
  PrimaryExpression_paren(_l, expr, _r) {
    return expr.evalExpr(this.args.state);
  },
  PropertyName(idOrLit) {
    const name = idOrLit.propName;
    return this.args.state.variables[name] ?? NaN;
  },
  numericLiteral(_) {
    return Number(this.sourceString);
  },
  decimalIntegerLiteral(_) {
    return Number(this.sourceString);
  },
};

semantics
  .addOperation("doQuery(ctx)", doQueryDict)
  .addAttribute("propName", propNameDict)
  .addAttribute("whoSpecifier", whoSpecifierDict)
  .addAttribute("typeSpecifier", typeSpecifierDict)
  .addOperation("tagSpecifier(ctx)", tagSpecifierDict)
  .addOperation("withCheck(ctx, state)", withCheckDict)
  .addOperation("evalExpr(state)", evalExprDict);

const parseCache = new Map<string, MatchResult>();

export function doSemanticQueryAction(
  source: string,
  queryArg: QueryArgs,
): AnyState[] {
  let match = parseCache.get(source);
  if (!match) {
    match = grammar.match(source);
    if (match.failed()) {
      throw new GiTcgQueryError(source, queryArg, match.message);
    }
    parseCache.set(source, match);
  }
  try {
    const result: AnyState[] = semantics(match).doQuery(queryArg);
    return result;
  } catch (e) {
    if (e instanceof Error) {
      throw new GiTcgQueryError(source, queryArg, e.message);
    } else {
      throw e;
    }
  }
}
