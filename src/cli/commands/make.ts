import type { Command } from "commander";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateScriptName } from "../../names.js";
import { buildMakeContextPrompt } from "../make/prompt.js";
import { getMakeProvider } from "../make/registry.js";

export const registerMakeCommand = (program: Command): void => {
  program
    .command("make")
    .description(
      "Open an agentic CLI to author a bash script (default provider: Claude Code). " +
        "Set QIX_MAKE_CLAUDE_BIN to override the claude executable.",
    )
    .argument("<name>", "script name to create (qix-managed name)")
    .option(
      "--provider <id>",
      "agent CLI provider",
      "claude-code",
    )
    .action(
      async (
        name: string,
        options: { provider: string },
      ) => {
        validateScriptName(name);
        const provider = getMakeProvider(options.provider);

        const promptBody = buildMakeContextPrompt(name);
        const tmpDir = await mkdtemp(path.join(os.tmpdir(), "qix-make-"));
        const promptPath = path.join(tmpDir, "prompt.txt");

        await writeFile(promptPath, promptBody, "utf8");

        try {
          const exitCode = await provider.launch({
            scriptName: name,
            promptFilePath: promptPath,
            cwd: process.cwd(),
          });
          process.exitCode = exitCode;
        } finally {
          await rm(tmpDir, { recursive: true, force: true });
        }
      },
    );
};
