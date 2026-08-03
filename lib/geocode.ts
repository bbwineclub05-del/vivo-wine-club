/**
 * Best-effort geocoding via OpenStreetMap's free Nominatim API (no key
 * required). Every candidate match is validated against the expected
 * country before being accepted — a same-name unrelated POI in the wrong
 * country (or even the wrong region within the right country) is a real,
 * observed failure mode of plain "name, country" queries, so callers should
 * always pass the most specific query available and fall back to a
 * region/town-level query rather than a bare name.
 */

const USER_AGENT = 'VivoWineClub-WineriesMap/1.0 (info@vivowineclub.com)';

const COUNTRY_CODE: Record<string, string> = { France: 'fr', Italy: 'it', Portugal: 'pt' };

export interface GeocodeTier {
  q: string;
  /** true = specific venue-level query; false = region/town-level fallback */
  precise: boolean;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  precise: boolean;
}

async function nominatimSearch(query: string): Promise<{ lat: number; lng: number; countryCode?: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' } });
  if (!res.ok) return null;
  const data = await res.json() as Array<{ lat: string; lon: string; address?: { country_code?: string } }>;
  if (!data?.[0]) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), countryCode: data[0].address?.country_code };
}

/** Tries each tier in order (most to least precise), stopping at the first result whose country matches `country`. */
export async function geocodeTiers(tiers: GeocodeTier[], country: string): Promise<GeocodeResult | null> {
  const expectedCc = COUNTRY_CODE[country] ?? 'it';
  for (const tier of tiers) {
    const found = await nominatimSearch(tier.q);
    if (found && found.countryCode === expectedCc) {
      return { lat: found.lat, lng: found.lng, precise: tier.precise };
    }
  }
  return null;
}
