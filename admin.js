import { all, one, run, now, getS, setS, log, hashPw, checkPw, newSession, getSession, cookie, json, html, esc } from './database.js';
import { tg, pumpBroadcast } from './telegram.js';
import { CLIENT_CSS, CLIENT_JS } from './panel.js';

const FORM = (title, extra, action) => html(`<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${CLIENT_CSS}</style></head><body><main style="max-width:380px;margin-top:60px"><h2>${title}</h2><form method="post" action="${action}">${extra}<button type="submit">Continue</button></form></main></body></html>`);
const SETUP = () => FORM('Create Main Admin', '<label>Username<input name="username" required></label><label>Password (min 8)<input name="password" type="password" minlength="8" required></label><label>Confirm Password<input name="confirm" type="password" required></label>', '/x/adme/setup');
const LOGIN = (err) => FORM('Main Admin Login' + (err ? ' — ' + esc(err) : ''), '<label>Username<input name="username" required></label><label>Password<input name="password" type="password" required></label>', '/x/adme/login');

const DASH = (csrf) => `<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Main Admin</title><style>${CLIENT_CSS}</style></head><body>
<header><b>👑 Main Admin</b><form method="post" action="/x/adme/logout" style="margin:0"><button class="t">Logout</button></form></header><nav id="nav"></nav><main id="main"></main><div id="toast"></div>
<script>const CSRF='${csrf}';const API='/api/a/';${CLIENT_JS}
let tab='dash';
const TABS=[['dash','📊 Dashboard'],['users','👥 Users'],['bots','🤖 User Bots'],['vip','⭐ VIP'],['join','🔗 Join'],['prov','🤖 AI Providers'],['models','🧠 AI Models'],['set','⚙️ Settings'],['bc','📢 Broadcast'],['logs','📋 Logs']];
const dt=t=>t?new Date(t*1000).toISOString().slice(0,16).replace('T',' '):'—';
const row=(txt,...btns)=>h('div',{class:'row'},h('span',{},txt),h('span',{},btns));
const btn=(t,fn,c)=>h('button',{class:c||'t',onclick:async()=>{try{await fn();load();}catch(e){toast(e.message)}}},t);
function form(fields,onsub,label){const f=h('form');fields.forEach(x=>f.append(inp(x)));f.append(h('button',{type:'submit'},label||'➕ Add'));f.onsubmit=async ev=>{ev.preventDefault();const b={};fields.forEach(x=>b[x[0]]=f.elements[x[0]].value);try{await onsub(b);load();}catch(e){toast(e.message)}};return f;}
async function view(){
 if(tab==='dash'){const r=await api('stats');return [h('div',{class:'grid'},Object.entries(r).map(e=>h('div',{class:'card'},h('small',{},e[0]),h('b',{},String(e[1])))))];}
 if(tab==='users'){const q=h('input',{placeholder:'Search: id / username / name'});q.value=window._q||'';q.onchange=()=>{window._q=q.value;load();};
  const r=await api('users?q='+encodeURIComponent(q.value));
  return [q,...r.users.map(u=>row('#'+u.id+' '+(u.first_name||'')+' '+(u.username?'@'+u.username:'')+' | tg:'+u.tg_id+' | bots:'+u.bots+' | VIP:'+(u.vip?'yes ('+u.bot_limit+')':'no')+(u.blocked?' | BLOCKED':'')+' | last '+dt(u.last_active),
   btn(u.blocked?'Unblock':'Block',()=>api('user/'+u.id,{op:u.blocked?'unblock':'block'}),'d'),
   btn(u.vip?'VIP off':'VIP on',()=>api('user/'+u.id,{op:'vip',on:!u.vip,n:u.vip?1:+(prompt('Bot limit',5)||5)})),
   btn('Limit',()=>api('user/'+u.id,{op:'limit',n:+prompt('Bot limit',u.bot_limit)})),
   btn('Expiry',()=>api('user/'+u.id,{op:'expiry',days:+prompt('VIP days from now (0 = never)',30)})),
   btn('✉️',()=>api('user/'+u.id,{op:'message',text:prompt('Message')||''}))))];}
 if(tab==='bots'){const r=await api('bots');return r.bots.map(b=>row('#'+b.id+' @'+b.username+' | owner '+(b.owner||b.owner_id)+' | group: '+(b.group_title||'—')+' | '+(b.status?'ON':'OFF')+' | webhook '+(b.webhook_ok?'ok':'no')+' | '+dt(b.created_at),
   btn(b.status?'Disable':'Enable',()=>api('bot/'+b.id,{op:b.status?'disable':'enable'}),b.status?'d':'t'),
   btn('Info',async()=>{const i=await api('botinfo/'+b.id);alert(JSON.stringify(i,null,1));})));}
 if(tab==='vip'){const r=await api('users?vip=1');return r.users.map(u=>row((u.username?'@'+u.username:u.first_name)+' | limit '+u.bot_limit+' | start '+dt(u.vip_start)+' | expiry '+dt(u.vip_expiry)));}
 if(tab==='join'){const r=await api('list/join_buttons');return [form([['label','Button text','text'],['url','URL','text']],b=>api('add/join_buttons',b)),...r.rows.map(x=>row(x.label+' → '+x.url+' ['+(x.enabled?'ON':'OFF')+']',btn('Toggle',()=>api('toggle/join_buttons',{id:x.id})),btn('🗑',()=>api('del/join_buttons',{id:x.id}),'d')))];}
 if(tab==='prov'){const r=await api('list/ai_providers');return [form([['name','Name','text'],['kind','Kind','sel:openrouter,gemini,custom'],['api_url','API URL (custom only)','text'],['api_key','API Key (optional)','pw']],b=>api('add/ai_providers',b)),...r.rows.map(x=>row('#'+x.id+' '+x.name+' ('+x.kind+') '+(x.api_url||'')+' key:'+(x.key_set?'set':'no')+' ['+(x.enabled?'ON':'OFF')+']',btn('Toggle',()=>api('toggle/ai_providers',{id:x.id})),btn('🗑',()=>api('del/ai_providers',{id:x.id}),'d')))];}
 if(tab==='models'){const r=await api('list/ai_models');return [form([['provider_id','Provider ID','num'],['model','Model id','text'],['priority','Priority (low = first)','num'],['free','Free?','sel:1,0']],b=>api('add/ai_models',b)),...r.rows.map(x=>row('['+x.priority+'] '+x.model+' | '+(x.pname||x.provider_id)+' | '+(x.free?'free':'paid')+' ['+(x.enabled?'ON':'OFF')+']',btn('Toggle',()=>api('toggle/ai_models',{id:x.id})),btn('Prio',()=>api('priority',{id:x.id,priority:+prompt('Priority',x.priority)})),btn('🗑',()=>api('del/ai_models',{id:x.id}),'d')))];}
 if(tab==='set'){const r=await api('settings');const f=h('form');[['main_welcome','Main Bot welcome text','area'],['botfather_text','Create Bot instructions text','area'],['admin_contact','Contact Admin URL (https://t.me/username)','text']].forEach(x=>f.append(inp(x,r.v[x[0]])));f.append(h('button',{type:'submit'},'💾 Save'));
  f.onsubmit=async ev=>{ev.preventDefault();const v={};['main_welcome','botfather_text','admin_contact'].forEach(k=>v[k]=f.elements[k].value);try{await api('settings',{v});toast('✅ Saved');}catch(e){toast(e.message)}};
  return [f,h('h3',{},'Main Bot'),h('p',{},'Username: '+(r.v.main_bot_username?'@'+r.v.main_bot_username:'—')),btn('🔗 Set Main Webhook',async()=>{const d=await api('mainwebhook',{});toast(d.msg);},'')];}
 if(tab==='bc'){const r=await api('broadcasts');return [form([['text','Message','area']],b=>api('broadcast',b),'📢 Send To All Users'),...r.rows.map(x=>row('#'+x.id+' '+dt(x.created_at)+' | total '+x.total+' | sent '+x.sent+' | failed '+x.failed+' | blocked '+x.blocked+' | pending '+x.pending+' — '+x.text.slice(0,60)))];}
 if(tab==='logs'){const r=await api('logs');return r.rows.map(x=>row(dt(x.at)+' ['+x.kind+'] '+(x.ref||'')+' '+x.msg));}
 return [];}
async function load(){const m=$('#main');$('#nav').replaceChildren(...TABS.map(t=>h('button',{class:t[0]===tab?'on':'t',onclick:()=>{tab=t[0];load();}},t[1])));try{m.replaceChildren(...await view());}catch(e){m.textContent='⚠️ '+e.message;}}
load();
</script></body></html>`;

const RES = { join_buttons: ['label', 'url'], ai_providers: ['name', 'kind', 'api_url', 'api_key'], ai_models: ['provider_id', 'model', 'priority', 'free'] };
const GSET = ['main_welcome', 'botfather_text', 'admin_contact'];

export async function admin(env, req, url) {
  const p = url.pathname, post = req.method === 'POST';
  if (post && req.headers.get('origin') !== url.origin) return json({ error: 'csrf' }, 403);

  if (p === '/x/adme') {
    if (!(await one(env, 'SELECT id FROM admins LIMIT 1'))) return SETUP();
    const s = await getSession(env, req, 'a');
    return s ? html(DASH(s.csrf)) : LOGIN();
  }
  if (p === '/x/adme/setup' && post) {
    if (await one(env, 'SELECT id FROM admins LIMIT 1')) return new Response('Main Admin already exists', { status: 403 });
    const f = await req.formData(), u = String(f.get('username') || '').trim(), pw = String(f.get('password') || '');
    if (!u || pw.length < 8 || pw !== f.get('confirm')) return new Response('Invalid input (password min 8, must match)', { status: 400 });
    try { await run(env, 'INSERT INTO admins(id,username,pass_hash,created_at) VALUES(1,?,?,?)', u, await hashPw(pw), now()); }
    catch { return new Response('Main Admin already exists', { status: 403 }); }
    log(env, 'admin', 1, 'Main admin created');
    return new Response(null, { status: 302, headers: { location: '/x/adme' } });
  }
  if (p === '/x/adme/login' && post) {
    const ip = req.headers.get('cf-connecting-ip') || '?';
    const fails = await one(env, "SELECT COUNT(*) n FROM logs WHERE kind='login_fail' AND msg=? AND at>?", ip, now() - 600);
    if (fails.n >= 5) return LOGIN('Too many attempts, wait 10 minutes');
    const f = await req.formData();
    const a = await one(env, 'SELECT * FROM admins WHERE username=?', String(f.get('username') || ''));
    if (!a || !(await checkPw(String(f.get('password') || ''), a.pass_hash))) { log(env, 'login_fail', null, ip); return LOGIN('Wrong credentials'); }
    const s = await newSession(env, 'a', a.id, 3600 * 8);
    log(env, 'login', a.id, 'Admin login ' + ip);
    return new Response(null, { status: 302, headers: { location: '/x/adme', 'set-cookie': cookie('a', s.id, 3600 * 8) } });
  }
  if (p === '/x/adme/logout' && post) {
    const s = await getSession(env, req, 'a');
    if (s) await run(env, 'DELETE FROM sessions WHERE id=?', s.id);
    return new Response(null, { status: 302, headers: { location: '/x/adme', 'set-cookie': cookie('a', 'x', 0) } });
  }
  if (p.startsWith('/api/a/')) return api(env, req, url, post);
  return new Response('Not found', { status: 404 });
}

async function api(env, req, url, post) {
  const s = await getSession(env, req, 'a');
  if (!s) return json({ error: 'auth' }, 401);
  if (post && req.headers.get('x-csrf') !== s.csrf) return json({ error: 'csrf' }, 403);
  const P = url.pathname.split('/').slice(3), a = P[0];
  const b = post ? await req.json().catch(() => ({})) : {};
  const T = env.MAIN_BOT_TOKEN;

  if (a === 'stats') {
    const c = async q => (await one(env, q)).n;
    return json({
      Users: await c('SELECT COUNT(*) n FROM users'), 'User Bots': await c('SELECT COUNT(*) n FROM bots'),
      'Connected Groups': await c('SELECT COUNT(*) n FROM bots WHERE group_chat_id IS NOT NULL'), VIP: await c('SELECT COUNT(*) n FROM users WHERE vip=1'),
      Blocked: await c('SELECT COUNT(*) n FROM users WHERE blocked=1'), 'Verified contacts': await c('SELECT COUNT(*) n FROM users WHERE phone IS NOT NULL'),
      'AI requests': await c('SELECT COUNT(*) n FROM ai_usage'), 'Pending broadcast': await c('SELECT COUNT(*) n FROM bq WHERE st=0'),
    });
  }
  if (a === 'users') {
    const q = url.searchParams.get('q') || '', vip = url.searchParams.get('vip') === '1', like = '%' + q + '%';
    const rows = await all(env, `SELECT u.*,(SELECT COUNT(*) FROM bots WHERE owner_id=u.id) bots FROM users u WHERE (?1='' OR username LIKE ?2 OR first_name LIKE ?2 OR CAST(tg_id AS TEXT)=?1) ${vip ? 'AND vip=1' : ''} ORDER BY id DESC LIMIT 100`, q, like);
    return json({ users: rows.map(({ phone, state, ...u }) => u) });
  }
  if (a === 'user' && post) {
    const u = await one(env, 'SELECT * FROM users WHERE id=?', +P[1]);
    if (!u) return json({ error: 'not found' }, 404);
    const n = Math.max(1, Math.floor(+b.n || 1));
    if (b.op === 'block') await run(env, 'UPDATE users SET blocked=1 WHERE id=?', u.id);
    else if (b.op === 'unblock') await run(env, 'UPDATE users SET blocked=0 WHERE id=?', u.id);
    else if (b.op === 'vip') await (b.on ? run(env, 'UPDATE users SET vip=1,vip_start=?,bot_limit=? WHERE id=?', now(), n, u.id) : run(env, 'UPDATE users SET vip=0,bot_limit=1,vip_expiry=NULL WHERE id=?', u.id));
    else if (b.op === 'limit') await run(env, 'UPDATE users SET bot_limit=? WHERE id=?', n, u.id);
    else if (b.op === 'expiry') await run(env, 'UPDATE users SET vip_expiry=? WHERE id=?', +b.days > 0 ? now() + Math.floor(+b.days) * 86400 : null, u.id);
    else if (b.op === 'message') {
      if (!u.chat_id || !String(b.text || '').trim()) return json({ error: 'No chat or empty text' }, 400);
      const r = await tg(T, 'sendMessage', { chat_id: u.chat_id, text: String(b.text) });
      if (!r.ok) return json({ error: r.description }, 400);
    } else return json({ error: 'bad op' }, 400);
    log(env, 'admin', u.id, 'user op ' + b.op);
    return json({ ok: true });
  }
  if (a === 'bots') return json({ bots: await all(env, 'SELECT b.id,b.username,b.status,b.webhook_ok,b.group_title,b.created_at,b.owner_id,u.username owner FROM bots b LEFT JOIN users u ON u.id=b.owner_id ORDER BY b.id DESC LIMIT 200') });
  if (a === 'bot' && post) {
    const bot = await one(env, 'SELECT * FROM bots WHERE id=?', +P[1]);
    if (!bot) return json({ error: 'not found' }, 404);
    await run(env, 'UPDATE bots SET status=? WHERE id=?', b.op === 'enable' ? 1 : 0, bot.id);
    log(env, 'admin', bot.id, 'bot ' + b.op);
    return json({ ok: true });
  }
  if (a === 'botinfo') {
    const bot = await one(env, 'SELECT * FROM bots WHERE id=?', +P[1]);
    if (!bot) return json({ error: 'not found' }, 404);
    const w = await tg(bot.token, 'getWebhookInfo'), S = await getS(env, 'bot:' + bot.id);
    return json({ bot: bot.username, group: bot.group_title, webhook: w.result && { url_set: !!w.result.url, pending: w.result.pending_update_count, last_error: w.result.last_error_message }, ai: S.ai_on === '1' ? 'on (' + (S.ai_kind || '') + ')' : 'off', moderation: { url: S.mod_url, bad: S.mod_bad, flood: S.mod_flood, dup: S.mod_dup }, cooldown: S.cooldown_s || 0 });
  }
  if (a === 'list') {
    const t = P[1];
    if (!RES[t]) return json({ error: 'bad' }, 404);
    if (t === 'ai_providers') return json({ rows: await all(env, "SELECT id,name,kind,api_url,enabled,(api_key IS NOT NULL AND api_key!='') key_set FROM ai_providers ORDER BY id") });
    if (t === 'ai_models') return json({ rows: await all(env, 'SELECT m.*,p.name pname FROM ai_models m LEFT JOIN ai_providers p ON p.id=m.provider_id ORDER BY m.priority,m.id') });
    return json({ rows: await all(env, `SELECT * FROM ${t} ORDER BY id`) });
  }
  if (a === 'add' && post) {
    const t = P[1], f = RES[t];
    if (!f) return json({ error: 'bad' }, 404);
    let v = f.map(k => String(b[k] ?? '').trim());
    if (t === 'join_buttons' && (!v[0] || !/^https?:\/\//.test(v[1]))) return json({ error: 'Label/URL সঠিক নয়' }, 400);
    if (t === 'ai_providers') { if (!v[0] || !['openrouter', 'gemini', 'custom'].includes(v[1])) return json({ error: 'Name/Kind সঠিক নয়' }, 400); }
    if (t === 'ai_models') { v = [Math.floor(+v[0]), v[1], Math.floor(+v[2]) || 10, +v[3] ? 1 : 0]; if (!(await one(env, 'SELECT id FROM ai_providers WHERE id=?', v[0])) || !v[1]) return json({ error: 'Provider ID/Model সঠিক নয়' }, 400); }
    await run(env, `INSERT INTO ${t}(${f.join(',')}) VALUES(${f.map(() => '?').join(',')})`, ...v);
    return json({ ok: true });
  }
  if (a === 'toggle' && post) {
    if (!RES[P[1]]) return json({ error: 'bad' }, 404);
    await run(env, `UPDATE ${P[1]} SET enabled=1-enabled WHERE id=?`, +b.id);
    return json({ ok: true });
  }
  if (a === 'del' && post) {
    if (!RES[P[1]]) return json({ error: 'bad' }, 404);
    await run(env, `DELETE FROM ${P[1]} WHERE id=?`, +b.id);
    if (P[1] === 'ai_providers') await run(env, 'DELETE FROM ai_models WHERE provider_id=?', +b.id);
    return json({ ok: true });
  }
  if (a === 'priority' && post) { await run(env, 'UPDATE ai_models SET priority=? WHERE id=?', Math.floor(+b.priority) || 10, +b.id); return json({ ok: true }); }
  if (a === 'settings') {
    if (!post) { const S = await getS(env, 'global'); return json({ v: S }); }
    for (const k of GSET) if (k in (b.v || {})) {
      const val = String(b.v[k]).slice(0, 4000);
      if (k === 'admin_contact' && val && !/^https?:\/\//.test(val)) return json({ error: 'Contact must be a https:// link' }, 400);
      await setS(env, 'global', k, val);
    }
    log(env, 'admin', 1, 'Global settings updated');
    return json({ ok: true });
  }
  if (a === 'mainwebhook' && post) {
    if (!T || !env.WEBHOOK_SECRET) return json({ msg: 'Set MAIN_BOT_TOKEN and WEBHOOK_SECRET secrets first' });
    const me = await tg(T, 'getMe');
    if (!me.ok) return json({ msg: 'Main bot token invalid' });
    const w = await tg(T, 'setWebhook', { url: url.origin + '/tg/main', secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message', 'callback_query'] });
    if (w.ok) await setS(env, 'global', 'main_bot_username', me.result.username);
    log(env, 'webhook', null, 'Main webhook ' + (w.ok ? 'set' : w.description));
    return json({ msg: w.ok ? '✅ Webhook set for @' + me.result.username : '❌ ' + w.description });
  }
  if (a === 'broadcasts') return json({ rows: await all(env, `SELECT b.id,b.text,b.created_at,
    (SELECT COUNT(*) FROM bq WHERE bid=b.id) total,(SELECT COUNT(*) FROM bq WHERE bid=b.id AND st=1) sent,(SELECT COUNT(*) FROM bq WHERE bid=b.id AND st=2) failed,
    (SELECT COUNT(*) FROM bq WHERE bid=b.id AND st=3) blocked,(SELECT COUNT(*) FROM bq WHERE bid=b.id AND st=0) pending FROM broadcasts b ORDER BY b.id DESC LIMIT 30`) });
  if (a === 'broadcast' && post) {
    const text = String(b.text || '').trim();
    if (!text) return json({ error: 'Message দিন' }, 400);
    const r = await run(env, 'INSERT INTO broadcasts(text,created_at) VALUES(?,?)', text, now());
    await run(env, 'INSERT INTO bq(bid,chat_id) SELECT ?,chat_id FROM users WHERE chat_id IS NOT NULL AND blocked=0', r.meta.last_row_id);
    log(env, 'broadcast', r.meta.last_row_id, 'Broadcast queued');
    await pumpBroadcast(env, 20); // rest is sent by cron in rate-limited batches
    return json({ ok: true });
  }
  if (a === 'logs') return json({ rows: await all(env, 'SELECT * FROM logs ORDER BY id DESC LIMIT 200') });
  return json({ error: 'not found' }, 404);
}
