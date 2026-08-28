# ADR-0001: Use a JSON-first Bedrock workflow

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

Die Zauberschmiede needs three simple custom recipes inside a ready-made Bedrock Survival world. The parent develops on macOS, understands Python virtual environments, and does not need to learn TypeScript for the first playable version. Minecraft Bedrock gameplay and the official Bedrock Editor are not available as a native Mac validation environment.

The workflow must remain small, reproducible, compatible with the family's iPhone and Amazon Kids tablet, and free of experimental creator features.

## Decision

The first playable version will use authored Bedrock JSON, a base world supplied from a supported Bedrock device, and ordinary `.mcworld` packaging.

- Visual Studio Code is the editor.
- Minecraft Creator Tools will be pinned as a repository-local npm development dependency and invoked through npm for static validation.
- The behavior pack is authoritative outside generated world staging. A resource pack is added only if a concrete feature requires one.
- Disposable assembly and exported `.mcworld` files are generated outputs, not editable sources.
- Player behavior is accepted in Minecraft Bedrock on the target mobile devices.
- Python virtual environments are not used because they do not manage Node/npm tools or Bedrock JSON.
- TypeScript, the Script API, Bedrock Editor, and experimental creator features are excluded from the first playable version.

## Consequences

- A future setup change will add a small `package.json`, lockfile, local validator, and packaging commands, but no application runtime.
- The Mac can validate JSON and package structure but cannot be the only acceptance environment.
- The parent must transfer a base world from a supported Bedrock device and import generated `.mcworld` files back to the family devices.
- Some world state is binary and less reviewable than JSON. The project will keep only the minimum authoritative base-world state and revisit Git LFS if repository size becomes a problem.
- TypeScript remains a future option only if a later approved requirement genuinely needs scripting; adopting it would require a new decision.
