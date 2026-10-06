// OFFICIAL Philippine holidays only (what Malacañang proclaims) - no solstices, equinoxes, "Ramadan start", Isra Mi'raj, Maulid, etc.
// 1) Years in OFFICIAL below use the annual proclamation exactly (2026 = Proc. 1006, 2027 = Proc. 1427).
// 2) Other years use the provider list, but only names that are real PH national holidays are kept.
// 3) Eid'l Fitr / Eid'l Adha are shown ONLY when the President proclaimed them (dates in islamic-dates.json).
//    No proclamation yet for a year = no Eid shown for that year. Add the date to islamic-dates.json when it is proclaimed.
import fs from 'node:fs';

const R = 'Regular Holiday', S = 'Special Non-Working Day', I = 'Islamic Holiday';
const OFFICIAL = {
  2026: [
    ['01-01', "New Year's Day", R], ['02-17', 'Chinese New Year', S], ['04-02', 'Maundy Thursday', R], ['04-03', 'Good Friday', R],
    ['04-04', 'Black Saturday', S], ['04-09', 'Araw ng Kagitingan (Day of Valor)', R], ['05-01', 'Labor Day', R], ['06-12', 'Independence Day', R],
    ['08-21', 'Ninoy Aquino Day', S], ['08-31', 'National Heroes Day', R], ['11-01', "All Saints' Day", S], ['11-02', "All Souls' Day", S],
    ['11-30', 'Bonifacio Day', R], ['12-08', 'Feast of the Immaculate Conception of Mary', S], ['12-24', 'Christmas Eve', S],
    ['12-25', 'Christmas Day', R], ['12-30', 'Rizal Day', R],
  ],
  2027: [
    ['01-01', "New Year's Day", R], ['02-06', 'Chinese New Year', S], ['03-25', 'Maundy Thursday', R], ['03-26', 'Good Friday', R],
    ['03-27', 'Black Saturday', S], ['04-09', 'Araw ng Kagitingan (Day of Valor)', R], ['05-01', 'Labor Day', R], ['06-12', 'Independence Day', R],
    ['08-21', 'Ninoy Aquino Day', S], ['08-30', 'National Heroes Day', R], ['11-01', "All Saints' Day", S], ['11-02', "All Souls' Day", S],
    ['11-30', 'Bonifacio Day', R], ['12-08', 'Feast of the Immaculate Conception of Mary', S], ['12-24', 'Christmas Eve', S],
    ['12-25', 'Christmas Day', R], ['12-30', 'Rizal Day', R], ['12-31', 'Last Day of the Year', S],
  ],
};
// names a provider may return that are genuine PH national holidays (anything else is dropped)
const REAL = /new year'?s (day|eve)|last day of the year|maundy|holy thursday|good friday|black saturday|kagitingan|day of valor|labou?r day|independence day|ninoy|national heroes|all saints|all souls|immaculate|bonifacio|christmas|rizal|chinese new year|lunar new year|special non-working|additional special|bridge/i;

// One-off nationwide special non-working days that providers may omit or name differently (the entry here replaces anything on the same date).
const EXTRA = {
  2023: [['10-30', 'Barangay and Sangguniang Kabataan Elections (BSKE)', S]],   // Proc. 360 s.2023
};

const EID = { eid_fitr: { name: "Eid'l Fitr (Feast of Ramadan)", local: 'Eidul Fitr' }, eid_adha: { name: "Eid'l Adha (Feast of Sacrifice)", local: 'Eidul Adha' } };
let proclaimed = {};
try { proclaimed = JSON.parse(fs.readFileSync(new URL('./islamic-dates.json', import.meta.url), 'utf8')); } catch { /* file missing = no Eid shown */ }

// LOCAL / REGIONAL Islamic holidays (PD 1083, Code of Muslim Personal Laws, Art. 169): observed in Muslim-majority areas such as BARMM, NOT nationwide.
// Set INCLUDE_LOCAL = false  -> "National Regular Islamic Holidays" version (Eid'l Fitr + Eid'l Adha only).
// Set INCLUDE_LOCAL = true   -> "National + Local & Regional Islamic Holidays" version.
export const INCLUDE_LOCAL = true;
// Local dates come ONLY from islamic-dates.json (the dates confirmed from Google). Nothing is computed or guessed: no date there = not shown.
// A date written with a trailing "~" (e.g. "2025-06-27~") is shown with a Provisional badge.
const LOCAL = [
  { key: 'amun_jadid', name: 'Amun Jadid (Islamic New Year)', local: 'Amun Jadid' },
  { key: 'maulid', name: 'Maulid an-Nabi (Birthday of the Prophet Muhammad)', local: 'Maulid an-Nabi' },
  { key: 'isra_miraj', name: "Isra Wal Mi'raj", local: "Isra Wal Mi'raj" },
];
export function localIslamic(year) {
  return LOCAL.flatMap((k) => [].concat(proclaimed?.[year]?.[k.key] ?? []).map((v) => {
    const prov = String(v).endsWith('~');
    return { date: String(v).replace('~', ''), name: k.name, local: k.local, type: I, scope: 'local', ...(prov && { provisional: true }) };
  }));
}

export function withIslamic(year, list) {
  const base = OFFICIAL[year]
    ? OFFICIAL[year].map(([md, name, type]) => ({ date: `${year}-${md}`, name, local: '', type }))
    : list.filter((h) => h.type !== I && REAL.test(`${h.name} ${h.local}`) && (!h.types || h.types.some((t) => /national|public/i.test(t))));   // Calendarific: only "National holiday" entries (drops observances / local days)
  const extra = (EXTRA[year] ?? []).map(([md, name, type]) => ({ date: `${year}-${md}`, name, local: '', type }));
  const base2 = [...base.filter((h) => !extra.some((x) => x.date === h.date)), ...extra];
  const eid = Object.entries(EID).flatMap(([k, v]) => (proclaimed?.[year]?.[k] ? [{ date: proclaimed[year][k], name: v.name, local: v.local, type: I, scope: 'national' }] : []));
  return [...base2, ...eid, ...(INCLUDE_LOCAL ? localIslamic(year) : [])].sort((a, b) => a.date.localeCompare(b.date));
}
