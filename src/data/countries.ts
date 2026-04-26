// 32 most populous countries (UN 2024 estimates). Wikidata QIDs for live
// leader lookups; fallbackLeader is what we ship for offline / pre-cache use.
// ISO 3166-1 alpha-2 codes drive flag emoji rendering in the HUD.

export type Country = {
  qid: string;
  name: string;
  iso: string;
  fallbackLeader: string;
};

export const COUNTRIES: Country[] = [
  { qid: 'Q668',  name: 'India',          iso: 'IN', fallbackLeader: 'Narendra Modi' },
  { qid: 'Q148',  name: 'China',          iso: 'CN', fallbackLeader: 'Li Qiang' },
  { qid: 'Q30',   name: 'United States',  iso: 'US', fallbackLeader: 'Donald Trump' },
  { qid: 'Q252',  name: 'Indonesia',      iso: 'ID', fallbackLeader: 'Prabowo Subianto' },
  { qid: 'Q843',  name: 'Pakistan',       iso: 'PK', fallbackLeader: 'Shehbaz Sharif' },
  { qid: 'Q1033', name: 'Nigeria',        iso: 'NG', fallbackLeader: 'Bola Tinubu' },
  { qid: 'Q155',  name: 'Brazil',         iso: 'BR', fallbackLeader: 'Lula da Silva' },
  { qid: 'Q902',  name: 'Bangladesh',     iso: 'BD', fallbackLeader: 'Muhammad Yunus' },
  { qid: 'Q159',  name: 'Russia',         iso: 'RU', fallbackLeader: 'Mikhail Mishustin' },
  { qid: 'Q96',   name: 'Mexico',         iso: 'MX', fallbackLeader: 'Claudia Sheinbaum' },
  { qid: 'Q115',  name: 'Ethiopia',       iso: 'ET', fallbackLeader: 'Abiy Ahmed' },
  { qid: 'Q17',   name: 'Japan',          iso: 'JP', fallbackLeader: 'Shigeru Ishiba' },
  { qid: 'Q79',   name: 'Egypt',          iso: 'EG', fallbackLeader: 'Mostafa Madbouly' },
  { qid: 'Q928',  name: 'Philippines',    iso: 'PH', fallbackLeader: 'Bongbong Marcos' },
  { qid: 'Q974',  name: 'DR Congo',       iso: 'CD', fallbackLeader: 'Judith Suminwa' },
  { qid: 'Q881',  name: 'Vietnam',        iso: 'VN', fallbackLeader: 'Pham Minh Chinh' },
  { qid: 'Q794',  name: 'Iran',           iso: 'IR', fallbackLeader: 'Masoud Pezeshkian' },
  { qid: 'Q43',   name: 'Turkey',         iso: 'TR', fallbackLeader: 'Recep Tayyip Erdogan' },
  { qid: 'Q183',  name: 'Germany',        iso: 'DE', fallbackLeader: 'Friedrich Merz' },
  { qid: 'Q869',  name: 'Thailand',       iso: 'TH', fallbackLeader: 'Paetongtarn Shinawatra' },
  { qid: 'Q145',  name: 'United Kingdom', iso: 'GB', fallbackLeader: 'Keir Starmer' },
  { qid: 'Q142',  name: 'France',         iso: 'FR', fallbackLeader: 'Francois Bayrou' },
  { qid: 'Q924',  name: 'Tanzania',       iso: 'TZ', fallbackLeader: 'Kassim Majaliwa' },
  { qid: 'Q258',  name: 'South Africa',   iso: 'ZA', fallbackLeader: 'Cyril Ramaphosa' },
  { qid: 'Q38',   name: 'Italy',          iso: 'IT', fallbackLeader: 'Giorgia Meloni' },
  { qid: 'Q114',  name: 'Kenya',          iso: 'KE', fallbackLeader: 'Musalia Mudavadi' },
  { qid: 'Q836',  name: 'Myanmar',        iso: 'MM', fallbackLeader: 'Min Aung Hlaing' },
  { qid: 'Q739',  name: 'Colombia',       iso: 'CO', fallbackLeader: 'Gustavo Petro' },
  { qid: 'Q884',  name: 'South Korea',    iso: 'KR', fallbackLeader: 'Han Duck-soo' },
  { qid: 'Q1049', name: 'Sudan',          iso: 'SD', fallbackLeader: 'Abdel Fattah al-Burhan' },
  { qid: 'Q1036', name: 'Uganda',         iso: 'UG', fallbackLeader: 'Robinah Nabbanja' },
  { qid: 'Q29',   name: 'Spain',          iso: 'ES', fallbackLeader: 'Pedro Sanchez' },
];

export type LeaderMap = Record<string, string>;

export function buildFallbackLeaders(): LeaderMap {
  return Object.fromEntries(COUNTRIES.map((c) => [c.qid, c.fallbackLeader]));
}

// Convert a 2-letter ISO country code to its Unicode flag emoji.
// 'FR' -> 🇫🇷
export function flagEmoji(iso: string | undefined | null): string {
  if (!iso || iso.length !== 2) return '';
  const A = 0x1f1e6; // 'A' regional indicator
  const codes = iso
    .toUpperCase()
    .split('')
    .map((c) => A + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...codes);
}
