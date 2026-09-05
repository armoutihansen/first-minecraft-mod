import assert from "node:assert/strict";
import {
  access,
  cp,
  copyFile,
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

import { readWorldFlags } from "../scripts/lib/level-dat.mjs";

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
      "die-zauberschmiede-v1.0.0.mcworld",
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

test("starter-chest preparation safely enables a fresh bonus chest", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "zauberschmiede-chest-"));

  try {
    const fixtureWorld = path.join(
      fixtureRoot,
      "world",
      "die_zauberschmiede",
    );
    const fixtureLevel = path.join(fixtureWorld, "level.dat");
    await mkdir(fixtureWorld, { recursive: true });
    await copyFile(
      path.join(
        repositoryRoot,
        "world",
        "die_zauberschmiede",
        "level.dat_old",
      ),
      fixtureLevel,
    );
    const before = await readFile(fixtureLevel);
    assert.equal(readWorldFlags(before).bonusChestEnabled, 0);

    const firstRun = spawnSync(
      process.execPath,
      [projectCommand, "enable-starter-chest", fixtureRoot],
      { encoding: "utf8" },
    );
    assert.equal(firstRun.status, 0, firstRun.stderr);
    const after = await readFile(fixtureLevel);
    assert.deepEqual(readWorldFlags(after), {
      bonusChestEnabled: 1,
      bonusChestSpawned: 0,
      cheatsEnabled: 0,
      commandsEnabled: 0,
      experiments_ever_used: 0,
      saved_with_toggled_experiments: 0,
    });
    assert.equal(
      [...before].filter((value, index) => value !== after[index]).length,
      1,
      "only bonusChestEnabled should change",
    );

    const secondRun = spawnSync(
      process.execPath,
      [projectCommand, "enable-starter-chest", fixtureRoot],
      { encoding: "utf8" },
    );
    assert.equal(secondRun.status, 0, secondRun.stderr);
    assert.deepEqual(await readFile(fixtureLevel), after);
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

test("project validation accepts the complete three-spell package", async () => {
  await rm(path.join(repositoryRoot, "out"), { recursive: true, force: true });
  const result = spawnSync(
    process.execPath,
    [projectCommand, "validate", repositoryRoot],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Behavior pack version: \d+\.\d+\.\d+/);
  assert.match(result.stdout, /Creator Tools validation passed \(0 errors/i);
  assert.match(
    result.stdout,
    /wooden pickaxe \+ 3 cobblestone -> 1 stone pickaxe/,
  );
  assert.match(
    result.stdout,
    /iron chestplate \+ 1 diamond -> 1 netherite chestplate/,
  );
  assert.match(
    result.stdout,
    /iron sword \+ 1 diamond -> 1 netherite sword/,
  );
  assert.match(result.stdout, /Starter chest: enabled and awaiting first spawn/);
  assert.match(
    result.stdout,
    /Handbuch: all three recipes and provisional spells are included/,
  );
  await assert.rejects(
    access(path.join(repositoryRoot, "out", "die_zauberschmiede.mcr.json")),
    { code: "ENOENT" },
  );
});

test("project validation rejects the first-slice pack version", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "zauberschmiede-version-"));

  try {
    await cp(path.join(repositoryRoot, "packs"), path.join(fixtureRoot, "packs"), {
      recursive: true,
    });
    await cp(path.join(repositoryRoot, "world"), path.join(fixtureRoot, "world"), {
      recursive: true,
    });
    const manifestFile = path.join(
      fixtureRoot,
      "packs",
      "behavior",
      "die_zauberschmiede",
      "manifest.json",
    );
    const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
    manifest.header.version = [1, 2, 0];
    manifest.modules[0].version = [1, 2, 0];
    await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);

    const result = spawnSync(
      process.execPath,
      [projectCommand, "validate", fixtureRoot],
      { encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /at least \[1, 3, 0\]/);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("project package embeds all three spells and complete starter chest", () => {
  const result = spawnSync(
    process.execPath,
    [projectCommand, "package", repositoryRoot],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const relativePackage = result.stdout.match(/Created (.+\.mcworld)/)?.[1];
  assert.ok(relativePackage, "package command must print the output path");
  const packagePath = path.join(repositoryRoot, relativePackage);

  const loot = spawnSync(
    "unzip",
    [
      "-p",
      packagePath,
      "behavior_packs/die_zauberschmiede/loot_tables/chests/spawn_bonus_chest.json",
    ],
    { encoding: "utf8" },
  );
  assert.equal(loot.status, 0, loot.stderr);
  const chest = JSON.parse(loot.stdout);
  assert.deepEqual(
    chest.pools.map((pool) => pool.entries[0].name),
    [
      "minecraft:written_book",
      "minecraft:wooden_pickaxe",
      "minecraft:cobblestone",
      "minecraft:iron_chestplate",
      "minecraft:iron_sword",
      "minecraft:diamond",
    ],
  );
  assert.equal(
    chest.pools[5].entries[0].functions[0].count,
    2,
    "the chest must contain one diamond for each upgrade spell",
  );
  const bookPages = chest.pools[0].entries[0].functions.find(
    (entry) => entry.function === "minecraft:set_book_contents",
  ).pages;
  assert.equal(bookPages.length, 6);
  assert.match(bookPages.join("\n"), /Eisenharnisch.*Diamanten/s);
  assert.match(bookPages.join("\n"), /Eisenschwert.*Diamanten/s);

  for (const recipe of [
    "wooden_pickaxe_to_stone_pickaxe.json",
    "iron_chestplate_to_netherite_chestplate.json",
    "iron_sword_to_netherite_sword.json",
  ]) {
    const embeddedRecipe = spawnSync(
      "unzip",
      [
        "-p",
        packagePath,
        `behavior_packs/die_zauberschmiede/recipes/${recipe}`,
      ],
      { encoding: "utf8" },
    );
    assert.equal(embeddedRecipe.status, 0, embeddedRecipe.stderr);
    assert.doesNotThrow(() => JSON.parse(embeddedRecipe.stdout));
  }

  const level = spawnSync("unzip", ["-p", packagePath, "level.dat"]);
  assert.equal(level.status, 0, level.stderr?.toString());
  assert.equal(readWorldFlags(level.stdout).bonusChestEnabled, 1);
  assert.equal(readWorldFlags(level.stdout).bonusChestSpawned, 0);
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
