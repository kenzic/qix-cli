import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { resolveScriptPathByName } from "./script-store.js";

const QIX_MARKER_PREFIX = "qix:";

export interface CronEntry {
  schedule: string;
  command: string;
  marker: string;
  scriptName: string;
  comment?: string;
  hash: string;
  raw: string;
}

export interface AddCronOptions {
  name: string;
  schedule: string;
  args?: string;
  env?: string[];
  comment?: string;
  dryRun?: boolean;
}

export interface RemoveCronOptions {
  name: string;
  schedule?: string;
  comment?: string;
  all?: boolean;
  dryRun?: boolean;
}

export interface ListCronOptions {
  name?: string;
}

function assertCronSchedule(schedule: string): string {
  const normalized = typeof schedule === "string" ? schedule.trim() : "";
  if (!normalized) {
    throw new Error("Cron schedule is required.");
  }
  const segments = normalized.split(/\s+/);
  if (segments.length < 5) {
    throw new Error(
      `Invalid cron schedule "${schedule}". Expected at least 5 fields.`,
    );
  }
  return normalized;
}

function shellEscapeSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function parseEnvAssignments(envValues: string[] = []): string {
  if (envValues.length === 0) return "";

  const assignments: string[] = [];
  for (const value of envValues) {
    if (!value.includes("=")) {
      throw new Error(`Invalid --env value "${value}". Expected KEY=VALUE.`);
    }
    const [key, ...parts] = value.split("=");
    if (!key || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error(`Invalid environment variable name "${key}".`);
    }
    assignments.push(`${key}=${shellEscapeSingleQuote(parts.join("="))}`);
  }

  return assignments.join(" ");
}

function makeHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}

function parseQixMarker(marker: string): {
  scriptName: string;
  comment?: string;
  hash: string;
} | null {
  if (!marker.startsWith(QIX_MARKER_PREFIX)) return null;
  const rest = marker.slice(QIX_MARKER_PREFIX.length);
  const parts = rest.split(":");
  if (parts.length < 2) return null;
  const scriptName = parts[0]?.trim();
  const hash = parts[parts.length - 1]?.trim();
  if (!scriptName || !hash) return null;

  const comment =
    parts.length > 2 ? parts.slice(1, parts.length - 1).join(":").trim() : "";

  return { scriptName, hash, comment: comment || undefined };
}

function parseQixCronLine(line: string): CronEntry | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const markerMatch = trimmed.match(/\s+#\s*(qix:[^\s].*)$/);
  if (!markerMatch) return null;

  const marker = markerMatch[1].trim();
  const markerData = parseQixMarker(marker);
  if (!markerData) return null;

  const lineWithoutMarker = trimmed.slice(0, markerMatch.index).trim();
  const tokens = lineWithoutMarker.split(/\s+/);
  if (tokens.length < 6) return null;

  const schedule = tokens.slice(0, 5).join(" ");
  const command = tokens.slice(5).join(" ");

  return {
    schedule,
    command,
    marker,
    scriptName: markerData.scriptName,
    comment: markerData.comment,
    hash: markerData.hash,
    raw: line,
  };
}

function runCrontab(
  args: string[],
  stdinData?: string,
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn("crontab", args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.once("error", (error: Error) => {
      reject(new Error(`Failed to run crontab: ${error.message}`));
    });
    child.once("close", (code: number | null) => {
      resolve({ stdout, stderr, code: typeof code === "number" ? code : 1 });
    });

    if (stdinData !== undefined) {
      child.stdin.write(stdinData);
    }
    child.stdin.end();
  });
}

async function readCrontabLines(): Promise<string[]> {
  const result = await runCrontab(["-l"]);
  if (result.code === 0) {
    const text = result.stdout.replace(/\r\n/g, "\n");
    return text === "" ? [] : text.split("\n").filter((line) => line !== "");
  }

  const noCrontab =
    result.stderr.toLowerCase().includes("no crontab") ||
    result.stdout.toLowerCase().includes("no crontab");
  if (noCrontab) return [];

  throw new Error(result.stderr.trim() || "Failed to read crontab.");
}

async function writeCrontabLines(lines: string[]): Promise<void> {
  const content = lines.length > 0 ? `${lines.join("\n")}\n` : "";
  const result = await runCrontab(["-"], content);
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || "Failed to write crontab.");
  }
}

function buildMarker(name: string, comment: string | undefined, hash: string): string {
  if (!comment) return `${QIX_MARKER_PREFIX}${name}:${hash}`;
  return `${QIX_MARKER_PREFIX}${name}:${comment}:${hash}`;
}

export async function listCronEntries(
  options: ListCronOptions = {},
): Promise<CronEntry[]> {
  const lines = await readCrontabLines();
  const entries = lines
    .map((line) => parseQixCronLine(line))
    .filter((entry): entry is CronEntry => Boolean(entry));

  if (options.name) {
    return entries.filter((entry) => entry.scriptName === options.name);
  }
  return entries;
}

export async function addCronEntry(options: AddCronOptions): Promise<CronEntry> {
  const schedule = assertCronSchedule(options.schedule);
  const scriptPath = await resolveScriptPathByName(options.name);
  const envPrefix = parseEnvAssignments(options.env);
  const argsSuffix = options.args ? ` ${options.args.trim()}` : "";
  const commandCore = `bash ${shellEscapeSingleQuote(scriptPath)}${argsSuffix}`;
  const command = envPrefix ? `${envPrefix} ${commandCore}` : commandCore;
  const normalizedComment = options.comment?.trim();
  const hash = makeHash(`${schedule}|${command}|${normalizedComment || ""}`);
  const marker = buildMarker(options.name, normalizedComment, hash);
  const raw = `${schedule} ${command} # ${marker}`;

  const entry: CronEntry = {
    schedule,
    command,
    marker,
    scriptName: options.name,
    comment: normalizedComment || undefined,
    hash,
    raw,
  };

  if (options.dryRun) {
    return entry;
  }

  const lines = await readCrontabLines();
  const exists = lines.some((line) => line.trim() === raw.trim());
  if (!exists) {
    lines.push(raw);
    await writeCrontabLines(lines);
  }

  return entry;
}

function shouldRemoveEntry(entry: CronEntry, options: RemoveCronOptions): boolean {
  if (entry.scriptName !== options.name) return false;
  if (options.all) return true;
  if (options.schedule && entry.schedule !== options.schedule.trim()) return false;
  if (options.comment && (entry.comment || "") !== options.comment.trim()) {
    return false;
  }
  return true;
}

export async function removeCronEntries(
  options: RemoveCronOptions,
): Promise<{ removed: CronEntry[] }> {
  const lines = await readCrontabLines();
  const removed: CronEntry[] = [];
  const kept: string[] = [];

  for (const line of lines) {
    const entry = parseQixCronLine(line);
    if (!entry) {
      kept.push(line);
      continue;
    }
    if (shouldRemoveEntry(entry, options)) {
      removed.push(entry);
      continue;
    }
    kept.push(line);
  }

  if (!options.dryRun && removed.length > 0) {
    await writeCrontabLines(kept);
  }

  return { removed };
}
