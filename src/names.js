import path from "node:path";

export const VALID_NAME_RE = /^[A-Za-z0-9._-]+$/;

export function deriveNameFromScriptPath(scriptPath) {
  return path.parse(scriptPath).name;
}

export function validateScriptName(name) {
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("Invalid script name. Name cannot be empty.");
  }

  if (!VALID_NAME_RE.test(name)) {
    throw new Error(
      `Invalid script name "${name}". Allowed characters: letters, numbers, dot, underscore, and dash.`
    );
  }

  return name;
}

export function resolveScriptName(sourcePath, explicitName) {
  const candidate = explicitName ?? deriveNameFromScriptPath(sourcePath);
  return validateScriptName(candidate);
}
