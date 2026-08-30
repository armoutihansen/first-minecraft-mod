import assert from "node:assert/strict";
import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const projectCommand = path.join(repositoryRoot, "scripts", "bedrock-project.mjs");

test("validation rejects malformed authored JSON", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "zauberschmiede-json-"));

  try {
    const behaviorPack = path.join(fixtureRoot, "packs", "behavior", "test-pack");
    await mkdir(behaviorPack, { recursive: true });
    await writeFile(path.join(behaviorPack, "manifest.json"), "{ not valid JSON\n");

    const result = spawnSync(
      process.execPath,
      [projectCommand, "check-json", fixtureRoot],
      { encoding: "utf8" },
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /manifest\.json/);
    assert.match(result.stderr, /invalid JSON/i);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("packaging creates a world-root archive without changing sources", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "zauberschmiede-package-"));

  try {
    const behaviorPack = path.join(
      fixtureRoot,
      "packs",
      "behavior",
      "die_zauberschmiede",
    );
    const worldSource = path.join(fixtureRoot, "world", "die_zauberschmiede");
    await mkdir(behaviorPack, { recursive: true });
    await mkdir(worldSource, { recursive: true });
    await writeFile(
      path.join(behaviorPack, "manifest.json"),
      JSON.stringify({
        format_version: 2,
        header: {
          name: "Die Zauberschmiede",
          description: "Test pack",
          uuid: "9f1f3c45-42bd-4d84-bd31-7ba101fc30ef",
          version: [1, 0, 0],
          min_engine_version: [1, 21, 0],
        },
        modules: [
          {
            type: "data",
            uuid: "648cdac2-2f02-4dfb-a9a0-c4a546ef3f65",
            version: [1, 0, 0],
          },
        ],
      }),
    );
    await writeFile(path.join(worldSource, "level.dat"), "fixture world data");
    await writeFile(path.join(worldSource, "levelname.txt"), "Die Zauberschmiede\n");

    const result = spawnSync(
      process.execPath,
      [projectCommand, "package", fixtureRoot],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr);
    const packagePath = path.join(
      fixtureRoot,
      "dist",
      "die-zauberschmiede.mcworld",
    );
    const listing = spawnSync("unzip", ["-Z1", packagePath], {
      encoding: "utf8",
    });
    assert.equal(listing.status, 0, listing.stderr);
    const entries = listing.stdout.trim().split("\n");
    assert.ok(entries.includes("level.dat"));
    assert.ok(entries.includes("levelname.txt"));
    assert.ok(
      entries.includes(
        "behavior_packs/die_zauberschmiede/manifest.json",
      ),
    );
    assert.ok(entries.includes("world_behavior_packs.json"));
    assert.ok(!entries.some((entry) => entry.startsWith("die_zauberschmiede/")));

    const association = spawnSync(
      "unzip",
      ["-p", packagePath, "world_behavior_packs.json"],
      { encoding: "utf8" },
    );
    assert.deepEqual(JSON.parse(association.stdout), [
      {
        pack_id: "9f1f3c45-42bd-4d84-bd31-7ba101fc30ef",
        version: [1, 0, 0],
      },
    ]);
    await assert.rejects(
      readFile(path.join(worldSource, "world_behavior_packs.json")),
      { code: "ENOENT" },
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("inspection rejects a world archive with an extra directory level", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "zauberschmiede-inspect-"));

  try {
    const nestedWorld = path.join(fixtureRoot, "die_zauberschmiede");
    await mkdir(nestedWorld, { recursive: true });
    await writeFile(path.join(nestedWorld, "level.dat"), "fixture world data");
    await writeFile(
      path.join(nestedWorld, "levelname.txt"),
      "Die Zauberschmiede\n",
    );
    const packagePath = path.join(fixtureRoot, "wrong.mcworld");
    const zip = spawnSync(
      "zip",
      ["-q", "-r", packagePath, "die_zauberschmiede"],
      { cwd: fixtureRoot, encoding: "utf8" },
    );
    assert.equal(zip.status, 0, zip.stderr);

    const result = spawnSync(
      process.execPath,
      [projectCommand, "inspect", packagePath],
      { encoding: "utf8" },
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /extra top-level directory/i);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("inspection rejects a behavior-pack association with the wrong UUID", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "zauberschmiede-association-"));

  try {
    const embeddedPack = path.join(
      fixtureRoot,
      "behavior_packs",
      "die_zauberschmiede",
    );
    await mkdir(embeddedPack, { recursive: true });
    await writeFile(path.join(fixtureRoot, "level.dat"), "fixture world data");
    await writeFile(
      path.join(fixtureRoot, "levelname.txt"),
      "Die Zauberschmiede\n",
    );
    await writeFile(
      path.join(embeddedPack, "manifest.json"),
      JSON.stringify({
        format_version: 2,
        header: {
          uuid: "9f1f3c45-42bd-4d84-bd31-7ba101fc30ef",
          version: [1, 0, 0],
        },
      }),
    );
    await writeFile(
      path.join(fixtureRoot, "world_behavior_packs.json"),
      JSON.stringify([
        {
          pack_id: "11111111-1111-4111-8111-111111111111",
          version: [1, 0, 0],
        },
      ]),
    );
    const packagePath = path.join(fixtureRoot, "wrong-association.mcworld");
    const zip = spawnSync(
      "zip",
      [
        "-q",
        "-r",
        packagePath,
        "level.dat",
        "levelname.txt",
        "world_behavior_packs.json",
        "behavior_packs",
      ],
      { cwd: fixtureRoot, encoding: "utf8" },
    );
    assert.equal(zip.status, 0, zip.stderr);

    const result = spawnSync(
      process.execPath,
      [projectCommand, "inspect", packagePath],
      { encoding: "utf8" },
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /pack association does not match/i);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("project validation accepts the first Zauberschmiede spell", async () => {
  await rm(path.join(repositoryRoot, "out"), { recursive: true, force: true });
  const result = spawnSync(
    process.execPath,
    [projectCommand, "validate", repositoryRoot],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Creator Tools validation passed \(0 errors/i);
  assert.match(
    result.stdout,
    /wooden pickaxe \+ 3 cobblestone -> 1 stone pickaxe/,
  );
  await assert.rejects(
    access(path.join(repositoryRoot, "out", "die_zauberschmiede.mcr.json")),
    { code: "ENOENT" },
  );
});

test("report command preserves a browsable Creator Tools HTML report", async () => {
  const outputFolder = path.join(repositoryRoot, "out");
  const reportFile = path.join(
    outputFolder,
    "die_zauberschmiede.report.html",
  );
  await rm(outputFolder, { recursive: true, force: true });

  try {
    const result = spawnSync(
      process.execPath,
      [projectCommand, "report", repositoryRoot, "--no-open"],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /out\/die_zauberschmiede\.report\.html/);
    assert.match(await readFile(reportFile, "utf8"), /^<html><head>/i);
  } finally {
    await rm(outputFolder, { recursive: true, force: true });
  }
});
