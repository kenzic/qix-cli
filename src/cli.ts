#!/usr/bin/env node

import { CommanderError } from "commander";
import { runCli } from "./cli/app.js";
import { normalizeCommanderMessage, reportError } from "./cli/errors.js";

runCli().catch((error: unknown) => {
  if (error instanceof CommanderError) {
    if (error.code === "commander.helpDisplayed") {
      process.exitCode = 0;
      return;
    }
    reportError(normalizeCommanderMessage(error.message));
    return;
  }

  reportError(error);
});
