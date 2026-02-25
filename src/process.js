import { spawn } from "node:child_process";

export async function runScriptWithBash(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn("bash", [scriptPath, ...args], { stdio: "inherit" });

    child.once("error", (error) => {
      reject(new Error(`Failed to start bash process: ${error.message}`));
    });

    child.once("close", (code) => {
      resolve(typeof code === "number" ? code : 1);
    });
  });
}
