#!/usr/bin/env node

import { Command, CommanderError } from "commander";
import {
  addScript,
  linkScript,
  listScripts,
  resolveScriptPathByName,
} from "./script-store.js";
import { runScriptWithBash } from "./process.js";
import { getBashCompletionScript } from "./completion.js";

function reportError(error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  if (!process.exitCode || process.exitCode === 0) {
    process.exitCode = 1;
  }
}

function normalizeCommanderMessage(message) {
  return message.replace(/^error:\s*/i, "");
}

async function main() {
  const program = new Command();

  program
    .name("qix")
    .usage("[command]")
    .description("Manage bash scripts from a single CLI.")
    .showHelpAfterError()
    .addHelpText(
      "after",
      `
Examples:
  qix add ./deploy.sh
  qix add ./deploy.sh --move
  qix add ./deploy.sh --name prod-deploy --force
  qix run prod-deploy -- --env staging
  source <(qix completion bash)
`
    );

  program
    .command("add")
    .description("Add a script by copying it into ~/.qix/scripts")
    .argument("<script>", "path to a script file")
    .option("--move", "move script instead of copying")
    .option("--name <name>", "name to store script as")
    .option("--force", "overwrite existing script with same name")
    .action(async (script, options) => {
      const result = await addScript({
        sourcePath: script,
        name: options.name,
        move: options.move,
        force: options.force,
      });
      console.log(`${options.move ? "Moved" : "Added"} "${result.name}"`);
    });

  program
    .command("link")
    .description("Link a script into ~/.qix/scripts instead of copying")
    .argument("<script>", "path to a script file")
    .option("--name <name>", "name to store script as")
    .option("--force", "overwrite existing script with same name")
    .action(async (script, options) => {
      const result = await linkScript({
        sourcePath: script,
        name: options.name,
        force: options.force,
      });
      console.log(`Linked "${result.name}"`);
    });

  program
    .command("list")
    .description("List all scripts")
    .action(async () => {
      const names = await listScripts();
      for (const name of names) {
        console.log(name);
      }
    });

  program
    .command("run")
    .description("Run a script (any args will be passed to the script)")
    .argument("<name>", "script name")
    .argument("[args...]", "arguments passed to the script")
    .action(async (name, args) => {
      const scriptPath = await resolveScriptPathByName(name);
      const exitCode = await runScriptWithBash(scriptPath, args || []);
      process.exitCode = exitCode;
    });

  program
    .command("completion")
    .description("Print shell completion script")
    .argument("[shell]", "shell name (currently only bash)", "bash")
    .action(async (shell) => {
      if (shell !== "bash") {
        throw new Error(
          `Unsupported shell "${shell}". Currently only "bash" is supported.`
        );
      }
      console.log(getBashCompletionScript());
    });

  if (process.argv.length <= 2) {
    program.outputHelp();
    return;
  }

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  if (error instanceof CommanderError) {
    if (error.code === "commander.helpDisplayed") {
      process.exitCode = 0;
      return;
    }
    reportError(normalizeCommanderMessage(error.message));
    return;
  }

  reportError(error);
});
