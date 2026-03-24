import type { Command } from "commander";
import { addScript } from "../../script-store.js";

export const registerAddCommand = (program: Command): void => {
  program
    .command("add")
    .description("Add a script by copying it into ~/.qix/scripts")
    .argument("<script>", "path to a script file")
    .option("--move", "move script instead of copying")
    .option("--name <name>", "name to store script as")
    .option("--force", "overwrite existing script with same name")
    .action(
      async (
        script: string,
        options: { move?: boolean; name?: string; force?: boolean },
      ) => {
        const result = await addScript({
          sourcePath: script,
          name: options.name,
          move: options.move,
          force: options.force,
        });
        console.log(`${options.move ? "Moved" : "Added"} "${result.name}"`);
      },
    );
};
