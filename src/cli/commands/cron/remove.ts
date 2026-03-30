import type { Command } from "commander";
import { removeCronEntries } from "../../../cron-store.js";

export const registerCronRemoveCommand = (cron: Command): void => {
  cron
    .command("remove")
    .description("Remove cron entries for a managed script")
    .argument("<name>", "script name")
    .option("--schedule <cron_expr>", "only remove matching schedule")
    .option("--comment <label>", "only remove matching comment label")
    .option("--all", "remove all qix cron entries for script")
    .option("--dry-run", "show removable entries without writing crontab")
    .action(
      async (
        name: string,
        options: {
          schedule?: string;
          comment?: string;
          all?: boolean;
          dryRun?: boolean;
        },
      ) => {
        if (!options.all && !options.schedule && !options.comment) {
          throw new Error(
            "Specify --all, --schedule, or --comment to remove entries.",
          );
        }
        const result = await removeCronEntries({
          name,
          schedule: options.schedule,
          comment: options.comment,
          all: options.all,
          dryRun: options.dryRun,
        });
        if (options.dryRun) {
          for (const entry of result.removed) {
            if (entry.headerLine) {
              console.log(entry.headerLine);
            }
            console.log(entry.raw);
          }
          console.log(
            `Matched ${result.removed.length} cron entr${result.removed.length === 1 ? "y" : "ies"}`,
          );
          return;
        }
        console.log(
          `Removed ${result.removed.length} cron entr${result.removed.length === 1 ? "y" : "ies"}`,
        );
      },
    );
};
