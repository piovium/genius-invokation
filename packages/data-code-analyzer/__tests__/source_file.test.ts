import { expect, test } from "vitest";
import path from "node:path";
import { TcgDataProject } from "../scripts/project";
import { TcgDataSourceFile } from "../scripts/source_file";

test("entity dependencies exclude local bindings and retain inline entities", () => {
  const base = path.resolve("data");
  const file = new TcgDataSourceFile(
    base,
    path.join(base, "test.gts"),
    `
      define skill { id 1 as Shadowed; };
      define skill { id 2 as Fallback; };
      define skill { id 3 as Outside; };
      const Alias = ([Shadowed = Fallback]) => [Shadowed, Outside];
      define character {
        id 4 as Character;
        skills Alias, Inline;
        nested { id 5 as Inline; };
        filter ((Shadowed) => Shadowed);
        :use(Shadowed);
        const Shadowed = Outside;
      };
    `,
  );
  const project = new TcgDataProject();
  project.addFile(file);
  expect(project.getDependencies(file, file.definitions[3])).toEqual(
    new Set([2, 3, 5]),
  );
});
