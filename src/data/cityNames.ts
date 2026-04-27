// Per-tribe city name pools, keyed by Country.iso (snake_case culture key).
// ~15–20 names per tribe so a long game doesn't loop. Ordered roughly by
// importance / familiarity so the first few cities of each tribe read as
// recognizable to a player who knows the period.

export const TRIBE_CITY_NAMES: Record<string, string[]> = {
  anglo_saxons: [
    'Wintanceaster',  // Winchester
    'Lundenburh',     // London
    'Eoforwic',       // York
    'Cantwaraburh',   // Canterbury
    'Bebbanburh',     // Bamburgh
    'Tamworþig',      // Tamworth
    'Snotingaham',    // Nottingham
    'Hreopadun',      // Repton
    'Hamtun',         // Southampton
    'Wireceaster',    // Worcester
    'Gleawanceaster', // Gloucester
    'Cyrneceaster',   // Cirencester
    'Maldun',         // Maldon
    'Readingum',      // Reading
    'Theodford',      // Thetford
    'Beadoricesworþ', // Bury St Edmunds
    'Stanford',       // Stamford
    'Brunanburh',     // (battle site)
  ],

  normans: [
    'Rouen',
    'Caen',
    'Bayeux',
    'Falaise',
    'Avranches',
    'Coutances',
    'Lisieux',
    'Cherbourg',
    'Argentan',
    'Saint-Lô',
    'Domfront',
    'Mortain',
    'Vire',
    'Pont-Audemer',
    'Lillebonne',
    'Eu',
    'Dieppe',
    'Honfleur',
  ],

  welsh: [
    'Aberffraw',
    'Caerfyrddin',     // Carmarthen
    'Caer Dydd',       // Cardiff
    'Caer Llion',      // Caerleon
    'Caer Wrygon',     // Worcester (Welsh form)
    'Aberystwyth',
    'Aberhonddu',      // Brecon
    'Aberteifi',       // Cardigan
    'Bangor',
    'Caernarfon',
    'Conwy',
    'Dinefwr',
    'Mathrafal',
    'Llanfair',
    'Llandeilo',
    'Tywyn',
    'Sain Ffagan',
    'Castell Nedd',    // Neath
  ],

  scots: [
    'Dùn Èideann',     // Edinburgh
    'Sruighlea',       // Stirling
    'Cill Rìmhinn',    // St Andrews
    'Dùn Bhreatainn',  // Dumbarton
    'Pheairt',         // Perth
    'Glaschu',         // Glasgow
    'Inbhir Nis',      // Inverness
    'Obar Dheathain',  // Aberdeen
    'Sgàin',           // Scone
    'Dùn Phrìs',       // Dumfries
    'Dùn Dè',          // Dundee
    'Cill Mheàrnaig',  // Kilmarnock
    'Forfar',
    'Loch Abar',       // Lochaber
    'Cinn Tìre',       // Kintyre
    'Latharna',        // Lorne
    'Latharna',
    'Dùn Phàrlain',    // Dunfermline
  ],

  picts: [
    'Forteviot',
    'Scone',
    'Burghead',
    'Inverurie',
    'Brechin',
    'Restenneth',
    'Glamis',
    'Aberlemno',
    'Dundurn',
    'Meigle',
    'Carpow',
    'Pitlochry',
    'Rhynie',
    'Tullich',
    'Dunkeld',
    'Cinnbelachoir',
    'Foterkern',
    'Logierait',
  ],

  irish: [
    'Áth Cliath',       // Dublin
    'Ard Macha',        // Armagh
    'Caiseal',          // Cashel
    'Cluain Mhic Nóis', // Clonmacnoise
    'Cill Dara',        // Kildare
    'Tuaim',
    'Inis Cathaigh',
    'Loch Garman',      // Wexford
    'Áth Luain',        // Athlone
    'Sligeach',         // Sligo
    'Tír Eoghain',
    'Tír Chonaill',
    'Dún Dealgan',      // Dundalk
    'Dún na nGall',     // Donegal
    'Cluain Eois',      // Clones
    'Léim an Bhradáin', // Leixlip
    'Ráth Maoláin',     // Rathmullan
    'Inis Eoghain',
  ],

  cornish: [
    'Pendynas',
    'Lyskerrys',     // Liskeard
    'Penryn',
    'Pen Sans',      // Penzance
    'Lannstefan',    // Launceston
    'Marghasyow',    // Marazion
    'Tregony',
    'Sen Aust',      // St Austell
    'Tregajorran',
    'Karrek Loos',   // St Michael's Mount
    'Boscastle',
    'Sen Erth',
    'Pol Berow',
    'Pol Vudhik',
    'Tre Goda',
    'Tre Lanherne',
    'Lannmoryl',
    'Trevithick',
  ],

  cumbrians: [
    'Caer Lualid',     // Carlisle
    'Caer Ystwyth',
    'Pen Rhydd',
    'Bedebrunn',
    'Pen-y-Coet',
    'Catrouguath',
    'Mawrcoet',
    'Trumwyn',
    'Aber Liddel',
    'Govan',
    'Aber Spitha',
    'Caerguys',
    'Penrith',
    'Eskdale',
    'Mochrum',
    'Llanluog',
    'Pen-y-Garth',
    'Dunfutis',
  ],

  danes: [
    'Jorvik',         // York
    'Hedeby',
    'Aros',           // Aarhus
    'Jelling',
    'Roskilde',
    'Lund',
    'Trelleborg',
    'Aalborg',
    'Viborg',
    'Birka',
    'Nidaros',        // Trondheim
    'Grimsby',
    'Whitby',
    'Skarthi',
    'Holmsdal',
    'Helgate',
    'Brunesby',
    'Tunsberg',
  ],

  islesmen: [
    'Innse Gall',       // The Hebrides
    'Manainn',          // Isle of Man
    'Cathair Cholmcille', // Iona
    'Inis Choluim',
    'Lios Mòr',
    'Dùn Aonghasa',
    'Càrn Liath',
    'Caisteal Òir',
    'Atholl',
    'Crom Loch',
    'Sgeir Dhubh',
    'Beinn na Cailliche',
    'Caol Reatha',
    'Èirisgeidh',
    'Geàrr Loch',
    'Cnoc Mòr',
    'Tobar an Tairbeart',
    'Caolas Bhalla',
  ],
};

// Fallback for any tribe not yet in the table (or for older saves with
// non-tribe iso values). Same generic medieval-ish pool we used to ship
// before per-tribe naming.
export const FALLBACK_CITY_NAMES = [
  'Rivermouth',
  'Highkeep',
  'Stonehold',
  'Goldfield',
  'Ironreach',
  'Saltmarsh',
  'Greenvale',
  'Northwatch',
  'Sunhaven',
  'Whitefall',
];

export function cityNameForTribe(iso: string | undefined | null, n: number): string {
  const pool = (iso && TRIBE_CITY_NAMES[iso]) || FALLBACK_CITY_NAMES;
  return pool[n % pool.length];
}
