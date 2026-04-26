import AsyncStorage from '@react-native-async-storage/async-storage';

import { buildFallbackLeaders, COUNTRIES, type LeaderMap } from './countries';

const CACHE_KEY = 'civ_leaders_cache_v1';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

type LeaderCacheBlob = {
  fetchedAt: string;
  data: LeaderMap;
};

export async function getCachedLeaders(): Promise<LeaderMap> {
  const fallback = buildFallbackLeaders();
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return fallback;
    const cache = JSON.parse(raw) as LeaderCacheBlob;
    const age = Date.now() - new Date(cache.fetchedAt).getTime();
    if (Number.isNaN(age) || age > CACHE_TTL_MS) return fallback;
    return { ...fallback, ...cache.data };
  } catch {
    return fallback;
  }
}

export async function refreshLeaders(): Promise<LeaderMap | null> {
  const values = COUNTRIES.map((c) => `wd:${c.qid}`).join(' ');
  const query = `
    SELECT ?country ?leaderLabel WHERE {
      VALUES ?country { ${values} }
      ?country p:P6 ?stmt.
      ?stmt ps:P6 ?leader.
      FILTER NOT EXISTS { ?stmt pq:P582 ?endTime. }
      SERVICE wikibase:label { bd:serviceParameter wikibase:language "en". }
    }
  `;
  const url = `${SPARQL_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': 'BlockyStrategery/0.0.1 (https://github.com/aaronr/civ-app)',
      },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      results: { bindings: Array<{ country?: { value: string }; leaderLabel?: { value: string } }> };
    };
    const data: LeaderMap = {};
    for (const b of json.results.bindings) {
      const uri = b.country?.value;
      const leader = b.leaderLabel?.value;
      if (!uri || !leader) continue;
      const qid = uri.split('/').pop();
      if (qid) data[qid] = leader;
    }
    if (Object.keys(data).length === 0) return null;
    const blob: LeaderCacheBlob = {
      fetchedAt: new Date().toISOString(),
      data,
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(blob));
    return { ...buildFallbackLeaders(), ...data };
  } catch (err) {
    console.warn('refreshLeaders failed', err);
    return null;
  }
}
