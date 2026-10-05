// D1 helpers, crypto, sessions, responses
const SEC = { 'x-frame-options': 'DENY', 'referrer-policy': 'same-origin' };
export const enc = new TextEncoder();
const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
export const rnd = (n = 16) => hex(crypto.getRandomValues(new Uint8Array(n)));
export const all = async (e, s, ...a) => (await e.DB.prepare(s).bind(...a).all()).results;
export const one = async (e, s, ...a) => (await all(e, s, ...a))[0] || null;
export const run = (e, s, ...a) => e.DB.prepare(s).bind(...a).run();
export const getS = async (e, scope, k) => (await one(e, 'SELECT v FROM settings WHERE scope=? AND k=?', scope, k))?.v ?? null;
export const setS = (e, scope, k, v) => run(e, 'INSERT INTO settings(scope,k,v) VALUES(?,?,?) ON CONFLICT(scope,k) DO UPDATE SET v=excluded.v', scope, k, String(v));
export const cfgOf = async (e, id) => Object.fromEntries((await all(e, 'SELECT k,v FROM settings WHERE scope=?', 'bot:' + id)).map((r) => [r.k, r.v]));
export const log = (e, type, msg) => run(e, 'INSERT INTO logs(type,msg,ts) VALUES(?,?,?)', type, String(msg).slice(0, 300), Date.now());
export const bump = (e, bot, k) => run(e, 'INSERT INTO stats(bot,k,n) VALUES(?,?,1) ON CONFLICT(bot,k) DO UPDATE SET n=n+1', bot, k);
export async function hashPw(pw, salt = rnd(8)) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const b = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 }, k, 256);
  return salt + ':' + hex(new Uint8Array(b));
}
export const checkPw = async (pw, h) => (await hashPw(pw, h.split(':')[0])) === h;
export const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', ...SEC } });
export const H = (html) => new Response(html, { headers: { 'content-type': 'text/html;charset=utf-8', ...SEC } });
export const cookie = (r, n) => (r.headers.get('cookie') || '').split('; ').find((c) => c.startsWith(n + '='))?.slice(n.length + 1);
export const session = async (e, r, n) => { const id = cookie(r, n); return id ? one(e, 'SELECT * FROM sessions WHERE id=? AND exp>?', id, Date.now()) : null; };
export const sameOrigin = (r) => r.headers.get('origin') === new URL(r.url).origin || r.headers.get('sec-fetch-site') === 'same-origin';
export async function newSession(e, kind, ref) {
  const id = rnd(24), csrf = rnd(12);
  await run(e, 'INSERT INTO sessions VALUES(?,?,?,?,?)', id, kind, String(ref), csrf, Date.now() + 8 * 3600e3);
  return { id, csrf };
}
export const ck = (n, id) => `${n}=${id}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`;
export const redirect = (to, cookieStr) => new Response(null, { status: 302, headers: { location: to, ...(cookieStr ? { 'set-cookie': cookieStr } : {}), ...SEC } });
