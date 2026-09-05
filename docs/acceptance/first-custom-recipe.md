# First playable version acceptance

Run these checks from a freshly generated and freshly imported `.mcworld` package.

## Mac checks

1. Run `npm ci` from a fresh checkout.
2. Run `npm test`.
3. Run `npm run validate`.
4. Run `npm run package:world`.
5. Run `npm run inspect:world --`, followed by the package path printed in step 4.

## Player checks from a clean import

Use the newly generated package rather than an existing world copy:

- [ ] The package imports successfully and appears as **Die Zauberschmiede**.
- [ ] The world opens in Survival without requesting experimental creator features.
- [ ] The initial spawn is close to a clearly visible starter chest.
- [ ] The chest opens and contains the **Handbuch der Zauberschmiede**, one wooden pickaxe, three cobblestone, one iron chestplate, one iron sword, and two diamonds.
- [ ] The Handbuch is readable and primarily German. It states all three recipes exactly and gives each a short provisional magical sentence.
- [ ] Ordinary crafting consumes one wooden pickaxe and three cobblestone and produces exactly one stone pickaxe. Recipe-book autofill works; for manual placement, the cobblestone occupies three separate crafting squares rather than one stacked square.
- [ ] Ordinary crafting consumes one iron chestplate and one diamond and produces exactly one netherite chestplate.
- [ ] Ordinary crafting consumes one iron sword and one diamond and produces exactly one netherite sword.
- [ ] A representative vanilla recipe still works and normal Survival behavior remains available.

Record the Minecraft version and result from one clean target-device import
before treating issue #3 as complete.

| Device | Minecraft version | Package | Player checks | Result |
| --- | --- | --- | --- | --- |
| iPhone | Not recorded | `die-zauberschmiede-v1.3.0.mcworld` | Clean import, starter chest, Handbuch, and all three recipes confirmed by the parent | Pass |
| Amazon Kids tablet | Not recorded | `die-zauberschmiede-v1.3.0.mcworld` | Pending | Pending |

## Family-device acceptance (issue #4)

Before calling the first playable version accepted for family use:

- [ ] Repeat the clean-import player checks above on both the iPhone and Amazon Kids tablet.
- [ ] Let the child refine the three provisional magical sentences and shape the spawn area.
- [ ] Host the world on one device over home Wi-Fi and join from the other.
- [ ] Confirm that the joining player can read the same Handbuch and use all three recipes.
