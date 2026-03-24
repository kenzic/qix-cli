import type { Command } from "commander";
import { listScripts } from "../../script-store.js";
import type { ListedScript } from "../../script-store.js";
import { formatListTable } from "../format.js";

export const registerListCommand = (program: Command): void => {
  program
    .command("list")
    .alias("ls")
    .description("List all scripts")
    .option("--plain", "one script per line (name or name — description)")
    .option("--json", "output as JSON array")
    .action(async (options: { plain?: boolean; json?: boolean }) => {
      const scripts = await listScripts();
      if (options.json) {
        const out = scripts.map(({ name, description }: ListedScript) =>
          description ? { name, description } : { name },
        );
        console.log(JSON.stringify(out, null, 2));
        return;
      }
      if (options.plain) {
        for (const { name, description } of scripts) {
          const line = description ? `${name} — ${description}` : name;
          console.log(line);
        }
        return;
      }
      console.log(formatListTable(scripts));
    });
};
