import type { Command } from "commander";
import { registerCronAddCommand } from "./add.js";
import { registerCronListCommand } from "./list.js";
import { registerCronRemoveCommand } from "./remove.js";

export const registerCronCommands = (program: Command): void => {
  const cron = program
    .command("cron")
    .description("Manage cron entries for qix scripts");

  registerCronAddCommand(cron);
  registerCronRemoveCommand(cron);
  registerCronListCommand(cron);
};
