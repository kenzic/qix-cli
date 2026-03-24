import matter from "gray-matter";

/**
 * Parses qix YAML frontmatter embedded in shell comments:
 * # ---
 * # description: ...
 * # metadata:
 * #   usage: ...
 * # ---
 */
export const parseQixHeader = (content: string): Record<string, unknown> | null => {
  const match = content.match(/# ---\n([\s\S]*?)\n# ---/);
  if (!match) return null;
  const yamlLike = match[1]
    .split("\n")
    .map((line) => line.replace(/^# ?/, ""))
    .join("\n");
  const withDelims = `---\n${yamlLike}\n---`;
  const data = matter(withDelims).data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  return data as Record<string, unknown>;
};
