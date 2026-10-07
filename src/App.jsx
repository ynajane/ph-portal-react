import { useState, useEffect, useRef } from 'react';
import { api, initCsrf } from './api.js';

const emOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const fold = (x) => String(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const Logo = ({ s = 46 }) => (<svg width={s} height={s} viewBox="0 0 32 32" role="img" aria-label="Hiraya logo"><circle cx="16" cy="16" r="14" fill="#6f4a2b" stroke="#d4a23a" strokeWidth="2" /><path d="M22.58 15.2L25.87 13.3M19.8 12.42L21.7 9.13M16 11.4L16 7.6M12.2 12.42L10.3 9.13M9.42 15.2L6.13 13.3" stroke="#d4a23a" strokeWidth="1.8" strokeLinecap="round" fill="none" /><path d="M10.4 19a5.6 5.6 0 0 1 11.2 0z" fill="#d4a23a" /><path d="M7.5 19h17M11.5 22.4h9M13.5 25.4h5" stroke="#fff3d6" strokeWidth="1.6" strokeLinecap="round" fill="none" /></svg>);
const Eye = ({ off }) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{off ? <><path d="M17.94 17.94A10.9 10.9 0 0 1 12 19C5 19 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" /><path d="M1 1l22 22" /></> : <><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></>}</svg>);

function Pw({ id, value, onChange, onBlur, auto }) {
  const [s, setS] = useState(false);
  return (<div className="pw"><input id={id} type={s ? 'text' : 'password'} value={value} onChange={onChange} onBlur={onBlur} autoComplete={auto} />
    <button type="button" className="eye" aria-label={s ? 'Hide password' : 'Show password'} aria-pressed={s} onClick={() => setS(!s)}><Eye off={s} /></button></div>);
}

/* ---------- login ---------- */
function Login({ onOk, go }) {
  const [f, setF] = useState({ email: '', password: '' }), [e, setE] = useState({}), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [rv, setRv] = useState('');
  const chk = (n, v) => n === 'email' ? (!v.trim() ? 'Email is required.' : emOk(v.trim()) ? '' : 'Enter a valid email (user@domain.com).') : (!v ? 'Password is required.' : '');
  const set = (n) => (ev) => { setF({ ...f, [n]: ev.target.value }); setE({ ...e, [n]: chk(n, ev.target.value) }); };
  const submit = async (ev) => {
    ev.preventDefault(); const ne = { email: chk('email', f.email), password: chk('password', f.password) }; setE(ne); if (ne.email || ne.password) return;
    setBusy(true); setRv(''); const r = await api('login', { email: f.email.trim(), password: f.password });
    if (r.ok) onOk((await api('me')).d); else setErr(r.d.error); setBusy(false);
  };
  const resend = async (ev) => { ev.preventDefault(); await api('resend-verification', { email: f.email.trim() }); setErr(''); setRv('If that account is unverified, a new link was sent.'); };
  return (<form onSubmit={submit} noValidate><div className="grid">
    <div className="wide"><label>Email<input type="email" autoComplete="username" value={f.email} onChange={set('email')} className={e.email ? 'bad' : ''} /></label><div className="err">{e.email}</div></div>
    <div className="wide"><label className="blk" htmlFor="l_pw">Password</label><Pw id="l_pw" value={f.password} onChange={set('password')} auto="current-password" /><div className="err">{e.password}</div></div></div>
    <p className="err">{err}{/verify your email/i.test(err) && <> <a href="#" onClick={resend}>Resend verification email</a></>}</p>{rv && <p className="err" style={{ color: 'var(--ok)' }}>{rv}</p>}
    <button className="alt sub" disabled={busy}>{busy ? 'Please wait…' : 'Log in'}</button><p className="sw">New here? <a onClick={() => go('reg')}>Create an account</a></p></form>);
}

/* ---------- combobox ---------- */
function Combo({ label, text, setText, load, pick, disabled, ph, err, ok, bad, onTouch }) {
  const [it, setIt] = useState([]), [open, setOpen] = useState(false), [k, setK] = useState(-1), seq = useRef(0), tm = useRef();
  const run = async (q) => { if (disabled) return; const m = ++seq.current, r = await load(q); if (m === seq.current) { setIt(r); setK(-1); setOpen(true); } };
  const choose = (o) => { setText(o.n || o.t); setOpen(false); pick(o); };
  return (<div><label>{label}<div className="combo">
    <input value={text} placeholder={ph} disabled={disabled} autoComplete="off" role="combobox" className={bad ? 'bad' : ok ? 'ok' : ''}
      onFocus={() => run(text)} onChange={(ev) => { setText(ev.target.value); pick(null, ev.target.value); clearTimeout(tm.current); tm.current = setTimeout(() => run(ev.target.value), 150); }}
      onKeyDown={(ev) => { if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); if (!open) return run(text); setK(Math.max(0, Math.min(it.length - 1, k + (ev.key === 'ArrowDown' ? 1 : -1)))); } else if (ev.key === 'Enter' && open && k >= 0) { ev.preventDefault(); choose(it[k]); } else if (ev.key === 'Escape') setOpen(false); }}
      onBlur={() => setTimeout(() => { setOpen(false); const m = it.find((o) => fold(o.n || o.t) === fold(text)); if (m && text) choose(m); onTouch(); }, 120)} />
    {open && <ul className="cbl">{it.length ? it.map((o, i) => <li key={i} className={i === k ? 'on' : ''} onMouseDown={(ev) => { ev.preventDefault(); choose(o); }}>{o.t}</li>) : <li className="no">No matches</li>}</ul>}
  </div></label><div className="err">{err}</div></div>);
}

/* ---------- register ---------- */
const FIELDS = [['first_name', 'First name'], ['last_name', 'Last name'], ['middle_initial', 'Middle initial (optional)'], ['birthday', 'Birthday (MM/DD/YYYY)'], ['house_street', 'House & street'], ['country'], ['state'], ['city'], ['zip_code', 'ZIP'], ['email', 'Email'], ['mobile', 'Mobile number'], ['password'], ['confirm_password']];
const tc = (s) => String(s ?? '').toLowerCase().replace(/(^|[\s\-/.(])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/(^|[\s-])(\p{L}['’])(\p{L})/gu, (m, a, b, c) => a + b + c.toUpperCase());   // Title Case (O'Brien, Mary-Jane, 5th Ave)
const TCF = ['first_name', 'last_name', 'middle_initial', 'house_street', 'city'];   // every text field except email
const pn = (v) => /^(?=.*\p{L})[\p{L}\p{M}'’ -]{2,50}$/u.test(v) ? '' : '2-50 letters, spaces, hyphens or apostrophes only.';
const pwOk = (v) => v.length >= 12 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v);
function Register({ done, go, limited }) {
  const [f, setF] = useState({ first_name: '', last_name: '', middle_initial: '', birthday: '', house_street: '', country: '', state: '', city: '', zip_code: '', email: '', mobile: '', password: '', confirm_password: '' });
  const [tx, setTx] = useState({ country: '', state: '', city: '' }), [touched, setT] = useState({}), [ax, setAx] = useState({}), [srv, setSrv] = useState({});
  const [CUR, setCUR] = useState(null), [cp, setCp] = useState(false), [ST, setST] = useState([]), [sug, setSug] = useState(''), [rerr, setRerr] = useState(''), [busy, setBusy] = useState(false), [copied, setCopied] = useState('Copy'), [zw, setZw] = useState('');
  const isPH = CUR?.code === 'PH';   // Philippines: "State" (no Province) and the city must be chosen from the official list
  const val = (n, v) => {
    if (!v && n !== 'middle_initial') return 'This field is required.';
    switch (n) {
      case 'first_name': case 'last_name': return pn(v);
      case 'middle_initial': return !v || /^\p{L}\.?$/u.test(v) ? '' : 'One letter, optionally with a period (A or A.).';
      case 'birthday': { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v); if (!m) return 'Use MM/DD/YYYY.'; const [, mo, d, y] = m.map(Number), dt = new Date(Date.UTC(y, mo - 1, d)); if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d || y < 1900) return 'Enter a real calendar date.'; const t = new Date(); if (dt > new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()))) return 'Birthday cannot be in the future.'; return dt > new Date(Date.UTC(t.getUTCFullYear() - 13, t.getUTCMonth(), t.getUTCDate())) ? 'You must be at least 13 years old.' : ''; }
      case 'house_street': return /^[\p{L}0-9 .,#'’/-]{3,255}$/u.test(v) ? '' : 'Enter a valid house number and street.';
      case 'country': return ''; case 'state': return '';
      case 'city': if (!/^[\p{L}0-9 .'()-]{2,100}$/u.test(v)) return 'Enter a valid name (2-100 characters).'; return isPH && !cp ? 'Choose a city from the list.' : '';
      case 'zip_code': return !CUR ? 'Select a country first.' : new RegExp(CUR.zipFormat, CUR.zipFlags).test(v) ? '' : 'Invalid ZIP for ' + CUR.name + '.';
      case 'email': return emOk(v) ? '' : 'Enter a valid email (user@domain.com).';
      case 'mobile': return !CUR ? 'Select a country first.' : /^\+?[\d\s().-]{5,20}$/.test(v) ? '' : 'Enter a valid mobile number.';
      case 'password': return pwOk(v) ? '' : '12+ characters with upper, lower, number and special character.';
      case 'confirm_password': return v === f.password ? '' : 'Passwords do not match.';
      default: return '';
    }
  };
  const err = (n) => touched[n] ? val(n, f[n]) || ax[n] || srv[n] || '' : '';
  const cls = (n) => touched[n] ? (err(n) ? 'bad' : f[n] ? 'ok' : '') : '';
  const touch = (n) => setT((t) => ({ ...t, [n]: true }));
  const upd = (n, v) => { if (n === 'zip_code') setZw(''); setF((p) => ({ ...p, [n]: v })); touch(n); setAx((a) => ({ ...a, [n]: '' })); setSrv((s) => ({ ...s, [n]: '' })); };
  const blurCheck = async (n) => {
    touch(n); const v = (TCF.includes(n) ? tc(f[n]) : f[n]).trim(); if (TCF.includes(n) && v !== f[n]) setF((p) => ({ ...p, [n]: v })); if (!v || val(n, v)) return; let m = '';
    if (n === 'email') { const r = await api('check/email', { email: v }); m = r.ok && r.d.ok ? '' : (r.d?.error || 'Could not check this email.'); }
    else if (CUR && n === 'mobile') { const r = await api('check/mobile', { country: CUR.code, mobile: v }); m = r.d?.ok ? '' : (r.d?.error || 'Could not check this number.'); }
    else if (CUR && n === 'zip_code') { const r = await api('geo/validate', { country: CUR.code, state: f.state, city: f.city, zip: v }); m = r.d?.errors?.zip_code || ''; setZw(r.d?.zipWarning || ''); }
    setAx((a) => ({ ...a, [n]: m }));
  };
  useEffect(() => {   // ZIP must match the city: re-check when the country, state or city changes after a ZIP was typed
    const z = f.zip_code.trim(); if (!CUR || !z || !f.state || !f.city.trim() || val('zip_code', z)) return;
    let on = true;
    const t = setTimeout(async () => { const r = await api('geo/validate', { country: CUR.code, state: f.state, city: f.city, zip: z }); if (!on) return; setAx((a) => ({ ...a, zip_code: r.d?.errors?.zip_code || '' })); setZw(r.d?.zipWarning || ''); }, 600);
    return () => { on = false; clearTimeout(t); };
  }, [f.city, f.state, CUR?.code]); // eslint-disable-line
  const maskBd = (v) => { const d = v.replace(/\D/g, '').slice(0, 8); return d.length > 4 ? d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4) : d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; };
  const mark = (n, v) => { setT((t) => ({ ...t, [n]: true })); setF((p) => ({ ...p, [n]: v })); };
  const pickCountry = async (o) => {
    if (!o) { setCUR(null); setST([]); setCp(false); setF((p) => ({ ...p, country: '', state: '', city: '' })); setTx((t) => ({ ...t, state: '', city: '' })); return; }
    mark('country', o.v); setCp(false); setTx((t) => ({ ...t, state: '', city: '' })); setF((p) => ({ ...p, state: '', city: '' }));
    const c = (await api('geo/countries/' + o.v)).d; setCUR(c); const s = (await api('geo/states?country=' + o.v)).d || []; setST(s);
    if (!s.length) { setF((p) => ({ ...p, state: c.name })); setTx((t) => ({ ...t, state: 'Not applicable' })); }
  };
  const gen = () => {
    const R = (n) => { const a = new Uint32Array(1); let x; do { crypto.getRandomValues(a); x = a[0]; } while (x >= 4294967296 - 4294967296 % n); return x % n; };
    const U = 'ABCDEFGHJKLMNPQRSTUVWXYZ', L = 'abcdefghijkmnopqrstuvwxyz', N = '23456789', S = '!@#$%^&*-_?', A = U + L + N + S, pick = (c) => c[R(c.length)];
    const c = [pick(U), pick(L), pick(N), pick(S)]; while (c.length < 16) c.push(pick(A));
    for (let i = c.length - 1; i > 0; i--) { const j = R(i + 1); [c[i], c[j]] = [c[j], c[i]]; }
    const p = c.join(''); setSug(p); setCopied('Copy'); setF((x) => ({ ...x, password: p, confirm_password: p })); setT((t) => ({ ...t, password: true, confirm_password: true }));
  };
  const copy = async () => { try { await navigator.clipboard.writeText(sug); setCopied('Copied ✓'); } catch { setCopied('Select & copy'); } };
  const submit = async (ev) => {
    ev.preventDefault(); const all = {}; FIELDS.forEach(([n]) => (all[n] = true)); setT(all);
    if (FIELDS.some(([n]) => val(n, f[n]) || ax[n])) { setRerr('Please fix the highlighted fields.'); return; }
    setRerr(''); setBusy(true); const g = { ...f }; TCF.forEach((k) => (g[k] = tc(g[k]))); setF(g); const r = await api('register', g);
    if (r.d.limit) { setBusy(false); return limited(); }   // 5 attempts per IP per hour reached: close the form and go to Log in with the rule
    if (r.d.errors) { setSrv(r.d.errors); setRerr('Please fix the highlighted fields.'); } else if (!r.ok) setRerr(r.d.error); else done();
    setBusy(false);
  };
  const sec = { first_name: 'Personal details', house_street: 'Address', email: 'Contact', password: 'Security' };
  const field = ([n, l]) => {
    let body;
    if (n === 'country') body = <Combo label="Country" ph="Type a country…" text={tx.country} setText={(v) => setTx((t) => ({ ...t, country: v }))} err={err('country') || (touched.country && !f.country ? 'Choose a country from the list.' : '')} ok={!!f.country} bad={touched.country && !f.country} onTouch={() => touch('country')}
      load={async (q) => ((await api('geo/countries?q=' + encodeURIComponent(q))).d || []).map((c) => ({ v: c.code, t: c.name + ' (' + c.dial + ')', n: c.name }))} pick={(o) => pickCountry(o)} />;
    else if (n === 'state') body = <Combo label="State" ph={isPH ? 'Not applicable' : 'Choose state'} disabled={isPH || (!!CUR && !ST.length)} text={tx.state} setText={(v) => setTx((t) => ({ ...t, state: v }))} err={touched.state && !f.state && !isPH ? 'Choose a state from the list.' : ''} ok={!!f.state && !isPH} bad={touched.state && !f.state && !isPH} onTouch={() => touch('state')}
      load={async (q) => { const x = fold(q), rk = (s) => { s = fold(s); return s.startsWith(x) ? 0 : s.includes(x) ? 1 : 9; }; return ST.filter((s) => !x || rk(s.name) < 9).sort((a, b) => rk(a.name) - rk(b.name) || a.name.localeCompare(b.name)).map((s) => ({ v: s.name, t: s.name })); }}
      pick={(o) => { setF((p) => ({ ...p, state: o ? o.v : '', city: '' })); setTx((t) => ({ ...t, city: '' })); setCp(false); if (o) touch('state'); }} />;
    else if (n === 'city') body = <Combo label="City" ph={isPH ? 'Choose a city' : 'Type or choose a city'} disabled={isPH && !f.state} text={tx.city} setText={(v) => setTx((t) => ({ ...t, city: v }))} err={err('city')} ok={cls('city') === 'ok'} bad={cls('city') === 'bad'} onTouch={() => touch('city')}
      load={async (q) => CUR ? ((await api('geo/cities?country=' + CUR.code + '&state=' + encodeURIComponent(ST.length ? f.state : '') + '&q=' + encodeURIComponent(q))).d || []).map((c) => ({ v: c, t: c })) : []}
      pick={(o, typed) => { setCp(!!o); setF((p) => ({ ...p, city: o ? o.v : (typed || '').trim() })); touch('city'); }} />;
    else if (n === 'password' || n === 'confirm_password') body = (<div className="wide"><label className="blk" htmlFor={'f_' + n}>{n === 'password' ? 'Password' : 'Confirm password'}</label>
      <Pw id={'f_' + n} value={f[n]} onChange={(ev) => upd(n, ev.target.value)} onBlur={() => touch(n)} auto="new-password" />
      {n === 'password' && <><div className="meter"><i style={{ width: [f.password.length >= 12, /[A-Z]/.test(f.password), /[a-z]/.test(f.password), /\d/.test(f.password), /[^A-Za-z0-9]/.test(f.password)].filter(Boolean).length * 20 + '%' }} /></div>
        <ul className="rules">{[['12+ characters', f.password.length >= 12], ['Uppercase', /[A-Z]/.test(f.password)], ['Lowercase', /[a-z]/.test(f.password)], ['Number', /\d/.test(f.password)], ['Special', /[^A-Za-z0-9]/.test(f.password)]].map(([t, m]) => <li key={t} className={m ? 'met' : ''}>{t}</li>)}</ul></>}
      <div className="err">{err(n)}</div></div>);
    else if (n === 'mobile') body = <div><label>{l}<span className="row"><span className="pre">{CUR ? CUR.dial : '+'}</span><input inputMode="tel" placeholder="9171234567" value={f.mobile} className={cls('mobile')} onChange={(ev) => upd('mobile', ev.target.value)} onBlur={() => blurCheck('mobile')} /></span></label><div className="err">{err('mobile')}</div></div>;
    else body = <div className={n === 'house_street' ? 'wide' : ''}><label>{l}<input type={n === 'email' ? 'email' : 'text'} autoComplete="off" value={f[n]} className={cls(n) + (TCF.includes(n) ? ' tc' : '')} placeholder={n === 'birthday' ? 'MM/DD/YYYY' : ''} maxLength={n === 'birthday' ? 10 : undefined} inputMode={n === 'birthday' ? 'numeric' : undefined}
      onChange={(ev) => upd(n, n === 'birthday' ? maskBd(ev.target.value) : ev.target.value)} onBlur={() => blurCheck(n)} /></label><div className="err">{err(n)}</div>{n === 'zip_code' && zw && !err(n) && <small className="hint warn">{zw}</small>}</div>;
    return <div key={n} style={{ display: 'contents' }}>{sec[n] && <div className="sec">{sec[n]}</div>}{body}</div>;
  };
  return (<form onSubmit={submit} noValidate><div className="grid">{FIELDS.map(field)}</div>
    <div style={{ marginTop: '.8rem' }}><button type="button" className="ghost" onClick={gen}>{sug ? 'Suggest another' : 'Suggest strong password'}</button></div>
    {sug && <div className="sug" role="status"><small>Suggested password. It was filled into both password fields. Copy it into your password manager now: we store only a hash, so we can't show it again after sign-up.</small><div className="row"><code>{sug}</code><button type="button" className="ghost" onClick={copy}>{copied}</button></div></div>}
    <p className="err">{rerr}</p><button className="alt sub" disabled={busy}>{busy ? 'Please wait…' : 'Create account'}</button><p className="sw">Already registered? <a onClick={() => go('login')}>Log in</a></p></form>);
}

/* ---------- mobile OTP ---------- */
function Otp({ phone, onOk, onLogin }) {
  const [code, setCode] = useState(''), [err, setErr] = useState(''), [n, setN] = useState(60);
  const send = async (first) => { const r = await api('otp/resend', {}); setErr(r.ok ? (first ? '' : 'New code sent.') : r.d.error); if (r.ok) setN(60); };
  useEffect(() => { send(true); }, []); // eslint-disable-line
  useEffect(() => { if (n <= 0) return; const t = setTimeout(() => setN(n - 1), 1000); return () => clearTimeout(t); }, [n]);
  const submit = async (ev) => { ev.preventDefault(); const r = await api('otp/verify', { code }); if (!r.ok) return setErr(r.d.error); const me = await api('me'); me.ok ? onOk(me.d) : onLogin('Mobile number verified! Please log in to continue.'); };
  return (<form onSubmit={submit}><h2>Verify your mobile</h2><p>Email verified. We texted a 6-digit code to <b>{phone}</b>. It lasts 5 minutes.</p>
    <label>Code<input inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} /></label><p className="err">{err}</p>
    <div className="row"><button>Verify code</button><button type="button" className="ghost" disabled={n > 0} onClick={() => send(false)}>{n > 0 ? `Resend (${n}s)` : 'Resend'}</button></div></form>);
}

/* ---------- dashboard ---------- */
const Em = ({ v }) => { const i = String(v).indexOf('@'); return i < 0 ? v : <>{v.slice(0, i)}<wbr />{v.slice(i)}</>; };
const initials = (a, b) => (((a || '')[0] || '') + ((b || '')[0] || '')).toUpperCase();
const PAL = [['#b4532f', '#6f2e17'], ['#8a6a2f', '#4d3a14'], ['#5f7a4a', '#2f4220'], ['#a8742c', '#6b4410'], ['#8c4a5e', '#52202f'], ['#4f6f78', '#243f47']];
const tone = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PAL[h % PAL.length]; };
const Av = ({ first, last, size = 'md', ok }) => { const [a, b] = tone((first || '') + (last || '')); return (<span className={'avx avx-' + size} style={{ '--a': a, '--b': b }} aria-hidden="true"><b>{initials(first, last) || '?'}</b>{ok && <i className="dot" />}</span>); };
const IC = { user: 'M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6', out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9', chev: 'M6 9l6 6 6-6', phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z', cal: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', check: 'M5 12l5 5L20 7', users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', flag: 'M4 22V4M4 4h13l-2 4 2 4H4' };
const Ico = ({ n }) => <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={IC[n]} /></svg>;
const when = (d) => { const t = new Date(d); return Number.isNaN(+t) ? '' : t.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' }); };
const ok = (t) => <span className="bd b2">{t}</span>;
const row = (k, v, sub) => (<div className="sr" key={k}><div><b>{k}</b>{sub && <small>{sub}</small>}</div><div className="v">{v}</div></div>);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (d) => `${MONTHS[+d.slice(5, 7) - 1]} ${+d.slice(8, 10)}, ${d.slice(0, 4)}`;   // 2026-12-31 -> December 31, 2026
const TYPE_CLS = { 'Regular Holiday': 'b0', 'Special Non-Working Day': 'b1', 'Islamic Holiday': 'b2' };

const TALLY = [{ type: 'Regular Holiday', label: 'Regular Holidays', cls: 'b0' }, { type: 'Special Non-Working Day', label: 'Special Non-Working Days', cls: 'b1' }, { type: 'Islamic Holiday', label: 'Islamic Holidays', cls: 'b2' }];

function Accounts() {
  const [L, setL] = useState(null);
  useEffect(() => { api('users').then((r) => setL(r.d || [])); }, []);
  if (!L) return 'Loading…';
  return L.length ? <div className="ag">{L.map((u, i) => { const p = u.name.split(' '); return <div className="ac" key={i}><Av first={p[0]} last={p[p.length - 1]} size="md" /><b>{u.name}</b><small title={u.email}>{u.email}</small><div className="meta"><span title="Mobile number (masked)"><Ico n="phone" />{u.mobile || '—'}</span><span title="Date joined"><Ico n="cal" />Joined {when(u.joined) || '—'}</span></div></div>; })}</div> : 'No accounts to show.';
}
function Holidays({ local }) {
  const [yr, setYr] = useState(new Date().getFullYear() >= 2020 && new Date().getFullYear() <= 2027 ? new Date().getFullYear() : 2026), [cm, setCm] = useState(new Date().getMonth()), [HL, setHL] = useState([]), [err, setErr] = useState(''), [ld, setLd] = useState(true), [flt, setFlt] = useState(''), [sc, setSc] = useState('');
  useEffect(() => { let on = true; setLd(true); setErr(''); api('holidays/' + yr).then((r) => { if (!on) return; setLd(false); r.ok ? setHL(r.d) : (setHL([]), setErr(r.d.error)); }); return () => { on = false; }; }, [yr]);
  const go = (d) => { let y = yr, m = cm + d; if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; } if (y < 2020 || y > 2027) return; setCm(m); if (y !== yr) { setHL([]); setYr(y); } };
  const f = new Date(yr, cm, 1), n = new Date(yr, cm + 1, 0).getDate(), hm = {};
  const sOf = (h) => (h.scope === 'local' ? 'local' : 'national');
  const VIS = local && sc ? HL.filter((h) => sOf(h) === sc) : HL;   // the server already returns the right set (see INCLUDE_LOCAL in islamic.js); the scope switch only exists in the National + Local version
  const tally = TALLY.map((t) => ({ ...t, label: t.type === 'Islamic Holiday' && !local ? 'National Islamic Holidays' : t.label, year: VIS.filter((h) => h.type === t.type).length, month: VIS.filter((h) => h.type === t.type && +h.date.slice(5, 7) === cm + 1).length }));
  VIS.filter((h) => +h.date.slice(5, 7) === cm + 1).forEach((h) => (hm[+h.date.slice(8)] ??= []).push(h));
  const now = new Date(), isToday = (d) => now.getFullYear() === yr && now.getMonth() === cm && now.getDate() === d;
  const mname = f.toLocaleString('en-PH', { month: 'long' }), tIdx = { 'Regular Holiday': 0, 'Special Non-Working Day': 1, 'Islamic Holiday': 2 };
  const shown = flt ? VIS.filter((h) => h.type === flt) : VIS;
  return (<div className="hol">
    <div className="hbar"><div className="mnav"><button type="button" aria-label="Previous month" disabled={yr === 2020 && cm === 0} onClick={() => go(-1)}>‹</button><h3 aria-live="polite">{f.toLocaleString('en-PH', { month: 'long', year: 'numeric' })}</h3><button type="button" aria-label="Next month" disabled={yr === 2027 && cm === 11} onClick={() => go(1)}>›</button></div>
      <label className="yrsel">Year<select value={yr} onChange={(e) => setYr(+e.target.value)}>{[2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}</select></label></div>
    <p className="err">{err}</p>
    <div className="hwrap">
      <div className="hcal"><div className="cg">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <b key={d}>{d}</b>)}{Array.from({ length: f.getDay() }, (_, i) => <i key={'e' + i} />)}
        {Array.from({ length: n }, (_, i) => { const d = i + 1, h = hm[d]; return <span key={d} className={'d' + (h ? ' hd t' + (tIdx[h[0].type] ?? 0) : '') + (isToday(d) ? ' td' : '')} title={h ? h.map((x) => x.name).join(' / ') : undefined}>{d}</span>; })}</div></div>
      <aside className="haside">
        <div id="cn"><h4>{mname}</h4>{Object.keys(hm).length ? Object.entries(hm).flatMap(([d, a]) => a.map((h) => <div className={'mi t' + (tIdx[h.type] ?? 0)} key={d + h.name}><b>{d}</b><span>{h.name}<small>{h.type}{h.scope === 'local' ? ' · Local' : local ? ' · National' : ''}{h.provisional ? ' · provisional' : ''}</small></span></div>)) : <p className="none">No holiday this month.</p>}</div>
      </aside></div>
    <h3 className="gt">Philippine Holidays in {yr} <small>({shown.length})</small></h3>
    <div className="chips" role="group" aria-label={'Holiday count for ' + yr}>{tally.map((t) => <button type="button" className={'chip ' + t.cls + (flt === t.type ? ' on' : '')} key={t.type} aria-pressed={flt === t.type} title="Click to filter the list" onClick={() => setFlt(flt === t.type ? '' : t.type)}><i />{t.label}<b>{t.year}</b></button>)}</div>
    <div className="hg">{ld ? 'Loading…' : shown.map((h) => <div className="h" key={h.date + h.name}><b>{h.name}</b><br /><small>{longDate(h.date)}</small><br /><span className={'bd ' + TYPE_CLS[h.type]}>{h.type}</span>{(h.scope === 'local' || h.provisional) && <small className="hn"><br />{h.scope === 'local' ? 'Regional Muslim holiday (PD 1083)' : ''}{h.provisional ? (h.scope === 'local' ? ' · ' : '') + 'Tentative date' : ''}</small>}</div>)}</div></div>);
}
const group = (t, rows) => (<><h4 className="gh">{t}</h4><div className="sg">{rows}</div></>);
// Profile and Settings intentionally show only the modal header (title + Close).

function Dash({ u }) {
  const [menu, setMenu] = useState(false), [dd, setDd] = useState(false), [m, setM] = useState(null);
  const out = async () => { await api('logout', {}); location.reload(); };
  useEffect(() => { const c = (e) => { if (!e.target.closest('.dd')) setDd(false); }, k = (e) => e.key === 'Escape' && (setM(null), setDd(false)); document.addEventListener('click', c); document.addEventListener('keydown', k); return () => { document.removeEventListener('click', c); document.removeEventListener('keydown', k); }; }, []);
  const A = ({ on, children }) => <a tabIndex={0} onClick={on} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), on())}>{children}</a>;
  const full = u.first_name + ' ' + u.last_name, ini = initials(u.first_name, u.last_name), small = m === 'p' || m === 's', pick = (f) => () => { setMenu(false); setDd(false); f(); };
  const togDd = () => { setMenu(false); setDd(!dd); };
  return (<>
    <nav><b className="lg"><Logo s={30} />Hiraya</b>
      <div id="links" className={menu ? 'open' : ''}><A on={pick(() => {})}>Dashboard</A><A on={pick(() => setM('p'))}>Profile</A><A on={pick(() => setM('s'))}>Settings</A><A on={pick(() => setM('h'))}>Philippine Holidays</A></div>
      <div className="dd"><a className="pfb" role="button" tabIndex={0} aria-label="Account menu" aria-expanded={dd} onClick={togDd} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), togDd())}><Av first={u.first_name} last={u.last_name} size="sm" ok /><span className="pt"><b>{full}</b><small>{u.email}</small></span><span className="cr"><Ico n="chev" /></span></a>
        {dd && <div id="acct" role="menu"><div className="ah"><Av first={u.first_name} last={u.last_name} size="lg" ok /><b className="dn">{full}</b><p><Em v={u.email} /></p><span className="vb"><Ico n="check" />Verified account</span></div>
          <button id="out" role="menuitem" onClick={out}><Ico n="out" />Log out</button><small className="bv">build v3</small></div>}</div>
      <button id="burger" aria-label="Menu" aria-expanded={menu} onClick={() => { setDd(false); setMenu(!menu); }}>{menu ? '✕' : '☰'}</button></nav>
    <section className="hero"><h1>Mabuhay, <span>{u.first_name}</span></h1><p>Your account is secure. Browse accounts and check the official Philippine holiday calendar.</p><div className="ctas"><button className="alt" onClick={() => { setMenu(false); setDd(false); setM('a'); }}>View More</button></div></section>
    {m && <div className="ov" onClick={(e) => e.target === e.currentTarget && setM(null)}><div className={'modal' + (small ? ' sm' : '')} role="dialog" aria-modal="true">
      <div className="mh">{!small && <div className="tabs"><button className={m === 'a' ? '' : 'ghost'} onClick={() => setM('a')}>Accounts</button><button className={m === 'h' ? '' : 'ghost'} onClick={() => setM('h')}>Calendars / Holidays</button></div>}<b id="mt">{m === 'p' ? 'Profile' : m === 's' ? 'Settings' : ''}</b><button className="ghost" id="cl" onClick={() => setM(null)}>Close</button></div>
      <div className="mb">{m === 'a' && <Accounts />}{m === 'h' && <Holidays local={u.holiday_scope !== 'national'} />}</div></div></div>}
  </>);
}

/* ---------- root ---------- */
export default function App() {
  const [ready, setReady] = useState(false), [user, setUser] = useState(null), [otp, setOtp] = useState(null), [view, setView] = useState('login'), [note, setNote] = useState(null), [cool, setCool] = useState(null), [left, setLeft] = useState(0), [regLock, setRegLock] = useState(false);
  const msg = (t, bad) => setNote(t ? { t, bad } : null);
  const gate = (u) => { if (u.mobile_verified) setUser(u); else setOtp(u.mobile_number); };
  useEffect(() => {
    (async () => {
      await initCsrf(); const q = new URLSearchParams(location.search), vOk = q.get('verified') === 'ok', un = q.get('unlock'); history.replaceState(null, '', '/');
      if (q.get('verified') && !vOk) msg('That link is invalid or expired.', 1);
      if (un === 'ok') msg('Account unlocked. You can log in now.'); else if (un === 'wait') setCool({ s: Math.min(120, Math.max(0, +q.get('s') || 0)), t: q.get('t') }); else if (un) msg('Unlock link invalid or expired.', 1);
      if (vOk) { const i = await api('otp/info'); if (!i.ok) msg('Email verified! Log in to continue with your mobile verification.'); else if (i.d.mobile_verified) msg('Your mobile is already verified. Please log in.'); else setOtp(i.d.phone); }
      else { const me = await api('me'); if (me.ok) gate(me.d); }
      setReady(true);
    })();
  }, []);
  useEffect(() => {
    if (!cool) return; const end = Date.now() + cool.s * 1000; let id;
    const tick = () => { const l = Math.max(0, Math.ceil((end - Date.now()) / 1000)); setLeft(l); if (!l) { clearInterval(id); if (cool.t) location.href = '/unlock?token=' + encodeURIComponent(cool.t); else { setCool(null); msg('Cooling period is over. Click the unlock link in your email again.'); } } };
    tick(); id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [cool]);
  if (!ready) return null;
  if (user) return <Dash u={user} />;
  const toLogin = (t, bad) => { setOtp(null); setView('login'); msg(t, bad); };
  const limited = () => { setRegLock(true); toLogin('Registration limit reached. To prevent bot spam, each IP address can make at most 5 registration attempts per hour. Please try again later, or log in if you already have an account.', 1); };
  return (<main id="auth"><div className="card"><div className="banner"><Logo /><div><h1 className="brand">Hiraya</h1><p>Registration, verification &amp; Philippine holidays</p></div></div>
    <div className="cb">{!otp && <div className="tabs"><button className={view === 'login' ? '' : 'ghost'} onClick={() => setView('login')}>Log in</button><button className={view === 'reg' ? '' : 'ghost'} disabled={regLock} title={regLock ? 'Registration is paused for this IP address. Try again in an hour.' : undefined} onClick={() => setView('reg')}>Create account</button></div>}
      {note && <div className={'msg' + (note.bad ? ' bad' : '')}>{note.t}</div>}
      {cool && left > 0 && <div className="msg bad">Cooling period started. Your account will unlock in <b>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</b>. Keep this page open.</div>}
      {otp ? <Otp phone={otp} onOk={setUser} onLogin={toLogin} />
        : view === 'login' ? <Login onOk={gate} go={(v) => !(v === 'reg' && regLock) && setView(v)} />
          : <Register go={setView} limited={limited} done={() => toLogin('Account created. Check your email and click the verification link. After that, we will text a code to your mobile number.')} />}
    </div></div></main>);
}