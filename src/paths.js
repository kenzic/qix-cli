import os from "node:os";
import path from "node:path";
import { mkdir } from "node:fs/promises";

export function getHomeDir() {
  const home = process.env.HOME || os.homedir();
  if (!home) {
    throw new Error("Could not resolve home directory.");
  }
  return home;
}

export function getQixDir() {
  return path.join(getHomeDir(), ".qix");
}

export function getScriptsDir() {
  return path.join(getQixDir(), "scripts");
}

export function getScriptPath(name) {
  return path.join(getScriptsDir(), `${name}.sh`);
}

export async function ensureScriptsDir() {
  await mkdir(getScriptsDir(), { recursive: true });
}
