export const normalizeCommanderMessage = (message: string): string => {
  return message.replace(/^error:\s*/i, "").trim();
};

export const reportError = (error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  if (!process.exitCode || process.exitCode === 0) {
    process.exitCode = 1;
  }
};
