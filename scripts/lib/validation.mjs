import { spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";

import { readWorldFlags } from "./level-dat.mjs";
import {
  checkAuthoredJson,
  isVersionAtLeast,
  isVersionTuple,
  requireCondition,
  requireFile,
  sameJson,
} from "./project-files.mjs";

const expectedStarterChest = {
  pools: [
    {
      rolls: 1,
      entries: [
        {
          type: "item",
          name: "minecraft:written_book",
          weight: 1,
          functions: [
            {
              function: "minecraft:set_name",
              name: "Handbuch der Zauberschmiede",
            },
            {
              function: "minecraft:set_book_contents",
              author: "Die Zauberschmiede",
              title: "Handbuch der Zauberschmiede",
              pages: [
                "Erster Zauber\n\nLege eine Holzspitzhacke und drei Bruchsteine in vier getrennte Felder der Werkbank.",
                "Nimm die Steinspitzhacke aus dem Ergebnisfeld.\n\nZauberspruch:\nStein, erwache!",
                "Zweiter Zauber\n\nLege einen Eisenharnisch und einen Diamanten in zwei getrennte Felder der Werkbank.",
                "Nimm den Netheritharnisch aus dem Ergebnisfeld.\n\nZauberspruch:\nDiamantenglanz, stärke den Stahl!",
                "Dritter Zauber\n\nLege ein Eisenschwert und einen Diamanten in zwei getrennte Felder der Werkbank.",
                "Nimm das Netheritschwert aus dem Ergebnisfeld.\n\nZauberspruch:\nKlinge, werde unbezwingbar!",
              ],
            },
          ],
        },
      ],
    },
    {
      rolls: 1,
      entries: [
        {
          type: "item",
          name: "minecraft:wooden_pickaxe",
          weight: 1,
        },
      ],
    },
    {
      rolls: 1,
      entries: [
        {
          type: "item",
          name: "minecraft:cobblestone",
          weight: 1,
          functions: [
            {
              function: "minecraft:set_count",
              count: 3,
            },
          ],
        },
      ],
    },
    {
      rolls: 1,
      entries: [
        {
          type: "item",
          name: "minecraft:iron_chestplate",
          weight: 1,
        },
      ],
    },
    {
      rolls: 1,
      entries: [
        {
          type: "item",
          name: "minecraft:iron_sword",
          weight: 1,
        },
      ],
    },
    {
      rolls: 1,
      entries: [
        {
          type: "item",
          name: "minecraft:diamond",
          weight: 1,
          functions: [
            {
              function: "minecraft:set_count",
              count: 2,
            },
          ],
        },
      ],
    },
  ],
};

const expectedRecipes = [
  {
    fileName: "wooden_pickaxe_to_stone_pickaxe.json",
    identifier: "die_zauberschmiede:wooden_pickaxe_to_stone_pickaxe",
    ingredients: [
      { item: "minecraft:wooden_pickaxe" },
      { item: "minecraft:cobblestone", count: 3 },
    ],
    result: { item: "minecraft:stone_pickaxe", count: 1 },
    description: "wooden-pickaxe spell",
  },
  {
    fileName: "iron_chestplate_to_netherite_chestplate.json",
    identifier: "die_zauberschmiede:iron_chestplate_to_netherite_chestplate",
    ingredients: [
      { item: "minecraft:iron_chestplate" },
      { item: "minecraft:diamond" },
    ],
    result: { item: "minecraft:netherite_chestplate", count: 1 },
    description: "chestplate spell",
  },
  {
    fileName: "iron_sword_to_netherite_sword.json",
    identifier: "die_zauberschmiede:iron_sword_to_netherite_sword",
    ingredients: [
      { item: "minecraft:iron_sword" },
      { item: "minecraft:diamond" },
    ],
    result: { item: "minecraft:netherite_sword", count: 1 },
    description: "sword spell",
  },
];

export async function validateProject(projectRoot) {
  const behaviorPack = path.join(
    projectRoot,
    "packs",
    "behavior",
    "die_zauberschmiede",
  );
  const manifestFile = path.join(behaviorPack, "manifest.json");
  const starterChestFile = path.join(
    behaviorPack,
    "loot_tables",
    "chests",
    "spawn_bonus_chest.json",
  );
  const levelFile = path.join(
    projectRoot,
    "world",
    "die_zauberschmiede",
    "level.dat",
  );
  const localCreatorTools = path.join(projectRoot, "node_modules", ".bin", "mct");

  const jsonFiles = await checkAuthoredJson(projectRoot);
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  const packVersion = manifest.header?.version;
  const recipes = await Promise.all(
    expectedRecipes.map(async (expected) => ({
      expected,
      recipe: JSON.parse(
        await readFile(
          path.join(behaviorPack, "recipes", expected.fileName),
          "utf8",
        ),
      ),
    })),
  );
  const starterChest = JSON.parse(await readFile(starterChestFile, "utf8"));
  const worldFlags = readWorldFlags(await readFile(levelFile));
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  requireCondition(manifest.format_version === 2, "Manifest format_version must be 2");
  requireCondition(uuidPattern.test(manifest.header?.uuid), "Invalid pack UUID");
  requireCondition(
    isVersionTuple(packVersion),
    "Pack version must contain three non-negative integers",
  );
  requireCondition(
    isVersionAtLeast(packVersion, [1, 3, 0]),
    "Pack version must be at least [1, 3, 0] for the complete three-spell package",
  );
  requireCondition(
    sameJson(manifest.header?.min_engine_version, [1, 21, 40]),
    "Minimum engine version must be [1, 21, 40]",
  );
  requireCondition(manifest.modules?.length === 1, "Manifest needs one module");
  requireCondition(manifest.modules[0].type === "data", "Module must be data-only");
  requireCondition(uuidPattern.test(manifest.modules[0].uuid), "Invalid module UUID");
  requireCondition(
    sameJson(manifest.modules[0].version, manifest.header.version),
    "Module version must match the pack version",
  );
  requireCondition(
    manifest.modules[0].uuid !== manifest.header.uuid,
    "Pack and module UUIDs must be unique",
  );
  requireCondition(
    manifest.capabilities === undefined,
    "Experimental capabilities are not allowed",
  );
  for (const { expected, recipe } of recipes) {
    const spell = recipe["minecraft:recipe_shapeless"];
    requireCondition(
      recipe.format_version === "1.21.40",
      `The ${expected.description} must use format_version 1.21.40`,
    );
    requireCondition(
      spell?.description?.identifier === expected.identifier,
      `The ${expected.description} has the wrong identifier`,
    );
    requireCondition(
      sameJson(spell?.tags, ["crafting_table"]),
      `The ${expected.description} must use ordinary crafting`,
    );
    requireCondition(
      sameJson(spell?.ingredients, expected.ingredients),
      `The ${expected.description} has the wrong ingredients`,
    );
    requireCondition(
      sameJson(spell?.unlock, { context: "AlwaysUnlocked" }),
      `The ${expected.description} must always be discoverable`,
    );
    requireCondition(
      sameJson(spell?.result, expected.result),
      `The ${expected.description} has the wrong result`,
    );
  }
  requireCondition(
    sameJson(starterChest, expectedStarterChest),
    "The starter chest loot table must match the exact first-playable contents",
  );
  requireCondition(
    worldFlags.bonusChestEnabled === 1 &&
      worldFlags.bonusChestSpawned === 0,
    "The starter bonus chest must be enabled and awaiting first spawn",
  );
  requireCondition(
    worldFlags.cheatsEnabled === 0 && worldFlags.commandsEnabled === 0,
    "The first playable world must not enable cheats or commands",
  );
  requireCondition(
    worldFlags.experiments_ever_used === 0 &&
      worldFlags.saved_with_toggled_experiments === 0,
    "The first playable world must not use experimental creator features",
  );
  requireCondition(
    jsonFiles.length === 5,
    "The first playable pack must contain exactly three recipes and one starter-chest loot table",
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
      // A pack icon is optional. Isolated mode cannot resolve vanilla item links,
      // which are checked explicitly above for this recipe instead.
      "CPACKICON,UNLINK",
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
    packVersion,
    starterChestReady: true,
    creatorToolsErrors: creatorToolsReport.errors,
    creatorToolsWarnings: warnings.length,
    jsonFileCount: jsonFiles.length,
  };
}
