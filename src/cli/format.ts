import type { ListedScript } from "../script-store.js";

export const formatListTable = (scripts: ListedScript[]): string => {
  if (scripts.length === 0) {
    return "Name  Description\n----  -----------\n";
  }
  const nameHeader = "Name";
  const descHeader = "Description";
  const nameWidth = Math.max(
    nameHeader.length,
    ...scripts.map((s) => s.name.length),
  );
  const descWidth = Math.max(
    descHeader.length,
    ...scripts.map((s) => (s.description || "").length),
  );
  const pad = (s: string, w: number) => s.padEnd(w);
  const sep = "-".repeat(nameWidth) + "  " + "-".repeat(descWidth);
  const rows = [
    pad(nameHeader, nameWidth) + "  " + pad(descHeader, descWidth),
    sep,
    ...scripts.map(
      ({ name, description }) =>
        pad(name, nameWidth) + "  " + pad(description || "", descWidth),
    ),
  ];
  return rows.join("\n");
};

export const formatMetadataValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export const formatMetadataTable = (
  metadata: Record<string, unknown>,
  excludeKeys: string[] = [],
): string => {
  const entries = Object.entries(metadata).filter(
    ([key]) => !excludeKeys.includes(key),
  );
  if (entries.length === 0) return "";
  const keyHeader = "Key";
  const valueHeader = "Value";
  const keys = entries.map(([k]) => k);
  const values = entries.map(([, v]) => formatMetadataValue(v));
  const keyWidth = Math.max(keyHeader.length, ...keys.map((k) => k.length));
  const valueWidth = Math.max(
    valueHeader.length,
    ...values.map((s) => s.length),
  );
  const pad = (s: string, w: number) => s.padEnd(w);
  const sep = "-".repeat(keyWidth) + "  " + "-".repeat(valueWidth);
  const rows = [
    pad(keyHeader, keyWidth) + "  " + pad(valueHeader, valueWidth),
    sep,
    ...entries.map(
      ([k, v]) =>
        pad(k, keyWidth) + "  " + pad(formatMetadataValue(v), valueWidth),
    ),
  ];
  return rows.join("\n");
};
