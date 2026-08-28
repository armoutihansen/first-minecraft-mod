import { spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";

import {
  checkAuthoredJson,
  requireCondition,
  requireFile,
  sameJson,
} from "./project-files.mjs";

export async function validateProject(projectRoot) {
  const behaviorPack = path.join(
    projectRoot,
    "packs",
    "behavior",
    "die_zauberschmiede",
  );
  const manifestFile = path.join(behaviorPack, "manifest.json");
  const localCreatorTools = path.join(projectRoot, "node_modules", ".bin", "mct");

  const jsonFiles = await checkAuthoredJson(projectRoot);
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  requireCondition(manifest.format_version === 2, "Manifest format_version must be 2");
  requireCondition(uuidPattern.test(manifest.header?.uuid), "Invalid pack UUID");
  requireCondition(
    sameJson(manifest.header?.version, [1, 0, 0]),
    "Pack version must be [1, 0, 0]",
  );
  requireCondition(
    sameJson(manifest.header?.min_engine_version, [1, 21, 40]),
    "Minimum engine version must be [1, 21, 40]",
  );
  requireCondition(manifest.modules?.length === 1, "Manifest needs one module");
  requireCondition(manifest.modules[0].type === "data", "Module must be data-only");
  requireCondition(uuidPattern.test(manifest.modules[0].uuid), "Invalid module UUID");
  requireCondition(
    manifest.modules[0].uuid !== manifest.header.uuid,
    "Pack and module UUIDs must be unique",
  );
  requireCondition(
    manifest.capabilities === undefined,
    "Experimental capabilities are not allowed",
  );
  requireCondition(
    jsonFiles.length === 1,
    "The smoke-test pack must not contain custom-recipe JSON yet",
  );

  await requireFile(localCreatorTools, projectRoot);
  const creatorTools = spawnSync(
    localCreatorTools,
    [
      "--input-folder",
      behaviorPack,
      "--output-type",
      "noReports",
      "--isolated",
      "--force",
      "--json",
      "validate",
      "main",
      // A pack icon is optional in Bedrock and belongs to the child's later visual work.
      "CPACKICON",
    ],
    {
      encoding: "utf8",
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  await rm(path.join(projectRoot, "out"), { recursive: true, force: true });
  if (creatorTools.status !== 0) {
    const details = [creatorTools.stdout, creatorTools.stderr]
      .filter(Boolean)
      .join("\n")
      .trim();
    throw new Error(`Creator Tools validation failed\n${details}`);
  }

  let creatorToolsReport;
  try {
    creatorToolsReport = JSON.parse(creatorTools.stdout);
  } catch (error) {
    throw new Error(`Creator Tools returned invalid JSON (${error.message})`);
  }
  requireCondition(
    creatorToolsReport.command === "validate",
    "Creator Tools did not run validation",
  );
  requireCondition(
    creatorToolsReport.errors === 0,
    `Creator Tools reported ${creatorToolsReport.errors} error(s)`,
  );
  const warnings = creatorToolsReport.projects
    .flatMap((project) => project.items)
    .filter((item) => item.type === "warning");
  requireCondition(
    warnings.length === 0,
    `Creator Tools reported warning(s): ${warnings
      .map((item) => item.message)
      .join("; ")}`,
  );

  return {
    creatorToolsErrors: creatorToolsReport.errors,
    creatorToolsWarnings: warnings.length,
    jsonFileCount: jsonFiles.length,
  };
}
