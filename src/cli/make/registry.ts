import { claudeCodeProvider } from "./providers/claude-code.js";
import type { MakeProvider } from "./types.js";

const providers: MakeProvider[] = [claudeCodeProvider];

const byId = new Map(providers.map((p) => [p.id, p]));

export const listMakeProviderIds = (): string[] =>
  providers.map((p) => p.id);

export const getMakeProvider = (id: string): MakeProvider => {
  const provider = byId.get(id);
  if (!provider) {
    const available = listMakeProviderIds().join(", ");
    throw new Error(
      `Unknown make provider "${id}". Available providers: ${available}.`,
    );
  }
  return provider;
};
