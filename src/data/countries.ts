// 10 medieval-era culture groups of the British Isles. The "qid" is a stable
// internal id used as the unique key in scenario settings and player records.
// `iso` doubles as the icon-asset key (snake_case) for the per-culture
// heraldic device PNG. `fallbackLeader` is no longer used at the UI level
// — kept on the type so older saves still load.

export type Country = {
  qid: string;
  name: string;
  iso: string;
  fallbackLeader: string;
};

export const COUNTRIES: Country[] = [
  { qid: 'cult_anglo_saxons', name: 'Anglo-Saxons', iso: 'anglo_saxons', fallbackLeader: '' },
  { qid: 'cult_normans',      name: 'Normans',      iso: 'normans',      fallbackLeader: '' },
  { qid: 'cult_welsh',        name: 'Welsh',        iso: 'welsh',        fallbackLeader: '' },
  { qid: 'cult_scots',        name: 'Scots',        iso: 'scots',        fallbackLeader: '' },
  { qid: 'cult_picts',        name: 'Picts',        iso: 'picts',        fallbackLeader: '' },
  { qid: 'cult_irish',        name: 'Irish',        iso: 'irish',        fallbackLeader: '' },
  { qid: 'cult_cornish',      name: 'Cornish',      iso: 'cornish',      fallbackLeader: '' },
  { qid: 'cult_cumbrians',    name: 'Cumbrians',    iso: 'cumbrians',    fallbackLeader: '' },
  { qid: 'cult_danes',        name: 'Danes',        iso: 'danes',        fallbackLeader: '' },
  { qid: 'cult_islesmen',     name: 'Islesmen',     iso: 'islesmen',     fallbackLeader: '' },
];

export type LeaderMap = Record<string, string>;

export function buildFallbackLeaders(): LeaderMap {
  return Object.fromEntries(COUNTRIES.map((c) => [c.qid, c.fallbackLeader]));
}

// Legacy helper. The new culture roster doesn't use ISO 3166 codes — `iso`
// is now a snake_case culture key — so flag emojis no longer apply. Returns
// an empty string for any non-2-letter input. New UI should render culture
// icons via cultureIconKey() / a CultureIcon component instead.
export function flagEmoji(iso: string | undefined | null): string {
  if (!iso || iso.length !== 2 || /[^A-Z]/i.test(iso)) return '';
  const A = 0x1f1e6;
  const codes = iso
    .toUpperCase()
    .split('')
    .map((c) => A + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...codes);
}

// Where a culture's heraldic icon PNG lives, by iso (snake_case) key.
// Files don't have to exist yet — the UI falls back to a one-letter chip.
export function cultureIconKey(iso: string | undefined | null): string | null {
  if (!iso) return null;
  return iso;
}
