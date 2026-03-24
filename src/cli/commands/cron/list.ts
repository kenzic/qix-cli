import type { Command } from "commander";
import { listCronEntries } from "../../../cron-store.js";

export const registerCronListCommand = (cron: Command): void => {
  cron
    .command("list")
    .description("List qix-managed cron entries")
    .option("--name <name>", "filter by script name")
    .option("--json", "output as JSON array")
    .action(async (options: { name?: string; json?: boolean }) => {
      const entries = await listCronEntries({ name: options.name });
      if (options.json) {
        console.log(
          JSON.stringify(
            entries.map((entry) => ({
              schedule: entry.schedule,
              scriptName: entry.scriptName,
              command: entry.command,
              comment: entry.comment,
              marker: entry.marker,
            })),
            null,
            2,
          ),
        );
        return;
      }
      if (entries.length === 0) {
        console.log("No qix-managed cron entries found.");
        return;
      }
      for (const entry of entries) {
        console.log(
          `${entry.schedule} | ${entry.scriptName} | ${entry.command}${entry.comment ? ` | ${entry.comment}` : ""}`,
        );
      }
    });
};
