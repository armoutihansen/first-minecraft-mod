# Die Zauberschmiede

Die Zauberschmiede is a ready-made Minecraft Bedrock Survival world for a parent and child to play on an iPhone and an Amazon Kids tablet, usually together over home Wi-Fi.

The first playable version centers on a starter chest near spawn. Bedrock creates
it on the first opening through the world's built-in bonus-chest mechanism, with
contents supplied by the behavior pack. It contains the German guidebook
**Handbuch der Zauberschmiede**, materials for trying the recipes, and three
simple custom recipes:

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
```

The command prints the generated package path. Pass that path to
`npm run inspect:world --`, then transfer only that newly named file to the
device. The filename includes the behavior-pack version; increase that version
when the pack gains content so devices can distinguish successive builds.

All three recipes are shapeless and work at a crafting table. For the first
recipe, place the wooden pickaxe in one crafting square and one cobblestone in
each of three other squares. A stack of three cobblestone in one square does not
match Bedrock's crafting grid. For each upgrade recipe, place the iron item and
one diamond in separate squares.

The authoritative base world is already configured to create the starter chest.
If it is ever replaced with a fresh device export, restore that setting with:

```sh
npm run prepare:starter-chest
```

The issue #3 package candidate is ready after the Mac checks and one clean-import
recipe run in the [first playable version checklist](docs/acceptance/first-custom-recipe.md).
The first playable version is accepted for family use only after issue #4 also
records successful checks on both target devices and over home Wi-Fi.
