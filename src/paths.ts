import os from "node:os";
import path from "node:path";
import { mkdir } from "node:fs/promises";

export function getHomeDir(): string {
  const home = process.env.HOME || os.homedir();
  if (!home) {
    throw new Error("Could not resolve home directory.");
  }
  return home;
}

export function getQixDir(): string {
  return path.join(getHomeDir(), ".qix");
}

export function getScriptsDir(): string {
  return path.join(getQixDir(), "scripts");
}

export function getScriptPath(name: string): string {
  return path.join(getScriptsDir(), `${name}.sh`);
}

export async function ensureScriptsDir(): Promise<void> {
  await mkdir(getScriptsDir(), { recursive: true });
}
