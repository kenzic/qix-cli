import type { Command } from "commander";
import { addCronEntry } from "../../../cron-store.js";

export const registerCronAddCommand = (cron: Command): void => {
  cron
    .command("add")
    .description("Add a cron entry for a managed script")
    .argument("<name>", "script name")
    .requiredOption("--schedule <cron_expr>", "cron schedule expression")
    .option("--args <arg string>", "arguments passed to the script")
    .option("--env <key=value...>", "environment assignment", (value, prev) => {
      const items = Array.isArray(prev) ? prev : [];
      items.push(value);
      return items;
    }, [] as string[])
    .option("--comment <label>", "freeform label for easier removal/filtering")
    .option("--dry-run", "print the cron line without writing crontab")
    .action(
      async (
        name: string,
        options: {
          schedule: string;
          args?: string;
          env?: string[];
          comment?: string;
          dryRun?: boolean;
        },
      ) => {
        const entry = await addCronEntry({
          name,
          schedule: options.schedule,
          args: options.args,
          env: options.env,
          comment: options.comment,
          dryRun: options.dryRun,
        });
        if (options.dryRun) {
          if (entry.headerLine) {
            console.log(entry.headerLine);
          }
          console.log(entry.raw);
          return;
        }
        console.log(`Added cron for "${entry.scriptName}"`);
      },
    );
};
