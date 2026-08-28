import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { requireCondition, requireFile, sameJson } from "./project-files.mjs";

const behaviorPackName = "die_zauberschmiede";
const embeddedManifestPath =
  "behavior_packs/die_zauberschmiede/manifest.json";

function validatePackAssociation(association, manifest) {
  requireCondition(
    Array.isArray(association) && association.length === 1,
    "Pack association must contain exactly one behavior pack",
  );
  requireCondition(
    association[0].pack_id === manifest.header?.uuid &&
      sameJson(association[0].version, manifest.header?.version),
    "Pack association does not match the embedded manifest UUID and version",
  );
}

async function inspectAssembledWorld(assembledWorld, projectRoot) {
  const levelFile = path.join(assembledWorld, "level.dat");
  const levelNameFile = path.join(assembledWorld, "levelname.txt");
  const associationFile = path.join(assembledWorld, "world_behavior_packs.json");
  const manifestFile = path.join(assembledWorld, embeddedManifestPath);

  for (const requiredFile of [
    levelFile,
    levelNameFile,
    associationFile,
    manifestFile,
  ]) {
    await requireFile(requiredFile, projectRoot);
  }
  requireCondition(
    (await readFile(levelNameFile, "utf8")).trim() === "Die Zauberschmiede",
    "The base world must be named Die Zauberschmiede",
  );

  const association = JSON.parse(await readFile(associationFile, "utf8"));
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  validatePackAssociation(association, manifest);
}

function readArchiveEntry(packageFile, entry) {
  const extracted = spawnSync("unzip", ["-p", packageFile, entry], {
    encoding: "utf8",
  });
  if (extracted.status !== 0) {
    throw new Error(`Could not read ${entry} from .mcworld`);
  }
  return extracted.stdout;
}

export function inspectWorldPackage(packageFile) {
  const listing = spawnSync("unzip", ["-Z1", packageFile], {
    encoding: "utf8",
  });
  if (listing.status !== 0) {
    throw new Error(`Could not inspect .mcworld package: ${listing.stderr.trim()}`);
  }

  const entries = listing.stdout.trim().split("\n").filter(Boolean);
  if (!entries.includes("level.dat")) {
    const nestedLevel = entries.find((entry) => /.+\/level\.dat$/.test(entry));
    if (nestedLevel) {
      throw new Error(
        `Invalid .mcworld: extra top-level directory before ${nestedLevel}`,
      );
    }
    throw new Error("Invalid .mcworld: level.dat is missing from the archive root");
  }

  for (const requiredEntry of [
    "levelname.txt",
    "world_behavior_packs.json",
    embeddedManifestPath,
  ]) {
    if (!entries.includes(requiredEntry)) {
      throw new Error(`Invalid .mcworld: missing ${requiredEntry}`);
    }
  }

  requireCondition(
    readArchiveEntry(packageFile, "levelname.txt").trim() ===
      "Die Zauberschmiede",
    "The packaged world must be named Die Zauberschmiede",
  );
  const association = JSON.parse(
    readArchiveEntry(packageFile, "world_behavior_packs.json"),
  );
  const manifest = JSON.parse(readArchiveEntry(packageFile, embeddedManifestPath));
  validatePackAssociation(association, manifest);

  return entries;
}

export async function packageWorld(projectRoot) {
  const worldSource = path.join(projectRoot, "world", behaviorPackName);
  const behaviorPack = path.join(
    projectRoot,
    "packs",
    "behavior",
    behaviorPackName,
  );
  const manifestFile = path.join(behaviorPack, "manifest.json");

  await requireFile(path.join(worldSource, "level.dat"), projectRoot);
  await requireFile(path.join(worldSource, "levelname.txt"), projectRoot);
  await requireFile(manifestFile, projectRoot);

  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  const packId = manifest.header?.uuid;
  const packVersion = manifest.header?.version;
  requireCondition(
    typeof packId === "string" && Array.isArray(packVersion),
    "Behavior-pack manifest needs header.uuid and header.version",
  );

  const assembledWorld = path.join(projectRoot, "build", behaviorPackName);
  const embeddedPack = path.join(
    assembledWorld,
    "behavior_packs",
    behaviorPackName,
  );
  const outputDirectory = path.join(projectRoot, "dist");
  const outputFile = path.join(outputDirectory, "die-zauberschmiede.mcworld");

  await rm(assembledWorld, { recursive: true, force: true });
  await mkdir(path.dirname(assembledWorld), { recursive: true });
  await cp(worldSource, assembledWorld, { recursive: true });
  await mkdir(path.dirname(embeddedPack), { recursive: true });
  await cp(behaviorPack, embeddedPack, { recursive: true });
  await writeFile(
    path.join(assembledWorld, "world_behavior_packs.json"),
    `${JSON.stringify([{ pack_id: packId, version: packVersion }], null, 2)}\n`,
  );

  await inspectAssembledWorld(assembledWorld, projectRoot);

  await mkdir(outputDirectory, { recursive: true });
  await rm(outputFile, { force: true });
  const zip = spawnSync("zip", ["-q", "-r", outputFile, "."], {
    cwd: assembledWorld,
    encoding: "utf8",
  });
  if (zip.status !== 0) {
    throw new Error(`Could not create .mcworld package: ${zip.stderr.trim()}`);
  }

  inspectWorldPackage(outputFile);
  return outputFile;
}
