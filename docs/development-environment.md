# Mac development environment

This document is the approved environment plan for the first playable version of **Die Zauberschmiede**. It describes what the parent will set up in the next implementation issue; it does not install tools or create Minecraft content.

## Decision in one minute

Use a **JSON-first, non-experimental Bedrock workflow**:

1. Edit the authored pack files in Visual Studio Code.
2. Keep Minecraft Creator Tools pinned inside this repository and run it through npm for static validation.
3. Keep the authoritative behavior pack separate from the world while editing; create a resource pack only if the first playable version genuinely needs resources.
4. Assemble a disposable world staging directory, validate it, and zip the *contents* as one `.mcworld` file.
5. Import that file into Minecraft Bedrock on the iPhone and Amazon Kids tablet for the final behavioral checks.

The first playable version uses JSON and ordinary packaging only. It does **not** use TypeScript, the Script API, Minecraft Bedrock Editor, experimental creator features, or a Python environment.

The durable reasoning for this choice is recorded in [ADR-0001](adr/0001-json-first-bedrock-workflow.md).

## Current Mac inventory

Rechecked on 2026-08-28:

| Capability | Current state | Decision |
| --- | --- | --- |
| Node.js | 26.7.0 at `/opt/homebrew/bin/node` | Present; satisfies Creator Tools' documented Node.js 22-or-later requirement. Do not replace it for the first playable version unless the pinned tool fails on it. |
| npm | 11.19.0 at `/opt/homebrew/bin/npm` | Present; use it for the project-local tool and lockfile. |
| Minecraft Creator Tools (`mct`) | Not installed locally or globally | Required for the later static-validation setup. Add it as a pinned development dependency in this repository, not as a global install. |
| Visual Studio Code | Stable 1.134.0 and Insiders are installed; `code` opens stable VS Code | Use stable VS Code. Its built-in JSON support is enough to begin. |
| Bedrock-specific VS Code extension | Not detected | Optional. Blockception's Minecraft Bedrock Development extension can improve completion and diagnostics, but it is not a prerequisite. |
| ZIP packaging | `/usr/bin/zip` 3.0 | Present and sufficient for `.mcworld` packaging. |
| Minecraft Bedrock / Bedrock Editor on Mac | Not detected; Bedrock Editor is documented as Windows-only | Do not make Mac-local gameplay a requirement. Validate in Minecraft Bedrock on the family devices. |
| Minecraft Bedrock and `.mcworld` import on iPhone | Not observable from the Mac | Required. The parent must confirm that the current Minecraft app is installed, launches, and appears as an option when opening a `.mcworld`. If not, install or update Minecraft from the App Store and allow the needed Files/share access. |
| Minecraft Bedrock and `.mcworld` import on Amazon Kids tablet | Not observable from the Mac | Required. The parent must confirm that Minecraft is installed and that an allowed profile/file browser can open a `.mcworld` with it. If not, install or update Minecraft through the device's approved app source and enable the necessary child-profile storage/share permission, or perform the import from the parent profile. |

This inventory is a snapshot, not a lockfile. The later setup must recheck versions before making changes.

## Why this is not a Python virtual environment

A Python virtual environment selects a Python interpreter and isolates packages installed by `pip`. This project does not run Python and does not need a Python interpreter, so activating `.venv` would not isolate or manage its tools.

The closest Node/npm equivalent is repository-local dependency management:

- `package.json` declares the exact tool used by the project;
- `package-lock.json` records the resolved dependency graph;
- `node_modules/` holds the local installed copy and stays out of Git;
- `npm exec -- <command>` runs the repository's copy instead of depending on a global command.

There is no environment to activate. Run npm commands from the repository root. A future contributor installs the same locked tools with `npm ci`.

This does **not** mean the project is becoming a TypeScript application. npm is only the delivery mechanism for a validator. The authored Minecraft behavior remains JSON.

## Chosen workspace shape

Issue #2 should create only the directories it actually needs, following this shape:

```text
packs/
  behavior/
    die_zauberschmiede/     # authoritative behavior-pack JSON
  resource/
    die_zauberschmiede/     # optional; create only if resources are required
world/
  die_zauberschmiede/       # authoritative base Bedrock world files
build/                      # disposable assembled world; ignored by Git
dist/                       # generated .mcworld packages; ignored by Git
```

Rules for that layout:

- `packs/behavior/die_zauberschmiede/` is the single editable source for custom-recipe behavior. Do not hand-edit a second copy embedded in a built world.
- Do not create the resource pack merely for symmetry. Add it only if a concrete requirement needs textures, localization, or another resource-pack feature.
- `world/die_zauberschmiede/` is the authoritative base world received from a supported Bedrock device. It contains the spawn area, starter chest, and Handbuch der Zauberschmiede state that JSON recipes cannot express by themselves.
- A build copies the base world and required packs into `build/`, then writes the world-to-pack association files using the manifest UUIDs and versions.
- A package contains the files *inside* the assembled world at the archive root. Zipping the containing directory adds an extra level and produces a world Minecraft cannot import.
- `build/`, `dist/`, `node_modules/`, logs, temporary ZIP files, and OS metadata are generated output and must not be committed.
- Commit the authored JSON, manifests, lockfile, validation/package commands, documentation, and the minimum authoritative base-world files. If binary world history becomes large, evaluate Git LFS later; it is not required for the first playable version.

## Validation model

No single validator proves that a Bedrock world works. Use two gates.

### Gate 1: static checks on the Mac

The later setup should:

1. add a pinned `@minecraft/creator-tools` development dependency and commit its lockfile;
2. expose short npm commands for validation and packaging, implemented without TypeScript;
3. parse every authored JSON file strictly;
4. run the pinned Creator Tools add-on validation with verbose output;
5. reject manifests with duplicate UUIDs, mismatched dependency versions, or unsupported experimental requirements;
6. inspect the assembled world before packaging, including its required Bedrock world files, embedded packs, and pack-association JSON;
7. inspect the `.mcworld` archive to ensure it has no extra top-level directory.

The exact Creator Tools command must be confirmed against the pinned version's `--help`. The currently documented form is equivalent to:

```sh
npm exec -- mct validate addon -i <project-directory> -v
```

Static success means the JSON and package shape are plausible. It does not mean Minecraft accepted the world or the custom recipes behave correctly.

### Gate 2: Minecraft Bedrock checks on supported devices

Use a freshly generated `.mcworld` each time:

1. Transfer it to the iPhone and Amazon Kids tablet without unpacking it.
2. On iPhone, open or share the `.mcworld` with Minecraft, wait for the successful-import message, then select it from **Play**.
3. On the Amazon Kids tablet, download or copy the file, open it with Minecraft from an allowed file browser/profile, wait for successful import, then select it from **Play**. Amazon Kids parental controls may require the parent to permit file access or perform the transfer from the parent profile.
4. Confirm that Die Zauberschmiede opens in Survival and does not request experimental creator features.
5. Run the issue-specific player acceptance checks. For issue #2, that means the initial spawn, starter chest, readable Handbuch entry, supplied materials, first custom recipe, and representative vanilla behavior.
6. Repeat from a clean import rather than a previously played development copy.

Device validation is intentionally separate from Mac-side validation. Minecraft Bedrock is available on Windows PCs and mobile devices, while the official Bedrock Editor requires Windows; neither is part of this minimal Mac setup.

## Exact setup work deferred to issue #2

Before gameplay implementation, issue #2 must complete this setup slice:

- create the minimal directory structure above, omitting the resource pack unless it is actually needed;
- create `package.json` with no TypeScript or script-runtime dependencies;
- add and lock a compatible project-local `@minecraft/creator-tools` version;
- add version-control ignores for dependencies, build staging, exports, logs, temporary archives, and macOS metadata;
- add small, documented validation and packaging commands;
- prove those commands fail clearly for malformed JSON and an archive with an extra directory level;
- document how the parent supplies/updates the authoritative base world from a supported Bedrock device;
- produce a smoke-test package with no gameplay claim, then confirm a clean import on both supported family devices before building the first custom recipe.

If local Creator Tools does not run with the current Node.js version, stop and report the exact error. The parent-facing next step is then to install an actively supported Node.js 22 LTS runtime (preferably through the existing Homebrew setup or a user-chosen version manager) and rerun `npm ci`; do not silently replace the system runtime.

## Acceptance criteria for that later setup

Environment setup is complete only when:

- a fresh checkout can run `npm ci` without a global `mct` installation;
- one documented command performs strict JSON and Creator Tools validation;
- one documented command creates a `.mcworld` from a clean staging directory without modifying authoritative sources;
- generated dependencies, staging, and exports do not appear in `git status`;
- the archive inspection proves the Bedrock world files are at its root and the required packs are attached;
- a parent can follow the mobile-import instructions without knowing npm internals;
- a clean package imports into Minecraft Bedrock on both the iPhone and Amazon Kids tablet before custom-recipe work begins;
- no TypeScript, Script API dependency, or experimental feature has been introduced.

## Primary references

- [Minecraft Creator Tools CLI](https://github.com/mojang/minecraft-creator-tools/blob/main/app/jsnode/README.md)
- [Minecraft Creator Tools overview](https://learn.microsoft.com/minecraft/creator/documents/mctoolsoverview)
- [Add-On development workflow](https://learn.microsoft.com/minecraft/creator/documents/addondevelopmentworkflow)
- [Commonly used Bedrock creator tools](https://learn.microsoft.com/minecraft/creator/documents/commonlyusedtools)
- [Getting started with Bedrock Add-Ons and mobile import](https://learn.microsoft.com/minecraft/creator/documents/gettingstarted)
- [Creating and repackaging a world template](https://learn.microsoft.com/minecraft/creator/documents/createaworldtemplate)
