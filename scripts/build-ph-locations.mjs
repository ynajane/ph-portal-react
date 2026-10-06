// Generates ph-locations.json: the official list of Philippine CITIES (149), fully offline.
//
//   npm i -D @aivangogh/ph-address     (official PSGC, as of 30 June 2026)
//   node scripts/build-ph-locations.mjs
//
// The Philippine form has no State/Province field, so only cities are listed: the same 149 cities Google and
// Wikipedia show (33 highly urbanized + 5 independent component + 111 component cities). Municipalities (Pateros, Bangued ...)
// and Manila's districts are NOT cities and are left out. The PSGC marks every city with "City" in its name
// ("Island Garden City of Samal" and "Science City of Munoz" included), which is how they are picked out.
// A city's province is kept only to check the ZIP code on the server; it is never shown or asked for.
// Four names exist twice (Naga, San Carlos, San Fernando, Talisay), so those are shown as "Naga City (Cebu)".
import { writeFileSync } from 'node:fs';
import * as P from '@aivangogh/ph-address';

const NCR = '1300000000', SGA = '1999900000';
const provinces = P.getAllProvinces(), regions = new Map(P.getAllRegions().map((r) => [r.psgcCode, r.name]));
const provByCode = new Map(provinces.map((p) => [p.psgcCode, p]));

// Highly urbanized / independent cities that PSGC lists on their own, mapped to their geographic province (used for the ZIP check only).
const HOME = {
  'Angeles City': 'Pampanga', 'Bacolod City': 'Negros Occidental', 'Baguio City': 'Benguet', 'Butuan City': 'Agusan del Norte',
  'Cagayan De Oro City': 'Misamis Oriental', 'Cebu City': 'Cebu', 'Davao City': 'Davao del Sur', 'General Santos City': 'South Cotabato',
  'Iligan City': 'Lanao del Norte', 'Iloilo City': 'Iloilo', 'Isabela City': 'Basilan', 'Lapu-Lapu City': 'Cebu', 'Lucena City': 'Quezon',
  'Mandaue City': 'Cebu', 'Olongapo City': 'Zambales', 'Puerto Princesa City': 'Palawan', 'Tacloban City': 'Leyte', 'Zamboanga City': 'Zamboanga del Sur',
};
const SGA_HOME = 'Cotabato';

// "Cagayan De Oro City" -> "Cagayan de Oro City", "Sto. Tomas City" -> "Santo Tomas City" (how Google writes them)
const pretty = (n) => n.replace(/\s+/g, ' ').trim()
  .replace(/\bSto\.?(?=\s)/g, 'Santo').replace(/\bSta\.?(?=\s)/g, 'Santa')
  .replace(/(?<=\S )(De|Del|Sa|Ng)(?= )/g, (m) => m.toLowerCase());

const rows = [];
for (const m of P.getAllMunicipalities()) {
  if (!/\bcity\b/i.test(m.name)) continue;                       // municipalities and Manila districts are not cities
  let prov, region;
  if (m.provinceCode === NCR) { prov = 'Metro Manila'; region = 'National Capital Region'; }
  else if (m.provinceCode === SGA) prov = SGA_HOME;
  else if (provByCode.has(m.provinceCode)) prov = provByCode.get(m.provinceCode).name;
  else if (HOME[m.name]) prov = HOME[m.name];
  if (!prov) throw new Error(`No province for ${m.name} (${m.psgcCode}); add it to HOME`);
  rows.push({ name: pretty(m.name), province: prov, region: region ?? regions.get(provinces.find((p) => p.name === prov)?.regionCode) ?? '' });
}
const dup = new Set(rows.filter((r, i) => rows.findIndex((x) => x.name === r.name) !== i).map((r) => r.name));
const cities = rows.map((r) => ({ ...r, name: dup.has(r.name) ? `${r.name} (${r.province})` : r.name })).sort((a, b) => a.name.localeCompare(b.name));
if (new Set(cities.map((c) => c.name)).size !== cities.length) throw new Error('Duplicate city labels');
writeFileSync(new URL('../ph-locations.json', import.meta.url), JSON.stringify({ source: 'PSGC (PSA), via @aivangogh/ph-address', asOf: '2026-06-30', count: cities.length, cities }));
console.log(`Philippine cities: ${cities.length}  |  duplicated names disambiguated: ${[...dup].join(', ')}`);
