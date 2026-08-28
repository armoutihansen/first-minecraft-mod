# First custom recipe acceptance

Run these checks from a freshly generated and freshly imported `.mcworld` package.

## Mac checks

1. Run `npm ci` from a fresh checkout.
2. Run `npm test`.
3. Run `npm run validate`.
4. Run `npm run package:world`.
5. Run `npm run inspect:world -- dist/die-zauberschmiede.mcworld`.

## Player checks on both target devices

Repeat the following on the iPhone and Amazon Kids tablet:

- [ ] The package imports successfully and appears as **Die Zauberschmiede**.
- [ ] The world opens in Survival without requesting experimental creator features.
- [ ] The initial spawn is close to a clearly visible starter chest.
- [ ] The chest opens and contains the Handbuch der Zauberschmiede, one wooden pickaxe, and three cobblestone.
- [ ] The Handbuch entry is readable, primarily German, and states the exact custom recipe with a short magical sentence.
- [ ] Ordinary crafting consumes one wooden pickaxe and three cobblestone and produces exactly one stone pickaxe.
- [ ] A representative vanilla recipe still works and normal Survival behavior remains available.

Record the Minecraft version and pass/fail result for each device before treating issue #2 as complete.

| Device | Minecraft version | Clean import | Player checks | Result |
| --- | --- | --- | --- | --- |
| iPhone | Pending | Pending | Pending | Pending |
| Amazon Kids tablet | Pending | Pending | Pending | Pending |
