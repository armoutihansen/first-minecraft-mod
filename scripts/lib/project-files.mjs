import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ignoredDirectories = new Set(["build", "dist", "node_modules", ".git", "out"]);

async function findJsonFiles(directory) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findJsonFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(entryPath);
    }
  }

  return files;
}

export async function checkAuthoredJson(projectRoot) {
  const jsonFiles = await findJsonFiles(path.join(projectRoot, "packs"));

  for (const file of jsonFiles) {
    try {
      JSON.parse(await readFile(file, "utf8"));
    } catch (error) {
      const relativePath = path.relative(projectRoot, file);
      throw new Error(`${relativePath}: invalid JSON (${error.message})`);
    }
  }

  return jsonFiles;
}

export async function requireFile(file, projectRoot) {
  try {
    await access(file);
  } catch {
    throw new Error(`Missing required file: ${path.relative(projectRoot, file)}`);
  }
}

export function requireCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function sameJson(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export function isVersionTuple(version) {
  return (
    Array.isArray(version) &&
    version.length === 3 &&
    version.every(Number.isInteger) &&
    version.every((part) => part >= 0)
  );
}

export function isVersionAtLeast(version, minimum) {
  if (!isVersionTuple(version) || !isVersionTuple(minimum)) {
    return false;
  }
  for (let index = 0; index < version.length; index += 1) {
    if (version[index] !== minimum[index]) {
      return version[index] > minimum[index];
    }
  }
  return true;
}
