import { spawn } from "node:child_process";

export async function runScriptWithBash(
  scriptPath: string,
  args: string[] = []
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn("bash", [scriptPath, ...args], { stdio: "inherit" });

    child.once("error", (error: Error) => {
      reject(new Error(`Failed to start bash process: ${error.message}`));
    });

    child.once("close", (code: number | null) => {
      resolve(typeof code === "number" ? code : 1);
    });
  });
}
