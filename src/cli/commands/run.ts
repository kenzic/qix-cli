import type { Command } from "commander";
import { resolveScriptPathByName } from "../../script-store.js";
import { runScriptWithBash } from "../../process.js";

export const registerRunCommand = (program: Command): void => {
  program
    .command("run")
    .description("Run a script (any args will be passed to the script)")
    .argument("<name>", "script name")
    .argument("[args...]", "arguments passed to the script")
    .action(async (name: string, args: string[] = []) => {
      const scriptPath = await resolveScriptPathByName(name);
      const exitCode = await runScriptWithBash(scriptPath, args || []);
      process.exitCode = exitCode;
    });
};
