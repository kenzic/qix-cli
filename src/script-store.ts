import path from "node:path";
import { constants } from "node:fs";
import {
  access,
  chmod,
  copyFile,
  lstat,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  symlink,
} from "node:fs/promises";
import { resolveScriptName, validateScriptName } from "./names.js";
import { ensureScriptsDir, getScriptPath, getScriptsDir } from "./paths.js";
import { parseScriptInfo } from "./util/parse-script-info.js";

export interface AddScriptOptions {
  sourcePath: string;
  name?: string | null;
  move?: boolean;
  force?: boolean;
}

export interface LinkScriptOptions {
  sourcePath: string;
  name?: string | null;
  force?: boolean;
}

export interface ScriptInfo {
  name: string;
  path: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface ListedScript {
  name: string;
  description?: string;
}

function isErrnoException(
  err: unknown
): err is NodeJS.ErrnoException {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err
  );
}

async function assertReadableFile(filePath: string): Promise<string> {
  const resolved = path.resolve(filePath);

  let fileStat;
  try {
    fileStat = await stat(resolved);
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      throw new Error(`Source script not found: ${resolved}`);
    }
    throw error;
  }

  if (!fileStat.isFile()) {
    throw new Error(`Source path is not a file: ${resolved}`);
  }

  try {
    await access(resolved, constants.R_OK);
  } catch {
    throw new Error(`Source script is not readable: ${resolved}`);
  }

  return resolved;
}

async function removeDestinationIfNeeded(
  destinationPath: string,
  force: boolean
): Promise<void> {
  let existing;
  try {
    existing = await lstat(destinationPath);
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  if (!force) {
    const scriptName = path.basename(destinationPath, ".sh");
    throw new Error(
      `Script "${scriptName}" already exists. Use --force to overwrite.`
    );
  }

  if (existing.isDirectory() && !existing.isSymbolicLink()) {
    throw new Error(
      `Cannot overwrite directory at destination: ${destinationPath}`
    );
  }

  await rm(destinationPath, { force: true });
}

async function setExecutableMode(filePath: string): Promise<void> {
  await chmod(filePath, 0o755);
}

export async function addScript({
  sourcePath,
  name,
  move = false,
  force = false,
}: AddScriptOptions): Promise<{ name: string; path: string }> {
  await ensureScriptsDir();

  const resolvedSource = await assertReadableFile(sourcePath);
  const scriptName = resolveScriptName(resolvedSource, name);
  const destinationPath = getScriptPath(scriptName);

  await removeDestinationIfNeeded(destinationPath, force);

  if (move) {
    await rename(resolvedSource, destinationPath);
  } else {
    await copyFile(resolvedSource, destinationPath);
  }

  await setExecutableMode(destinationPath);

  return { name: scriptName, path: destinationPath };
}

export async function linkScript({
  sourcePath,
  name,
  force = false,
}: LinkScriptOptions): Promise<{ name: string; path: string }> {
  await ensureScriptsDir();

  const resolvedSource = await assertReadableFile(sourcePath);
  const scriptName = resolveScriptName(resolvedSource, name);
  const destinationPath = getScriptPath(scriptName);

  await removeDestinationIfNeeded(destinationPath, force);

  await symlink(resolvedSource, destinationPath);

  return { name: scriptName, path: destinationPath };
}

export async function listScripts(): Promise<ListedScript[]> {
  await ensureScriptsDir();
  const entries = await readdir(getScriptsDir(), { withFileTypes: true });

  const scripts = entries
    .filter(
      (entry) =>
        entry.name.endsWith(".sh") &&
        (entry.isFile() || entry.isSymbolicLink())
    )
    .map((entry) => entry.name.slice(0, -3));

  const withDescriptions = await Promise.all(
    scripts.map(async (name): Promise<ListedScript> => {
      let description: string | undefined;
      try {
        const content = await readFile(getScriptPath(name), "utf8");
        const data = parseScriptInfo(content);
        description =
          typeof data.description === "string"
            ? data.description.trim()
            : undefined;
      } catch {
        // ignore read errors (e.g. broken symlink)
      }
      return { name, description };
    })
  );

  return withDescriptions.sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeLookupName(name: string): string {
  const trimmed = typeof name === "string" ? name.trim() : "";
  return trimmed.endsWith(".sh") ? trimmed.slice(0, -3) : trimmed;
}

/** Same name normalization as resolveScriptPathByName (e.g. strips optional `.sh`). */
export function normalizeScriptNameInput(name: string): string {
  return validateScriptName(normalizeLookupName(name));
}

export async function resolveScriptPathByName(name: string): Promise<string> {
  const scriptName = validateScriptName(normalizeLookupName(name));
  const scriptPath = getScriptPath(scriptName);

  try {
    await lstat(scriptPath);
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      throw new Error(`Script "${scriptName}" not found.`);
    }
    throw error;
  }

  return scriptPath;
}

export async function getScriptInfo(name: string): Promise<{
  name: string;
  path: string;
  info: Record<string, unknown>;
}> {
  const scriptPath = await resolveScriptPathByName(name);
  const scriptName = path.basename(scriptPath, ".sh");
  const content = await readFile(scriptPath, "utf8");
  const info = parseScriptInfo(content);
  return { name: scriptName, path: scriptPath, info };
}
