export const now = () => Math.floor(Date.now() / 1000);
export const all = async (e, s, ...p) => (await e.DB.prepare(s).bind(...p).all()).results;
export const one = (e, s, ...p) => e.DB.prepare(s).bind(...p).first();
export const run = (e, s, ...p) => e.DB.prepare(s).bind(...p).run();

export const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
export const rand = (n = 16) => hex(crypto.getRandomValues(new Uint8Array(n)));
const eq = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };

export async function hashPw(pw, salt = rand(16)) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const b = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, k, 256);
  return salt + ':' + hex(b);
}
export const checkPw = async (pw, stored) => eq(await hashPw(pw, stored.split(':')[0]), stored);

// settings: scope = 'global' | 'bot:<id>'
export async function getS(e, scope) {
  const o = {};
  for (const r of await all(e, 'SELECT k,v FROM settings WHERE scope=?', scope)) o[r.k] = r.v;
  return o;
}
export const setS = (e, scope, k, v) => run(e, 'INSERT INTO settings(scope,k,v) VALUES(?,?,?) ON CONFLICT(scope,k) DO UPDATE SET v=excluded.v', scope, k, String(v));
export const log = (e, kind, ref, msg) => run(e, 'INSERT INTO logs(at,kind,ref,msg) VALUES(?,?,?,?)', now(), kind, ref || null, String(msg).slice(0, 500)).catch(() => {});
export const incr = (e, bot, k) => run(e, 'INSERT INTO stats(bot_id,k,n) VALUES(?,?,1) ON CONFLICT(bot_id,k) DO UPDATE SET n=n+1', bot, k).catch(() => {});

// sessions: kind 'u' (user panel) | 'a' (main admin)
export async function newSession(e, kind, ref, ttl = 86400 * 7) {
  const id = rand(32), csrf = rand(16);
  await run(e, 'INSERT INTO sessions VALUES(?,?,?,?,?)', id, kind, ref, csrf, now() + ttl);
  return { id, csrf };
}
export const cookie = (kind, id, ttl = 604800) => `s_${kind}=${id}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${ttl}`;
export async function getSession(e, req, kind) {
  const m = new RegExp('(?:^|; )s_' + kind + '=([a-f0-9]+)').exec(req.headers.get('cookie') || '');
  if (!m) return null;
  return one(e, 'SELECT * FROM sessions WHERE id=? AND kind=? AND expires>?', m[1], kind, now());
}
export const json = (o, st = 200, h = {}) => new Response(JSON.stringify(o), { status: st, headers: { 'content-type': 'application/json', ...h } });
export const html = (s, st = 200, h = {}) => new Response(s, { status: st, headers: { 'content-type': 'text/html;charset=utf-8', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer', ...h } });
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
