import { expect, test } from "vitest";
import { $, Card, CombatStatus, State, ref, setup } from "#test";
import { CustomDataLoader } from "@gi-tcg/custom-data-loader";
import { type CardHandle, type CombatStatusHandle } from "@gi-tcg/core/data";
import {
  createRpcResponse,
  type Notification,
  type RpcRequest,
} from "@gi-tcg/typings";
import { GiTcgDataError } from "@gi-tcg/core";

const ChoiceCard = 990001 as CardHandle;
const ChoiceStatus = 990002 as CombatStatusHandle;
const AllChoices = 990003 as CombatStatusHandle;
const options = [
  { key: "one", text: "相同文本" },
  { key: "two", text: "相同文本" },
];

async function choiceData(choices: unknown = options, repeat = false) {
  return (
    await new CustomDataLoader().loadMod(`
    import { DamageType } from "#custom-data-loader";
    define combatStatus {
      id ${ChoiceStatus} as ChoiceStatus;
      name "Choice status";
      variable count, 0;
      on selectOption {
        when :(:e.via.caller.definition.id === ${ChoiceCard} && :e.prompt === "请选择" && :e.who === 0);
        :variables.count += 1;
        if (:e.selectedOption === "相同文本" && :e.options[:e.selectedIndex].key === :e.selectedKey) {
          :damage(DamageType.Physical, :e.selectedKey === "one" ? 1 : 2);
        }
      }
    }
    define combatStatus {
      id ${AllChoices};
      name "All choices";
      variable count, 0;
      on selectOption {
        listenTo all;
        :variables.count += 1;
      }
    }
    define card {
      id ${ChoiceCard};
      name "Choice card";
      on selectOption {
        :damage(DamageType.Physical, 5);
      }
      :combatStatus(ChoiceStatus);
      const options = ${JSON.stringify(choices)};
      :selectOption("请选择", options);
      ${repeat ? ':selectOption("请选择", options);' : ""}
      options[0].key = "mutated";
      options[0].text = "mutated";
    }
  `)
  ).done()[0];
}

test.each([0, 1])(
  "selectOption %i resolves the key and text from its snapshot",
  async (index) => {
    const card = ref();
    const c = setup(
      <State data={await choiceData()}>
        <Card my def={ChoiceCard} ref={card} />
        <CombatStatus opp def={ChoiceStatus} />
        <CombatStatus opp def={AllChoices} />
      </State>,
    );
    const mine: Notification[] = [];
    const theirs: Notification[] = [];
    const requests: RpcRequest[] = [];
    c.game.players[0].io.notify = (notification) => {
      mine.push(notification);
    };
    c.game.players[1].io.notify = (notification) => {
      theirs.push(notification);
    };
    const rpc = c.game.players[0].io.rpc;
    c.game.players[0].io.rpc = (request) => {
      requests.push(request);
      return rpc(request);
    };
    await c.me.card(card);
    expect(requests.at(-1)?.request).toEqual({
      $case: "selectOption",
      value: { prompt: "请选择", options },
    });
    c.expect($.opp.active).toHaveVariable({ health: 10 });
    await c.me.selectOption(index);
    c.expect($.opp.active).toHaveVariable({ health: 9 - index });
    c.expect($.my.combatStatus.def(ChoiceStatus)).toHaveVariable({ count: 1 });
    c.expect($.opp.combatStatus.def(ChoiceStatus)).toHaveVariable({ count: 0 });
    c.expect($.opp.combatStatus.def(AllChoices)).toHaveVariable({ count: 1 });
    const done = (notifications: Notification[]) =>
      notifications
        .flatMap((n) => n.mutation)
        .map((m) => m.mutation)
        .filter((m) => m?.$case === "selectOptionDone");
    expect(done(mine)).toEqual([
      {
        $case: "selectOptionDone",
        value: {
          who: 0,
          prompt: "请选择",
          selectedIndex: index,
          selectedKey: options[index].key,
          selectedOption: options[index].text,
        },
      },
    ]);
    expect(done(theirs)).toEqual([
      { $case: "selectOptionDone", value: { who: 0 } },
    ]);
  },
);

test("consecutive single-option requests each require a response", async () => {
  const c = setup(
    <State data={await choiceData([options[0]], true)}>
      <Card my def={ChoiceCard} />
    </State>,
  );
  await c.me.card(ChoiceCard);
  await c.me.selectOption(0);
  c.expect($.opp.active).toHaveVariable({ health: 9 });
  await c.me.selectOption(0);
  c.expect($.opp.active).toHaveVariable({ health: 8 });
  c.expect($.my.combatStatus.def(ChoiceStatus)).toHaveVariable({ count: 2 });
});

test.each(
  [
    [],
    [{ key: "", text: "Empty" }],
    [{ text: "Missing" }],
    [
      { key: "same", text: "A" },
      { key: "same", text: "B" },
    ],
  ].map((choices) => ({ choices })),
)("rejects invalid options $choices", async ({ choices }) => {
  const c = setup(
    <State data={await choiceData(choices)}>
      <Card my def={ChoiceCard} />
    </State>,
  );
  await expect(c.me.card(ChoiceCard)).rejects.toBeInstanceOf(GiTcgDataError);
});

test.each([-1, 2])(
  "rejects out-of-range response %i without emitting a result",
  async (selectedIndex) => {
    const c = setup(
      <State data={await choiceData()}>
        <Card my def={ChoiceCard} />
      </State>,
    );
    const failures: Error[] = [];
    const rpc = c.game.players[0].io.rpc;
    c.game.onIoError = (error) => {
      failures.push(error);
    };
    c.game.players[0].io.rpc = (request) =>
      request.request?.$case === "selectOption"
        ? Promise.resolve(createRpcResponse("selectOption", { selectedIndex }))
        : rpc(request);
    await c.me.card(ChoiceCard);
    expect(failures).toHaveLength(1);
    expect(failures[0].message).toContain("Selected option not in candidates");
    c.expect($.opp.active).toHaveVariable({ health: 10 });
    c.expect($.my.combatStatus.def(ChoiceStatus)).toHaveVariable({ count: 0 });
  },
);
