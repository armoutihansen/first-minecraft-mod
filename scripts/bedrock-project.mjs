#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { inspectWorldPackage, packageWorld } from "./lib/packaging.mjs";
import { checkAuthoredJson } from "./lib/project-files.mjs";
import { createValidationReport } from "./lib/reporting.mjs";
import { validateProject } from "./lib/validation.mjs";

async function main() {
  const [command, ...argumentsAfterCommand] = process.argv.slice(2);
  const pathArgument = argumentsAfterCommand.find(
    (argument) => argument !== "--no-open",
  );
  const projectRoot = path.resolve(pathArgument ?? process.cwd());

  if (command === "check-json") {
    const files = await checkAuthoredJson(projectRoot);
    console.log(`Valid JSON: ${files.length} authored file(s)`);
    return;
  }

  if (command === "validate") {
    const result = await validateProject(projectRoot);
    console.log(`Valid JSON: ${result.jsonFileCount} authored file(s)`);
    console.log("Pack: non-experimental behavior-pack shell (no recipes yet)");
    console.log(
      `Creator Tools validation passed (${result.creatorToolsErrors} errors, ${result.creatorToolsWarnings} warnings)`,
    );
    return;
  }

  if (command === "report") {
    const reportFile = await createValidationReport(projectRoot, {
      openReport: !argumentsAfterCommand.includes("--no-open"),
    });
    console.log(`Creator Tools report: ${path.relative(projectRoot, reportFile)}`);
    return;
  }

  if (command === "package") {
    const outputFile = await packageWorld(projectRoot);
    console.log(`Created ${path.relative(projectRoot, outputFile)}`);
    return;
  }

  if (command === "inspect") {
    inspectWorldPackage(path.resolve(pathArgument ?? ""));
    console.log(`Valid .mcworld structure: ${pathArgument}`);
    return;
  }

  throw new Error(
    "Usage: bedrock-project.mjs <check-json|validate|report|package|inspect> [path] [--no-open]",
  );
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
