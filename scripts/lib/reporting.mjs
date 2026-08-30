import { spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";

import { requireFile } from "./project-files.mjs";

export async function createValidationReport(
  projectRoot,
  { openReport = true } = {},
) {
  const behaviorPack = path.join(
    projectRoot,
    "packs",
    "behavior",
    "die_zauberschmiede",
  );
  const localCreatorTools = path.join(
    projectRoot,
    "node_modules",
    ".bin",
    "mct",
  );
  const outputFolder = path.join(projectRoot, "out");
  const reportFile = path.join(
    outputFolder,
    "die_zauberschmiede.report.html",
  );

  await requireFile(localCreatorTools, projectRoot);
  await rm(outputFolder, { recursive: true, force: true });

  const creatorTools = spawnSync(
    localCreatorTools,
    [
      "--input-folder",
      behaviorPack,
      "--output-folder",
      outputFolder,
      "--isolated",
      "--force",
      "validate",
      "main",
      "CPACKICON,UNLINK",
    ],
    {
      encoding: "utf8",
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  if (creatorTools.status !== 0) {
    const details = [creatorTools.stdout, creatorTools.stderr]
      .filter(Boolean)
      .join("\n")
      .trim();
    throw new Error(`Creator Tools report failed\n${details}`);
  }

  await requireFile(reportFile, projectRoot);

  if (openReport) {
    if (process.platform !== "darwin") {
      throw new Error(
        `Automatic report opening requires macOS. Open ${reportFile} manually.`,
      );
    }
    const opener = spawnSync("open", [reportFile], { encoding: "utf8" });
    if (opener.status !== 0) {
      throw new Error(`Could not open report: ${opener.stderr.trim()}`);
    }
  }

  return reportFile;
}
