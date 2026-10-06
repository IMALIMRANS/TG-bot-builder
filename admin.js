// Main Admin Panel (/x/adme) + admin API
import { one, all, run, getS, setS, cfgOf, log, hashPw, checkPw, J, H, session, sameOrigin, newSession, ck, redirect } from './database.js';
import { page } from './panel.js';
import { tg, runQueue } from './telegram.js';

const AJS = `const M=window.MODE;let ST=null,tab='main';
const T=[['main','🤖','Main Bot'],['dash','📊','Dashboard'],['users','👥','Users'],['bots','🧩','Bots'],['grp','🏘','Groups'],['vip','⭐','VIP'],['join','🔗','Join'],['help','🆘','Help'],['bc','📢','Broadcast'],['logs','📜','Logs'],['set','⚙️','Settings']];
const P=(a,b)=>api(a,b);
function auth(){const u=h('input',{placeholder:'Username or phone number',autocomplete:'username'}),p=h('input',{type:'password',placeholder:'Password (min 8 characters)',autocomplete:'current-password'}),c=h('input',{type:'password',placeholder:'Confirm password'});
$('#main').textContent='';$('#main').append(h('div',{class:'card'},h('b',{},M==='setup'?'Create Main Admin':'Admin Login'),u,p,M==='setup'?c:null,h('button',{onclick:()=>{if(M==='setup'&&p.value!==c.value)return toast('Passwords do not match',1);P('/x/adme/'+M,{username:u.value,password:p.value}).then(()=>location.reload())}},M==='setup'?'Create Admin':'Login')))}
const sv=(k,v)=>P('/api/a/settings',{k,v}).then(()=>toast('Saved ✅'));
const D=t=>t?new Date(t).toLocaleString():'—';
async function detail(id){const d=await P('/api/a/userdetail',{id}),x=d.user,m=$('#main');m.textContent='';const dy=h('input',{type:'number',placeholder:'VIP days (0 = permanent)',min:0}),l=h('input',{type:'number',value:x.bot_limit,min:1});
const act=o=>P('/api/a/user',Object.assign({id:x.id},o)).then(()=>{toast('Done ✅');detail(id)});
m.append(h('button',{class:'o',onclick:draw},'← Back'),h('div',{class:'card'},h('b',{},x.first_name+(x.username?' @'+x.username:'')),h('p',{},'ID: '+x.id+' · Chat: '+x.chat_id),h('p',{},'📱 '+(d.phone?d.phone+' ✅ verified':'Phone not verified')),h('p',{},'Joined: '+D(x.created)),h('p',{},(x.vip?'⭐ VIP'+(x.vip_till?' until '+D(x.vip_till):' (permanent)'):'Free plan')+' · Bot limit '+x.bot_limit+(x.blocked?' · 🚫 Blocked':''))),
h('div',{class:'card'},dy,h('button',{onclick:()=>act({f:'vip_days',v:+dy.value})},'⭐ Set VIP'),h('button',{class:'o',onclick:()=>act({f:'vip',v:0})},'Remove VIP'),l,h('button',{onclick:()=>act({f:'bot_limit',v:+l.value})},'Save bot limit'),h('button',{class:'d',onclick:()=>act({f:'blocked',v:x.blocked?0:1})},x.blocked?'Unblock':'Block user and bots'),h('button',{onclick:()=>{const t=prompt('Message');t&&P('/api/a/dm',{id:x.id,text:t}).then(()=>toast('Sent ✅'))}},'✉️ Message')),
d.bots.length?d.bots.map(b=>h('div',{class:'item'},h('div',{class:'it'},'🤖 @'+b.username),h('div',{class:'ib'},'Group: '+(b.group_name||'—')+(b.guser?' @'+b.guser:'')+' · '+(b.status?'🟢 Active':'🔴 Disabled')))):h('div',{class:'empty'},'No bots'))}
const V={
main(){const i=h('input',{type:'password',placeholder:'Paste the bot token'});return h('div',{class:'card'},h('p',{},ST.main?'✅ Connected: @'+ST.main:'⚠️ Main bot is not set up yet'),i,h('button',{onclick:()=>P('/api/a/mainbot',{token:i.value}).then(()=>{toast('Webhook set ✅');i.value='';load()})},'Connect & Auto Setup'),h('button',{class:'o',onclick:()=>P('/api/a/mainbot',{token:''}).then(()=>toast('Webhook set again ✅'))},'Re-set Webhook'))},
dash(){return h('div',{},ST.main?null:h('div',{class:'card warn'},'⚠️ Set up the main bot first'),h('div',{class:'card g'},[['Users',ST.users],['Bots',ST.bots],['VIP',ST.vip]].map(x=>h('div',{},h('b',{},x[1]),x[0]))),h('button',{class:'d',onclick:()=>P('/x/adme/logout',{}).then(()=>location.reload())},'Logout'))},
users(){const c=h('div',{}),q=h('input',{placeholder:'🔍 id / username / name / phone'});const go=()=>P('/api/a/users?q='+encodeURIComponent(q.value)).then(d=>{c.textContent='';if(!d.users.length)c.append(h('div',{class:'empty'},'No users'));d.users.forEach(x=>c.append(h('div',{class:'item',onclick:()=>detail(x.id)},h('div',{class:'it'},x.first_name+(x.username?' @'+x.username:'')),h('div',{class:'ib'},(x.vip?'⭐ VIP · ':'')+(x.blocked?'🚫 Blocked · ':'')+'ID '+x.id+(x.phone?' · 📱 '+x.phone:' · not verified')+'\\n🤖 '+(x.bots||'no bots')))))});q.onchange=go;go();return h('div',{},q,h('div',{class:'grid'},c))},
bots(){const c=h('div',{class:'grid'});P('/api/a/bots').then(d=>{if(!d.bots.length)c.append(h('div',{class:'empty'},'No bots'));d.bots.forEach(b=>c.append(h('div',{class:'item'},h('div',{class:'it'},'@'+b.username),h('div',{class:'ib'},'Owner: '+(b.oname||'')+' @'+(b.ouser||'')+' ('+b.owner+')\\nGroup: '+(b.group_name||'—')+' · '+(b.status?'🟢 Active':'🔴 Disabled')),h('div',{class:'ia'},h('button',{class:'s',onclick:()=>P('/api/a/bottoggle',{id:b.id}).then(()=>{toast('Done ✅');draw()})},b.status?'Disable':'Enable'),h('button',{class:'s o',onclick:()=>P('/api/a/botinfo',{id:b.id}).then(d=>alert(d.text))},'ℹ️ Info')))))});return c},
grp(){const c=h('div',{class:'grid'});P('/api/a/groups').then(d=>{if(!d.items.length)c.append(h('div',{class:'empty'},'No groups connected'));d.items.forEach(x=>c.append(h('div',{class:'item'},h('div',{class:'it'},'👥 '+x.group_name+(x.guser?' @'+x.guser:'')),h('div',{class:'ib'},'Bot: @'+x.bot+'\\nOwner: '+(x.oname||'')+' @'+(x.ouser||'')+'\\nGroup ID: '+x.group_id))))});return c},
vip(){const k=h('input',{placeholder:'Contact Admin link (https://t.me/...)'}),t=h('input',{placeholder:'Package title (e.g. Pro — $5/month)',maxlength:100}),b=h('textarea',{rows:4,placeholder:'Package details',maxlength:1500}),c=h('div',{class:'grid'});let eid=null;
const add=h('button',{onclick:()=>P('/api/a/packages',{op:eid?'edit':'add',id:eid,title:t.value,body:b.value}).then(()=>{eid=null;t.value='';b.value='';add.textContent='➕ Add package';go()})},'➕ Add package');
const go=()=>P('/api/a/packages').then(d=>{k.value=d.contact||'';c.textContent='';if(!d.items.length)c.append(h('div',{class:'empty'},'No packages yet'));d.items.forEach(x=>c.append(h('div',{class:'item'},h('div',{class:'it'},x.title),h('div',{class:'ib'},x.body),h('div',{class:'ia'},h('button',{class:'s',onclick:()=>{eid=x.id;t.value=x.title;b.value=x.body;add.textContent='💾 Save changes';window.scrollTo(0,0)}},'✏️ Edit'),h('button',{class:'s d',onclick:()=>confirm('Delete this?')&&P('/api/a/packages',{op:'del',id:x.id}).then(go)},'🗑 Delete')))))});go();
return h('div',{},h('div',{class:'card'},h('b',{},'Contact Admin button'),k,h('button',{onclick:()=>sv('contact',k.value)},'Save link')),h('div',{class:'card'},h('b',{},'VIP packages (shown to users who verify their contact)'),t,b,add),c)},
join(){const l=h('input',{placeholder:'Button text'}),u=h('input',{placeholder:'https://...'}),c=h('div',{class:'grid'}),sw=h('input',{type:'checkbox'});const go=()=>P('/api/a/join').then(d=>{sw.checked=d.on;c.textContent='';if(!d.items.length)c.append(h('div',{class:'empty'},'No join buttons'));d.items.forEach(x=>c.append(h('div',{class:'item'},h('div',{class:'it'},x.label),h('div',{class:'ib'},x.url),h('div',{class:'ia'},h('button',{class:'s d',onclick:()=>P('/api/a/join',{op:'del',id:x.id}).then(go)},'🗑 Delete')))))});sw.onchange=()=>P('/api/a/join',{op:'toggle',on:sw.checked?1:0}).then(()=>toast('Saved ✅'));go();return h('div',{},h('div',{class:'card'},h('label',{class:'row'},'Show join buttons in the main bot',h('span',{class:'sw'},sw,h('i')))),h('div',{class:'card'},l,u,h('button',{onclick:()=>P('/api/a/join',{op:'add',label:l.value,url:u.value}).then(()=>{l.value='';u.value='';go()})},'➕ Add button')),c)},
help(){const t=h('textarea',{rows:4,placeholder:'Help text'}),l=h('input',{placeholder:'Button text (e.g. 📺 Video)'}),u=h('input',{placeholder:'https://...'}),c=h('div',{class:'grid'});const go=()=>P('/api/a/help').then(d=>{t.value=d.text||'';c.textContent='';d.items.forEach(x=>c.append(h('div',{class:'item'},h('div',{class:'it'},x.label),h('div',{class:'ib'},x.url),h('div',{class:'ia'},h('button',{class:'s d',onclick:()=>P('/api/a/help',{op:'del',id:x.id}).then(go)},'🗑 Delete')))))});go();return h('div',{},h('div',{class:'card'},t,h('button',{onclick:()=>P('/api/a/help',{text:t.value}).then(()=>toast('Saved ✅'))},'Save text')),h('div',{class:'card'},l,u,h('button',{onclick:()=>P('/api/a/help',{op:'add',label:l.value,url:u.value}).then(()=>{l.value='';u.value='';go()})},'➕ Add button')),c)},
bc(){const t=h('textarea',{rows:4,placeholder:'Message to all users'}),c=h('div',{class:'card'});const go=()=>P('/api/a/broadcast').then(d=>{c.textContent='';const s=d.s;c.append(h('p',{},s?'Total '+s.total+' | Sent '+(s.sent||0)+' | Failed '+(s.failed||0)+' | Blocked '+(s.blocked||0)+' | Pending '+(s.pending||0):'No broadcast yet'))});go();return h('div',{},h('div',{class:'card'},t,h('button',{onclick:()=>confirm('Send to everyone?')&&P('/api/a/broadcast',{text:t.value}).then(()=>{toast('Queued ✅');t.value='';go()})},'📢 Send'),h('button',{class:'o',onclick:go},'🔄 Refresh')),c)},
logs(){const c=h('div',{});P('/api/a/logs').then(d=>{if(!d.items.length)c.append(h('div',{class:'empty'},'No logs'));d.items.forEach(x=>c.append(h('div',{class:'item'},h('div',{class:'it'},x.type+' · '+D(x.ts)),h('div',{class:'ib'},x.msg))))});return c},
set(){const w=h('textarea',{rows:4,placeholder:'Main bot welcome text'});w.value=ST.welcome||'';return h('div',{class:'card'},w,h('button',{onclick:()=>sv('welcome',w.value)},'Save welcome text'))}};
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
  if (!post && !p.startsWith('/api/a/')) return J({ error: 'Not found' }, 404);
  if (!sameOrigin(r)) return J({ error: 'Security check failed (csrf)' }, 403);
  const b = await r.json().catch(() => ({}));
  if (p === '/x/adme/setup') {
    const un = String(b.username || '').trim();
    if (!un || String(b.password || '').length < 8) return J({ error: 'Enter a username and a password of at least 8 characters' }, 400);
    try { await run(e, 'INSERT INTO admins(id,username,pw) VALUES(1,?,?)', un, await hashPw(b.password)); } catch (x) { return J({ error: 'Admin already exists' }, 400); }
    await log(e, 'admin', 'main admin created');
    const s = await newSession(e, 'a', 1);
    return new Response(JSON.stringify({ ok: 1 }), { headers: { 'content-type': 'application/json', 'set-cookie': ck('s_a', s.id), 'x-frame-options': 'DENY', 'referrer-policy': 'same-origin' } });
  }
  if (p === '/x/adme/login') {
    const fails = (await one(e, "SELECT COUNT(*) c FROM logs WHERE type='login_fail' AND msg=? AND ts>?", ip, Date.now() - 600000)).c;
    if (fails >= 5) return J({ error: 'Too many failed attempts, try again in 10 minutes' }, 429);
    const a = await one(e, 'SELECT * FROM admins WHERE id=1');
    if (!a || a.username !== b.username || !(await checkPw(String(b.password || ''), a.pw))) { await log(e, 'login_fail', ip); return J({ error: 'Wrong username or password' }, 401); }
    await log(e, 'login', 'admin');
    const s = await newSession(e, 'a', 1);
    return new Response(JSON.stringify({ ok: 1 }), { headers: { 'content-type': 'application/json', 'set-cookie': ck('s_a', s.id), 'x-frame-options': 'DENY', 'referrer-policy': 'same-origin' } });
  }
  const s = await session(e, r, 's_a');
  if (!s || s.kind !== 'a') return J({ error: 'Please log in again' }, 401);
  if (r.headers.get('x-csrf') !== s.csrf && p !== '/x/adme/logout') return J({ error: 'Security check failed, refresh the page' }, 403);
  if (p === '/x/adme/logout') { await run(e, 'DELETE FROM sessions WHERE id=?', s.id); return J({ ok: 1 }); }
  if (p === '/api/a/mainbot') {
    let token = String(b.token || '').trim();
    if (!token) token = (await getS(e, 'global', 'main_token')) || '';
    if (!token) return J({ error: 'Enter a token' }, 400);
    const me = await tg(token, 'getMe');
    if (!me.ok) return J({ error: 'Invalid token' }, 400);
    const secret = (await getS(e, 'global', 'main_secret')) || crypto.randomUUID().replace(/-/g, '');
    const wh = await tg(token, 'setWebhook', { url: u.origin + '/tg/main', secret_token: secret, allowed_updates: ['message', 'callback_query'] });
    if (!wh.ok) return J({ error: 'Webhook could not be set' }, 400);
    await setS(e, 'global', 'main_token', token); await setS(e, 'global', 'main_secret', secret); await setS(e, 'global', 'main_username', me.result.username);
    await log(e, 'webhook_set', '@' + me.result.username); return J({ ok: 1 });
  }
  if (p === '/api/a/state') {
    const c = async (q) => (await one(e, q)).c;
    return J({ main: await getS(e, 'global', 'main_username'), users: await c('SELECT COUNT(*) c FROM users'), bots: await c('SELECT COUNT(*) c FROM bots'), vip: await c('SELECT COUNT(*) c FROM users WHERE vip=1'), welcome: await getS(e, 'global', 'welcome'), contact: await getS(e, 'global', 'contact') });
  }
  if (p === '/api/a/users') {
    const q = '%' + (u.searchParams.get('q') || '') + '%';
    return J({ users: await all(e, `SELECT id,username,first_name,vip,blocked,(SELECT v FROM settings WHERE scope='user:'||users.id AND k='phone') phone,(SELECT group_concat('@'||bt.username||IFNULL(' → '||COALESCE('@'||(SELECT v FROM settings WHERE scope='bot:'||bt.id AND k='group_user' AND v!=''),bt.group_name),'')) FROM bots bt WHERE bt.owner=users.id) bots FROM users WHERE CAST(id AS TEXT) LIKE ? OR username LIKE ? OR first_name LIKE ? ORDER BY created DESC LIMIT 50`, q, q, q) });
  }
  if (p === '/api/a/user' && b.f === 'vip_days') { const d = Math.max(0, +b.v || 0); await run(e, 'UPDATE users SET vip=1,vip_till=? WHERE id=?', d ? Date.now() + d * 864e5 : 0, +b.id); await log(e, 'admin', `vip ${b.id} ${d}d`); return J({ ok: 1 }); }
  if (p === '/api/a/user') {
    if (!['vip', 'bot_limit', 'blocked'].includes(b.f)) return J({ error: 'Invalid request' }, 400);
    await run(e, `UPDATE users SET ${b.f}=? WHERE id=?`, Math.max(0, +b.v || 0), +b.id); await log(e, 'admin', `user ${b.id} ${b.f}=${b.v}`); return J({ ok: 1 });
  }
  if (p === '/api/a/bots') return J({ bots: await all(e, 'SELECT b.id,b.owner,b.username,b.group_name,b.status,u.first_name oname,u.username ouser FROM bots b LEFT JOIN users u ON u.id=b.owner ORDER BY b.id DESC LIMIT 100') });
  if (p === '/api/a/bottoggle') { await run(e, 'UPDATE bots SET status=1-status WHERE id=?', +b.id); return J({ ok: 1 }); }
  if (p === '/api/a/groups') return J({ items: await all(e, `SELECT b.username bot,b.group_name,b.group_id,(SELECT v FROM settings WHERE scope='bot:'||b.id AND k='group_user') guser,u.first_name oname,u.username ouser FROM bots b LEFT JOIN users u ON u.id=b.owner WHERE b.group_id IS NOT NULL`) });
  if (p === '/api/a/help') {
    if (b.op === 'add') {
      if (!/^https:\/\//.test(b.url || '') || !String(b.label || '').trim()) return J({ error: 'Enter a label and an https link' }, 400);
      await run(e, "INSERT INTO buttons(bot,scope,label,url) VALUES(0,'help',?,?)", String(b.label).trim().slice(0, 60), b.url); return J({ ok: 1 });
    }
    if (b.op === 'del') { await run(e, "DELETE FROM buttons WHERE id=? AND bot=0 AND scope='help'", +b.id); return J({ ok: 1 }); }
    if (b.text !== undefined) await setS(e, 'global', 'help_text', String(b.text).slice(0, 3000));
    return J({ text: await getS(e, 'global', 'help_text'), items: await all(e, "SELECT id,label,url FROM buttons WHERE bot=0 AND scope='help'") });
  }
  if (p === '/api/a/userdetail') {
    const us = await one(e, 'SELECT id,username,first_name,chat_id,vip,vip_till,bot_limit,blocked,created FROM users WHERE id=?', +b.id); if (!us) return J({ error: 'Not found' }, 404);
    return J({ user: us, phone: await getS(e, 'user:' + us.id, 'phone'), lang: await getS(e, 'user:' + us.id, 'lang'), bots: await all(e, "SELECT b.id,b.username,b.name,b.group_name,b.status,(SELECT v FROM settings WHERE scope='bot:'||b.id AND k='group_user') guser FROM bots b WHERE b.owner=?", us.id) });
  }
  if (p === '/api/a/logs') return J({ items: await all(e, 'SELECT type,msg,ts FROM logs ORDER BY id DESC LIMIT 100') });
  if (p === '/api/a/join') {
    if (b.op === 'add') {
      if (!/^https:\/\//.test(b.url || '') || !String(b.label || '').trim()) return J({ error: 'Enter a label and an https link' }, 400);
      await run(e, 'INSERT INTO join_buttons(label,url) VALUES(?,?)', String(b.label).trim().slice(0, 60), b.url); return J({ ok: 1 });
    }
    if (b.op === 'del') { await run(e, 'DELETE FROM join_buttons WHERE id=?', +b.id); return J({ ok: 1 }); }
    if (b.op === 'toggle') { await setS(e, 'global', 'join_on', b.on ? '1' : '0'); return J({ ok: 1 }); }
    return J({ items: await all(e, 'SELECT id,label,url FROM join_buttons'), on: (await getS(e, 'global', 'join_on')) !== '0' });
  }
  if (p === '/api/a/broadcast') {
    if (b.text !== undefined) {
      const t = String(b.text).trim().slice(0, 3500); if (!t) return J({ error: 'Write a message' }, 400);
      const r = await run(e, 'INSERT INTO broadcasts(text,ts) VALUES(?,?)', t, Date.now());
      await run(e, 'INSERT INTO bq(bid,chat_id) SELECT ?,chat_id FROM users WHERE blocked=0 AND chat_id IS NOT NULL', r.meta.last_row_id);
      await runQueue(e, 20); await log(e, 'broadcast', 'id ' + r.meta.last_row_id); return J({ ok: 1 });
    }
    return J({ s: await one(e, 'SELECT b.id, COUNT(q.id) total, SUM(q.st=1) sent, SUM(q.st=2) failed, SUM(q.st=3) blocked, SUM(q.st=0) pending FROM broadcasts b LEFT JOIN bq q ON q.bid=b.id GROUP BY b.id ORDER BY b.id DESC LIMIT 1') });
  }
  if (p === '/api/a/dm') {
    const T = await getS(e, 'global', 'main_token'), us = await one(e, 'SELECT chat_id FROM users WHERE id=?', +b.id);
    if (!T || !us || !String(b.text || '').trim()) return J({ error: 'Could not send' }, 400);
    const r = await tg(T, 'sendMessage', { chat_id: us.chat_id, text: String(b.text).slice(0, 3500) });
    return r.ok ? J({ ok: 1 }) : J({ error: 'The user cannot receive messages' }, 400);
  }
  if (p === '/api/a/botinfo') {
    const bt = await one(e, 'SELECT * FROM bots WHERE id=?', +b.id); if (!bt) return J({ error: 'Not found' }, 404);
    const w = (await tg(bt.token, 'getWebhookInfo')).result || {}, cf = await cfgOf(e, bt.id);
    return J({ text: 'Webhook: ' + (w.url ? '✅' : '❌') + '\nPending: ' + (w.pending_update_count || 0) + '\nLast error: ' + (w.last_error_message || '—') + '\nAI: ' + (cf.ai_on === '1' && cf.ai_key ? 'ON' : 'OFF') + '\nModeration: ' + (['url_on', 'bad_on', 'flood_on', 'dup_on'].filter((k) => cf[k] === '1').join(', ') || 'OFF') });
  }
  if (p === '/api/a/packages') {
    if (b.op === 'add' || b.op === 'edit') {
      const t = String(b.title || '').trim().slice(0, 100), body = String(b.body || '').trim().slice(0, 1500);
      if (!t || !body) return J({ error: 'Enter a title and details' }, 400);
      if (b.op === 'add') await run(e, 'INSERT INTO packages(title,body) VALUES(?,?)', t, body); else await run(e, 'UPDATE packages SET title=?,body=? WHERE id=?', t, body, +b.id);
      return J({ ok: 1 });
    }
    if (b.op === 'del') { await run(e, 'DELETE FROM packages WHERE id=?', +b.id); return J({ ok: 1 }); }
    return J({ contact: await getS(e, 'global', 'contact'), items: await all(e, 'SELECT id,title,body FROM packages ORDER BY id') });
  }
  if (p === '/api/a/settings') {
    if (!['welcome', 'contact'].includes(b.k)) return J({ error: 'Invalid request' }, 400);
    if (b.k === 'contact' && b.v && !/^https:\/\//.test(b.v)) return J({ error: 'The link must start with https://' }, 400);
    await setS(e, 'global', b.k, String(b.v).slice(0, 2000)); return J({ ok: 1 });
  }
  return J({ error: 'Not found' }, 404);
}
