import { $, Character, State, Status, ref, setup } from "#test";
import {
  InfluxBlast,
  MirrorMaiden,
  Refraction,
  Refraction01,
} from "@gi-tcg/data/internal/characters/hydro/mirror_maiden.gts";
import { test } from "vitest";

test.each([Refraction, Refraction01])(
  "crossCharacter disposes conflicting status %s on another character",
  async (conflicting) => {
    const oldStatus = ref();
    const alliedStatus = ref();
    const c = setup(
      <State>
        <Character my active def={MirrorMaiden}>
          <Status def={conflicting} ref={alliedStatus} />
        </Character>
        <Character opp active />
        <Character opp>
          <Status def={conflicting} ref={oldStatus} />
        </Character>
      </State>,
    );

    await c.me.skill(InfluxBlast);

    c.expect(oldStatus).toNotExist();
    c.expect($.opp.status.def(Refraction)).toHaveVariable({ duration: 2 });
    c.expect(alliedStatus).toHaveVariable({
      duration: conflicting === Refraction ? 2 : 3,
    });
  },
);
