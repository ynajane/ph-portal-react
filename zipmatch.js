// ZIP <-> province/city matching for the Philippines, fully offline (uses the bundled ph-zip.json).
// ph-zip.json rows: { z: ZIP, a: postal area (municipality, or a district for Metro Manila), p: province, r: region }
import { readFileSync } from 'node:fs';

const DATA = JSON.parse(readFileSync(new URL('./ph-zip.json', import.meta.url), 'utf8'));
const BY_ZIP = new Map();
for (const r of DATA) (BY_ZIP.get(r.z) ?? BY_ZIP.set(r.z, []).get(r.z)).push(r);

// Normalise a place name so "City of Angeles", "Angeles City" and "ANGELES" all compare equal.
export const nm = (x = '') => String(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/\([^)]*\)/g, ' ')
  .replace(/\bsta\b/g, 'santa').replace(/\bsto\b/g, 'santo').replace(/\bgen\b/g, 'general')
  .replace(/\b(city of|municipality of|province of|city|cpo|poblacion)\b/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ').trim();

const lev = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};
// Same place? Exact after normalising, ignoring spaces ("Daan Bantayan"/"Daanbantayan"), or one typo on long names
// (the postal data has a few, e.g. "San Remegio").
export const samePlace = (a, b) => {
  const A = nm(a), B = nm(b); if (!A || !B) return false;
  if (A === B) return true;
  const a2 = A.replace(/ /g, ''), b2 = B.replace(/ /g, '');
  return a2 === b2 || (a2.length >= 8 && lev(a2, b2) <= 1);
};
// Provinces: normalised equality; Maguindanao was split in 2022 so the old and new names are treated as one.
const sameProv = (a, b) => { const A = nm(a), B = nm(b); return A === B || (A.startsWith('maguindanao') && B.startsWith('maguindanao')); };

// Metro Manila postal areas are districts, not cities, so map ZIP ranges to their city (PHLPost ranges; verified
// against every Metro Manila row in ph-zip.json, see the test script).
const NCR = [
  [1000, 1018, 'Manila'], [1100, 1139, 'Quezon City'], [1200, 1299, 'Makati'], [1300, 1399, 'Pasay'],
  [1400, 1439, 'Caloocan'], [1440, 1469, 'Valenzuela'], [1470, 1484, 'Malabon'], [1485, 1499, 'Navotas'],
  [1500, 1549, 'San Juan'], [1550, 1599, 'Mandaluyong'], [1600, 1619, 'Pasig'], [1620, 1629, 'Pateros'],
  [1630, 1639, 'Taguig'], [1700, 1739, 'Parañaque'], [1740, 1769, 'Las Piñas'], [1770, 1799, 'Muntinlupa'],
  [1800, 1819, 'Marikina'],
];
export const ncrCityOf = (zip) => { const n = +zip; return NCR.find(([a, b]) => n >= a && n <= b)?.[2] ?? null; };
const ncrRangeOf = (city) => {
  const hit = NCR.find(([, , c]) => samePlace(c, city)); if (!hit) return null;
  const zs = DATA.filter((r) => +r.z >= hit[0] && +r.z <= hit[1]).map((r) => r.z).sort();
  return { name: hit[2], lo: zs[0], hi: zs.at(-1) };
};
const NCR_PROV = 'Metro Manila';

const listZips = (zs) => { const u = [...new Set(zs)].sort(); return u.length > 4 ? `${u[0]}–${u.at(-1)}` : u.join(', '); };

// -> { ok: true } | { ok: false, error }   (state = province name as shown in the form, e.g. "Pampanga" / "Metro Manila")
export function checkPhZip({ state, city, zip }) {
  const z = String(zip ?? '').trim(), recs = BY_ZIP.get(z);
  if (!recs) return { ok: false, error: `${z} is not a valid Philippine ZIP code.` };

  const inNcr = sameProv(state, NCR_PROV), zNcr = ncrCityOf(z);
  const zipPlace = zNcr ? `${zNcr}, ${NCR_PROV}` : `${recs[0].a.replace(/\s*\([^)]*\)/g, '')}, ${recs[0].p}`;

  // 1) province
  const provOk = inNcr ? !!zNcr || recs.some((r) => sameProv(r.p, NCR_PROV)) : recs.some((r) => sameProv(r.p, state));
  if (!provOk) return { ok: false, error: `ZIP ${z} belongs to ${zipPlace}, not ${state}.` };

  // 2) city: matches a postal area of this ZIP (municipalities, Metro Manila districts)...
  if (recs.some((r) => samePlace(r.a, city))) return { ok: true };
  if (inNcr) {                                                       // ...or the Metro Manila city that owns this ZIP range
    if (zNcr && samePlace(zNcr, city)) return { ok: true };
    const own = ncrRangeOf(city);
    if (!own) return { ok: true };                                   // not a name we can map (e.g. a barangay): province-level check only
    return { ok: false, error: `ZIP ${z} is in ${zNcr ?? 'another city'}, not ${own.name}. ZIP codes for ${own.name}: ${own.lo}–${own.hi}.` };
  }
  const mine = DATA.filter((r) => sameProv(r.p, state) && samePlace(r.a, city));
  if (!mine.length) return { ok: true };                             // this city has no postal area of its own in the data: province-level check only
  return { ok: false, error: `ZIP ${z} belongs to ${recs[0].a.replace(/\s*\([^)]*\)/g, '')}, not ${city}. ZIP code for ${city}: ${listZips(mine.map((r) => r.z))}.` };
}