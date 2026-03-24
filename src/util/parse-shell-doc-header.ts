const SECTION_HEADER_RE =
  /^(usage|requirements|options|examples|exit codes):\s*$/i;

const DECORATIVE_LINE_RE = /^[\s#\-_=]+$/;

const stripLeadingComment = (line: string): string =>
  line.replace(/^\s*#\s?/, "");

const isLikelyFilenameOnlyTitle = (line: string): boolean =>
  /^[\w.-]+\.sh\s*$/.test(line.trim());

type SectionKey = "usage" | "requirements" | "options" | "examples" | "exitCodes";

const sectionNameToKey = (name: string): SectionKey | null => {
  const n = name.trim().toLowerCase();
  if (n === "usage") return "usage";
  if (n === "requirements") return "requirements";
  if (n === "options") return "options";
  if (n === "examples") return "examples";
  if (n === "exit codes") return "exitCodes";
  return null;
};

const extractInitialCommentBodyLines = (content: string): string[] | null => {
  const lines = content.split(/\r?\n/);
  let i = 0;
  if (lines[0]?.startsWith("#!")) {
    i = 1;
  }

  const body: string[] = [];
  for (; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (trimmed === "") {
      if (body.length > 0) {
        body.push("");
      }
      continue;
    }
    if (!trimmed.startsWith("#")) {
      break;
    }
    body.push(stripLeadingComment(raw));
  }

  if (body.length === 0) {
    return null;
  }

  return body;
};

const joinSectionLines = (lines: string[]): string =>
  lines
    .map((l) => l.trimEnd())
    .join("\n")
    .trim();

/**
 * Parses common shell script header comments (Usage:, Requirements:, etc.).
 */
export const parseShellDocHeader = (
  content: string,
): Record<string, unknown> | null => {
  const bodyLines = extractInitialCommentBodyLines(content);
  if (!bodyLines) return null;

  const filteredForSections = bodyLines.filter((line) => {
    if (DECORATIVE_LINE_RE.test(line)) return false;
    return true;
  });

  const sections = new Map<SectionKey, string[]>();
  let currentSection: SectionKey | "description" = "description";
  let descriptionLines: string[] = [];
  let pendingDescription: string[] = [];

  const flushDescriptionParagraph = (): void => {
    if (pendingDescription.length === 0) return;
    if (descriptionLines.length > 0) {
      descriptionLines.push("");
    }
    descriptionLines.push(...pendingDescription);
    pendingDescription = [];
  };

  for (const line of filteredForSections) {
    const trimmed = line.trim();
    const sectionMatch = trimmed.match(SECTION_HEADER_RE);
    if (sectionMatch) {
      const key = sectionNameToKey(sectionMatch[1]);
      if (key) {
        flushDescriptionParagraph();
        currentSection = key;
        if (!sections.has(key)) {
          sections.set(key, []);
        }
        continue;
      }
    }

    if (currentSection === "description") {
      if (trimmed === "") {
        flushDescriptionParagraph();
        continue;
      }
      pendingDescription.push(line);
      continue;
    }

    const bucket = sections.get(currentSection);
    if (bucket) {
      bucket.push(line);
    }
  }

  flushDescriptionParagraph();

  const descCandidate = descriptionLines
    .filter((line, idx, arr) => {
      if (DECORATIVE_LINE_RE.test(line)) return false;
      if (isLikelyFilenameOnlyTitle(line) && idx === 0 && arr.length > 1) {
        return false;
      }
      return true;
    })
    .join("\n")
    .trim();

  const metadata: Record<string, unknown> = {};
  for (const [key, lines] of sections) {
    const text = joinSectionLines(lines);
    if (text) {
      metadata[key] = text;
    }
  }

  const hasMetadata = Object.keys(metadata).length > 0;
  const hasDescription = descCandidate.length > 0;

  if (!hasDescription && !hasMetadata) {
    return null;
  }

  const result: Record<string, unknown> = {};
  if (hasDescription) {
    result.description = descCandidate;
  }
  if (hasMetadata) {
    result.metadata = metadata;
  }

  return result;
};
