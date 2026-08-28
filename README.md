# Die Zauberschmiede

Die Zauberschmiede is a ready-made Minecraft Bedrock Survival world for a parent and child to play on an iPhone and an Amazon Kids tablet, usually together over home Wi-Fi.

The first playable version centers on a starter chest near spawn. It contains the German guidebook **Handbuch der Zauberschmiede**, materials for trying the recipes, and three simple custom recipes:

- wooden pickaxe + 3 cobblestone → stone pickaxe
- iron chestplate + 1 diamond → netherite chestplate
- iron sword + 1 diamond → netherite sword

Product requirements and implementation work are tracked in [GitHub Issues](https://github.com/armoutihansen/first-minecraft-mod/issues).

Before setting up tools, read the [approved Mac development environment plan](docs/development-environment.md). The first playable version is JSON-first and uses no TypeScript, scripting, or experimental creator features.

## Development

Install the locked project-local validator and run the Mac checks:

```sh
npm ci
npm test
npm run validate
```

To generate, preserve, and open the detailed Creator Tools HTML report on macOS:

```sh
npm run report
```

The report is generated under `out/` and remains local because generated output is ignored by Git. A later `npm run validate` deliberately removes it.

Packaging also needs an exported base world at `world/die_zauberschmiede/`. See the [base-world instructions](world/README.md), then run:

```sh
npm run package:world
npm run inspect:world -- dist/die-zauberschmiede.mcworld
```

The package is not accepted until the [first custom recipe checklist](docs/acceptance/first-custom-recipe.md) passes on both family devices.
