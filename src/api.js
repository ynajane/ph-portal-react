let csrf = '';
export async function initCsrf() { csrf = (await api('csrf', undefined, false)).d.csrf; }
export async function api(p, b, retry = true) {
  const h = { 'x-csrf-token': csrf }; if (b) h['Content-Type'] = 'application/json';
  const r = await fetch('/api/' + p, { method: b ? 'POST' : 'GET', credentials: 'same-origin', headers: h, body: b ? JSON.stringify(b) : undefined });
  let d = {}; try { d = await r.json(); } catch { /* empty */ }
  if (r.status === 403 && d.error === 'Invalid CSRF token.' && retry && p !== 'csrf') { await initCsrf(); return api(p, b, false); }
  return { ok: r.ok, d };
}
