// Main Admin Panel (/x/adme) + admin API
import { one, all, run, getS, setS, cfgOf, log, hashPw, checkPw, J, H, session, sameOrigin, newSession, ck, redirect } from './database.js';
import { page } from './panel.js';
import { tg, runQueue } from './telegram.js';

const AJS = `const M=window.MODE;let ST=null,tab='main';
const T=[['main','🤖','Main Bot'],['dash','📊','Dashboard'],['users','👥','Users'],['bots','🧩','User Bots'],['aip','🔌','AI Providers'],['aim','🤖','AI Models'],['join','🔗','Join'],['grp','🏘','Groups'],['help','🆘','Help'],['bc','📢','Broadcast'],['logs','📜','Logs'],['set','⚙️','Settings']];
const P=(a,b)=>api(a,b);
function auth(){const u=h('input',{placeholder:'Username',autocomplete:'username'}),p=h('input',{type:'password',placeholder:'Password (কমপক্ষে ৮)',autocomplete:'current-password'}),c=h('input',{type:'password',placeholder:'Password আবার দিন'});
$('#main').textContent='';$('#main').append(h('div',{class:'card'},h('b',{},M==='setup'?'Main Admin তৈরি করুন':'Admin Login'),u,p,M==='setup'?c:null,h('button',{onclick:()=>{if(M==='setup'&&p.value!==c.value)return toast('Password মেলেনি',1);P('/x/adme/'+M,{username:u.value,password:p.value}).then(()=>location.reload())}},M==='setup'?'Create Admin':'Login')))}
const sv=(k,v)=>P('/api/a/settings',{k,v}).then(()=>toast('সংরক্ষিত ✅'));
const V={
main(){const i=h('input',{type:'password',placeholder:'Bot Token paste করুন'});return h('div',{class:'card'},h('p',{},ST.main?'✅ Connected: @'+ST.main:'⚠️ Main Bot এখনো সেট হয়নি'),i,h('button',{onclick:()=>P('/api/a/mainbot',{token:i.value}).then(()=>{toast('Webhook সেট ✅');i.value='';load()})},'Connect & Auto Setup'),h('button',{onclick:()=>P('/api/a/mainbot',{token:''}).then(()=>toast('Webhook আবার সেট ✅'))},'Re-set Webhook'))},
dash(){return h('div',{},ST.main?null:h('div',{class:'card warn'},'⚠️ আগে Main Bot Setup করুন'),h('div',{class:'card g'},[['Users',ST.users],['Bots',ST.bots],['VIP',ST.vip]].map(x=>h('div',{},h('b',{},x[1]),x[0]))),h('button',{class:'d',onclick:()=>P('/x/adme/logout',{}).then(()=>location.reload())},'Logout'))},
users(){const c=h('div',{}),q=h('input',{placeholder:'🔍 id / username / নাম'});const go=()=>P('/api/a/users?q='+encodeURIComponent(q.value)).then(d=>{c.textContent='';if(!d.users.length)c.append(h('div',{class:'empty'},'কোনো user নেই'));d.users.forEach(x=>{const l=h('input',{type:'number',value:x.bot_limit,min:1}),dy=h('input',{type:'number',placeholder:'দিন',min:0});c.append(h('div',{class:'card'},h('b',{},x.first_name+' @'+x.username+' ('+x.id+')'),h('div',{},'🤖 '+(x.bots||'কোনো বট নেই')),h('label',{class:'row'},'VIP',(()=>{const i=h('input',{type:'checkbox'});i.checked=!!x.vip;i.onchange=()=>P('/api/a/user',{id:x.id,f:'vip',v:i.checked?1:0}).then(()=>toast('✅'));return h('span',{class:'sw'},i,h('i'))})()),h('label',{},'VIP মেয়াদ (দিন, ০ = স্থায়ী)'),dy,h('button',{onclick:()=>P('/api/a/user',{id:x.id,f:'vip_days',v:+dy.value}).then(()=>toast('VIP সেট ✅'))},'Set VIP'),h('label',{},'Bot limit'),l,h('button',{onclick:()=>P('/api/a/user',{id:x.id,f:'bot_limit',v:+l.value}).then(()=>toast('✅'))},'Save limit'),h('button',{class:'d',onclick:()=>P('/api/a/user',{id:x.id,f:'blocked',v:x.blocked?0:1}).then(()=>{toast('✅');go()})},x.blocked?'Unblock':'Block'),h('button',{onclick:()=>{const t=prompt('মেসেজ লিখুন');t&&P('/api/a/dm',{id:x.id,text:t}).then(()=>toast('পাঠানো হয়েছে ✅'))}},'✉️ Message')))})});q.onchange=go;go();return h('div',{},q,c)},
bots(){const c=h('div',{});P('/api/a/bots').then(d=>{if(!d.bots.length)c.append(h('div',{class:'empty'},'কোনো বট নেই'));d.bots.forEach(b=>c.append(h('div',{class:'card'},h('b',{},'@'+b.username),h('p',{},'Owner: '+(b.oname||'')+' @'+(b.ouser||'')+' ('+b.owner+') | Group: '+(b.group_name||'—')+' | '+(b.status?'🟢 Active':'🔴 Disabled')),h('button',{onclick:()=>P('/api/a/bottoggle',{id:b.id}).then(()=>{toast('✅');draw()})},b.status?'Disable':'Enable'),h('button',{onclick:()=>P('/api/a/botinfo',{id:b.id}).then(d=>alert(d.text))},'ℹ️ Info'))))});return c},
aip(){const c=h('div',{});P('/api/a/aiprov').then(d=>d.items.forEach(x=>{const i=h('input',{type:'checkbox'});i.checked=!!x.act;i.onchange=()=>P('/api/a/aiprov',{id:x.id,act:i.checked?1:0}).then(()=>toast('✅'));c.append(h('div',{class:'card row'},h('b',{},x.name),h('span',{class:'sw'},i,h('i'))))}));return c},
aim(){const k=h('select',{},['openrouter','gemini','custom'].map(x=>h('option',{value:x},x))),m=h('input',{placeholder:'Model id (যেমন google/gemma-2-9b-it:free)'}),p=h('input',{type:'number',placeholder:'Priority (ছোট = আগে)',value:10}),fr=h('input',{type:'checkbox'});fr.checked=true;const c=h('div',{});const go=()=>P('/api/a/aimodels').then(d=>{c.textContent='';if(!d.items.length)c.append(h('div',{class:'empty'},'কোনো fallback model নেই'));d.items.forEach(x=>{const i=h('input',{type:'checkbox'});i.checked=!!x.act;i.onchange=()=>P('/api/a/aimodels',{op:'toggle',id:x.id}).then(()=>toast('✅'));c.append(h('div',{class:'card row'},h('span',{},x.kind+' · '+x.model+' · P'+x.prio+(x.free?' · free':' · paid')),h('span',{class:'sw'},i,h('i')),h('button',{class:'d',onclick:()=>confirm('মুছবেন?')&&P('/api/a/aimodels',{op:'del',id:x.id}).then(go)},'🗑')))})});go();return h('div',{},h('div',{class:'card'},k,m,p,h('label',{class:'row'},'Free model',h('span',{class:'sw'},fr,h('i'))),h('button',{onclick:()=>P('/api/a/aimodels',{op:'add',kind:k.value,model:m.value,prio:+p.value,free:fr.checked?1:0}).then(go)},'➕ Add')),c)},
grp(){const c=h('div',{});P('/api/a/groups').then(d=>{if(!d.items.length)c.append(h('div',{class:'empty'},'কোনো Group যুক্ত নেই'));d.items.forEach(x=>c.append(h('div',{class:'card'},h('b',{},'👥 '+x.group_name),h('p',{},'Bot: @'+x.bot+' | Owner: '+(x.oname||'')+' @'+(x.ouser||'')+' | ID: '+x.group_id))))});return c},
help(){const t=h('textarea',{rows:4,placeholder:'Help লেখা'}),l=h('input',{placeholder:'Button লেখা (যেমন 📺 ভিডিও)'}),u=h('input',{placeholder:'https://...'}),c=h('div',{});const go=()=>P('/api/a/help').then(d=>{t.value=d.text||'';c.textContent='';d.items.forEach(x=>c.append(h('div',{class:'card row'},h('span',{},x.label+' → '+x.url),h('button',{class:'d',onclick:()=>P('/api/a/help',{op:'del',id:x.id}).then(go)},'🗑'))))});go();return h('div',{},h('div',{class:'card'},t,h('button',{onclick:()=>P('/api/a/help',{text:t.value}).then(()=>toast('✅'))},'Save text')),h('div',{class:'card'},l,u,h('button',{onclick:()=>P('/api/a/help',{op:'add',label:l.value,url:u.value}).then(go)},'➕ Add button')),c)},
join(){const l=h('input',{placeholder:'Button লেখা'}),u=h('input',{placeholder:'https://...'}),c=h('div',{});const go=()=>P('/api/a/join').then(d=>{c.textContent='';if(!d.items.length)c.append(h('div',{class:'empty'},'কোনো Join button নেই'));d.items.forEach(x=>c.append(h('div',{class:'card row'},h('span',{},x.label+' → '+x.url),h('button',{class:'d',onclick:()=>P('/api/a/join',{op:'del',id:x.id}).then(go)},'🗑'))))});go();return h('div',{},h('div',{class:'card'},l,u,h('button',{onclick:()=>P('/api/a/join',{op:'add',label:l.value,url:u.value}).then(go)},'➕ Add')),c)},
bc(){const t=h('textarea',{rows:4,placeholder:'সব user-কে message'}),c=h('div',{class:'card'});const go=()=>P('/api/a/broadcast').then(d=>{c.textContent='';const s=d.s;c.append(h('p',{},s?'Total '+s.total+' | Sent '+(s.sent||0)+' | Failed '+(s.failed||0)+' | Blocked '+(s.blocked||0)+' | Pending '+(s.pending||0):'এখনো কোনো broadcast নেই'))});go();return h('div',{},h('div',{class:'card'},t,h('button',{onclick:()=>confirm('সবাইকে পাঠাবেন?')&&P('/api/a/broadcast',{text:t.value}).then(()=>{toast('Queue-তে যোগ ✅');t.value='';go()})},'📢 Send'),h('button',{onclick:go},'🔄 Refresh')),c)},
logs(){const c=h('div',{});P('/api/a/logs').then(d=>{if(!d.items.length)c.append(h('div',{class:'empty'},'কোনো log নেই'));d.items.forEach(x=>c.append(h('div',{class:'card'},h('b',{},x.type+' · '+new Date(x.ts).toLocaleString()),h('div',{},x.msg))))});return c},
set(){const w=h('textarea',{rows:4,placeholder:'Main welcome text'}),k=h('input',{placeholder:'https://t.me/... (Contact Admin link)'});w.value=ST.welcome||'';k.value=ST.contact||'';return h('div',{class:'card'},w,h('button',{onclick:()=>sv('welcome',w.value)},'Save welcome'),k,h('button',{onclick:()=>sv('contact',k.value)},'Save link'))}};
async function draw(){tabs(T,tab,x=>{tab=x;draw()});const m=$('#main');m.textContent='';m.append(V[tab]())}
async function load(){ST=await P('/api/a/state');if(!ST.main)tab='main';draw()}
if(M==='dash')load();else auth();`;

export async function admin(r, e, u) {
  const p = u.pathname, post = r.method === 'POST';
  const ip = r.headers.get('cf-connecting-ip') || 'x';
  if (p === '/x/adme' && !post) {
    const a = await one(e, 'SELECT id FROM admins WHERE id=1');
    const s = await session(e, r, 's_a');
    const ok = s && s.kind === 'a';
    return H(page('🔐 Main Admin', `window.MODE="${!a ? 'setup' : ok ? 'dash' : 'login'}";` + AJS, ok ? s.csrf : ''));
  }
  if (!post && !p.startsWith('/api/a/')) return J({ error: 'পাওয়া যায়নি' }, 404);
  if (!sameOrigin(r)) return J({ error: 'নিরাপত্তা যাচাই ব্যর্থ (csrf)' }, 403);
  const b = await r.json().catch(() => ({}));
  if (p === '/x/adme/setup') {
    const un = String(b.username || '').trim();
    if (!un || String(b.password || '').length < 8) return J({ error: 'Username দিন ও Password কমপক্ষে ৮ অক্ষর রাখুন' }, 400);
    try { await run(e, 'INSERT INTO admins(id,username,pw) VALUES(1,?,?)', un, await hashPw(b.password)); } catch (x) { return J({ error: 'Admin আগেই তৈরি হয়েছে' }, 400); }
    await log(e, 'admin', 'main admin created');
    const s = await newSession(e, 'a', 1);
    return new Response(JSON.stringify({ ok: 1 }), { headers: { 'content-type': 'application/json', 'set-cookie': ck('s_a', s.id), 'x-frame-options': 'DENY', 'referrer-policy': 'same-origin' } });
  }
  if (p === '/x/adme/login') {
    const fails = (await one(e, "SELECT COUNT(*) c FROM logs WHERE type='login_fail' AND msg=? AND ts>?", ip, Date.now() - 600000)).c;
    if (fails >= 5) return J({ error: 'অনেকবার ভুল হয়েছে, ১০ মিনিট পরে চেষ্টা করুন' }, 429);
    const a = await one(e, 'SELECT * FROM admins WHERE id=1');
    if (!a || a.username !== b.username || !(await checkPw(String(b.password || ''), a.pw))) { await log(e, 'login_fail', ip); return J({ error: 'Username বা Password ভুল' }, 401); }
    await log(e, 'login', 'admin');
    const s = await newSession(e, 'a', 1);
    return new Response(JSON.stringify({ ok: 1 }), { headers: { 'content-type': 'application/json', 'set-cookie': ck('s_a', s.id), 'x-frame-options': 'DENY', 'referrer-policy': 'same-origin' } });
  }
  const s = await session(e, r, 's_a');
  if (!s || s.kind !== 'a') return J({ error: 'আবার লগইন করুন' }, 401);
  if (r.headers.get('x-csrf') !== s.csrf && p !== '/x/adme/logout') return J({ error: 'নিরাপত্তা যাচাই ব্যর্থ, পেজ রিফ্রেশ করুন' }, 403);
  if (p === '/x/adme/logout') { await run(e, 'DELETE FROM sessions WHERE id=?', s.id); return J({ ok: 1 }); }
  if (p === '/api/a/mainbot') {
    let token = String(b.token || '').trim();
    if (!token) token = (await getS(e, 'global', 'main_token')) || '';
    if (!token) return J({ error: 'Token দিন' }, 400);
    const me = await tg(token, 'getMe');
    if (!me.ok) return J({ error: 'Token সঠিক নয়' }, 400);
    const secret = (await getS(e, 'global', 'main_secret')) || crypto.randomUUID().replace(/-/g, '');
    const wh = await tg(token, 'setWebhook', { url: u.origin + '/tg/main', secret_token: secret, allowed_updates: ['message', 'callback_query'] });
    if (!wh.ok) return J({ error: 'Webhook সেট হয়নি' }, 400);
    await setS(e, 'global', 'main_token', token); await setS(e, 'global', 'main_secret', secret); await setS(e, 'global', 'main_username', me.result.username);
    await log(e, 'webhook_set', '@' + me.result.username); return J({ ok: 1 });
  }
  if (p === '/api/a/state') {
    const c = async (q) => (await one(e, q)).c;
    return J({ main: await getS(e, 'global', 'main_username'), users: await c('SELECT COUNT(*) c FROM users'), bots: await c('SELECT COUNT(*) c FROM bots'), vip: await c('SELECT COUNT(*) c FROM users WHERE vip=1'), welcome: await getS(e, 'global', 'welcome'), contact: await getS(e, 'global', 'contact') });
  }
  if (p === '/api/a/users') {
    const q = '%' + (u.searchParams.get('q') || '') + '%';
    return J({ users: await all(e, 'SELECT id,username,first_name,chat_id,vip,bot_limit,blocked,(SELECT group_concat('@'||username||IFNULL(' ['||group_name||']','')) FROM bots WHERE owner=users.id) bots FROM users WHERE CAST(id AS TEXT) LIKE ? OR username LIKE ? OR first_name LIKE ? ORDER BY created DESC LIMIT 50', q, q, q) });
  }
  if (p === '/api/a/user' && b.f === 'vip_days') { const d = Math.max(0, +b.v || 0); await run(e, 'UPDATE users SET vip=1,vip_till=? WHERE id=?', d ? Date.now() + d * 864e5 : 0, +b.id); await log(e, 'admin', `vip ${b.id} ${d}d`); return J({ ok: 1 }); }
  if (p === '/api/a/user') {
    if (!['vip', 'bot_limit', 'blocked'].includes(b.f)) return J({ error: 'ভুল অনুরোধ' }, 400);
    await run(e, `UPDATE users SET ${b.f}=? WHERE id=?`, Math.max(0, +b.v || 0), +b.id); await log(e, 'admin', `user ${b.id} ${b.f}=${b.v}`); return J({ ok: 1 });
  }
  if (p === '/api/a/bots') return J({ bots: await all(e, 'SELECT b.id,b.owner,b.username,b.group_name,b.status,u.first_name oname,u.username ouser FROM bots b LEFT JOIN users u ON u.id=b.owner ORDER BY b.id DESC LIMIT 100') });
  if (p === '/api/a/bottoggle') { await run(e, 'UPDATE bots SET status=1-status WHERE id=?', +b.id); return J({ ok: 1 }); }
  if (p === '/api/a/groups') return J({ items: await all(e, 'SELECT b.username bot,b.group_name,b.group_id,u.first_name oname,u.username ouser FROM bots b LEFT JOIN users u ON u.id=b.owner WHERE b.group_id IS NOT NULL') });
  if (p === '/api/a/help') {
    if (b.op === 'add') {
      if (!/^https:\/\//.test(b.url || '') || !String(b.label || '').trim()) return J({ error: 'লেখা ও https লিংক দিন' }, 400);
      await run(e, "INSERT INTO buttons(bot,scope,label,url) VALUES(0,'help',?,?)", String(b.label).trim().slice(0, 60), b.url); return J({ ok: 1 });
    }
    if (b.op === 'del') { await run(e, "DELETE FROM buttons WHERE id=? AND bot=0 AND scope='help'", +b.id); return J({ ok: 1 }); }
    if (b.text !== undefined) await setS(e, 'global', 'help_text', String(b.text).slice(0, 3000));
    return J({ text: await getS(e, 'global', 'help_text'), items: await all(e, "SELECT id,label,url FROM buttons WHERE bot=0 AND scope='help'") });
  }
  if (p === '/api/a/logs') return J({ items: await all(e, 'SELECT type,msg,ts FROM logs ORDER BY id DESC LIMIT 100') });
  if (p === '/api/a/join') {
    if (b.op === 'add') {
      if (!/^https:\/\//.test(b.url || '') || !String(b.label || '').trim()) return J({ error: 'লেখা ও https লিংক দিন' }, 400);
      await run(e, 'INSERT INTO join_buttons(label,url) VALUES(?,?)', String(b.label).trim().slice(0, 60), b.url); return J({ ok: 1 });
    }
    if (b.op === 'del') { await run(e, 'DELETE FROM join_buttons WHERE id=?', +b.id); return J({ ok: 1 }); }
    return J({ items: await all(e, 'SELECT id,label,url FROM join_buttons') });
  }
  if (p === '/api/a/broadcast') {
    if (b.text !== undefined) {
      const t = String(b.text).trim().slice(0, 3500); if (!t) return J({ error: 'Message লিখুন' }, 400);
      const r = await run(e, 'INSERT INTO broadcasts(text,ts) VALUES(?,?)', t, Date.now());
      await run(e, 'INSERT INTO bq(bid,chat_id) SELECT ?,chat_id FROM users WHERE blocked=0 AND chat_id IS NOT NULL', r.meta.last_row_id);
      await runQueue(e, 20); await log(e, 'broadcast', 'id ' + r.meta.last_row_id); return J({ ok: 1 });
    }
    return J({ s: await one(e, 'SELECT b.id, COUNT(q.id) total, SUM(q.st=1) sent, SUM(q.st=2) failed, SUM(q.st=3) blocked, SUM(q.st=0) pending FROM broadcasts b LEFT JOIN bq q ON q.bid=b.id GROUP BY b.id ORDER BY b.id DESC LIMIT 1') });
  }
  if (p === '/api/a/dm') {
    const T = await getS(e, 'global', 'main_token'), us = await one(e, 'SELECT chat_id FROM users WHERE id=?', +b.id);
    if (!T || !us || !String(b.text || '').trim()) return J({ error: 'পাঠানো যায়নি' }, 400);
    const r = await tg(T, 'sendMessage', { chat_id: us.chat_id, text: String(b.text).slice(0, 3500) });
    return r.ok ? J({ ok: 1 }) : J({ error: 'User message নিতে পারছে না' }, 400);
  }
  if (p === '/api/a/botinfo') {
    const bt = await one(e, 'SELECT * FROM bots WHERE id=?', +b.id); if (!bt) return J({ error: 'পাওয়া যায়নি' }, 404);
    const w = (await tg(bt.token, 'getWebhookInfo')).result || {}, cf = await cfgOf(e, bt.id);
    return J({ text: 'Webhook: ' + (w.url ? '✅' : '❌') + '\nPending: ' + (w.pending_update_count || 0) + '\nLast error: ' + (w.last_error_message || '—') + '\nAI: ' + (cf.ai_on === '1' && cf.ai_key ? 'ON' : 'OFF') + '\nModeration: ' + (['url_on', 'bad_on', 'flood_on', 'dup_on'].filter((k) => cf[k] === '1').join(', ') || 'OFF') });
  }
  if (p === '/api/a/aiprov') {
    if (b.id !== undefined) { await run(e, 'UPDATE ai_providers SET act=? WHERE id=?', b.act ? 1 : 0, +b.id); await log(e, 'admin', 'ai provider ' + b.id); return J({ ok: 1 }); }
    return J({ items: await all(e, 'SELECT id,name,kind,act FROM ai_providers') });
  }
  if (p === '/api/a/aimodels') {
    if (b.op === 'add') {
      if (!['openrouter', 'gemini', 'custom'].includes(b.kind) || !String(b.model || '').trim()) return J({ error: 'Provider ও Model দিন' }, 400);
      await run(e, 'INSERT INTO ai_models(kind,model,prio,free,act) VALUES(?,?,?,?,1)', b.kind, String(b.model).trim().slice(0, 200), +b.prio || 10, b.free ? 1 : 0); return J({ ok: 1 });
    }
    if (b.op === 'toggle') { await run(e, 'UPDATE ai_models SET act=1-act WHERE id=?', +b.id); return J({ ok: 1 }); }
    if (b.op === 'del') { await run(e, 'DELETE FROM ai_models WHERE id=?', +b.id); return J({ ok: 1 }); }
    return J({ items: await all(e, 'SELECT id,kind,model,prio,free,act FROM ai_models ORDER BY prio,id') });
  }
  if (p === '/api/a/settings') {
    if (!['welcome', 'contact'].includes(b.k)) return J({ error: 'ভুল অনুরোধ' }, 400);
    if (b.k === 'contact' && b.v && !/^https:\/\//.test(b.v)) return J({ error: 'লিংক https:// দিয়ে শুরু হতে হবে' }, 400);
    await setS(e, 'global', b.k, String(b.v).slice(0, 2000)); return J({ ok: 1 });
  }
  return J({ error: 'পাওয়া যায়নি' }, 404);
}
