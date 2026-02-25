import path from "node:path";
import { constants } from "node:fs";
import {
  access,
  chmod,
  copyFile,
  lstat,
  readdir,
  rename,
  rm,
  stat,
  symlink,
} from "node:fs/promises";
import { resolveScriptName, validateScriptName } from "./names.js";
import { ensureScriptsDir, getScriptPath, getScriptsDir } from "./paths.js";

async function assertReadableFile(filePath) {
  const resolved = path.resolve(filePath);

  let fileStat;
  try {
    fileStat = await stat(resolved);
  } catch (error) {
    if (error && error.code === "ENOENT") {
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

async function removeDestinationIfNeeded(destinationPath, force) {
  let existing;
  try {
    existing = await lstat(destinationPath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  if (!force) {
    const scriptName = path.basename(destinationPath, ".sh");
    throw new Error(`Script "${scriptName}" already exists. Use --force to overwrite.`);
  }

  if (existing.isDirectory() && !existing.isSymbolicLink()) {
    throw new Error(`Cannot overwrite directory at destination: ${destinationPath}`);
  }

  await rm(destinationPath, { force: true });
}

async function setExecutableMode(filePath) {
  await chmod(filePath, 0o755);
}

export async function addScript({ sourcePath, name, move = false, force = false }) {
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

export async function linkScript({ sourcePath, name, force = false }) {
  await ensureScriptsDir();

  const resolvedSource = await assertReadableFile(sourcePath);
  const scriptName = resolveScriptName(resolvedSource, name);
  const destinationPath = getScriptPath(scriptName);

  await removeDestinationIfNeeded(destinationPath, force);

  await symlink(resolvedSource, destinationPath);

  return { name: scriptName, path: destinationPath };
}

export async function listScripts() {
  await ensureScriptsDir();
  const entries = await readdir(getScriptsDir(), { withFileTypes: true });

  return entries
    .filter(
      (entry) =>
        entry.name.endsWith(".sh") && (entry.isFile() || entry.isSymbolicLink())
    )
    .map((entry) => entry.name.slice(0, -3))
    .sort((a, b) => a.localeCompare(b));
}

export async function resolveScriptPathByName(name) {
  const scriptName = validateScriptName(name);
  const scriptPath = getScriptPath(scriptName);

  try {
    await lstat(scriptPath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new Error(`Script "${scriptName}" not found.`);
    }
    throw error;
  }

  return scriptPath;
}
