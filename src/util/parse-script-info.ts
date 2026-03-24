import { parseQixHeader } from "./parse-qix-header.js";
import { parseShellDocHeader } from "./parse-shell-doc-header.js";

const hasQixContent = (data: Record<string, unknown>): boolean =>
  Object.keys(data).length > 0;

/**
 * Prefer qix comment-frontmatter; if missing or empty, fall back to
 * conventional shell documentation comments.
 */
export const parseScriptInfo = (content: string): Record<string, unknown> => {
  const qix = parseQixHeader(content);
  if (qix !== null && hasQixContent(qix)) {
    return qix;
  }

  const shellDoc = parseShellDocHeader(content);
  if (shellDoc !== null && hasQixContent(shellDoc)) {
    return shellDoc;
  }

  return {};
};
