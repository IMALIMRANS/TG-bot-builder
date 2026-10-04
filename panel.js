import { all, one, run, now, getS, setS, log, newSession, getSession, cookie, json, html, sameOrigin } from './database.js';
import { tg, botAccess, connectGroup, detectAI } from './telegram.js';

// ---- shared client helpers (also used by admin.js). No backticks / dollar-braces inside! ----
export const CLIENT_CSS = `
:root{--bg:#0b1220;--card:#131c2e;--bd:#22304a;--tx:#e8eefc;--mut:#8b9ab8;--pri:#5b8cff;--ok:#22c55e;--bad:#ef4444}
@media(prefers-color-scheme:light){:root{--bg:#f3f6fb;--card:#fff;--bd:#dbe3f0;--tx:#142033;--mut:#62728f}}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{font:15px/1.45 system-ui,sans-serif;margin:0;background:var(--bg);color:var(--tx);padding-top:env(safe-area-inset-top);padding-bottom:calc(78px + env(safe-area-inset-bottom))}
header{padding:16px;display:flex;gap:10px;align-items:center;background:linear-gradient(135deg,#4f6df5,#8b5cf6);color:#fff;border-radius:0 0 22px 22px;box-shadow:0 6px 24px rgba(79,109,245,.3)}
header b{flex:1;font-size:17px}header form{margin:0;padding:0;border:0;background:none}
header select{width:auto;margin:0;background:rgba(255,255,255,.2);color:#fff;border:0}header select option{color:#000}
nav{position:fixed;bottom:0;left:0;right:0;display:flex;gap:2px;overflow-x:auto;padding:6px 8px calc(6px + env(safe-area-inset-bottom));background:var(--card);border-top:1px solid var(--bd);z-index:5}
nav button{background:none;color:var(--mut);display:flex;flex-direction:column;align-items:center;gap:2px;min-width:70px;padding:6px 4px;font-size:11px;font-weight:500;white-space:nowrap}
nav button i{font-style:normal;font-size:21px}nav button.on{color:var(--pri);background:rgba(91,140,255,.14)}
main{padding:16px;max-width:720px;margin:auto}h2{text-align:center}h3{margin:20px 0 8px;font-size:16px}small,p{color:var(--mut)}
button{background:var(--pri);color:#fff;border:0;border-radius:12px;padding:10px 14px;font-size:14px;font-weight:600;cursor:pointer;transition:.15s}
button:active{transform:scale(.96)}button.t{background:rgba(127,140,170,.2);color:var(--tx)}button.d{background:rgba(239,68,68,.15);color:var(--bad)}
input,select,textarea{width:100%;padding:11px 12px;margin:5px 0 12px;border-radius:12px;border:1px solid var(--bd);background:var(--bg);color:var(--tx);font:inherit}
input:focus,select:focus,textarea:focus{outline:2px solid var(--pri)}
label{display:block;font-size:13px;color:var(--mut);font-weight:600}
form{background:var(--card);border:1px solid var(--bd);border-radius:16px;padding:14px;margin:8px 0}
label:has(.tg){display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0 10px;margin:0}
.tg{width:48px;height:28px;min-width:48px;padding:0;border-radius:99px;background:#64748b;position:relative}
.tg:after{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:.2s}
.tg.on{background:var(--ok)}.tg.on:after{left:23px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.card,.row{background:var(--card);border:1px solid var(--bd);border-radius:16px;padding:14px;margin:8px 0}
.card small{display:block}.card b{display:block;font-size:22px;margin-top:4px;word-break:break-word}
.row{display:flex;justify-content:space-between;gap:10px;align-items:center;word-break:break-word}.row>span:first-child{flex:1;min-width:0}
.acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.acts button{padding:7px 10px;font-size:13px}
.empty{text-align:center;color:var(--mut);padding:26px}
.sk{height:74px;border-radius:16px;margin:8px 0;background:linear-gradient(90deg,var(--card),var(--bd),var(--card));background-size:200% 100%;animation:sk 1.2s infinite}@keyframes sk{to{background-position:-200% 0}}
#toast{position:fixed;bottom:96px;left:50%;transform:translateX(-50%);background:#1f2937;color:#fff;padding:11px 18px;border-radius:99px;display:none;z-index:9;max-width:90%;box-shadow:0 6px 20px rgba(0,0,0,.35)}
`;
export const CLIENT_JS = `
const $=s=>document.querySelector(s);
const h=(t,a={},...c)=>{const e=document.createElement(t);for(const k in a){if(k.slice(0,2)==='on')e[k]=a[k];else e.setAttribute(k,a[k]);}for(const x of c.flat())e.append(x&&x.nodeType?x:document.createTextNode(x==null?'':x));return e;};
const api=async(p,b)=>{const r=await fetch(API+p,b===undefined?{}:{method:'POST',headers:{'content-type':'application/json','x-csrf':CSRF},body:JSON.stringify(b)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j;};
const toast=t=>{const e=$('#toast');e.textContent=t;e.style.display='block';setTimeout(()=>e.style.display='none',2500);};
const SW=[['1','ON'],['0','OFF']];
function inp(f,val){const k=f[0],l=f[1],t=f[2];let e;
 if(t==='area')e=h('textarea',{rows:3});
 else if(t==='sw'){e=h('button',{type:'button',class:'tg'});e.value='0';e.onclick=()=>{e.value=e.value==='1'?'0':'1';e.className='tg'+(e.value==='1'?' on':'');};}
 else if(t.slice(0,4)==='sel:'){e=h('select',{},t.slice(4).split(',').map(x=>h('option',{value:x},x)));}
 else if(t==='dt')e=h('input',{type:'datetime-local'});
 else e=h('input',{type:t==='pw'?'password':t==='num'?'number':'text'});
 e.name=k;if(val!=null&&val!=='')e.value=val;if(t==='sw')e.className='tg'+(e.value==='1'?' on':'');return h('label',{},l,e);}
`;

const PAGE = (csrf) => `<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Control Panel</title><style>${CLIENT_CSS}</style></head><body>
<header><b>🤖 Control Panel</b><select id="bots" style="width:auto;margin:0"></select></header><nav id="nav"></nav><main id="main"></main><div id="toast"></div>
<script>const CSRF='${csrf}';const API='/api/p/';${CLIENT_JS}
let cur=null,tab='overview',tz=360;
const TABS=[['overview','📊 Dashboard'],['group','👥 Group'],['commands','⌨️ Commands'],['auto_replies','💬 Auto Reply'],['ai','🤖 AI'],['moderation','🛡️ Moderation'],['welcome','👋 Welcome'],['scheduled_posts','📢 Auto Post'],['pin','📌 Pin'],['buttons','🔘 Buttons'],['bot_admins','👑 Admins'],['general','⚙️ Settings']];
const ACT='sel:delete,warn,delete_warn,restrict';
const SETF={
welcome:[['welcome_on','Welcome','sw'],['welcome_text','Text ({name} {username} {user_id} {group_name})','area']],
moderation:[['mod_url','URL Protection','sw'],['act_url','URL action',ACT],['mod_bad','Bad Word Filter','sw'],['act_bad','Bad word action',ACT],['mod_flood','Flood Protection','sw'],['flood_n','Max messages','num'],['flood_s','Within seconds','num'],['act_flood','Flood action',ACT],['mod_dup','Duplicate Protection','sw'],['act_dup','Duplicate action',ACT],['warn_limit','Warning limit','num'],['mute_min','Mute minutes','num']],
ai:[['ai_on','AI','sw'],['ai_kind','Provider','sel:openrouter,gemini,custom'],['ai_key','API Key','pw'],['ai_url','Custom API URL (https)','text'],['ai_model','Model','text'],['ai_prompt','System Prompt','area'],['ai_knowledge','Knowledge (Rules, FAQ, Admin info, Website...)','area'],['ai_fallback','Fallback message','area']],
general:[['tz_offset','Timezone offset in minutes (Dhaka=360)','num'],['cooldown_s','Message cooldown seconds (0=off, min 30)','num']]};
const LISTF={commands:[['cmd','Command (e.g. rules)','text'],['response','Response','area']],auto_replies:[['trig','Trigger','text'],['mode','Match','sel:contains,exact,ci'],['reply','Reply','area']],bad_words:[['word','Bad word','text']],scheduled_posts:[['text','Message','area'],['next_run','Date & Time','dt'],['rep','Repeat','sel:once,daily,weekly,custom'],['interval_min','Custom repeat (minutes)','num']],buttons:[['scope','Used in','sel:welcome,command,post'],['label','Button text','text'],['url','URL','text']],bot_admins:[['username','@username','text'],['perms','Permissions','text']]};
const fmt=v=>new Date((v+tz*60)*1000).toISOString().slice(0,16).replace('T',' ');

async function setForm(g){const r=await api(cur+'/settings/'+g);if(g==='welcome'&&!r.v.welcome_on)r.v.welcome_on='1';const f=h('form');
 SETF[g].forEach(x=>f.append(inp(x,r.v[x[0]])));
 if(g==='ai'){if(r.key_set)f.elements.ai_key.placeholder='saved (leave blank to keep)';
  f.append(h('button',{type:'button',class:'t',onclick:async()=>{try{const d=await api(cur+'/detect',{key:f.elements.ai_key.value});f.elements.ai_kind.value=d.kind;toast('Detected: '+d.kind+(d.models.length?' | free models: '+d.models.slice(0,8).join(', '):''));}catch(e){toast(e.message)}}},'🔎 Detect'),' ');}
 f.append(h('button',{type:'submit'},'💾 Save'));
 f.onsubmit=async ev=>{ev.preventDefault();const v={};SETF[g].forEach(x=>v[x[0]]=f.elements[x[0]].value);try{await api(cur+'/settings/'+g,{v});toast('✅ Saved');}catch(e){toast(e.message)}};
 return f;}

async function listUI(res){const r=await api(cur+'/list/'+res);const box=h('div');const F=LISTF[res];const f=h('form');
 F.forEach(x=>f.append(inp(x)));f.append(h('button',{type:'submit'},'➕ Add'));
 f.onsubmit=async ev=>{ev.preventDefault();const b={};F.forEach(x=>{let v=f.elements[x[0]].value;if(x[2]==='dt')v=v?Math.floor(Date.parse(v+':00Z')/1000)-tz*60:0;b[x[0]]=v;});try{await api(cur+'/add/'+res,b);load();}catch(e){toast(e.message)}};
 box.append(f);
 if(!r.rows.length)box.append(h('div',{class:'empty'},'এখনো কিছু নেই — উপরে যোগ করুন'));
 r.rows.forEach(w=>box.append(h('div',{class:'row'},h('span',{},F.map(x=>x[2]==='dt'?fmt(w[x[0]]):w[x[0]]).filter(x=>x!=null&&x!=='').join(' · ')),h('button',{class:'d',onclick:async()=>{if(confirm('Delete?')){await api(cur+'/del/'+res,{id:w.id});load();}}},'🗑'))));
 return box;}

async function view(){
 if(tab==='overview'){const r=await api(cur+'/overview');
  const C=[['🤖 Bot','@'+r.bot.username],['👥 Group',r.group||'—'],['👤 Members',r.members==null?'—':r.members],['💬 Messages',r.s.messages||0],['🗑️ Deleted',r.s.deleted||0],['⚠️ Warnings',r.s.warnings||0],['🤖 AI Replies',r.s.ai||0],['📢 Auto Posts',r.s.posts||0],['⚡ Commands',r.s.commands||0]];
  return [h('div',{class:'grid'},C.map(c=>h('div',{class:'card'},h('small',{},c[0]),h('b',{},String(c[1]))))),h('p',{},'Webhook: '+(r.bot.webhook_ok?'✅':'❌')+(r.bot.status?'':' | ⛔ Bot disabled by admin'))];}
 if(tab==='group'){const r=await api(cur+'/overview');const f=h('form',{},inp(['group','Group username / link (@mygroup)','text']),h('button',{type:'submit'},'🔗 Connect Group'));
  f.onsubmit=async ev=>{ev.preventDefault();try{const d=await api(cur+'/group',{group:f.elements.group.value});toast('✅ '+d.title+' | Members: '+d.members);load();}catch(e){toast(e.message)}};
  return [h('p',{},r.group?'✅ Connected: '+r.group:'No group connected'),h('small',{},'Bot must be Admin with Delete, Restrict, Pin permissions.'),f];}
 if(tab==='commands')return [h('h3',{},'⌨️ Commands'),await listUI('commands')];
 if(tab==='auto_replies')return [h('h3',{},'💬 Auto Reply'),await listUI('auto_replies')];
 if(tab==='ai')return [h('h3',{},'🤖 AI'),await setForm('ai')];
 if(tab==='moderation')return [h('h3',{},'🛡️ Moderation'),await setForm('moderation'),h('h3',{},'Bad words'),await listUI('bad_words')];
 if(tab==='welcome')return [h('h3',{},'👋 Welcome'),await setForm('welcome')];
 if(tab==='scheduled_posts')return [h('h3',{},'📢 Auto Post (time = your timezone setting)'),await listUI('scheduled_posts')];
 if(tab==='buttons')return [h('h3',{},'🔘 Buttons'),await listUI('buttons')];
 if(tab==='bot_admins')return [h('h3',{},'👑 Bot Admins'),h('small',{},'perms: commands,ai,moderation,autopost,settings'),await listUI('bot_admins')];
 if(tab==='general')return [h('h3',{},'⚙️ Settings'),await setForm('general'),h('h3',{},'Warnings'),(()=>{const f=h('form',{},inp(['tg_id','User Telegram ID','num']),h('button',{class:'t',type:'submit'},'Reset warnings'));f.onsubmit=async ev=>{ev.preventDefault();try{await api(cur+'/warnreset',{tg_id:f.elements.tg_id.value});toast('✅ Reset');}catch(e){toast(e.message)}};return f;})(),h('h3',{},'Danger'),h('button',{class:'d',onclick:async()=>{if(confirm('Delete this bot and all its data?')){await api(cur+'/delete',{});location.reload();}}},'🗑 Delete Bot')];
 if(tab==='pin'){const f=h('form',{},inp(['text','Message to send & pin','area']),h('button',{type:'submit'},'📌 Send & Pin'),' ',h('button',{type:'button',class:'t',onclick:async()=>{try{await api(cur+'/pin',{unpin:true});toast('✅ Unpinned all');}catch(e){toast(e.message)}}},'Unpin all'));
  f.onsubmit=async ev=>{ev.preventDefault();try{await api(cur+'/pin',{text:f.elements.text.value});toast('✅ Pinned');}catch(e){toast(e.message)}};return [h('h3',{},'📌 Pin'),f];}
 return [];}
async function load(){const m=$('#main');if(!cur){m.textContent='কোনো Bot নেই। Telegram-এ Main Bot থেকে Create Bot করুন।';return;}
 $('#nav').replaceChildren(...TABS.map(t=>h('button',{class:t[0]===tab?'on':'',onclick:()=>{tab=t[0];load();}},h('i',{},t[1].split(' ')[0]),h('span',{},t[1].split(' ').slice(1).join(' ')))));
 m.replaceChildren(h('div',{class:'sk'}),h('div',{class:'sk'}));try{const g=await api(cur+'/settings/general');tz=+(g.v.tz_offset||360);m.replaceChildren(...await view());}catch(e){m.textContent='⚠️ '+e.message;}}
(async()=>{try{const r=await api('bots');const s=$('#bots');r.bots.forEach(b=>s.append(h('option',{value:b.id},'@'+b.username)));cur=r.bots.length?r.bots[0].id:null;s.onchange=()=>{cur=s.value;load();};load();}catch(e){$('#main').textContent='Session expired. Telegram Bot-এ /start দিয়ে Open চাপুন।';}})();
</script></body></html>`;

// ---- server ----
const SET = {
  welcome: ['welcome_on', 'welcome_text'],
  moderation: ['mod_url', 'act_url', 'mod_bad', 'act_bad', 'mod_flood', 'flood_n', 'flood_s', 'act_flood', 'mod_dup', 'act_dup', 'warn_limit', 'mute_min'],
  ai: ['ai_on', 'ai_kind', 'ai_key', 'ai_url', 'ai_model', 'ai_prompt', 'ai_knowledge', 'ai_fallback'],
  general: ['tz_offset', 'cooldown_s'],
};
const PERM = { welcome: 'settings', general: 'settings', moderation: 'moderation', ai: 'ai' };
const RES = {
  commands: { f: ['cmd', 'response'], p: 'commands' },
  auto_replies: { f: ['trig', 'mode', 'reply'], p: 'commands' },
  bad_words: { f: ['word'], p: 'moderation' },
  scheduled_posts: { f: ['text', 'next_run', 'rep', 'interval_min'], p: 'autopost' },
  buttons: { f: ['scope', 'label', 'url'], p: 'settings' },
  bot_admins: { f: ['username', 'perms'], p: 'owner' },
};
const PERMS = ['commands', 'ai', 'moderation', 'autopost', 'settings'];

export async function panel(env, req, url) {
  const p = url.pathname;
  if (p === '/p/login') {
    const t = url.searchParams.get('t') || '';
    const r = await one(env, 'SELECT * FROM login_tokens WHERE token=? AND expires>?', t, now());
    if (!r) return html('Link expired. Telegram Bot-এ আবার /start দিয়ে Open চাপুন।', 401);
    await run(env, 'DELETE FROM login_tokens WHERE token=?', t);
    const s = await newSession(env, 'u', r.user_id);
    return new Response(null, { status: 302, headers: { location: '/p', 'set-cookie': cookie('u', s.id) } });
  }
  if (p === '/p') {
    const s = await getSession(env, req, 'u');
    if (!s) return html('Telegram Bot-এ /start দিয়ে Open চাপুন।', 401);
    return html(PAGE(s.csrf));
  }
  return api(env, req, url);
}

async function api(env, req, url) {
  const s = await getSession(env, req, 'u');
  if (!s) return json({ error: 'auth' }, 401);
  const post = req.method === 'POST';
  if (post && (req.headers.get('x-csrf') !== s.csrf || !sameOrigin(req, url))) return json({ error: 'csrf' }, 403);
  const user = await one(env, 'SELECT * FROM users WHERE id=?', s.ref);
  if (!user || user.blocked) return json({ error: 'blocked' }, 403);
  const P = url.pathname.split('/').slice(3);
  const body = post ? await req.json().catch(() => ({})) : {};

  if (P[0] === 'bots') {
    const rows = await all(env, 'SELECT id,name,username,group_title,status,webhook_ok,owner_id FROM bots WHERE owner_id=? OR id IN (SELECT bot_id FROM bot_admins WHERE tg_id=? OR lower(username)=lower(?))', user.id, user.tg_id, user.username || '');
    return json({ bots: rows });
  }
  const bot = await one(env, 'SELECT * FROM bots WHERE id=?', +P[0]);
  if (!bot) return json({ error: 'not found' }, 404);
  const acc = await botAccess(env, bot, user);
  if (!acc) return json({ error: 'forbidden' }, 403);
  const can = x => acc === 'all' || acc.includes(x);
  if (post && !bot.status) return json({ error: 'Bot disabled by admin' }, 403);
  const scope = 'bot:' + bot.id, a = P[1];

  if (a === 'overview') {
    const st = {};
    for (const r of await all(env, 'SELECT k,n FROM stats WHERE bot_id=?', bot.id)) st[r.k] = r.n;
    let members = null;
    if (bot.group_chat_id) { const c = await tg(bot.token, 'getChatMemberCount', { chat_id: bot.group_chat_id }); if (c.ok) members = c.result; }
    return json({ bot: { username: bot.username, status: bot.status, webhook_ok: bot.webhook_ok }, group: bot.group_title, members, s: st });
  }
  if (a === 'settings') {
    const g = P[2];
    if (!SET[g]) return json({ error: 'bad group' }, 404);
    if (!post) {
      const S = await getS(env, scope), v = {};
      SET[g].forEach(k => (v[k] = S[k] ?? ''));
      const key_set = !!S.ai_key;
      if (g === 'ai') v.ai_key = ''; // never expose API key
      return json({ v, key_set });
    }
    if (!can(PERM[g])) return json({ error: 'no permission' }, 403);
    for (const k of SET[g]) {
      if (!(k in (body.v || {}))) continue;
      let val = String(body.v[k]).slice(0, 4000);
      if (k === 'ai_key' && !val) continue;
      if (k === 'ai_url' && val && !/^https:\/\//.test(val)) return json({ error: 'API URL must start with https://' }, 400);
      if (k === 'cooldown_s' && +val > 0 && +val < 30) val = '30';
      await setS(env, scope, k, val);
    }
    return json({ ok: true });
  }
  if (a === 'list') {
    const R = RES[P[2]];
    if (!R) return json({ error: 'bad' }, 404);
    return json({ rows: await all(env, `SELECT * FROM ${P[2]} WHERE bot_id=? ORDER BY id DESC LIMIT 200`, bot.id) });
  }
  if (a === 'add') {
    const name = P[2], R = RES[name];
    if (!R) return json({ error: 'bad' }, 404);
    if (R.p === 'owner' ? acc !== 'all' : !can(R.p)) return json({ error: 'no permission' }, 403);
    const v = R.f.map(k => String(body[k] ?? '').trim());
    const bad = m => json({ error: m }, 400);
    if (name === 'commands') {
      v[0] = v[0].replace(/^\//, '').toLowerCase();
      if (!/^\w{1,32}$/.test(v[0]) || !v[1]) return bad('Command/Response সঠিক নয়');
    } else if (name === 'auto_replies') {
      if (!v[0] || !v[2] || !['contains', 'exact', 'ci'].includes(v[1])) return bad('Trigger/Reply সঠিক নয়');
    } else if (name === 'bad_words') {
      v[0] = v[0].toLowerCase(); if (!v[0]) return bad('Word দিন');
    } else if (name === 'scheduled_posts') {
      v[1] = Math.floor(+v[1]); v[3] = Math.max(1, Math.floor(+v[3] || 60));
      if (!v[0] || !(v[1] > 0) || !['once', 'daily', 'weekly', 'custom'].includes(v[2])) return bad('Message/Date/Repeat সঠিক নয়');
    } else if (name === 'buttons') {
      if (!['welcome', 'command', 'post'].includes(v[0]) || !v[1] || !/^https?:\/\//.test(v[2])) return bad('Button সঠিক নয়');
    } else if (name === 'bot_admins') {
      v[0] = v[0].replace(/^@/, '');
      if (!/^\w{3,32}$/.test(v[0])) return bad('Username সঠিক নয়');
      v[1] = (v[1] ? v[1].split(',').map(x => x.trim()).filter(x => PERMS.includes(x)) : PERMS).join(',');
    }
    const cols = ['bot_id', ...R.f];
    await run(env, `INSERT INTO ${name}(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`, bot.id, ...v);
    return json({ ok: true });
  }
  if (a === 'del') {
    const R = RES[P[2]];
    if (!R) return json({ error: 'bad' }, 404);
    if (R.p === 'owner' ? acc !== 'all' : !can(R.p)) return json({ error: 'no permission' }, 403);
    await run(env, `DELETE FROM ${P[2]} WHERE id=? AND bot_id=?`, +body.id, bot.id);
    return json({ ok: true });
  }
  if (a === 'group') {
    if (!can('settings')) return json({ error: 'no permission' }, 403);
    const r = await connectGroup(env, bot, body.group);
    return r.ok ? json(r) : json({ error: r.error }, 400);
  }
  if (a === 'pin') {
    if (!can('settings') || !bot.group_chat_id) return json({ error: 'no permission / group not connected' }, 403);
    if (body.unpin) {
      const r = await tg(bot.token, 'unpinAllChatMessages', { chat_id: bot.group_chat_id });
      return r.ok ? json({ ok: true }) : json({ error: r.description }, 400);
    }
    const text = String(body.text || '').trim();
    if (!text) return json({ error: 'Message দিন' }, 400);
    const m = await tg(bot.token, 'sendMessage', { chat_id: bot.group_chat_id, text });
    if (!m.ok) return json({ error: m.description }, 400);
    const r = await tg(bot.token, 'pinChatMessage', { chat_id: bot.group_chat_id, message_id: m.result.message_id });
    return r.ok ? json({ ok: true }) : json({ error: r.description }, 400);
  }
  if (a === 'warnreset') {
    if (!can('moderation')) return json({ error: 'no permission' }, 403);
    await run(env, 'UPDATE warnings SET count=0 WHERE bot_id=? AND tg_id=?', bot.id, +body.tg_id);
    return json({ ok: true });
  }
  if (a === 'detect') {
    if (!can('ai')) return json({ error: 'no permission' }, 403);
    const key = body.key || (await getS(env, scope)).ai_key || '';
    return json(await detectAI(key));
  }
  if (a === 'delete') {
    if (acc !== 'all') return json({ error: 'owner only' }, 403);
    await tg(bot.token, 'deleteWebhook', {});
    for (const t of ['commands', 'auto_replies', 'bad_words', 'warnings', 'cooldowns', 'scheduled_posts', 'buttons', 'bot_admins', 'stats', 'msglog'])
      await run(env, `DELETE FROM ${t} WHERE bot_id=?`, bot.id);
    await run(env, 'DELETE FROM settings WHERE scope=?', scope);
    await run(env, 'DELETE FROM bots WHERE id=?', bot.id);
    log(env, 'bot', bot.id, 'Bot deleted by owner');
    return json({ ok: true });
  }
  return json({ error: 'not found' }, 404);
}
