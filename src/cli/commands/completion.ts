import type { Command } from "commander";
import { getBashCompletionScript } from "../../completion.js";

export const registerCompletionCommand = (program: Command): void => {
  program
    .command("completion")
    .description("Print shell completion script")
    .argument("[shell]", "shell name (currently only bash)", "bash")
    .action(async (shell: string) => {
      if (shell !== "bash") {
        throw new Error(
          `Unsupported shell "${shell}". Currently only "bash" is supported.`,
        );
      }
      console.log(getBashCompletionScript());
    });
};
