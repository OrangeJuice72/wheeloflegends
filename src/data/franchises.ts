/** Franchise/universe registry — reel 1 of the recruit slot machine. */

export interface FranchiseDef {
  id: string;
  name: string;
  color: number;
}

export const FRANCHISES: Record<string, FranchiseDef> = {
  dc: { id: 'dc', name: 'DC COMICS', color: 0x2e6fff },
  marvel: { id: 'marvel', name: 'MARVEL', color: 0xd23a3a },
  anime: { id: 'anime', name: 'ANIME', color: 0xffa022 },
  'star-wars': { id: 'star-wars', name: 'STAR WARS', color: 0xffe345 },
  mario: { id: 'mario', name: 'MARIO', color: 0xff4a3a },
  nintendo: { id: 'nintendo', name: 'NINTENDO', color: 0xff4a3a },
  pokemon: { id: 'pokemon', name: 'POKÉMON', color: 0xffd21e },
  disney: { id: 'disney', name: 'DISNEY', color: 0x9be8ff },
  toons: { id: 'toons', name: 'TOONS', color: 0xff8a2e },
  spongebob: { id: 'spongebob', name: 'SPONGEBOB', color: 0xffd83d },
  cinema: { id: 'cinema', name: 'CINEMA', color: 0xcfcfcf },
  tmnt: { id: 'tmnt', name: 'TMNT', color: 0x54c437 },
};

export function getFranchise(id: string): FranchiseDef {
  const def = FRANCHISES[id];
  if (!def) throw new Error(`Unknown franchise: ${id}`);
  return def;
}
