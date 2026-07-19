# Artifact item art

Each image here is the art for a shop artifact — the filename (minus extension)
must match an item id defined in `src/data/items.ts` (e.g. `super-star.png` →
the `super-star` item). Art appears automatically in the store, the bag, held
badges on cards, and battle.

Unlike portraits, **art alone does not create an item**: gameplay attributes
(price, tier, stat boosts, franchise resonance, granted skill) live in
`src/data/items.ts`. To add a new artifact: drop the image here, then add a
`ShopItemDef` with the same id.

Resonance: any legend can hold any artifact, but holders from the artifact's
home franchises get multiplied boosts plus the granted ARTIFACT battle skill.

Note: `i_00001_.png` is unnamed and not wired to an item — rename it to a real
id and add its definition.
