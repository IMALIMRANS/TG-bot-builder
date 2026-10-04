// Telegram API + Main Bot + User Bot logic
import { one, all, run, getS, setS, cfgOf, log, bump, rnd } from './database.js';
export async function tg(token, m, b = {}) {
  try { return await (await fetch(`https://api.telegram.org/bot${token}/${m}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(); }
  catch (x) { return { ok: false, description: String(x) }; }
}
export const kb = (rows) => ({ inline_keyboard: rows });
export const vars = (t, u, g) => t.replace(/{name}/g, u.first_name || '').replace(/{username}/g, u.username ? '@' + u.username : '').replace(/{user_id}/g, u.id).replace(/{group_name}/g, g || '');
const loginLink = async (e, owner, origin) => { const t = rnd(20); await run(e, 'INSERT INTO login_tokens VALUES(?,?,?)', t, owner, Date.now() + 600000); return origin + '/p/login?t=' + t; };

export const btns = async (e, bot, scope) => { const r = await all(e, 'SELECT label,url FROM buttons WHERE bot=? AND scope=?', bot, scope); return r.length ? kb(r.map((x) => [{ text: x.label, url: x.url }])) : undefined; };
const ALL = Object.fromEntries(['send_messages', 'send_audios', 'send_documents', 'send_photos', 'send_videos', 'send_video_notes', 'send_voice_notes', 'send_polls', 'send_other_messages', 'add_web_page_previews'].map((k) => ['can_' + k, true]));
export async function runQueue(e, n) {
  const T = await getS(e, 'global', 'main_token'); if (!T) return;
  for (const q of await all(e, 'SELECT q.id,q.chat_id,b.text FROM bq q JOIN broadcasts b ON b.id=q.bid WHERE q.st=0 ORDER BY q.id LIMIT ?', n)) {
    const r = await tg(T, 'sendMessage', { chat_id: q.chat_id, text: q.text });
    await run(e, 'UPDATE bq SET st=? WHERE id=?', r.ok ? 1 : r.error_code === 403 ? 3 : 2, q.id);
  }
}
export async function tick(e) {
  const now = Date.now();
  for (const r of await all(e, 'SELECT c.bot,c.uid,b.token,b.group_id FROM cooldowns c JOIN bots b ON b.id=c.bot WHERE c.till<=?', now)) {
    await tg(r.token, 'restrictChatMember', { chat_id: r.group_id, user_id: r.uid, permissions: ALL }); await run(e, 'DELETE FROM cooldowns WHERE bot=? AND uid=?', r.bot, r.uid);
  }
  for (const p of await all(e, 'SELECT p.*,b.token,b.group_id FROM scheduled_posts p JOIN bots b ON b.id=p.bot WHERE p.act=1 AND p.run_at<=? AND b.status=1 AND b.group_id IS NOT NULL', now)) {
    await tg(p.token, 'sendMessage', { chat_id: p.group_id, text: p.body, reply_markup: await btns(e, p.bot, 'post') }); await bump(e, p.bot, 'posts'); await log(e, 'auto_post', 'bot ' + p.bot);
    const step = { daily: 864e5, weekly: 6048e5, custom: Math.max(1, p.mins) * 6e4 }[p.rep];
    if (!step) await run(e, 'UPDATE scheduled_posts SET act=0 WHERE id=?', p.id);
    else { let t = p.run_at; while (t <= now) t += step; await run(e, 'UPDATE scheduled_posts SET run_at=? WHERE id=?', t, p.id); }
  }
  await run(e, 'DELETE FROM msglog WHERE ts<?', now - 120000);
  await runQueue(e, 25);
}

export async function handleMain(e, upd, origin) {
  const cb = upd.callback_query, m = cb ? cb.message : upd.message, f = (cb || upd.message || {}).from;
  const T = await getS(e, 'global', 'main_token');
  if (!f || !m || !T) return;
  const chat = m.chat.id;
  await run(e, 'INSERT INTO users(id,username,first_name,chat_id,created) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET username=excluded.username,first_name=excluded.first_name,chat_id=excluded.chat_id', f.id, f.username || '', f.first_name || '', chat, Date.now());
  const U = await one(e, 'SELECT * FROM users WHERE id=?', f.id);
  if (U.blocked) return;
  const say = (text, rm) => tg(T, 'sendMessage', { chat_id: chat, text, reply_markup: rm });
  const vipMsg = async () => { const l = await getS(e, 'global', 'contact'); return say('✅ Verified! VIP পেতে Admin-এর সাথে যোগাযোগ করুন।', l ? kb([[{ text: '📩 Contact Admin', url: l }]]) : undefined); };
  if (cb) {
    await tg(T, 'answerCallbackQuery', { callback_query_id: cb.id });
    if (cb.data === 'cb') { await run(e, "UPDATE users SET state='token' WHERE id=?", f.id); return say('1️⃣ BotFather-এ গিয়ে নতুন বট বানান\n2️⃣ পাওয়া Token এখানে পাঠান (পাঠানোর পর মেসেজ মুছে যাবে)', kb([[{ text: '🤖 BotFather', url: 'https://t.me/BotFather' }]])); }
    if (cb.data === 'open') return say('🌐 Control Panel (১০ মিনিট বৈধ):', kb([[{ text: '🌐 Open Panel', url: await loginLink(e, f.id, origin) }]]));
    if (cb.data === 'vip') return (await getS(e, 'user:' + f.id, 'verified')) ? vipMsg() : say('📱 আগে নিজের নম্বর Verify করুন (শুধু আপনার নিজের contact গ্রহণযোগ্য):', { keyboard: [[{ text: '📱 Verify Contact', request_contact: true }]], one_time_keyboard: true, resize_keyboard: true });
    return;
  }
  if (m.contact) { if (m.contact.user_id !== f.id) return say('⚠️ শুধু নিজের contact পাঠান।'); await setS(e, 'user:' + f.id, 'verified', '1'); return vipMsg(); }
  const tx = m.text || '';
  if (tx.startsWith('/start')) {
    await run(e, "UPDATE users SET state='' WHERE id=?", f.id);
    return say((await getS(e, 'global', 'welcome')) || '👋 স্বাগতম! নিজের Group Control Bot বানান।', kb([[{ text: '🤖 Create Bot', callback_data: 'cb' }, { text: '⭐ VIP', callback_data: 'vip' }], [{ text: '🌐 Open', callback_data: 'open' }], ...(await all(e, 'SELECT label,url FROM join_buttons')).map((x) => [{ text: x.label, url: x.url }])]));
  }
  if (U.state !== 'token' || !tx) return;
  await tg(T, 'deleteMessage', { chat_id: chat, message_id: m.message_id });
  const me = await tg(tx.trim(), 'getMe');
  if (!me.ok) return say('❌ Token সঠিক নয়। আবার চেষ্টা করুন।');
  const cnt = (await one(e, 'SELECT COUNT(*) c FROM bots WHERE owner=?', f.id)).c;
  if (cnt >= (U.vip ? U.bot_limit : 1)) return say('⚠️ আপনার Bot limit পূর্ণ। আরও বট চাইলে VIP নিন।');
  if (await one(e, 'SELECT id FROM bots WHERE token=?', tx.trim())) return say('⚠️ এই বট আগেই যোগ করা হয়েছে।');
  const secret = rnd(16);
  const r = await run(e, 'INSERT INTO bots(owner,token,username,name,secret,created) VALUES(?,?,?,?,?,?)', f.id, tx.trim(), me.result.username, me.result.first_name, secret, Date.now());
  const id = r.meta.last_row_id;
  const wh = await tg(tx.trim(), 'setWebhook', { url: origin + '/tg/bot/' + id, secret_token: secret, allowed_updates: ['message'] });
  await run(e, "UPDATE users SET state='' WHERE id=?", f.id);
  await log(e, 'bot_created', '@' + me.result.username + ' webhook=' + wh.ok);
  return say(`✅ বট তৈরি হয়েছে!\nName: ${me.result.first_name}\nUsername: @${me.result.username}\nWebhook: ${wh.ok ? '✅' : '❌'}`, kb([[{ text: '🌐 Open Control Panel', callback_data: 'open' }]]));
}

async function ask(kind, url, key, model, sys, text) {
  if (kind === 'gemini') {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: 'user', parts: [{ text }] }] }) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return ((await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
  }
  const u = kind === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : url.replace(/\/$/, '') + '/chat/completions';
  const r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key }, body: JSON.stringify({ model, messages: [{ role: 'system', content: sys }, { role: 'user', content: text }] }) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return ((await r.json()).choices?.[0]?.message?.content || '').trim();
}

// AI Router: user's model -> admin fallback models (same provider kind, by priority) -> fallback message
export async function aiReply(e, bot, cfg, text, u, group) {
  if (cfg.ai_on !== '1' || !cfg.ai_key) return null;
  const kind = cfg.ai_kind || 'openrouter';
  const prov = await one(e, 'SELECT act FROM ai_providers WHERE kind=?', kind);
  if (!prov || !prov.act || (kind === 'custom' && !cfg.ai_url)) return null;
  const fb = cfg.ai_fallback || 'দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। Admin-এর সাথে যোগাযোগ করুন।';
  const sys = (cfg.ai_prompt || 'You are a helpful Telegram group assistant. Reply briefly in the user\'s language.') + '\n\nKnowledge Base:\n' + (cfg.ai_kb || '(empty)') + '\n\nUser: ' + (u.first_name || '') + ' | Group: ' + (group || '') + '\nIf the answer is not in the knowledge base and you do not know it, reply exactly NO_ANSWER.';
  const models = [...new Set([cfg.ai_model, ...(await all(e, 'SELECT model FROM ai_models WHERE act=1 AND kind=? ORDER BY prio,id', kind)).map((x) => x.model)].filter(Boolean))];
  for (const mdl of models) {
    try {
      const out = await ask(kind, cfg.ai_url || '', cfg.ai_key, mdl, sys, text);
      if (!out) throw new Error('empty');
      await run(e, 'INSERT INTO ai_usage(bot,model,ok,ts) VALUES(?,?,1,?)', bot.id, mdl, Date.now());
      await log(e, 'ai_request', `bot ${bot.id} ${mdl}`);
      if (out.includes('NO_ANSWER')) return fb;
      await bump(e, bot.id, 'ai'); return out;
    } catch (x) {
      await run(e, 'INSERT INTO ai_usage(bot,model,ok,ts) VALUES(?,?,0,?)', bot.id, mdl, Date.now());
      await log(e, 'ai_fail', `bot ${bot.id} ${mdl} ${x.message}`);
    }
  }
  await log(e, 'ai_fallback', 'bot ' + bot.id); return fb;
}

const isAdm = async (T, chat, uid) => { const r = await tg(T, 'getChatMember', { chat_id: chat, user_id: uid }); return r.ok && ['creator', 'administrator'].includes(r.result.status); };

export async function handleBot(e, bot, upd, origin) {
  const m = upd.message; if (!m) return;
  const T = bot.token, c = m.chat, u = m.from || {};
  if (c.type === 'private') {
    if (!(m.text || '').startsWith('/start')) return;
    let okAdm = u.id === bot.owner;
    if (!okAdm) { const a = await one(e, 'SELECT id FROM bot_admins WHERE bot=? AND (tg_id=? OR (tg_id IS NULL AND username=lower(?)))', bot.id, u.id, u.username || ''); if (a) { okAdm = true; await run(e, 'UPDATE bot_admins SET tg_id=? WHERE id=?', u.id, a.id); } }
    if (okAdm) return tg(T, 'sendMessage', { chat_id: c.id, text: '👋 Welcome, ' + (u.first_name || '') + '!', reply_markup: kb([[{ text: '🌐 Open Control Panel', url: await loginLink(e, u.id, origin) }]]) });
    const mu = await getS(e, 'global', 'main_username');
    return tg(T, 'sendMessage', { chat_id: c.id, text: 'Control Panel শুধু Bot Admin-এর জন্য।', reply_markup: mu ? kb([[{ text: 'Create Your Bot', url: 'https://t.me/' + mu }]]) : undefined });
  }
  if (c.id !== bot.group_id) return;
  const cfg = await cfgOf(e, bot.id);
  if (m.new_chat_members && cfg.welcome_on === '1') { for (const n of m.new_chat_members) await tg(T, 'sendMessage', { chat_id: c.id, text: vars(cfg.welcome_text || 'স্বাগতম {name}!', n, c.title), reply_markup: await btns(e, bot.id, 'welcome') }); return; }
  const tx = m.text || ''; if (!tx || u.is_bot) return;
  await bump(e, bot.id, 'msgs');
  const now = Date.now(); let ac;
  const isA = async () => (ac ??= await isAdm(T, c.id, u.id));
  const bad = (cfg.bad_words || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean), low0 = tx.toLowerCase();
  let rule = null;
  if (cfg.url_on === '1' && /(https?:\/\/|t\.me\/|www\.)/i.test(tx)) rule = 'url';
  else if (cfg.bad_on === '1' && bad.some((w) => low0.includes(w))) rule = 'bad';
  if (!rule && (cfg.flood_on === '1' || cfg.dup_on === '1')) {
    const hh = low0.slice(0, 200);
    await run(e, 'INSERT INTO msglog VALUES(?,?,?,?)', bot.id, u.id, now, hh);
    if (cfg.flood_on === '1' && (await one(e, 'SELECT COUNT(*) c FROM msglog WHERE bot=? AND uid=? AND ts>?', bot.id, u.id, now - 1000 * (+cfg.flood_s || 10))).c > (+cfg.flood_n || 5)) rule = 'flood';
    else if (cfg.dup_on === '1' && (await one(e, 'SELECT COUNT(*) c FROM msglog WHERE bot=? AND uid=? AND h=? AND ts>?', bot.id, u.id, hh, now - 60000)).c > 1) rule = 'dup';
  }
  if (rule && !(await isA())) {
    const how = cfg[rule + '_act'] || 'both', lim = +(cfg.warn_limit || 3); let n = 0;
    if (how === 'delete' || how === 'both') { await tg(T, 'deleteMessage', { chat_id: c.id, message_id: m.message_id }); await bump(e, bot.id, 'deleted'); }
    if (how === 'warn' || how === 'both') {
      await run(e, 'INSERT INTO warnings(bot,uid,n) VALUES(?,?,1) ON CONFLICT(bot,uid) DO UPDATE SET n=n+1', bot.id, u.id);
      n = (await one(e, 'SELECT n FROM warnings WHERE bot=? AND uid=?', bot.id, u.id)).n; await bump(e, bot.id, 'warns');
    }
    if (how === 'mute' || (n && n >= lim)) { await tg(T, 'restrictChatMember', { chat_id: c.id, user_id: u.id, permissions: { can_send_messages: false }, until_date: Math.floor(now / 1000) + 3600 }); await run(e, 'UPDATE warnings SET n=0 WHERE bot=? AND uid=?', bot.id, u.id); }
    await tg(T, 'sendMessage', { chat_id: c.id, text: how === 'mute' ? `🔇 ${u.first_name} ১ ঘণ্টার জন্য mute হয়েছে` : `⚠️ ${u.first_name}, নিয়ম ভাঙার জন্য সতর্কতা${n ? ` (${Math.min(n, lim)}/${lim})` : ''}` });
    return log(e, 'moderation', `bot ${bot.id} user ${u.id} ${rule}/${how}`);
  }
  if (cfg.cooldown_on === '1' && !(await isA())) {
    const sec = Math.max(30, +cfg.cooldown_sec || 30);
    await tg(T, 'restrictChatMember', { chat_id: c.id, user_id: u.id, permissions: { can_send_messages: false }, until_date: Math.floor(now / 1000) + sec });
    await run(e, 'INSERT INTO cooldowns VALUES(?,?,?) ON CONFLICT(bot,uid) DO UPDATE SET till=excluded.till', bot.id, u.id, now + sec * 1000);
    await tg(T, 'sendMessage', { chat_id: c.id, text: `⏳ ${u.first_name}, আপনি আবার message পাঠাতে পারবেন: ${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}` });
  }
  if (tx[0] === '/') {
    const row = await one(e, 'SELECT resp FROM commands WHERE bot=? AND name=?', bot.id, tx.slice(1).split(/[\s@]/)[0].toLowerCase());
    if (row) { await bump(e, bot.id, 'cmds'); return tg(T, 'sendMessage', { chat_id: c.id, text: vars(row.resp, u, c.title), reply_markup: await btns(e, bot.id, 'command') }); }
    return;
  }
  const low = tx.toLowerCase();
  for (const r of await all(e, 'SELECT * FROM auto_replies WHERE bot=?', bot.id)) {
    const t = r.trig.toLowerCase();
    if ((r.mode === 'exact' && tx === r.trig) || (r.mode === 'ci' && low === t) || (r.mode === 'contains' && low.includes(t))) return tg(T, 'sendMessage', { chat_id: c.id, text: vars(r.resp, u, c.title), reply_to_message_id: m.message_id });
  }
  // AI: only when bot is mentioned or its message is replied to
  const mention = new RegExp('@' + bot.username + '\\b', 'i').test(tx), rep = m.reply_to_message?.from?.id === +T.split(':')[0];
  if (mention || rep) {
    const q = tx.replace(new RegExp('@' + bot.username, 'ig'), '').trim();
    if (q) { const a = await aiReply(e, bot, cfg, q, u, c.title); if (a) return tg(T, 'sendMessage', { chat_id: c.id, text: a.slice(0, 4000), reply_to_message_id: m.message_id }); }
  }
}
