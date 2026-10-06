import { useState, useEffect, useRef } from 'react';
import { api, initCsrf } from './api.js';

const emOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const fold = (x) => String(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const Logo = ({ s = 46 }) => (<svg width={s} height={s} viewBox="0 0 32 32" role="img" aria-label="Activity #2 logo"><circle cx="16" cy="16" r="14" fill="#c8102e" stroke="#f2b632" strokeWidth="2" /><path fill="#fff" fillRule="evenodd" d="M16 4.5l10.5 23h-5l-1.6-4h-7.8l-1.6 4h-5zM16 12.6l-2.5 6.1h5z" /></svg>);
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
const FIELDS = [['first_name', 'First name'], ['last_name', 'Last name'], ['middle_initial', 'Middle initial (optional)'], ['birthday', 'Birthday (MM/DD/YYYY)'], ['house_street', 'House & street'], ['country'], ['state'], ['city'], ['zip_code', 'ZIP / postal code'], ['email', 'Email'], ['mobile', 'Mobile number'], ['password'], ['confirm_password']];
const pn = (v) => /^(?=.*\p{L})[\p{L}\p{M}'’ -]{2,50}$/u.test(v) ? '' : '2-50 letters, spaces, hyphens or apostrophes only.';
const pwOk = (v) => v.length >= 12 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v);
function Register({ done, go }) {
  const [f, setF] = useState({ first_name: '', last_name: '', middle_initial: '', birthday: '', house_street: '', country: '', state: '', city: '', zip_code: '', email: '', mobile: '', password: '', confirm_password: '' });
  const [tx, setTx] = useState({ country: '', state: '', city: '' }), [touched, setT] = useState({}), [ax, setAx] = useState({}), [srv, setSrv] = useState({});
  const [CUR, setCUR] = useState(null), [cp, setCp] = useState(false), [ST, setST] = useState([]), [sug, setSug] = useState(''), [rerr, setRerr] = useState(''), [busy, setBusy] = useState(false), [copied, setCopied] = useState('Copy'), [zw, setZw] = useState('');
  const isPH = CUR?.code === 'PH';   // Philippines: the city must be chosen from the list of the selected state/province
  const val = (n, v) => {
    if (!v && n !== 'middle_initial') return 'This field is required.';
    switch (n) {
      case 'first_name': case 'last_name': return pn(v);
      case 'middle_initial': return !v || /^\p{L}\.?$/u.test(v) ? '' : 'One letter, optionally with a period (A or A.).';
      case 'birthday': { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v); if (!m) return 'Use MM/DD/YYYY.'; const [, mo, d, y] = m.map(Number), dt = new Date(Date.UTC(y, mo - 1, d)); if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d || y < 1900) return 'Enter a real calendar date.'; const t = new Date(); return dt > new Date(Date.UTC(t.getUTCFullYear() - 13, t.getUTCMonth(), t.getUTCDate())) ? 'You must be at least 13 years old.' : ''; }
      case 'house_street': return /^[\p{L}0-9 .,#'’/-]{3,255}$/u.test(v) ? '' : 'Enter a valid house number and street.';
      case 'country': return ''; case 'state': return '';
      case 'city': if (!/^[\p{L}0-9 .'()-]{2,100}$/u.test(v)) return 'Enter a valid name (2-100 characters).'; return isPH && !cp ? 'Choose a city from the list.' : '';
      case 'zip_code': return !CUR ? 'Select a country first.' : new RegExp(CUR.zipFormat, CUR.zipFlags).test(v) ? '' : 'Invalid postal code for ' + CUR.name + '.';
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
    touch(n); const v = f[n].trim(); if (!v || val(n, v)) return; let m = '';
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
    setRerr(''); setBusy(true); const r = await api('register', f);
    if (r.d.errors) { setSrv(r.d.errors); setRerr('Please fix the highlighted fields.'); } else if (!r.ok) setRerr(r.d.error); else done();
    setBusy(false);
  };
  const sec = { first_name: 'Personal details', house_street: 'Address', email: 'Contact', password: 'Security' };
  const field = ([n, l]) => {
    let body;
    if (n === 'country') body = <Combo label="Country" ph="Type a country…" text={tx.country} setText={(v) => setTx((t) => ({ ...t, country: v }))} err={err('country') || (touched.country && !f.country ? 'Choose a country from the list.' : '')} ok={!!f.country} bad={touched.country && !f.country} onTouch={() => touch('country')}
      load={async (q) => ((await api('geo/countries?q=' + encodeURIComponent(q))).d || []).map((c) => ({ v: c.code, t: c.name + ' (' + c.dial + ')', n: c.name }))} pick={(o) => pickCountry(o)} />;
    else if (n === 'state') body = <Combo label="State / Province" ph="Choose state / province" disabled={!!CUR && !ST.length} text={tx.state} setText={(v) => setTx((t) => ({ ...t, state: v }))} err={touched.state && !f.state ? 'Choose a state / province from the list.' : ''} ok={!!f.state} bad={touched.state && !f.state} onTouch={() => touch('state')}
      load={async (q) => { const x = fold(q), rk = (s) => { s = fold(s); return s.startsWith(x) ? 0 : s.includes(x) ? 1 : 9; }; return ST.filter((s) => !x || rk(s.name) < 9).sort((a, b) => rk(a.name) - rk(b.name) || a.name.localeCompare(b.name)).map((s) => ({ v: s.name, t: s.name })); }}
      pick={(o) => { setF((p) => ({ ...p, state: o ? o.v : '', city: '' })); setTx((t) => ({ ...t, city: '' })); setCp(false); if (o) touch('state'); }} />;
    else if (n === 'city') body = <Combo label="City" ph={isPH ? (f.state ? 'Choose a city / municipality' : 'Choose a state / province first') : 'Type or choose a city'} disabled={isPH && !f.state} text={tx.city} setText={(v) => setTx((t) => ({ ...t, city: v }))} err={err('city')} ok={cls('city') === 'ok'} bad={cls('city') === 'bad'} onTouch={() => touch('city')}
      load={async (q) => CUR ? ((await api('geo/cities?country=' + CUR.code + '&state=' + encodeURIComponent(ST.length ? f.state : '') + '&q=' + encodeURIComponent(q))).d || []).map((c) => ({ v: c, t: c })) : []}
      pick={(o, typed) => { setCp(!!o); setF((p) => ({ ...p, city: o ? o.v : (typed || '').trim() })); touch('city'); }} />;
    else if (n === 'password' || n === 'confirm_password') body = (<div className="wide"><label className="blk" htmlFor={'f_' + n}>{n === 'password' ? 'Password' : 'Confirm password'}</label>
      <Pw id={'f_' + n} value={f[n]} onChange={(ev) => upd(n, ev.target.value)} onBlur={() => touch(n)} auto="new-password" />
      {n === 'password' && <><div className="meter"><i style={{ width: [f.password.length >= 12, /[A-Z]/.test(f.password), /[a-z]/.test(f.password), /\d/.test(f.password), /[^A-Za-z0-9]/.test(f.password)].filter(Boolean).length * 20 + '%' }} /></div>
        <ul className="rules">{[['12+ characters', f.password.length >= 12], ['Uppercase', /[A-Z]/.test(f.password)], ['Lowercase', /[a-z]/.test(f.password)], ['Number', /\d/.test(f.password)], ['Special', /[^A-Za-z0-9]/.test(f.password)]].map(([t, m]) => <li key={t} className={m ? 'met' : ''}>{t}</li>)}</ul></>}
      <div className="err">{err(n)}</div></div>);
    else if (n === 'mobile') body = <div className="wide"><label>{l}<span className="row"><span className="pre">{CUR ? CUR.dial : '+'}</span><input inputMode="tel" placeholder="9171234567" value={f.mobile} className={cls('mobile')} onChange={(ev) => upd('mobile', ev.target.value)} onBlur={() => blurCheck('mobile')} /></span></label><div className="err">{err('mobile')}</div></div>;
    else body = <div className={['email', 'house_street'].includes(n) ? 'wide' : ''}><label>{l}<input type={n === 'email' ? 'email' : 'text'} autoComplete="off" value={f[n]} className={cls(n)} placeholder={n === 'birthday' ? 'MM/DD/YYYY' : ''} maxLength={n === 'birthday' ? 10 : undefined} inputMode={n === 'birthday' ? 'numeric' : undefined}
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
const row = (k, v, sub) => (<div className="sr" key={k}><div><b>{k}</b>{sub && <small>{sub}</small>}</div><div className="v">{v}</div></div>);
const TYPE_CLS = { 'Regular Holiday': 'b0', 'Special Non-Working Day': 'b1', 'Islamic Holiday': 'b2' };

function Accounts() {
  const [L, setL] = useState(null);
  useEffect(() => { api('users').then((r) => setL(r.d || [])); }, []);
  if (!L) return 'Loading…';
  return L.length ? <div className="ag">{L.map((u, i) => { const p = u.name.split(' '); return <div className="ac" key={i}><div className="av big">{initials(p[0], p[p.length - 1])}</div><b>{u.name}</b><small title={u.email}>{u.email}</small></div>; })}</div> : 'No accounts to show.';
}
function Holidays() {
  const [yr, setYr] = useState(new Date().getFullYear() >= 2020 && new Date().getFullYear() <= 2027 ? new Date().getFullYear() : 2026), [cm, setCm] = useState(new Date().getMonth()), [HL, setHL] = useState([]), [err, setErr] = useState(''), [ld, setLd] = useState(true);
  useEffect(() => { let on = true; setLd(true); setErr(''); api('holidays/' + yr).then((r) => { if (!on) return; setLd(false); r.ok ? setHL(r.d) : (setHL([]), setErr(r.d.error)); }); return () => { on = false; }; }, [yr]);
  const go = (d) => { let y = yr, m = cm + d; if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; } if (y < 2020 || y > 2027) return; setCm(m); if (y !== yr) { setHL([]); setYr(y); } };
  const f = new Date(yr, cm, 1), n = new Date(yr, cm + 1, 0).getDate(), hm = {};
  HL.filter((h) => +h.date.slice(5, 7) === cm + 1).forEach((h) => (hm[+h.date.slice(8)] ??= []).push(h));
  return (<div><div className="ctl"><label>Year<select value={yr} onChange={(e) => setYr(+e.target.value)}>{[2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}</select></label></div>
    <p className="err">{err}</p>
    <div className="mnav"><button type="button" aria-label="Previous month" disabled={yr === 2020 && cm === 0} onClick={() => go(-1)}>‹</button><h3 aria-live="polite">{f.toLocaleString('en-PH', { month: 'long', year: 'numeric' })}</h3><button type="button" aria-label="Next month" disabled={yr === 2027 && cm === 11} onClick={() => go(1)}>›</button></div>
    <div className="cg">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <b key={d}>{d}</b>)}{Array.from({ length: f.getDay() }, (_, i) => <i key={'e' + i} />)}
      {Array.from({ length: n }, (_, i) => { const d = i + 1, h = hm[d]; return <span key={d} className={'d' + (h ? ' hd t' + (({ 'Regular Holiday': 0, 'Special Non-Working Day': 1, 'Islamic Holiday': 2 })[h[0].type] ?? 0) : '')} title={h ? h.map((x) => x.name).join(' / ') : undefined}>{d}</span>; })}</div>
    <div id="cn">{Object.keys(hm).length ? Object.entries(hm).flatMap(([d, a]) => a.map((h) => <div key={d + h.name}><b>{d}</b> - {h.name} ({h.type}{h.provisional ? ', provisional' : ''})</div>)) : 'No holiday this month.'}</div>
    <h3>All holidays this year</h3>
    <div className="hg">{ld ? 'Loading…' : HL.map((h) => <div className="h" key={h.date + h.name}><b>{h.name}</b><br /><small>{new Date(h.date + 'T00:00:00+08:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' })}</small><br /><span className={'bd ' + TYPE_CLS[h.type]}>{h.type}</span>{h.provisional && <> <span className="bd b1" title="Computed from the Islamic calendar. The official date may differ by a day.">Provisional</span></>}</div>)}</div></div>);
}
function Profile({ u }) {
  const nm = [u.first_name, u.middle_initial, u.last_name].filter(Boolean).join(' ');
  return (<><div className="ph"><div className="av big">{initials(u.first_name, u.last_name)}</div><div><h3>{nm}</h3><small><Em v={u.email} /></small></div></div>
    <div className="sg">{row('Birthday', u.birthday || '')}{row('Mobile', u.mobile_number)}{row('Address', [u.house_street, u.city, u.state, u.zip_code, u.country].filter(Boolean).join(', '))}</div></>);
}
const Settings = ({ out }) => (<><h3>Sign-in and security</h3><div className="sg">{row('Password', <span className="bd b2">Protected</span>, 'We never store your actual password.')}{row('Session', '8 hours', 'After that, you will need to log in again.')}{row('Failed log-ins', '3 attempts', 'Your account locks after 3 wrong passwords. We email you an unlock link that works after 2 minutes.')}</div><button className="danger" onClick={out}>Log out</button></>);

function Dash({ u }) {
  const [menu, setMenu] = useState(false), [dd, setDd] = useState(false), [m, setM] = useState(null);
  const out = async () => { await api('logout', {}); location.reload(); };
  useEffect(() => { const c = (e) => { if (!e.target.closest('.dd')) setDd(false); }, k = (e) => e.key === 'Escape' && (setM(null), setDd(false)); document.addEventListener('click', c); document.addEventListener('keydown', k); return () => { document.removeEventListener('click', c); document.removeEventListener('keydown', k); }; }, []);
  const A = ({ on, children }) => <a tabIndex={0} onClick={on} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), on())}>{children}</a>;
  const full = u.first_name + ' ' + u.last_name, ini = initials(u.first_name, u.last_name), small = m === 'p' || m === 's', pick = (f) => () => { setMenu(false); setDd(false); f(); };
  const togDd = () => { setMenu(false); setDd(!dd); };
  return (<>
    <nav><b className="lg"><Logo s={30} />Activity #2</b>
      <div id="links" className={menu ? 'open' : ''}><A on={pick(() => scrollTo({ top: 0, behavior: 'smooth' }))}>Dashboard</A><A on={pick(() => setM('p'))}>Profile</A><A on={pick(() => setM('s'))}>Settings</A><A on={pick(() => setM('h'))}>Philippine Holidays</A></div>
      <div className="dd"><a className="pfb" role="button" tabIndex={0} aria-label="Account menu" aria-expanded={dd} onClick={togDd} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), togDd())}><span className="av">{ini}</span><span className="pt"><b>{full}</b><small>{u.email}</small></span><span className="cr">▾</span></a>
        {dd && <div id="ddm"><div className="av big">{ini}</div><b className="dn">{full}</b><p><Em v={u.email} /></p><small style={{ opacity: 0.6 }}>build v2</small><div className="bt"><button id="out" onClick={out}>Log out</button></div></div>}</div>
      <button id="burger" aria-label="Menu" aria-expanded={menu} onClick={() => { setDd(false); setMenu(!menu); }}>{menu ? '✕' : '☰'}</button></nav>
    <section className="hero"><h1>Mabuhay, <span>{u.first_name}</span></h1><p>Your account is secure. Browse accounts and check the official Philippine holiday calendar.</p><div className="ctas"><button className="alt" onClick={() => { setMenu(false); setDd(false); setM('a'); }}>View More</button></div></section>
    {m && <div className="ov" onClick={(e) => e.target === e.currentTarget && setM(null)}><div className={'modal' + (small ? ' sm' : '')} role="dialog" aria-modal="true">
      <div className="mh">{!small && <div className="tabs"><button className={m === 'a' ? '' : 'ghost'} onClick={() => setM('a')}>Accounts</button><button className={m === 'h' ? '' : 'ghost'} onClick={() => setM('h')}>Calendars / Holidays</button></div>}<b id="mt">{m === 'p' ? 'Profile' : m === 's' ? 'Settings' : ''}</b><button className="ghost" id="cl" onClick={() => setM(null)}>Close</button></div>
      <div className="mb">{m === 'a' && <Accounts />}{m === 'h' && <Holidays />}{m === 'p' && <Profile u={u} />}{m === 's' && <Settings out={out} />}</div></div></div>}
  </>);
}

/* ---------- root ---------- */
export default function App() {
  const [ready, setReady] = useState(false), [user, setUser] = useState(null), [otp, setOtp] = useState(null), [view, setView] = useState('login'), [note, setNote] = useState(null), [cool, setCool] = useState(null), [left, setLeft] = useState(0);
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
  const toLogin = (t) => { setOtp(null); setView('login'); msg(t); };
  return (<main id="auth"><div className="card"><div className="banner"><Logo /><div><h1 className="brand">Activity #2</h1><p>Registration, verification &amp; Philippine holidays</p></div></div>
    <div className="cb">{!otp && <div className="tabs"><button className={view === 'login' ? '' : 'ghost'} onClick={() => setView('login')}>Log in</button><button className={view === 'reg' ? '' : 'ghost'} onClick={() => setView('reg')}>Create account</button></div>}
      {note && <div className={'msg' + (note.bad ? ' bad' : '')}>{note.t}</div>}
      {cool && left > 0 && <div className="msg bad">Cooling period started. Your account will unlock in <b>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</b>. Keep this page open.</div>}
      {otp ? <Otp phone={otp} onOk={setUser} onLogin={toLogin} />
        : view === 'login' ? <Login onOk={gate} go={setView} />
          : <Register go={setView} done={() => toLogin('Account created. Check your email and click the verification link. After that, we will text a code to your mobile number.')} />}
    </div></div></main>);
}