// 32 most populous countries (UN 2024 estimates). Wikidata QIDs for live
// leader lookups; fallbackLeader is what we ship for offline / pre-cache use.
// Stored locally; do not need to be perfectly current.

export type Country = {
  qid: string;
  name: string;
  fallbackLeader: string;
};

export const COUNTRIES: Country[] = [
  { qid: 'Q668',  name: 'India',          fallbackLeader: 'Narendra Modi' },
  { qid: 'Q148',  name: 'China',          fallbackLeader: 'Li Qiang' },
  { qid: 'Q30',   name: 'United States',  fallbackLeader: 'Donald Trump' },
  { qid: 'Q252',  name: 'Indonesia',      fallbackLeader: 'Prabowo Subianto' },
  { qid: 'Q843',  name: 'Pakistan',       fallbackLeader: 'Shehbaz Sharif' },
  { qid: 'Q1033', name: 'Nigeria',        fallbackLeader: 'Bola Tinubu' },
  { qid: 'Q155',  name: 'Brazil',         fallbackLeader: 'Lula da Silva' },
  { qid: 'Q902',  name: 'Bangladesh',     fallbackLeader: 'Muhammad Yunus' },
  { qid: 'Q159',  name: 'Russia',         fallbackLeader: 'Mikhail Mishustin' },
  { qid: 'Q96',   name: 'Mexico',         fallbackLeader: 'Claudia Sheinbaum' },
  { qid: 'Q115',  name: 'Ethiopia',       fallbackLeader: 'Abiy Ahmed' },
  { qid: 'Q17',   name: 'Japan',          fallbackLeader: 'Shigeru Ishiba' },
  { qid: 'Q79',   name: 'Egypt',          fallbackLeader: 'Mostafa Madbouly' },
  { qid: 'Q928',  name: 'Philippines',    fallbackLeader: 'Bongbong Marcos' },
  { qid: 'Q974',  name: 'DR Congo',       fallbackLeader: 'Judith Suminwa' },
  { qid: 'Q881',  name: 'Vietnam',        fallbackLeader: 'Pham Minh Chinh' },
  { qid: 'Q794',  name: 'Iran',           fallbackLeader: 'Masoud Pezeshkian' },
  { qid: 'Q43',   name: 'Turkey',         fallbackLeader: 'Recep Tayyip Erdogan' },
  { qid: 'Q183',  name: 'Germany',        fallbackLeader: 'Friedrich Merz' },
  { qid: 'Q869',  name: 'Thailand',       fallbackLeader: 'Paetongtarn Shinawatra' },
  { qid: 'Q145',  name: 'United Kingdom', fallbackLeader: 'Keir Starmer' },
  { qid: 'Q142',  name: 'France',         fallbackLeader: 'Francois Bayrou' },
  { qid: 'Q924',  name: 'Tanzania',       fallbackLeader: 'Kassim Majaliwa' },
  { qid: 'Q258',  name: 'South Africa',   fallbackLeader: 'Cyril Ramaphosa' },
  { qid: 'Q38',   name: 'Italy',          fallbackLeader: 'Giorgia Meloni' },
  { qid: 'Q114',  name: 'Kenya',          fallbackLeader: 'Musalia Mudavadi' },
  { qid: 'Q836',  name: 'Myanmar',        fallbackLeader: 'Min Aung Hlaing' },
  { qid: 'Q739',  name: 'Colombia',       fallbackLeader: 'Gustavo Petro' },
  { qid: 'Q884',  name: 'South Korea',    fallbackLeader: 'Han Duck-soo' },
  { qid: 'Q1049', name: 'Sudan',          fallbackLeader: 'Abdel Fattah al-Burhan' },
  { qid: 'Q1036', name: 'Uganda',         fallbackLeader: 'Robinah Nabbanja' },
  { qid: 'Q29',   name: 'Spain',          fallbackLeader: 'Pedro Sanchez' },
];

export type LeaderMap = Record<string, string>;

export function buildFallbackLeaders(): LeaderMap {
  return Object.fromEntries(COUNTRIES.map((c) => [c.qid, c.fallbackLeader]));
}
