#!/usr/bin/env node

import { Command, CommanderError } from "commander";
import {
  addScript,
  getScriptInfo,
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

function formatListTable(scripts) {
  if (scripts.length === 0) {
    return "Name  Description\n----  -----------\n";
  }
  const nameHeader = "Name";
  const descHeader = "Description";
  const nameWidth = Math.max(
    nameHeader.length,
    ...scripts.map((s) => s.name.length),
  );
  const descWidth = Math.max(
    descHeader.length,
    ...scripts.map((s) => (s.description || "").length),
  );
  const pad = (s, w) => s.padEnd(w);
  const sep = "-".repeat(nameWidth) + "  " + "-".repeat(descWidth);
  const rows = [
    pad(nameHeader, nameWidth) + "  " + pad(descHeader, descWidth),
    sep,
    ...scripts.map(
      ({ name, description }) =>
        pad(name, nameWidth) + "  " + pad(description || "", descWidth),
    ),
  ];
  return rows.join("\n");
}

function formatMetadataValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatMetadataTable(metadata, excludeKeys = []) {
  const entries = Object.entries(metadata).filter(
    ([key]) => !excludeKeys.includes(key),
  );
  if (entries.length === 0) return "";
  const keyHeader = "Key";
  const valueHeader = "Value";
  const keys = entries.map(([k]) => k);
  const values = entries.map(([, v]) => formatMetadataValue(v));
  const keyWidth = Math.max(keyHeader.length, ...keys.map((k) => k.length));
  const valueWidth = Math.max(
    valueHeader.length,
    ...values.map((s) => s.length),
  );
  const pad = (s, w) => s.padEnd(w);
  const sep = "-".repeat(keyWidth) + "  " + "-".repeat(valueWidth);
  const rows = [
    pad(keyHeader, keyWidth) + "  " + pad(valueHeader, valueWidth),
    sep,
    ...entries.map(
      ([k, v]) =>
        pad(k, keyWidth) + "  " + pad(formatMetadataValue(v), valueWidth),
    ),
  ];
  return rows.join("\n");
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
`,
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
    .alias("ls")
    .description("List all scripts")
    .option("--plain", "one script per line (name or name — description)")
    .option("--json", "output as JSON array")
    .action(async (options) => {
      const scripts = await listScripts();
      if (options.json) {
        const out = scripts.map(({ name, description }) =>
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

  program
    .command("info")
    .description("Show script name, description, usage, and metadata")
    .argument("<name>", "script name")
    .action(async (name) => {
      const { name: scriptName, info } = await getScriptInfo(name);
      console.log(`Name: ${scriptName}`);
      if (
        info.description !== undefined &&
        info.description !== null &&
        typeof info.description === "string"
      ) {
        console.log(`Description: ${info.description.trim()}`);
      }

      if (
        info?.metadata?.usage !== undefined &&
        info?.metadata?.usage !== null
      ) {
        console.log("\nUsage:");
        console.log(formatMetadataValue(info.metadata.usage));
      }
      if (info?.metadata) {
        const table = formatMetadataTable(info.metadata, [
          "usage",
          "description",
        ]);
        if (table) {
          console.log("\nMetadata");
          console.log(table);
        }
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
          `Unsupported shell "${shell}". Currently only "bash" is supported.`,
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
