// Shared UI (CSS/helpers) + User Web Panel
import { enc, one, all, run, getS, setS, cfgOf, J, H, session, sameOrigin, newSession, ck, redirect } from './database.js';
import { tg, syncCmds, aiReply, aiErr, createBot } from './telegram.js';

export const CSS = `:root{--bg:#f3f5fb;--c:#fff;--t:#1b2133;--m:#6b7390;--p:#5b6cff;--p2:#8a4dff;--b:#e3e7f3}
@media(prefers-color-scheme:dark){:root{--bg:#0f1220;--c:#1a1e33;--t:#eef0fa;--m:#98a0c0;--b:#2a3052}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--t);font:15px system-ui,sans-serif;padding:env(safe-area-inset-top) 0 calc(80px + env(safe-area-inset-bottom))}
header{background:linear-gradient(135deg,var(--p),var(--p2));color:#fff;padding:18px 16px;font-size:18px}header select{margin-top:8px}
main{padding:14px;max-width:640px;margin:auto}.card{background:var(--c);border:1px solid var(--b);border-radius:16px;padding:14px;margin-bottom:12px}.warn{border-color:#f5a623}
input,textarea,select{width:100%;padding:12px;border-radius:12px;border:1px solid var(--b);background:var(--bg);color:var(--t);font:inherit;margin:6px 0}
button{background:linear-gradient(135deg,var(--p),var(--p2));color:#fff;border:0;border-radius:12px;padding:12px 16px;font:inherit;min-height:44px;margin:4px 4px 0 0}button.d{background:#e5484d}button.o{opacity:.55}.card[onclick]{cursor:pointer}button.s{padding:6px 12px;min-height:34px;font-size:13px}
.item{background:var(--c);border:1px solid var(--b);border-radius:14px;padding:12px;margin-bottom:10px}.it{font-weight:700;word-break:break-word}
.ib{color:var(--m);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-wrap;word-break:break-word;margin:4px 0 8px;font-size:13px}.ia{display:flex;gap:8px}.ia button{margin:0}
@media(min-width:560px){.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}}.cnt{color:var(--m);display:block;text-align:right;font-size:12px}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px;z-index:20;overflow:auto}.modal .card{width:100%;max-width:440px;margin:0}.err{color:#e5484d;font-size:13px;margin:4px 0}.modal ol{padding-left:18px;color:var(--m)}.hint{color:var(--m);font-size:13px}
nav{position:fixed;bottom:0;left:0;right:0;display:flex;overflow-x:auto;background:var(--c);border-top:1px solid var(--b);padding:6px 6px calc(6px + env(safe-area-inset-bottom))}nav:empty{display:none}
nav button{background:none;color:var(--m);display:flex;flex-direction:column;align-items:center;font-size:11px;min-width:76px;padding:4px;margin:0}nav button.on{color:var(--p)}nav b{font-size:20px}
.row{display:flex;justify-content:space-between;align-items:center;padding:10px 0}.sw{position:relative;width:48px;height:28px;flex:none}.sw input{opacity:0;position:absolute;inset:0;width:100%;height:100%;margin:0;z-index:1}
.sw i{position:absolute;inset:0;background:var(--b);border-radius:20px;transition:.2s}.sw i:before{content:"";position:absolute;width:22px;height:22px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.2s}
.sw input:checked+i{background:var(--p)}.sw input:checked+i:before{transform:translateX(20px)}
.toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#16a34a;color:#fff;padding:10px 18px;border-radius:20px;z-index:9}.toast.bad{background:#e5484d}
.empty{text-align:center;color:var(--m);padding:24px}.g{display:grid;grid-template-columns:1fr 1fr;gap:10px}.g div{text-align:center}.g b{font-size:24px;display:block}`;

export const HELP = `const $=s=>document.querySelector(s);const TW=window.Telegram&&Telegram.WebApp,VIA=new URLSearchParams(location.search).get('b')||'0';if(TW){TW.ready();TW.expand()}
function h(t,a,...c){const e=document.createElement(t);for(const k in a||{}){if(k.startsWith('on'))e[k]=a[k];else e.setAttribute(k,a[k])}c.flat(Infinity).forEach(x=>x!=null&&x!==false&&e.append(x));return e}
function toast(m,bad){const t=h('div',{class:'toast'+(bad?' bad':'')},m);document.body.append(t);setTimeout(()=>t.remove(),3000)}
async function api(p,b){const o={headers:{'x-csrf':window.CSRF||'','x-init':TW?TW.initData:'','x-bot':VIA}};if(b){o.method='POST';o.body=JSON.stringify(b);o.headers['content-type']='application/json'}let r;try{r=await fetch(p,o)}catch(x){toast('No internet connection',1);throw x}let d={};try{d=await r.json()}catch(x){}if(!r.ok){const er=new Error(d.error||'Something went wrong');er.msg=er.message;toast(er.message,1);throw er}return d}
function tabs(T,cur,fn){const n=$('#tabs');n.textContent='';T.forEach(t=>n.append(h('button',{class:cur==t[0]?'on':'',onclick:()=>fn(t[0])},h('b',{},t[1]),t[2])))}`;

export const page = (title, script, csrf, tgw) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${title}</title><style>${CSS}</style>${tgw ? '<script src="https://telegram.org/js/telegram-web-app.js"></script>' : ''}</head><body><header><b>${title}</b><select id="bot" hidden></select></header><main id="main"><div class="card empty">Loading…</div></main><nav id="tabs"></nav><script>window.CSRF="${csrf}";${HELP}${script}</script></body></html>`;

const PJS = `let B=null,S=null,tab='cmd',SUB='add';
const T=[['cmd','⚡','Commands'],['ar','💬','Auto Reply'],['ai','🧠','AI'],['wel','👋','Welcome'],['mod','🛡️','Moderation'],['post','📅','Auto Post'],['pin','📌','Pin'],['btn','🔘','Buttons'],['adm','👑','Admins'],['set','⚙️','Settings']];
const set=(k,v)=>api('/api/p/set',{id:B,k,v}).then(()=>{S.cfg[k]=v;toast('Saved ✅')});
function tog(label,k){const i=h('input',{type:'checkbox'});i.checked=S.cfg[k]==='1';i.onchange=()=>set(k,i.checked?'1':'0');return h('label',{class:'row'},label,h('span',{class:'sw'},i,h('i')))}
function txt(label,k){const i=h('input',{placeholder:label});i.value=S.cfg[k]||'';return h('div',{class:'card'},h('b',{},label),i,h('button',{onclick:()=>set(k,i.value)},'Save'))}
function sel(label,k,o){const s=h('select',{},o.map(x=>h('option',{value:x[0]},x[1])));s.value=S.cfg[k]||o[0][0];s.onchange=()=>set(k,s.value);return h('label',{},label,s)}
function area(ph,rows,max,val){const t=h('textarea',{rows,placeholder:ph,maxlength:max}),c=h('small',{class:'cnt'});t.value=val||'';const u=()=>{c.textContent=t.value.length+' / '+max};t.oninput=u;u();return [h('div',{},t,c),t]}
function crud(t,rows,form,payload,fill,ttl,sub,hint,path){let eid=null;const add=h('button',{},'➕ Add'),cancel=h('button',{class:'o'},'Cancel');cancel.hidden=true;
add.onclick=()=>api(eid?'/api/p/edit':(path||'/api/p/add'),Object.assign({id:B,t,rid:eid},payload())).then(()=>{toast(eid?'Updated ✅':'Added ✅');draw()});cancel.onclick=()=>draw();
const cards=rows.length?rows.map(r=>h('div',{class:'item'},h('div',{class:'it'},ttl(r)),h('div',{class:'ib'},sub(r)),h('div',{class:'ia'},fill?h('button',{class:'s',onclick:()=>{eid=r.id;fill(r);add.textContent='💾 Save changes';cancel.hidden=false;window.scrollTo(0,0)}},'✏️ Edit'):null,h('button',{class:'s d',onclick:()=>{if(confirm('Delete this?'))api('/api/p/del',{id:B,t,rid:r.id}).then(draw)}},'🗑 Delete')))):[h('div',{class:'empty'},'Nothing here yet ✨')];
return h('div',{},h('div',{class:'card'},hint?h('p',{class:'hint'},hint):null,form,add,cancel),h('div',{class:'grid'},cards))}
const A={
add(){const k=h('input',{type:'password',placeholder:'API Key (OpenRouter / Gemini / Custom)'}),u=h('input',{placeholder:'Custom only: https://.../v1'}),m=h('input',{placeholder:'Model (empty = Auto: all free models)'});return h('div',{},h('div',{class:'card'},tog('🧠 AI enabled','ai_on'),h('p',{class:'hint'},'The AI answers only when someone mentions the bot. With Auto, the next free model is used when one hits its limit; if every model of an API fails, the next API is used. Mention the bot while replying to a message and the AI also checks that message for hidden links or bad content.')),h('div',{class:'card'},h('b',{},'Connected APIs'),S.apis.length?S.apis.map(x=>h('div',{class:'row'},h('span',{},'🔑 '+x.kind+' — '+(x.model||'Auto')),h('button',{class:'s d',onclick:()=>{if(confirm('Delete this?'))api('/api/p/del',{id:B,t:'aik',rid:x.id}).then(draw)}},'🗑'))):h('p',{class:'hint'},'No API connected yet.'),k,u,m,h('button',{onclick:()=>api('/api/p/aikey',{id:B,key:k.value,url:u.value,model:m.value}).then(()=>{toast('API added ✅');draw()})},'➕ Add API'),h('button',{class:'o',onclick:()=>api('/api/p/aitest',{id:B}).then(d=>toast(d.ok?'✅ '+d.text.slice(0,60):'❌ '+d.err,!d.ok))},'🧪 Test AI')))},
prompt(){const c=S.cfg,nm=h('input',{placeholder:'AI name (default: Assistant)',maxlength:60}),ad=h('input',{placeholder:'Admin name',maxlength:100}),tn=h('select',{},[['friendly','Friendly'],['formal','Formal'],['direct','Direct & short'],['detail','Detailed step-by-step']].map(x=>h('option',{value:x[0]},x[1])));
const [pw,pr]=area('System prompt',5,4000,c.ai_prompt),[kw,kb]=area('Knowledge & rules — about you, your community, rules, FAQ, all your links',8,20000,c.ai_kb),[fw,fb]=area('Fallback message',3,500,c.ai_fallback||'Sorry, I cannot answer that right now. Please contact the group admin.');nm.value=c.ai_name||'Assistant';ad.value=c.ai_admin||'';tn.value=c.ai_tone||'friendly';
const PT=[['🎓 Education','You are {n}, a patient tutor for students. Explain simply with examples. Admin: {a}.'],['🛒 Shop / Support','You are {n}, a polite customer-support assistant for a shop. Answer using the knowledge base only. For orders or complaints refer to {a}.'],['💬 Community','You are {n}, a friendly community assistant. Keep the chat positive, answer questions, and point members to {a} for issues.'],['❓ FAQ (direct)','You are {n}. Answer ONLY from the knowledge base, in 1-3 short sentences. If unknown reply NO_ANSWER.'],['💻 Tech support','You are {n}, a technical helper. Give short step-by-step fixes. Ask one clarifying question if needed.'],['🎮 Gaming','You are {n}, a fun gaming buddy. Share tips and keep replies short and energetic.']];
return h('div',{},h('div',{class:'card'},nm,ad,h('label',{},'Answer style',tn),h('b',{},'Prompt templates'),h('div',{},PT.map(x=>h('button',{class:'s',onclick:()=>{pr.value=x[1].split('{n}').join(nm.value||'Assistant').split('{a}').join(ad.value||'the admin');pr.oninput()}},x[0]))),pw,h('b',{},'Knowledge & rules'),kw,h('b',{},'Fallback message'),fw,h('button',{onclick:()=>api('/api/p/ai',{id:B,name:nm.value,admin:ad.value,tone:tn.value,prompt:pr.value,kb:kb.value,fallback:fb.value}).then(()=>toast('Saved ✅'))},'Save')))},
files(){const ti=h('input',{placeholder:'Title (e.g. Free course link, Config code)',maxlength:80}),ty=h('select',{},[['text','📝 Text'],['code','💻 Code (tap to copy)'],['link','🔗 Link']].map(x=>h('option',{value:x[0]},x[1])));const [bw,bd]=area('Content: text, code or link',6,8000,'');
return crud('file',S.files,[ti,ty,bw],()=>({a:ti.value,m:ty.value,b:bd.value}),r=>{ti.value=r.name;ty.value=r.kind;bd.value=r.body;bd.oninput()},r=>'📎 '+r.name,r=>'['+r.kind+'] '+r.body,'Give each file a title and choose its type. When a member asks the AI about it (by mentioning the bot), the AI sends the content — code arrives as a tap-to-copy block.')}};
const V={
cmd(){const CT=[['rules','📜 Rules','📜 Group rules:\\n1. Respect everyone\\n2. No spam or ads\\n3. Follow the admins'],['help','🆘 Help','🆘 Need help? Mention an admin.'],['admin','👤 Admin','👤 Admin: @username\\nContact for support.'],['about','ℹ️ About','ℹ️ {group_name} — our community.'],['links','🔗 Links','🔗 Website: https://example.com\\n📺 YouTube: https://youtube.com/@channel'],['price','💰 Price','💰 Price list:\\n• Plan 1 — 0\\n• Plan 2 — 0'],['contact','📞 Contact','📞 Phone: 01XXXXXXXXX\\n📧 Email: info@example.com'],['hello','👋 Hello','👋 Hello {name}! How can I help?']];
const a=h('input',{placeholder:'Command name, without /'}),b=h('textarea',{placeholder:'Reply — {name} {username} {user_id} {group_name}',rows:4,maxlength:3000});
return crud('cmd',S.commands,[h('b',{},'Tap a template, then edit it'),h('div',{},CT.map(x=>h('button',{class:'s',onclick:()=>{a.value=x[0];b.value=x[2]}},x[1]))),a,b],()=>({a:a.value,b:b.value}),r=>{a.value=r.name;b.value=r.resp},r=>'/'+r.name,r=>r.resp,'Each command name can be used only once. Added commands appear in the group’s / menu.')},
ar(){const a=h('input',{placeholder:'Trigger word'}),b=h('textarea',{placeholder:'Reply',rows:3,maxlength:3000}),m=h('select',{},[['contains','Contains'],['exact','Exact'],['ci','Case-insensitive']].map(x=>h('option',{value:x[0]},x[1])));return crud('ar',S.replies,[a,m,b],()=>({a:a.value,b:b.value,m:m.value}),r=>{a.value=r.trig;b.value=r.resp;m.value=r.mode},r=>'💬 '+r.trig,r=>'['+r.mode+'] '+r.resp)},
ai(){return h('div',{},h('div',{},[['add','➕ Add AI'],['prompt','📝 Prompt'],['files','📁 Files']].map(x=>h('button',{class:SUB==x[0]?'':'o',onclick:()=>{SUB=x[0];draw()}},x[1]))),A[SUB]())},
wel(){const WT=[['😊 Simple','👋 Welcome {name} to {group_name}! Please follow the group rules.'],['🎉 Cheerful','🎉 Hey {name}! So happy to have you in {group_name}! 🥳'],['📜 Formal','Dear {name}, welcome to {group_name}. Kindly read and follow the rules.'],['📢 With rules','Welcome {name}! ✅ No spam ✅ No links ✅ Be kind to everyone']];const t=h('textarea',{rows:5,maxlength:1000});t.value=S.cfg.welcome_text||WT[0][1];return h('div',{},h('div',{class:'card'},tog('Welcome message enabled','welcome_on')),h('div',{class:'card'},h('b',{},'Choose a template'),h('div',{},WT.map(x=>h('button',{class:'s',onclick:()=>{t.value=x[1]}},x[0]))),t,h('p',{class:'hint'},'Variables: {name} {username} {user_id} {group_name}'),h('button',{onclick:()=>set('welcome_text',t.value)},'Save')))},
mod(){const A2=[['both','Delete + Warn'],['delete','Delete'],['warn','Warn'],['mute','Mute (1 hour)']];return h('div',{},h('div',{class:'card'},tog('🔗 URL protection (strong)','url_on'),sel('URL action','url_act',A2),tog('🤬 Bad word filter','bad_on'),sel('Bad word action','bad_act',A2),tog('🌊 Flood protection','flood_on'),sel('Flood action','flood_act',A2),tog('♻️ Duplicate protection','dup_on'),sel('Duplicate action','dup_act',A2),h('p',{class:'hint'},'URL protection also catches disguised links such as “site dot com”, “site(.)com”, spaced letters and look-alike characters. If something still slips through, reply to that message and mention the bot — the AI will review it, warn the user and notify you.')),txt('Flood: messages (default 5)','flood_n'),txt('Flood: seconds (default 10)','flood_s'),txt('Banned words (comma separated)','bad_words'),txt('Warning limit (mute 1 hour when reached)','warn_limit'),h('button',{class:'d',onclick:()=>api('/api/p/resetwarn',{id:B}).then(()=>toast('Warnings reset ✅'))},'Reset warnings'))},
post(){const t=h('textarea',{rows:3,placeholder:'Post message',maxlength:3000}),d=h('input',{type:'datetime-local'}),r=h('select',{},['once','daily','weekly','custom'].map(x=>h('option',{value:x},x))),m=h('input',{type:'number',placeholder:'Custom: every N minutes',min:1});return crud('post',S.posts,[t,d,r,m],()=>({body:t.value,dt:d.value,rep:r.value,mins:+m.value}),null,x=>'🕒 '+new Date(x.run_at).toLocaleString()+' · '+x.rep+(x.rep=='custom'?' ('+x.mins+' min)':''),x=>x.body,'Times use your timezone setting. A one-time post that could not be sent on time is deleted automatically.','/api/p/post')},
pin(){const t=h('textarea',{rows:3,placeholder:'Message to pin',maxlength:3000});return h('div',{class:'card'},t,h('button',{onclick:()=>api('/api/p/pin',{id:B,text:t.value}).then(()=>toast('Pinned 📌'))},'Send & Pin'),h('button',{class:'d',onclick:()=>api('/api/p/pin',{id:B,unpin:1}).then(()=>toast('Unpinned ✅'))},'Unpin all'))},
btn(){const s=h('select',{},['welcome','command','post'].map(x=>h('option',{value:x},x))),l=h('input',{placeholder:'Button text'}),u=h('input',{placeholder:'https://...'});return crud('btn',S.buttons,[s,l,u],()=>({a:l.value,b:u.value,m:s.value}),null,x=>'🔘 '+x.label,x=>'['+x.scope+'] '+x.url)},
adm(){if(!S.owner)return h('div',{class:'card empty'},'Only the owner can add admins');const u=h('input',{placeholder:'@username'});const cb=['commands','ai','moderation','autopost','settings'].map(x=>[x,h('input',{type:'checkbox'})]);return crud('adm',S.admins,[u,cb.map(c=>h('label',{class:'row'},c[0],h('span',{class:'sw'},c[1],h('i'))))],()=>({a:u.value,b:cb.filter(c=>c[1].checked).map(c=>c[0]).join(',')||'commands'}),null,x=>'👑 @'+x.username,x=>x.perms,'Admins open the panel from your bot with /start.')},
set(){const n=h('input',{placeholder:'New bot name',value:S.bot.name||''});return h('div',{},h('div',{class:'card'},h('b',{},'🔗 Connected group'),h('p',{},S.bot.group_name||'—'),S.owner?h('button',{class:'d',onclick:()=>{if(confirm('Disconnect this group?'))api('/api/p/ungroup',{id:B}).then(draw)}},'Disconnect group'):null),h('div',{class:'card'},n,h('button',{onclick:()=>api('/api/p/name',{id:B,name:n.value}).then(()=>toast('Name changed ✅'))},'✏️ Change name'),h('button',{onclick:()=>api('/api/p/logo',{id:B}).then(()=>{toast('Send the photo in the bot chat 📩');TW&&setTimeout(()=>TW.close(),1200)})},'🖼 Change logo')),h('div',{class:'card'},h('b',{},'⏱ Slow mode'),h('p',{class:'hint'},'Telegram shows its countdown (Slow Mode is active...) only for its built-in slow mode, which bots cannot turn on. Open your group, then Edit, Permissions, Slow mode, and pick a delay.')),txt('Timezone offset in minutes (Bangladesh = 360)','tz'),S.owner?V.del():null)},
del(){return h('div',{class:'card'},h('p',{},'Bot: @'+S.bot.username),h('button',{class:'d',onclick:()=>{if(confirm('Delete this bot and all its data permanently?'))api('/api/p/delbot',{id:B}).then(()=>{toast('Deleted');load()})}},'🗑 Delete bot'))}};
function gate(){const i=h('input',{placeholder:'https://t.me/yourgroup  or  @yourgroup  or  -100123...'}),err=h('div',{class:'err'}),b=h('button',{onclick:()=>{err.textContent='';b.disabled=true;api('/api/p/group',{id:B,ref:i.value}).then(d=>{toast('Group connected: '+d.name);draw()}).catch(e=>{err.textContent=e.msg||'Could not connect';b.disabled=false})}},'🔗 Connect');
document.body.append(h('div',{class:'modal',id:'gate'},h('div',{class:'card'},h('h3',{},'🔗 Connect your group'),h('ol',{},h('li',{},'Add this bot to your group.'),h('li',{},'Make it an admin and give it ALL permissions (delete messages, restrict members, pin messages, invite users).'),h('li',{},'Paste your group link or @username below and tap Connect.')),i,err,b)))}
async function draw(){const g=$('#gate');if(g)g.remove();S=await api('/api/p/state?id='+B);const m=$('#main');m.textContent='';if(!S.bot.group_id){$('#tabs').textContent='';return gate()}tabs(T,tab,x=>{tab=x;draw()});if(!S.bot.status)m.append(h('div',{class:'card warn'},'⚠️ This bot is disabled by the admin — read-only'));m.append(V[tab]())}
async function load(){const d=await api('/api/p/bots');if(!d.bots.length){$('#main').textContent='';$('#main').append(h('div',{class:'card empty'},'No access to this bot'));return}B=d.bots[0].id;draw()}
if(!TW||!TW.initData||VIA==='0'){$('#main').textContent='';$('#main').append(h('div',{class:'card empty'},'🔒 This panel opens only inside Telegram. Open your bot, send /start and tap the Control Panel button.'))}else load();`;

const SETK = ['welcome_on', 'welcome_text', 'url_on', 'url_act', 'bad_on', 'bad_act', 'bad_words', 'warn_limit', 'ai_on', 'flood_on', 'flood_act', 'flood_n', 'flood_s', 'dup_on', 'dup_act', 'cooldown_on', 'cooldown_sec', 'tz'];

// Verify Telegram Mini App initData (HMAC). Every request is verified, so there is no session to expire.
async function auth(e, r, u) {
  const init = r.headers.get('x-init') || '', via = +(r.headers.get('x-bot') || 0) || 0;
  const q = new URLSearchParams(init), hash = q.get('hash'); q.delete('hash');
  if (!init || !hash || !via) return null;
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
  if (!a) return J({ error: 'Open the panel from inside Telegram' }, 401);
  const post = r.method === 'POST', uid = a.uid;
  if ((await one(e, 'SELECT blocked FROM users WHERE id=?', uid))?.blocked) return J({ error: 'Your account has been blocked.' }, 403);
  if (a.uname) await run(e, 'UPDATE bot_admins SET tg_id=? WHERE tg_id IS NULL AND username=?', uid, a.uname);
  if (p === '/api/p/bots') {
    const U = await one(e, 'SELECT vip,bot_limit FROM users WHERE id=?', uid);
    return J({ lang: (await getS(e, 'user:' + uid, 'lang')) === 'bn' ? 'bn' : 'en', info: U ? { vip: U.vip, limit: U.vip ? U.bot_limit : 1 } : null, bots: await all(e, 'SELECT id,username,name,group_name FROM bots WHERE (owner=? OR id IN (SELECT bot FROM bot_admins WHERE tg_id=?))' + (a.via ? ' AND id=' + a.via : ''), uid, uid) });
  }
  if (p === '/api/p/lang') { await setS(e, 'user:' + uid, 'lang', r.method === 'POST' && (await r.clone().json().catch(() => ({}))).lang === 'bn' ? 'bn' : 'en'); return J({ ok: 1 }); }
  if (p === '/api/p/newbot') {
    if (a.via) return J({ error: 'Open the Bot Builder from the main bot to create bots' }, 403);
    const U = await one(e, 'SELECT * FROM users WHERE id=?', uid); if (!U || U.blocked) return J({ error: 'Account unavailable' }, 403);
    const nb = await r.clone().json().catch(() => ({})), x = await createBot(e, uid, U, String(nb.token || '').trim(), u.origin);
    return x.ok ? J({ ok: 1 }) : J({ error: { bad: 'Invalid token', limit: 'Bot limit reached. Get VIP for more bots.', dup: 'This bot is already added' }[x.code] }, 400);
  }
  const b = post ? await r.json().catch(() => ({})) : {};
  const id = +(b.id || u.searchParams.get('id'));
  const bot = a.via && id !== a.via ? null : await one(e, 'SELECT * FROM bots WHERE id=? AND (owner=? OR id IN (SELECT bot FROM bot_admins WHERE tg_id=?))', id, uid, uid);
  if (!bot) return J({ error: 'You have no access to this bot' }, 403);
  if (post && !bot.status) return J({ error: 'This bot is disabled, changes are not allowed' }, 403);
  const own = bot.owner === uid, perms = own ? [] : ((await one(e, 'SELECT perms FROM bot_admins WHERE bot=? AND tg_id=?', id, uid))?.perms || '').split(',');
  const can = (x) => own || perms.includes(x), no = () => J({ error: 'You do not have permission for this' }, 403);
  if (p.startsWith('/api/p/ai') && !can('ai')) return no();
  if ((p === '/api/p/group' || p === '/api/p/delbot') && !own) return no();
  if (p === '/api/p/add' || p === '/api/p/del' || p === '/api/p/edit') { const pm = { cmd: 'commands', ar: 'commands', btn: 'settings', post: 'autopost', aik: 'ai', file: 'ai' }; if (b.t === 'adm' ? !own : !can(pm[b.t])) return no(); }
  const pub = { id: bot.id, name: bot.name, group_id: bot.group_id, username: bot.username, group_name: bot.group_name, status: bot.status };
  if (p === '/api/p/state') {
    const st = Object.fromEntries((await all(e, 'SELECT k,n FROM stats WHERE bot=?', id)).map((x) => [x.k, x.n]));
    const cfg = await cfgOf(e, id); const ks = !!cfg.ai_key; delete cfg.ai_key; cfg.ai_key_set = ks ? '1' : '';
    return J({ bot: pub, owner: own, files: await all(e, 'SELECT id,name,kind,body FROM files WHERE bot=?', id), apis: await all(e, 'SELECT id,kind,model FROM ai_keys WHERE bot=?', id), posts: await all(e, 'SELECT id,body,run_at,rep,mins,act FROM scheduled_posts WHERE bot=?', id), buttons: await all(e, 'SELECT id,scope,label,url FROM buttons WHERE bot=?', id), admins: own ? await all(e, 'SELECT id,username,tg_id,perms FROM bot_admins WHERE bot=?', id) : [], cfg, stats: st, commands: await all(e, 'SELECT id,name,resp FROM commands WHERE bot=?', id), replies: await all(e, 'SELECT id,trig,mode,resp FROM auto_replies WHERE bot=?', id) });
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
    if (!body || isNaN(t)) return J({ error: 'Enter a message and a date-time' }, 400);
    if (t - tz * 60000 < Date.now() - 60000) return J({ error: 'Choose a future date and time' }, 400);
    await run(e, 'INSERT INTO scheduled_posts(bot,body,run_at,rep,mins) VALUES(?,?,?,?,?)', id, body, t - tz * 60000, ['once', 'daily', 'weekly', 'custom'].includes(b.rep) ? b.rep : 'once', Math.max(1, +b.mins || 60)); return J({ ok: 1 });
  }
  if (p === '/api/p/pin') {
    if (!can('autopost')) return no();
    if (!bot.group_id) return J({ error: 'Connect a group first' }, 400);
    if (b.unpin) { await tg(bot.token, 'unpinAllChatMessages', { chat_id: bot.group_id }); return J({ ok: 1 }); }
    const txt = String(b.text || '').trim(); if (!txt) return J({ error: 'Write a message' }, 400);
    const m = await tg(bot.token, 'sendMessage', { chat_id: bot.group_id, text: txt });
    if (!m.ok) return J({ error: 'Could not send the message' }, 400);
    await tg(bot.token, 'pinChatMessage', { chat_id: bot.group_id, message_id: m.result.message_id }); return J({ ok: 1 });
  }
  if (p === '/api/p/aikey') {
    const k = String(b.key || '').trim(); if (!k) return J({ error: 'Enter an API key' }, 400);
    const kind = k.startsWith('sk-or-') ? 'openrouter' : k.startsWith('AIza') ? 'gemini' : 'custom';
    if (kind === 'custom' && !/^https:\/\//.test(b.url || '')) return J({ error: 'Enter an https:// URL for a custom API' }, 400);
    if ((await one(e, 'SELECT COUNT(*) c FROM ai_keys WHERE bot=?', id)).c >= 5) return J({ error: 'You can add up to 5 APIs' }, 400);
    await run(e, 'INSERT INTO ai_keys(bot,kind,url,k,model) VALUES(?,?,?,?,?)', id, kind, kind === 'custom' ? b.url : '', k.slice(0, 300), String(b.model || '').trim().slice(0, 200));
    return J({ ok: 1 });
  }
  if (p === '/api/p/ai') { const sc = 'bot:' + id; for (const [k, v] of [['ai_prompt', b.prompt], ['ai_kb', b.kb], ['ai_fallback', b.fallback], ['ai_name', b.name], ['ai_admin', b.admin], ['ai_tone', b.tone]]) await setS(e, sc, k, String(v || '').slice(0, { ai_kb: 20000, ai_prompt: 4000, ai_fallback: 500, ai_name: 60, ai_admin: 100, ai_tone: 20 }[k])); return J({ ok: 1 }); }
  if (p === '/api/p/aitest') {
    const out = await aiReply(e, bot, { ...(await cfgOf(e, id)), ai_on: '1', ai_fallback: '\u0000F' }, 'Say hi in one short sentence.', { first_name: 'Test' }, 'test');
    return J(out && out !== '\u0000F' ? { ok: 1, text: out } : { ok: 0, err: aiErr() || 'No API added yet' });
  }
  if (p === '/api/p/name') {
    if (!can('settings')) return no();
    const nm = String(b.name || '').trim().slice(0, 64); if (!nm) return J({ error: 'Enter a name' }, 400);
    if (!(await tg(bot.token, 'setMyName', { name: nm })).ok) return J({ error: 'Could not change the name (try again later)' }, 400);
    await run(e, 'UPDATE bots SET name=? WHERE id=?', nm, id); return J({ ok: 1 });
  }
  if (p === '/api/p/logo') {
    if (!can('settings')) return no();
    await setS(e, 'bot:' + id, 'await_logo', String(uid));
    const r = await tg(bot.token, 'sendMessage', { chat_id: uid, text: '🖼 Send the bot’s new logo here as a photo.' });
    return r.ok ? J({ ok: 1 }) : J({ error: 'Send /start to the bot first, then try again' }, 400);
  }
  if (p === '/api/p/edit') {
    const resp = String(b.b || '').trim().slice(0, b.t === 'file' ? 8000 : 3000), a = String(b.a || '').trim(), rid = +b.rid;
    if (!a || !resp) return J({ error: 'Please fill in all fields' }, 400);
    if (b.t === 'cmd') {
      const name = a.replace(/^\//, '').toLowerCase();
      if (!/^[a-z0-9_]{1,32}$/.test(name)) return J({ error: 'Command: use only a-z, 0-9, _' }, 400);
      if (await one(e, 'SELECT id FROM commands WHERE bot=? AND name=? AND id!=?', id, name, rid)) return J({ error: 'This command already exists' }, 400);
      await run(e, 'UPDATE commands SET name=?,resp=? WHERE id=? AND bot=?', name, resp, rid, id); await syncCmds(e, bot);
    } else if (b.t === 'ar') {
      await run(e, 'UPDATE auto_replies SET trig=?,mode=?,resp=? WHERE id=? AND bot=?', a.slice(0, 200), ['exact', 'ci', 'contains'].includes(b.m) ? b.m : 'contains', resp, rid, id);
    } else if (b.t === 'file') {
      if (!['link', 'text', 'code'].includes(b.m)) return J({ error: 'Invalid request' }, 400);
      await run(e, 'UPDATE files SET name=?,kind=?,body=? WHERE id=? AND bot=?', a.slice(0, 80), b.m, resp, rid, id);
    } else return J({ error: 'Invalid request' }, 400);
    return J({ ok: 1 });
  }
  if (p === '/api/p/add') {
    const resp = String(b.b || '').trim().slice(0, 3000), a = String(b.a || '').trim();
    if (!a || !resp) return J({ error: 'Please fill in all fields' }, 400);
    if (b.t === 'cmd') {
      const name = a.replace(/^\//, '').toLowerCase();
      if (!/^[a-z0-9_]{1,32}$/.test(name)) return J({ error: 'Command: use only a-z, 0-9, _' }, 400);
      if (await one(e, 'SELECT id FROM commands WHERE bot=? AND name=?', id, name)) return J({ error: 'This command already exists' }, 400);
      await run(e, 'INSERT INTO commands(bot,name,resp) VALUES(?,?,?)', id, name, resp);
    } else if (b.t === 'ar') {
      await run(e, 'INSERT INTO auto_replies(bot,trig,mode,resp) VALUES(?,?,?,?)', id, a.slice(0, 200), ['exact', 'ci', 'contains'].includes(b.m) ? b.m : 'contains', resp);
    } else if (b.t === 'file') {
      if (!['link', 'text', 'code'].includes(b.m)) return J({ error: 'Invalid request' }, 400);
      if ((await one(e, 'SELECT COUNT(*) c FROM files WHERE bot=?', id)).c >= 50) return J({ error: 'You can add up to 50 files' }, 400);
      await run(e, 'INSERT INTO files(bot,name,kind,body) VALUES(?,?,?,?)', id, a.slice(0, 80), b.m, String(b.b || '').trim().slice(0, 8000));
    } else if (b.t === 'btn') {
      if (!/^https:\/\//.test(resp) || !['welcome', 'command', 'post'].includes(b.m)) return J({ error: 'The link must start with https://' }, 400);
      await run(e, 'INSERT INTO buttons(bot,scope,label,url) VALUES(?,?,?,?)', id, b.m, a.slice(0, 60), resp);
    } else if (b.t === 'adm') {
      const un = a.replace(/^@/, '').toLowerCase();
      if (!/^[a-z0-9_]{3,32}$/.test(un)) return J({ error: 'Enter a valid @username' }, 400);
      await run(e, 'INSERT INTO bot_admins(bot,username,perms) VALUES(?,?,?)', id, un, resp.split(',').filter((x) => ['commands', 'ai', 'moderation', 'autopost', 'settings'].includes(x)).join(',') || 'commands');
    } else return J({ error: 'Invalid request' }, 400);
    if (b.t === 'cmd' || b.t === 'file') await syncCmds(e, bot);
    return J({ ok: 1 });
  }
  if (p === '/api/p/del') {
    const t = { cmd: 'commands', ar: 'auto_replies', btn: 'buttons', post: 'scheduled_posts', adm: 'bot_admins', aik: 'ai_keys', file: 'files' }[b.t];
    if (!t) return J({ error: 'Invalid request' }, 400);
    await run(e, `DELETE FROM ${t} WHERE id=? AND bot=?`, +b.rid, id); if (b.t === 'cmd' || b.t === 'file') await syncCmds(e, bot); return J({ ok: 1 });
  }
  if (p === '/api/p/group') {
    const ref = String(b.ref || '').trim().replace(/^https?:\/\//i, '').replace(/^(t\.me|telegram\.me)\//i, '').replace(/^@/, '').split(/[\/?]/)[0];
    if (!ref) return J({ error: 'Enter your group link or @username' }, 400);
    if (/^(\+|joinchat)/i.test(ref)) return J({ error: 'Private invite links cannot be used. Use the group’s public @username or its numeric id (-100…).' }, 400);
    if (!/^(-?\d+|[A-Za-z][A-Za-z0-9_]{3,31})$/.test(ref)) return J({ error: 'That does not look like a valid group link or username.' }, 400);
    const chat = await tg(bot.token, 'getChat', { chat_id: /^-?\d+$/.test(ref) ? +ref : '@' + ref });
    if (!chat.ok) return J({ error: 'Group not found. Check the link or username, and make sure the bot has been added to the group.' }, 400);
    if (!['group', 'supergroup'].includes(chat.result.type)) return J({ error: 'This is not a group. Please enter a group, not a channel or a user.' }, 400);
    const cm = await tg(bot.token, 'getChatMember', { chat_id: chat.result.id, user_id: +bot.token.split(':')[0] });
    if (!cm.ok || ['left', 'kicked'].includes(cm.result.status)) return J({ error: 'The bot is not in this group. Add it to the group first.' }, 400);
    if (cm.result.status !== 'administrator') return J({ error: 'The bot is not an admin of this group. Make it an admin with all permissions.' }, 400);
    const need = [['can_delete_messages', 'Delete messages'], ['can_restrict_members', 'Restrict members'], ['can_pin_messages', 'Pin messages'], ['can_invite_users', 'Invite users']].filter((x) => !cm.result[x[0]]).map((x) => x[1]);
    if (need.length) return J({ error: 'The bot is missing permissions: ' + need.join(', ') + '. Give it all permissions and try again.' }, 400);
    if (await one(e, 'SELECT id FROM bots WHERE group_id=? AND id!=?', chat.result.id, id)) return J({ error: 'This group is connected to another bot' }, 400);
    await run(e, 'UPDATE bots SET group_id=?,group_name=? WHERE id=?', chat.result.id, chat.result.title || ref, id);
    await setS(e, 'bot:' + id, 'group_user', chat.result.username || '');
    await syncCmds(e, { ...bot, group_id: chat.result.id });
    const mc = await tg(bot.token, 'getChatMemberCount', { chat_id: chat.result.id });
    return J({ name: chat.result.title, members: mc.result || 0 });
  }
  if (p === '/api/p/ungroup') {
    if (!own) return no();
    if (bot.group_id) await tg(bot.token, 'deleteMyCommands', { scope: { type: 'chat', chat_id: bot.group_id } });
    await run(e, 'UPDATE bots SET group_id=NULL,group_name=NULL WHERE id=?', id); return J({ ok: 1 });
  }
  if (p === '/api/p/delbot') {
    await tg(bot.token, 'deleteWebhook');
    for (const t of ['commands', 'auto_replies', 'warnings', 'stats', 'scheduled_posts', 'buttons', 'bot_admins', 'msglog', 'ai_keys', 'files']) await run(e, `DELETE FROM ${t} WHERE bot=?`, id);
    await run(e, 'DELETE FROM settings WHERE scope=?', 'bot:' + id);
    await run(e, 'DELETE FROM bots WHERE id=?', id); return J({ ok: 1 });
  }
  return J({ error: 'Not found' }, 404);
}
