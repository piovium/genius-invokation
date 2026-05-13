import { $ } from "execa";
import { program } from "@commander-js/extra-typings";

program
  .option("-P, --production", "Use production filter")
  .argument("<command>", "Command to run for each filter")
  .argument("[filter]", "Comma-separated filter list")
  .argument("[args...]", "Extra arguments to pass to the command")
  .action(async (command, filter, args, options) => {
    const filters = filter?.split(",") ?? [];
    const filterArgs = filters.map(
      (f) =>
        `--${options.production ? "filter-prod" : "filter"}=${f.replace(/([\w-]+)/g, "{packages/$1}")}`,
    );
    await $({
      stdio: "inherit",
    })`pnpm --recursive ${filterArgs} ${command} ${args}`;
  });

await program.parseAsync();
