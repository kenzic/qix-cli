import { spawn } from "node:child_process";
import type { MakeProvider } from "../types.js";

const DEFAULT_BIN = "claude";

const getClaudeBin = (): string =>
  process.env.QIX_MAKE_CLAUDE_BIN?.trim() || DEFAULT_BIN;

export const claudeCodeProvider: MakeProvider = {
  id: "claude-code",
  description: "Claude Code CLI (claude)",
  launch: async ({
    scriptName,
    promptFilePath,
    cwd,
  }): Promise<number> => {
    const bin = getClaudeBin();
    const initialMessage =
      `Help me write a bash script for qix named "${scriptName}". ` +
      `Prefer saving as ./${scriptName}.sh in the current working directory unless we agree otherwise.`;

    const args: string[] = [
      "--append-system-prompt-file",
      promptFilePath,
      "-n",
      `qix-make:${scriptName}`,
      initialMessage,
    ];

    return new Promise((resolve, reject) => {
      const child = spawn(bin, args, {
        cwd,
        stdio: "inherit",
      });

      child.once("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") {
          reject(
            new Error(
              `Could not run "${bin}". Install Claude Code and ensure it is on PATH, or set QIX_MAKE_CLAUDE_BIN to the executable path.`,
            ),
          );
          return;
        }
        reject(
          new Error(`Failed to start ${bin}: ${error.message}`),
        );
      });

      child.once("close", (code: number | null) => {
        resolve(typeof code === "number" ? code : 1);
      });
    });
  },
};
