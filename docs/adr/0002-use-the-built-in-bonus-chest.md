# ADR-0002: Use Bedrock's built-in bonus chest

- **Status:** Accepted
- **Date:** 2026-09-05

## Context

The first player loop needs a starter chest near initial spawn, but the project
is built on macOS without Bedrock Editor. Editing the world's LevelDB through an
unproven third-party tool risks corrupting the device-created base world. An
automatic command function would require cheats, while the delivered world must
remain ordinary Survival without experimental creator features.

## Decision

Use Bedrock's stable bonus-chest mechanism to place the starter chest near spawn.
Keep `bonusChestEnabled` set and `bonusChestSpawned` clear in the authoritative
`level.dat`, and override `loot_tables/chests/spawn_bonus_chest.json` in the
attached behavior pack.

The first slice's deterministic loot table contains the named, written
**Handbuch der Zauberschmiede**, one wooden pickaxe, and three cobblestone. The
Handbuch explicitly explains that manual crafting uses three separate squares
for the cobblestone and includes the provisional spell, “Stein, erwache!”

## Consequences

- Bedrock, rather than project code, chooses the exact safe position near spawn.
- Each freshly imported package creates one new starter chest on first opening.
- The packaged world keeps cheats, commands, and experimental features disabled.
- Validation must check the relevant `level.dat` flags and the exact deterministic
  loot-table contents before packaging.
- Replacing the authoritative base world requires rerunning
  `npm run prepare:starter-chest` before validation.
- The final chest placement and contents still require acceptance in Minecraft
  on a supported device.
