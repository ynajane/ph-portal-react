// Generates ph-locations.json: every Philippine PROVINCE and its CITIES + MUNICIPALITIES (official PSGC, PSA), fully offline.
//
//   npm i -D @aivangogh/ph-address
//   npm run build:locations
//
// Output: { provinces: [{ name, region }], places: [{ name, type: 'City' | 'Municipality', province }] }
//  * Provinces use the current official names (Davao de Oro, Maguindanao del Norte / del Sur, Cotabato ...).
//  * The National Capital Region has no provinces, so it is listed as "Metro Manila" (its 16 cities + the municipality of Pateros).
//  * Highly urbanized / independent cities that PSGC lists on their own are placed in the province they geographically belong to
//    (Cebu City -> Cebu, Davao City -> Davao del Sur ...). The Special Geographic Area (BARMM) municipalities are placed in Cotabato.
//  * Manila's districts (Tondo, Binondo ...) are not cities or municipalities and are left out.
//  * The script stops with a list if anything cannot be placed, so no place is ever silently dropped.
import { writeFileSync } from 'node:fs';
import * as P from '@aivangogh/ph-address';

const NCR = '1300000000', SGA = '1999900000', SGA_HOME = 'Cotabato';
const provinces = P.getAllProvinces(), regions = new Map(P.getAllRegions().map((r) => [r.psgcCode, r.name]));
const provByCode = new Map(provinces.map((p) => [p.psgcCode, p]));
const HOME = {   // independent / highly urbanized cities -> geographic province
  'Angeles City': 'Pampanga', 'Bacolod City': 'Negros Occidental', 'Baguio City': 'Benguet', 'Butuan City': 'Agusan del Norte',
  'Cagayan De Oro City': 'Misamis Oriental', 'Cebu City': 'Cebu', 'Davao City': 'Davao del Sur', 'General Santos City': 'South Cotabato',
  'Iligan City': 'Lanao del Norte', 'Iloilo City': 'Iloilo', 'Isabela City': 'Basilan', 'Lapu-Lapu City': 'Cebu', 'Lucena City': 'Quezon',
  'Mandaue City': 'Cebu', 'Olongapo City': 'Zambales', 'Puerto Princesa City': 'Palawan', 'Tacloban City': 'Leyte', 'Zamboanga City': 'Zamboanga del Sur',
};

const pretty = (n) => n.replace(/\s+/g, ' ').trim()
  .replace(/^City of (.+)$/i, '$1 City')                          // "City of Makati" -> "Makati City"
  .replace(/\bSto\.?(?=\s)/g, 'Santo').replace(/\bSta\.?(?=\s)/g, 'Santa')
  .replace(/(?<=\S )(De|Del|Sa|Ng)(?= )/g, (m) => m.toLowerCase());

const provName = new Map(provinces.map((p) => [p.psgcCode, pretty(p.name)]));
const provRegion = new Map(provinces.map((p) => [pretty(p.name), regions.get(p.regionCode) ?? '']));
provRegion.set('Metro Manila', 'National Capital Region');

const places = [], unplaced = [];
for (const m of P.getAllMunicipalities()) {
  if (/^13806/.test(m.psgcCode) && m.psgcCode !== "1380600000") continue;   // districts of the City of Manila (Tondo, Binondo, Ermita ...) are not cities or municipalities
  const isCity = /\bcity\b/i.test(m.name);
  let prov;
  if (m.provinceCode === NCR) { if (!isCity && !/^pateros$/i.test(m.name.trim())) continue; prov = 'Metro Manila'; }   // skip Manila's districts
  else if (m.provinceCode === SGA) prov = SGA_HOME;
  else if (provName.has(m.provinceCode)) prov = provName.get(m.provinceCode);
  else if (HOME[m.name]) prov = HOME[m.name];
  if (!prov) { unplaced.push(`${m.name} (${m.psgcCode})`); continue; }
  places.push({ name: pretty(m.name), type: isCity ? 'City' : 'Municipality', province: prov });
}
if (unplaced.length) throw new Error(`Cannot place ${unplaced.length} entries - add them to HOME: ${unplaced.join(', ')}`);

const seen = new Set(), uniq = places.filter((p) => !seen.has(p.province + '|' + p.name) && seen.add(p.province + '|' + p.name))
  .sort((a, b) => a.province.localeCompare(b.province) || a.name.localeCompare(b.name));
const used = new Set(uniq.map((p) => p.province));
const provList = [...provRegion].filter(([n]) => used.has(n)).map(([name, region]) => ({ name, region })).sort((a, b) => a.name.localeCompare(b.name));
const empty = [...provRegion.keys()].filter((n) => !used.has(n));
const ncr = uniq.filter((p) => p.province === 'Metro Manila').length;
if (ncr !== 17) throw new Error(`Metro Manila should have 17 places (16 cities + Pateros), got ${ncr}`);

writeFileSync(new URL('../ph-locations.json', import.meta.url), JSON.stringify({ source: 'PSGC (PSA), via @aivangogh/ph-address', asOf: new Date().toISOString().slice(0, 10), provinces: provList, places: uniq }));
console.log(`Provinces: ${provList.length}  |  cities: ${uniq.filter((p) => p.type === 'City').length}  |  municipalities: ${uniq.filter((p) => p.type === 'Municipality').length}  |  total places: ${uniq.length}`);
if (empty.length) console.warn('Provinces with no places (check):', empty.join(', '));
