import type { Command } from "commander";
import { linkScript } from "../../script-store.js";

export const registerLinkCommand = (program: Command): void => {
  program
    .command("link")
    .description("Link a script into ~/.qix/scripts instead of copying")
    .argument("<script>", "path to a script file")
    .option("--name <name>", "name to store script as")
    .option("--force", "overwrite existing script with same name")
    .action(
      async (script: string, options: { name?: string; force?: boolean }) => {
        const result = await linkScript({
          sourcePath: script,
          name: options.name,
          force: options.force,
        });
        console.log(`Linked "${result.name}"`);
      },
    );
};
