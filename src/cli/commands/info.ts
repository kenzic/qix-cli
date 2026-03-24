import type { Command } from "commander";
import { getScriptInfo } from "../../script-store.js";
import { formatMetadataTable, formatMetadataValue } from "../format.js";

export const registerInfoCommand = (program: Command): void => {
  program
    .command("info")
    .description("Show script name, description, usage, and metadata")
    .argument("<name>", "script name")
    .action(async (name: string) => {
      const { name: scriptName, info } = await getScriptInfo(name);
      console.log(`Name: ${scriptName}`);
      if (
        info.description !== undefined &&
        info.description !== null &&
        typeof info.description === "string"
      ) {
        console.log(`Description: ${info.description.trim()}`);
      }

      const meta = info.metadata;
      if (
        meta !== undefined &&
        meta !== null &&
        typeof meta === "object" &&
        !Array.isArray(meta)
      ) {
        const metaObj = meta as Record<string, unknown>;
        if (metaObj.usage !== undefined && metaObj.usage !== null) {
          console.log("\nUsage:");
          console.log(formatMetadataValue(metaObj.usage));
        }
        const table = formatMetadataTable(metaObj, ["usage", "description"]);
        if (table) {
          console.log("\nMetadata");
          console.log(table);
        }
      }
    });
};
