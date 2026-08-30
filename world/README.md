# Authoritative base world

The Mac cannot create or play-test the Bedrock world. Export a clean Survival world from one of the family's supported Bedrock devices and unpack its **contents** into:

```text
world/die_zauberschmiede/
```

Before export, the world must:

- be named **Die Zauberschmiede**;
- use Survival mode with experimental creator features disabled;
- leave ordinary Survival and vanilla crafting enabled.

This first export began as the smoke-test world. The package launches Minecraft on the iPhone, but the clean-import details and tablet import remain unverified. First-recipe work continued under the parent's explicit provisional device assumptions; both clean-import records are still required before issue #2 closes. Add player-facing world state only through the documented starter-chest and Handbuch flow, then use `docs/acceptance/first-custom-recipe.md` for final acceptance.

Do not put an exported `.mcworld` file in this directory. Keep the archive outside the repository, unpack it, and copy the world files themselves so that `level.dat` is located at:

```text
world/die_zauberschmiede/level.dat
```

On macOS, the parent can extract the ZIP-compatible `.mcworld` directly:

```sh
mkdir -p world/die_zauberschmiede
ditto -x -k /absolute/path/to/Die-Zauberschmiede.mcworld world/die_zauberschmiede
```

Run this from the repository root and replace the example with the real export path. If extraction creates another enclosing directory, move that directory's contents up so `level.dat` has the exact path shown above.

The packaging command copies this source into ignored `build/` staging and never edits it in place.
