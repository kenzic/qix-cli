import { Command } from "commander";
import { HEADER, HELP_EXAMPLES, VERSION } from "./constants.js";
import { registerAddCommand } from "./commands/add.js";
import { registerCompletionCommand } from "./commands/completion.js";
import { registerCronCommands } from "./commands/cron/index.js";
import { registerInfoCommand } from "./commands/info.js";
import { registerLinkCommand } from "./commands/link.js";
import { registerListCommand } from "./commands/list.js";
import { registerRunCommand } from "./commands/run.js";

export const runCli = async (): Promise<void> => {
  const program = new Command();

  program
    .name("qix")
    .usage("[command]")
    .version(VERSION)
    .description("Manage bash scripts from a single CLI.")
    .showHelpAfterError()
    .addHelpText("before", HEADER)
    .addHelpText("after", HELP_EXAMPLES);

  registerAddCommand(program);
  registerLinkCommand(program);
  registerListCommand(program);
  registerInfoCommand(program);
  registerRunCommand(program);
  registerCompletionCommand(program);
  registerCronCommands(program);

  if (process.argv.length <= 2) {
    program.outputHelp();
    return;
  }

  await program.parseAsync(process.argv);
};
