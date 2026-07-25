export type BattlefieldTier = 'common' | 'rare' | 'epic';

export interface BattlefieldDef {
  id: string;
  name: string;
  subtitle: string;
  /** Image filename (without extension) under assets/battlefields. */
  texture: string;
  affinityFranchises: string[];
  boost: number;
  tier: BattlefieldTier;
  accent: number;
}

export const BATTLEFIELDS: readonly BattlefieldDef[] = [
  { id: 'sky-garden', name: 'Sky Garden Arena', subtitle: 'Ancient power favors heroes of enchanted worlds.', texture: 'sky-garden', affinityFranchises: ['mario', 'nintendo', 'disney', 'toons'], boost: 0.10, tier: 'rare', accent: 0x52f3ff },
  { id: 'void-terrace', name: 'The Void Terrace', subtitle: 'A cosmic crossing strengthens cinematic legends.', texture: 'void-terrace', affinityFranchises: ['dc', 'marvel', 'cinema', 'star-wars'], boost: 0.10, tier: 'rare', accent: 0xb04aff },
  { id: 'gotham', name: 'Gotham City Rooftops', subtitle: 'The shadows of Gotham strengthen its watchful defenders.', texture: 'gotham', affinityFranchises: ['dc'], boost: 0.22, tier: 'epic', accent: 0x35a8ff },
  { id: 'marvel-avengers', name: 'Avengers Compound', subtitle: "Earth's mightiest rally beneath the Avengers banner.", texture: 'marvel-avengers', affinityFranchises: ['marvel'], boost: 0.20, tier: 'epic', accent: 0xff4a5a },
  { id: 'mushroom-kingdom', name: 'Mushroom Kingdom', subtitle: 'Power-ups and royal courage favor Mushroom Kingdom legends.', texture: 'mushroom-kingdom', affinityFranchises: ['mario', 'nintendo'], boost: 0.16, tier: 'rare', accent: 0xffb02e },
  { id: 'pokemon-field', name: 'Pokémon Stadium', subtitle: 'A charged field brings every Pokémon to peak form.', texture: 'pokemon-field', affinityFranchises: ['pokemon'], boost: 0.20, tier: 'epic', accent: 0xffd21e },
  { id: 'fortress-of-solitude', name: 'Fortress of Solitude', subtitle: 'Crystalline halls steel the resolve of DC legends.', texture: 'fortress-of-solitude', affinityFranchises: ['dc'], boost: 0.22, tier: 'epic', accent: 0x8fdcff },
  { id: 'death-star', name: 'The Death Star', subtitle: 'The battle station empowers legends of a galaxy far, far away.', texture: 'death-star', affinityFranchises: ['star-wars'], boost: 0.20, tier: 'epic', accent: 0xff4a4a },
  { id: 'valley-of-the-end', name: 'Valley of the End', subtitle: 'A legendary clash site sharpens every anime warrior.', texture: 'valley-of-the-end', affinityFranchises: ['anime'], boost: 0.20, tier: 'epic', accent: 0x8fb8ff },
  { id: 'tmnt-sewer', name: 'Turtle Lair', subtitle: 'The sewers of New York shelter the heroes in a half shell.', texture: 'tmnt-sewer', affinityFranchises: ['tmnt'], boost: 0.20, tier: 'epic', accent: 0x54c437 },
  { id: 'bowsers-castle', name: "Bowser's Castle", subtitle: 'Lava and iron favor the champions of the Mushroom Kingdom.', texture: 'bowsers-castle', affinityFranchises: ['mario'], boost: 0.18, tier: 'rare', accent: 0xff6a2e },
  { id: 'arendelle', name: 'Arendelle', subtitle: 'The frozen kingdom crowns its Disney legends.', texture: 'arendelle', affinityFranchises: ['disney'], boost: 0.20, tier: 'epic', accent: 0x8fdcff },
  { id: 'kingdom-of-corona', name: 'Kingdom of Corona', subtitle: 'Lantern light lifts the legends of Disney.', texture: 'kingdom-of-corona', affinityFranchises: ['disney'], boost: 0.16, tier: 'rare', accent: 0xffe27a },
  { id: 'gold-vault', name: 'Money Bin Vault', subtitle: 'A fortune in gold rewards its Disney fortune-seekers.', texture: 'gold-vault', affinityFranchises: ['disney'], boost: 0.16, tier: 'rare', accent: 0xffd23a },
];

const KNOWN_FRANCHISES = ['dc', 'marvel', 'anime', 'pokemon', 'tmnt', 'star-wars', 'mario', 'nintendo', 'spongebob', 'toons', 'disney', 'cinema'];

export function getBattlefield(id: string): BattlefieldDef {
  const configured = BATTLEFIELDS.find((battlefield) => battlefield.id === id);
  if (configured) return configured;
  const affinities = KNOWN_FRANCHISES.filter((franchise) => id.includes(franchise));
  const name = id.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  return {
    id, name,
    subtitle: affinities.length > 0 ? 'A home-field convergence empowers its legends.' : 'A neutral arena where every legend stands equal.',
    texture: id, affinityFranchises: affinities, boost: 0.12, tier: 'common', accent: 0x35c8ff,
  };
}