// Shared UI (CSS/helpers) + User Web Panel
import { enc, one, all, run, getS, setS, cfgOf, J, H, session, sameOrigin, newSession, ck, redirect } from './database.js';
import { tg } from './telegram.js';

export const CSS = `:root{--bg:#f3f5fb;--c:#fff;--t:#1b2133;--m:#6b7390;--p:#5b6cff;--p2:#8a4dff;--b:#e3e7f3}
@media(prefers-color-scheme:dark){:root{--bg:#0f1220;--c:#1a1e33;--t:#eef0fa;--m:#98a0c0;--b:#2a3052}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--t);font:15px system-ui,sans-serif;padding:env(safe-area-inset-top) 0 calc(80px + env(safe-area-inset-bottom))}
header{background:linear-gradient(135deg,var(--p),var(--p2));color:#fff;padding:18px 16px;font-size:18px}header select{margin-top:8px}
main{padding:14px;max-width:640px;margin:auto}.card{background:var(--c);border:1px solid var(--b);border-radius:16px;padding:14px;margin-bottom:12px}.warn{border-color:#f5a623}
input,textarea,select{width:100%;padding:12px;border-radius:12px;border:1px solid var(--b);background:var(--bg);color:var(--t);font:inherit;margin:6px 0}
button{background:linear-gradient(135deg,var(--p),var(--p2));color:#fff;border:0;border-radius:12px;padding:12px 16px;font:inherit;min-height:44px;margin:4px 4px 0 0}button.d{background:#e5484d}
nav{position:fixed;bottom:0;left:0;right:0;display:flex;overflow-x:auto;background:var(--c);border-top:1px solid var(--b);padding:6px 6px calc(6px + env(safe-area-inset-bottom))}nav:empty{display:none}
nav button{background:none;color:var(--m);display:flex;flex-direction:column;align-items:center;font-size:11px;min-width:76px;padding:4px;margin:0}nav button.on{color:var(--p)}nav b{font-size:20px}
.row{display:flex;justify-content:space-between;align-items:center;padding:10px 0}.sw{position:relative;width:48px;height:28px;flex:none}.sw input{opacity:0;position:absolute;inset:0;width:100%;height:100%;margin:0;z-index:1}
.sw i{position:absolute;inset:0;background:var(--b);border-radius:20px;transition:.2s}.sw i:before{content:"";position:absolute;width:22px;height:22px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.2s}
.sw input:checked+i{background:var(--p)}.sw input:checked+i:before{transform:translateX(20px)}
.toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#16a34a;color:#fff;padding:10px 18px;border-radius:20px;z-index:9}.toast.bad{background:#e5484d}
.empty{text-align:center;color:var(--m);padding:24px}.g{display:grid;grid-template-columns:1fr 1fr;gap:10px}.g div{text-align:center}.g b{font-size:24px;display:block}`;

export const HELP = `const $=s=>document.querySelector(s);const TW=window.Telegram&&Telegram.WebApp,VIA=new URLSearchParams(location.search).get('b')||'0';if(TW){TW.ready();TW.expand()}
function h(t,a,...c){const e=document.createElement(t);for(const k in a||{}){if(k.startsWith('on'))e[k]=a[k];else e.setAttribute(k,a[k])}c.flat().forEach(x=>x!=null&&e.append(x));return e}
function toast(m,bad){const t=h('div',{class:'toast'+(bad?' bad':'')},m);document.body.append(t);setTimeout(()=>t.remove(),2500)}
async function api(p,b){const o={headers:{'x-csrf':window.CSRF||'','x-init':TW?TW.initData:'','x-bot':VIA}};if(b){o.method='POST';o.body=JSON.stringify(b);o.headers['content-type']='application/json'}let r;try{r=await fetch(p,o)}catch(x){toast('ইন্টারনেট সংযোগ নেই',1);throw x}let d={};try{d=await r.json()}catch(x){}if(!r.ok){toast(d.error||'কিছু একটা ভুল হয়েছে',1);throw new Error('e')}return d}
function tabs(T,cur,fn){const n=$('#tabs');n.textContent='';T.forEach(t=>n.append(h('button',{class:cur==t[0]?'on':'',onclick:()=>fn(t[0])},h('b',{},t[1]),t[2])))}`;

export const page = (title, script, csrf, tgw) => `<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${title}</title><style>${CSS}</style>${tgw ? '<script src="https://telegram.org/js/telegram-web-app.js"></script>' : ''}</head><body><header><b>${title}</b><select id="bot" hidden></select></header><main id="main"><div class="card empty">লোড হচ্ছে…</div></main><nav id="tabs"></nav><script>window.CSRF="${csrf}";${HELP}${script}</script></body></html>`;

const PJS = `let B=null,S=null,tab='group';
const T=[['group','👥','Group'],['cmd','⚡','Commands'],['ar','💬','Auto Reply'],['wel','👋','Welcome'],['mod','🛡️','Moderation'],['ai','🧠','AI'],['post','📅','Auto Post'],['pin','📌','Pin'],['btn','🔘','Buttons'],['adm','👑','Admins'],['set','⚙️','Settings']];
const set=(k,v)=>api('/api/p/set',{id:B,k,v}).then(()=>{S.cfg[k]=v;toast('সংরক্ষিত ✅')});
function tog(label,k){const i=h('input',{type:'checkbox'});i.checked=S.cfg[k]==='1';i.onchange=()=>set(k,i.checked?'1':'0');return h('label',{class:'row'},label,h('span',{class:'sw'},i,h('i')))}
function sel(label,k,o){const s=h('select',{},o.map(x=>h('option',{value:x[0]},x[1])));s.value=S.cfg[k]||o[0][0];s.onchange=()=>set(k,s.value);return h('label',{},label,s)}
function txt(label,k,area){const i=h(area?'textarea':'input',{placeholder:label,rows:4});i.value=S.cfg[k]||'';return h('div',{class:'card'},h('b',{},label),i,h('button',{onclick:()=>set(k,i.value)},'Save'))}
function list(t,rows,fmt,form){const c=h('div',{},h('div',{class:'card'},form),rows.length?rows.map(r=>h('div',{class:'card row'},h('span',{},fmt(r)),h('button',{class:'d',onclick:()=>{if(confirm('মুছে ফেলবেন?'))api('/api/p/del',{id:B,t,rid:r.id}).then(draw)}},'🗑'))):h('div',{class:'empty'},'এখনো কিছু নেই ✨'));return c}
const V={
group(){const s=S.stats;return h('div',{},h('div',{class:'card g'},[['Messages',s.msgs],['Deleted',s.deleted],['Warnings',s.warns],['Commands',s.cmds],['AI Replies',s.ai],['Auto Posts',s.posts]].map(x=>h('div',{},h('b',{},x[1]||0),x[0]))),
h('div',{class:'card'},h('b',{},S.bot.group_name?'✅ Connected: '+S.bot.group_name:'⚠️ কোনো Group যুক্ত নেই'),h('p',{},'Bot-কে Group-এ Admin করুন (Delete, Restrict, Pin permission সহ), তারপর @username বা id দিন।'),(()=>{const i=h('input',{placeholder:'@groupusername বা -100...'});return h('div',{},i,h('button',{onclick:()=>api('/api/p/group',{id:B,ref:i.value}).then(d=>{toast('Group যুক্ত হয়েছে: '+d.name+' ('+d.members+' সদস্য)');draw()})},'Connect Group'))})()))},
cmd(){const a=h('input',{placeholder:'command (যেমন rules)'}),b=h('textarea',{placeholder:'উত্তর — {name} {username} {user_id} {group_name}',rows:3});return list('cmd',S.commands,r=>'/'+r.name+' → '+r.resp,[a,b,h('button',{onclick:()=>api('/api/p/add',{id:B,t:'cmd',a:a.value,b:b.value}).then(draw)},'➕ Add')])},
ar(){const a=h('input',{placeholder:'Trigger শব্দ'}),b=h('textarea',{placeholder:'Reply',rows:3}),m=h('select',{},[['contains','Contains'],['exact','Exact'],['ci','Case-insensitive']].map(x=>h('option',{value:x[0]},x[1])));return list('ar',S.replies,r=>r.trig+' ['+r.mode+'] → '+r.resp,[a,m,b,h('button',{onclick:()=>api('/api/p/add',{id:B,t:'ar',a:a.value,b:b.value,m:m.value}).then(draw)},'➕ Add')])},
wel(){return h('div',{},h('div',{class:'card'},tog('Welcome message চালু','welcome_on')),txt('Welcome text ({name} {group_name})','welcome_text',1))},
mod(){const A=[['both','Delete + Warn'],['delete','Delete'],['warn','Warn'],['mute','Mute (১ ঘণ্টা)']];return h('div',{},h('div',{class:'card'},tog('🔗 URL protection','url_on'),sel('URL action','url_act',A),tog('🤬 Bad word filter','bad_on'),sel('Bad word action','bad_act',A),tog('🌊 Flood protection','flood_on'),sel('Flood action','flood_act',A),tog('♻️ Duplicate protection','dup_on'),sel('Duplicate action','dup_act',A)),txt('Flood: কয়টি message (ডিফল্ট ৫)','flood_n'),txt('Flood: কত সেকেন্ডে (ডিফল্ট ১০)','flood_s'),txt('নিষিদ্ধ শব্দ (কমা দিয়ে)','bad_words',1),txt('Warning limit (পূর্ণ হলে ১ ঘণ্টা mute)','warn_limit'),h('button',{class:'d',onclick:()=>api('/api/p/resetwarn',{id:B}).then(()=>toast('Warning reset ✅'))},'Warning Reset'))},
post(){const t=h('textarea',{rows:3,placeholder:'Post message'}),d=h('input',{type:'datetime-local'}),r=h('select',{},['once','daily','weekly','custom'].map(x=>h('option',{value:x},x))),m=h('input',{type:'number',placeholder:'Custom হলে কত মিনিট পর পর',min:1});return list('post',S.posts,x=>new Date(x.run_at).toLocaleString()+' ['+x.rep+(x.rep=='custom'?' '+x.mins+'m':'')+'] '+(x.act?'':'(শেষ) ')+x.body,[h('p',{},'সময় আপনার সেট করা Timezone অনুযায়ী (Settings)'),t,d,r,m,h('button',{onclick:()=>api('/api/p/post',{id:B,body:t.value,dt:d.value,rep:r.value,mins:+m.value}).then(draw)},'➕ Schedule')])},
pin(){const t=h('textarea',{rows:3,placeholder:'Pin করার message'});return h('div',{class:'card'},t,h('button',{onclick:()=>api('/api/p/pin',{id:B,text:t.value}).then(()=>toast('Pinned 📌'))},'Send & Pin'),h('button',{class:'d',onclick:()=>api('/api/p/pin',{id:B,unpin:1}).then(()=>toast('Unpinned ✅'))},'Unpin All'))},
btn(){const s=h('select',{},['welcome','command','post'].map(x=>h('option',{value:x},x))),l=h('input',{placeholder:'Button লেখা'}),u=h('input',{placeholder:'https://...'});return list('btn',S.buttons,x=>'['+x.scope+'] '+x.label+' → '+x.url,[s,l,u,h('button',{onclick:()=>api('/api/p/add',{id:B,t:'btn',a:l.value,b:u.value,m:s.value}).then(draw)},'➕ Add')])},
adm(){if(!S.owner)return h('div',{class:'card empty'},'শুধু Owner Admin যোগ করতে পারবে');const u=h('input',{placeholder:'@username'});const cb=['commands','ai','moderation','autopost','settings'].map(x=>[x,h('input',{type:'checkbox'})]);return list('adm',S.admins,x=>'@'+x.username+' ['+x.perms+']'+(x.tg_id?' ✅':' (Bot-এ /start বাকি)'),[u,cb.map(c=>h('label',{class:'row'},c[0],h('span',{class:'sw'},c[1],h('i')))),h('button',{onclick:()=>api('/api/p/add',{id:B,t:'adm',a:u.value,b:cb.filter(c=>c[1].checked).map(c=>c[0]).join(',')||'commands'}).then(draw)},'➕ Add Admin')])},
ai(){const c=S.cfg;
const kind=h('select',{},[['openrouter','OpenRouter (প্রস্তাবিত)'],['gemini','Gemini'],['custom','Custom OpenAI-compatible']].map(x=>h('option',{value:x[0]},x[1])));kind.value=c.ai_kind||'openrouter';
const url=h('input',{placeholder:'Custom URL (https://.../v1)'});url.value=c.ai_url||'';
const key=h('input',{type:'password',placeholder:c.ai_key_set?'🔒 Key সেট আছে — বদলাতে নতুন key দিন':'API Key'});
const model=h('input',{placeholder:'Model',list:'ml'});model.value=c.ai_model||'';const dl=h('datalist',{id:'ml'});
const pr=h('textarea',{rows:3,placeholder:'System prompt'});pr.value=c.ai_prompt||'';
const kb=h('textarea',{rows:5,placeholder:'Knowledge Base (rules, FAQ, admin info, website)'});kb.value=c.ai_kb||'';
const fb=h('textarea',{rows:2,placeholder:'Fallback message'});fb.value=c.ai_fallback||'';
return h('div',{},h('div',{class:'card'},tog('🧠 AI চালু','ai_on'),h('p',{},'Group-এ bot-কে mention বা তার message-এ reply করলে AI উত্তর দেবে। API key না থাকলে AI কাজ করে না।')),
h('div',{class:'card'},kind,url,key,h('button',{onclick:()=>api('/api/p/ai-detect',{id:B,key:key.value,kind:kind.value}).then(d=>{kind.value=d.kind;dl.textContent='';(d.models||[]).forEach(m=>dl.append(h('option',{value:m})));toast('Provider: '+d.kind+(d.models?' — '+d.models.length+'টি free model':''))})},'🔍 Detect'),model,dl,pr,kb,fb,h('button',{onclick:()=>api('/api/p/ai',{id:B,kind:kind.value,url:url.value,key:key.value,model:model.value,prompt:pr.value,kb:kb.value,fallback:fb.value}).then(()=>{toast('AI সংরক্ষিত ✅');draw()})},'Save AI')))},
set(){return h('div',{},h('div',{class:'card'},tog('⏳ Cooldown চালু (member-দের জন্য)','cooldown_on')),txt('Cooldown সেকেন্ড (সর্বনিম্ন ৩০)','cooldown_sec'),txt('Timezone offset মিনিটে (বাংলাদেশ = 360)','tz'),S.owner?V.del():null)},
del(){return h('div',{class:'card'},h('p',{},'Bot: @'+S.bot.username),h('button',{class:'d',onclick:()=>{if(confirm('বট ও সব ডেটা স্থায়ীভাবে মুছে যাবে!'))api('/api/p/delbot',{id:B}).then(()=>{toast('মুছে ফেলা হয়েছে');B=null;load()})}},'🗑 Bot Delete'))}};
async function draw(){S=await api('/api/p/state?id='+B);tabs(T,tab,x=>{tab=x;draw()});const m=$('#main');m.textContent='';if(!S.bot.status)m.append(h('div',{class:'card warn'},'⚠️ এই বট Admin বন্ধ করেছে — read-only'));m.append(V[tab]())}
async function load(){const d=await api('/api/p/bots'),s=$('#bot');s.textContent='';d.bots.forEach(b=>s.append(h('option',{value:b.id},'@'+b.username)));if(!d.bots.length){$('#main').textContent='';$('#main').append(h('div',{class:'card empty'},'কোনো বট নেই। Main Bot থেকে Create Bot করুন।'));return}s.hidden=d.bots.length<2;B=B||d.bots[0].id;s.value=B;s.onchange=()=>{B=+s.value;draw()};draw()}
if(!TW||!TW.initData){$('#main').textContent='';$('#main').append(h('div',{class:'card empty'},'🔒 এই Panel শুধু Telegram-এর ভেতর থেকে খোলা যায়। Bot-এ গিয়ে Open Control Panel চাপুন।'))}else load();`;

const SETK = ['welcome_on', 'welcome_text', 'url_on', 'url_act', 'bad_on', 'bad_act', 'bad_words', 'warn_limit', 'ai_on', 'flood_on', 'flood_act', 'flood_n', 'flood_s', 'dup_on', 'dup_act', 'cooldown_on', 'cooldown_sec', 'tz'];

// Verify Telegram Mini App initData (HMAC). Every request is verified, so there is no session to expire.
async function auth(e, r, u) {
  const init = r.headers.get('x-init') || '', via = +(r.headers.get('x-bot') || 0) || 0;
  const q = new URLSearchParams(init), hash = q.get('hash'); q.delete('hash');
  if (!init || !hash) return null;
  const token = via ? (await one(e, 'SELECT token FROM bots WHERE id=?', via))?.token : await getS(e, 'global', 'main_token');
  if (!token) return null;
  const hm = async (k, d) => new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), enc.encode(d)));
  const dcs = [...q.entries()].sort((x, y) => (x[0] < y[0] ? -1 : 1)).map(([k, v]) => k + '=' + v).join('\n');
  const sig = [...(await hm(await hm(enc.encode('WebAppData'), token), dcs))].map((x) => x.toString(16).padStart(2, '0')).join('');
  if (sig !== hash || Date.now() / 1000 - (+q.get('auth_date') || 0) > 604800) return null;
  let usr; try { usr = JSON.parse(q.get('user')); } catch (x) { return null; }
  return usr && usr.id ? { uid: usr.id, uname: (usr.username || '').toLowerCase(), via } : null;
}

export async function panel(r, e, u) {
  const p = u.pathname;
  if (p === '/p') return H(page('🤖 Control Panel', PJS, '', true));
  const a = await auth(e, r, u);
  if (!a) return J({ error: 'Telegram-এর ভেতর থেকে Panel খুলুন' }, 401);
  const post = r.method === 'POST', uid = a.uid;
  if (a.uname) await run(e, 'UPDATE bot_admins SET tg_id=? WHERE tg_id IS NULL AND username=?', uid, a.uname);
  if (p === '/api/p/bots') return J({ bots: await all(e, 'SELECT id,username FROM bots WHERE (owner=? OR id IN (SELECT bot FROM bot_admins WHERE tg_id=?))' + (a.via ? ' AND id=' + a.via : ''), uid, uid) });
  const b = post ? await r.json().catch(() => ({})) : {};
  const id = +(b.id || u.searchParams.get('id'));
  const bot = a.via && id !== a.via ? null : await one(e, 'SELECT * FROM bots WHERE id=? AND (owner=? OR id IN (SELECT bot FROM bot_admins WHERE tg_id=?))', id, uid, uid);
  if (!bot) return J({ error: 'এই বটে আপনার অনুমতি নেই' }, 403);
  if (post && !bot.status) return J({ error: 'বট বন্ধ আছে, পরিবর্তন করা যাবে না' }, 403);
  const own = bot.owner === uid, perms = own ? [] : ((await one(e, 'SELECT perms FROM bot_admins WHERE bot=? AND tg_id=?', id, uid))?.perms || '').split(',');
  const can = (x) => own || perms.includes(x), no = () => J({ error: 'এই কাজের অনুমতি আপনার নেই' }, 403);
  if (p.startsWith('/api/p/ai') && !can('ai')) return no();
  if ((p === '/api/p/group' || p === '/api/p/delbot') && !own) return no();
  if (p === '/api/p/add' || p === '/api/p/del') { const pm = { cmd: 'commands', ar: 'commands', btn: 'settings', post: 'autopost' }; if (b.t === 'adm' ? !own : !can(pm[b.t])) return no(); }
  const pub = { id: bot.id, username: bot.username, group_name: bot.group_name, status: bot.status };
  if (p === '/api/p/state') {
    const st = Object.fromEntries((await all(e, 'SELECT k,n FROM stats WHERE bot=?', id)).map((x) => [x.k, x.n]));
    const cfg = await cfgOf(e, id); const ks = !!cfg.ai_key; delete cfg.ai_key; cfg.ai_key_set = ks ? '1' : '';
    return J({ bot: pub, owner: own, posts: await all(e, 'SELECT id,body,run_at,rep,mins,act FROM scheduled_posts WHERE bot=?', id), buttons: await all(e, 'SELECT id,scope,label,url FROM buttons WHERE bot=?', id), admins: own ? await all(e, 'SELECT id,username,tg_id,perms FROM bot_admins WHERE bot=?', id) : [], cfg, stats: st, commands: await all(e, 'SELECT id,name,resp FROM commands WHERE bot=?', id), replies: await all(e, 'SELECT id,trig,mode,resp FROM auto_replies WHERE bot=?', id) });
  }
  if (p === '/api/p/set' && SETK.includes(b.k)) {
    if (!can(b.k === 'ai_on' ? 'ai' : /^(url|bad|flood|dup|warn)/.test(b.k) ? 'moderation' : 'settings')) return no();
    const v = b.k === 'cooldown_sec' ? String(Math.max(30, +b.v || 30)) : String(b.v).slice(0, 2000);
    await setS(e, 'bot:' + id, b.k, v); return J({ ok: 1 });
  }
  if (p === '/api/p/resetwarn') { if (!can('moderation')) return no(); await run(e, 'DELETE FROM warnings WHERE bot=?', id); return J({ ok: 1 }); }
  if (p === '/api/p/post') {
    if (!can('autopost')) return no();
    const body = String(b.body || '').trim().slice(0, 3000), t = Date.parse((b.dt || '') + ':00Z'), tz = +(await getS(e, 'bot:' + id, 'tz')) || 0;
    if (!body || isNaN(t)) return J({ error: 'Message ও তারিখ-সময় দিন' }, 400);
    await run(e, 'INSERT INTO scheduled_posts(bot,body,run_at,rep,mins) VALUES(?,?,?,?,?)', id, body, t - tz * 60000, ['once', 'daily', 'weekly', 'custom'].includes(b.rep) ? b.rep : 'once', Math.max(1, +b.mins || 60)); return J({ ok: 1 });
  }
  if (p === '/api/p/pin') {
    if (!can('autopost')) return no();
    if (!bot.group_id) return J({ error: 'আগে Group যুক্ত করুন' }, 400);
    if (b.unpin) { await tg(bot.token, 'unpinAllChatMessages', { chat_id: bot.group_id }); return J({ ok: 1 }); }
    const txt = String(b.text || '').trim(); if (!txt) return J({ error: 'Message লিখুন' }, 400);
    const m = await tg(bot.token, 'sendMessage', { chat_id: bot.group_id, text: txt });
    if (!m.ok) return J({ error: 'Message পাঠানো যায়নি' }, 400);
    await tg(bot.token, 'pinChatMessage', { chat_id: bot.group_id, message_id: m.result.message_id }); return J({ ok: 1 });
  }
  if (p === '/api/p/ai-detect') {
    const k = String(b.key || '').trim();
    const kind = k.startsWith('sk-or-') ? 'openrouter' : k.startsWith('AIza') ? 'gemini' : k ? 'custom' : (['openrouter', 'gemini', 'custom'].includes(b.kind) ? b.kind : 'openrouter');
    let models = null;
    if (kind === 'openrouter') { try { models = ((await (await fetch('https://openrouter.ai/api/v1/models')).json()).data || []).map((x) => x.id).filter((x) => x.endsWith(':free')).slice(0, 40); } catch (x) { models = []; } }
    return J({ kind, models });
  }
  if (p === '/api/p/ai') {
    const kind = ['openrouter', 'gemini', 'custom'].includes(b.kind) ? b.kind : 'openrouter';
    if (kind === 'custom' && !/^https:\/\//.test(b.url || '')) return J({ error: 'Custom URL অবশ্যই https:// দিয়ে শুরু হতে হবে' }, 400);
    const sc = 'bot:' + id;
    await setS(e, sc, 'ai_kind', kind); await setS(e, sc, 'ai_url', String(b.url || '').slice(0, 300));
    if (b.key) await setS(e, sc, 'ai_key', String(b.key).trim().slice(0, 300));
    for (const [k, v] of [['ai_model', b.model], ['ai_prompt', b.prompt], ['ai_kb', b.kb], ['ai_fallback', b.fallback]]) await setS(e, sc, k, String(v || '').slice(0, k === 'ai_kb' ? 8000 : 2000));
    return J({ ok: 1 });
  }
  if (p === '/api/p/add') {
    const resp = String(b.b || '').trim().slice(0, 3000), a = String(b.a || '').trim();
    if (!a || !resp) return J({ error: 'সব ঘর পূরণ করুন' }, 400);
    if (b.t === 'cmd') {
      const name = a.replace(/^\//, '').toLowerCase();
      if (!/^[a-z0-9_]{1,32}$/.test(name)) return J({ error: 'Command-এ শুধু a-z, 0-9, _ ব্যবহার করুন' }, 400);
      await run(e, 'INSERT INTO commands(bot,name,resp) VALUES(?,?,?)', id, name, resp);
    } else if (b.t === 'ar') {
      await run(e, 'INSERT INTO auto_replies(bot,trig,mode,resp) VALUES(?,?,?,?)', id, a.slice(0, 200), ['exact', 'ci', 'contains'].includes(b.m) ? b.m : 'contains', resp);
    } else if (b.t === 'btn') {
      if (!/^https:\/\//.test(resp) || !['welcome', 'command', 'post'].includes(b.m)) return J({ error: 'লিংক https:// দিয়ে শুরু হতে হবে' }, 400);
      await run(e, 'INSERT INTO buttons(bot,scope,label,url) VALUES(?,?,?,?)', id, b.m, a.slice(0, 60), resp);
    } else if (b.t === 'adm') {
      const un = a.replace(/^@/, '').toLowerCase();
      if (!/^[a-z0-9_]{3,32}$/.test(un)) return J({ error: 'সঠিক @username দিন' }, 400);
      await run(e, 'INSERT INTO bot_admins(bot,username,perms) VALUES(?,?,?)', id, un, resp.split(',').filter((x) => ['commands', 'ai', 'moderation', 'autopost', 'settings'].includes(x)).join(',') || 'commands');
    } else return J({ error: 'ভুল অনুরোধ' }, 400);
    return J({ ok: 1 });
  }
  if (p === '/api/p/del') {
    const t = { cmd: 'commands', ar: 'auto_replies', btn: 'buttons', post: 'scheduled_posts', adm: 'bot_admins' }[b.t];
    if (!t) return J({ error: 'ভুল অনুরোধ' }, 400);
    await run(e, `DELETE FROM ${t} WHERE id=? AND bot=?`, +b.rid, id); return J({ ok: 1 });
  }
  if (p === '/api/p/group') {
    let ref = String(b.ref || '').trim().replace(/^https?:\/\/t\.me\//, '').replace(/^@/, '');
    if (!ref) return J({ error: 'Group username বা id দিন' }, 400);
    const chat = await tg(bot.token, 'getChat', { chat_id: /^-?\d+$/.test(ref) ? +ref : '@' + ref });
    if (!chat.ok) return J({ error: 'Group পাওয়া যায়নি, বা বট Group-এ নেই' }, 400);
    const cm = await tg(bot.token, 'getChatMember', { chat_id: chat.result.id, user_id: +bot.token.split(':')[0] });
    if (!cm.ok || cm.result.status !== 'administrator') return J({ error: 'বটকে Group-এ Administrator বানান' }, 400);
    const x = cm.result;
    if (!x.can_delete_messages || !x.can_restrict_members || !x.can_pin_messages) return J({ error: 'বটকে Delete Messages, Restrict Members ও Pin Messages permission দিন' }, 400);
    if (await one(e, 'SELECT id FROM bots WHERE group_id=? AND id!=?', chat.result.id, id)) return J({ error: 'এই Group অন্য বটে যুক্ত আছে' }, 400);
    await run(e, 'UPDATE bots SET group_id=?,group_name=? WHERE id=?', chat.result.id, chat.result.title || ref, id);
    const mc = await tg(bot.token, 'getChatMemberCount', { chat_id: chat.result.id });
    return J({ name: chat.result.title, members: mc.result || 0 });
  }
  if (p === '/api/p/delbot') {
    await tg(bot.token, 'deleteWebhook');
    for (const t of ['commands', 'auto_replies', 'warnings', 'stats', 'scheduled_posts', 'buttons', 'bot_admins', 'cooldowns', 'msglog']) await run(e, `DELETE FROM ${t} WHERE bot=?`, id);
    await run(e, 'DELETE FROM settings WHERE scope=?', 'bot:' + id);
    await run(e, 'DELETE FROM bots WHERE id=?', id); return J({ ok: 1 });
  }
  return J({ error: 'পাওয়া যায়নি' }, 404);
}
