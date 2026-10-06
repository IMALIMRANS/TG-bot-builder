// Telegram API + Main Bot + User Bot logic
import { one, all, run, getS, setS, cfgOf, log, bump, rnd } from './database.js';
export async function tg(token, m, b = {}) {
  try { return await (await fetch(`https://api.telegram.org/bot${token}/${m}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(); }
  catch (x) { return { ok: false, description: String(x) }; }
}
export const kb = (rows) => ({ inline_keyboard: rows });
export const vars = (t, u, g) => t.replace(/{name}/g, u.first_name || '').replace(/{username}/g, u.username ? '@' + u.username : '').replace(/{user_id}/g, u.id).replace(/{group_name}/g, g || '');

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
  await run(e, "DELETE FROM scheduled_posts WHERE rep='once' AND run_at<?", now - 5 * 60000);
  for (const p of await all(e, 'SELECT p.*,b.token,b.group_id FROM scheduled_posts p JOIN bots b ON b.id=p.bot LEFT JOIN users u ON u.id=b.owner WHERE p.run_at<=? AND b.status=1 AND IFNULL(u.blocked,0)=0 AND b.group_id IS NOT NULL', now)) {
    await tg(p.token, 'sendMessage', { chat_id: p.group_id, text: p.body, reply_markup: await btns(e, p.bot, 'post') }); await bump(e, p.bot, 'posts'); await log(e, 'auto_post', 'bot ' + p.bot);
    const step = { daily: 864e5, weekly: 6048e5, custom: Math.max(1, p.mins) * 6e4 }[p.rep];
    if (!step) await run(e, 'DELETE FROM scheduled_posts WHERE id=?', p.id);
    else { let t = p.run_at; while (t <= now) t += step; await run(e, 'UPDATE scheduled_posts SET run_at=? WHERE id=?', t, p.id); }
  }
  await run(e, 'DELETE FROM msglog WHERE ts<?', now - 120000);
  await runQueue(e, 25);
}

const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const TLD = 'com|net|org|io|xyz|info|biz|online|site|link|top|club|app|dev|tv|cc|ly|gl|gg|ru|pw|ws|tk|ml|ga|cf|gq|shop|store|live|pro|vip|fun|click|bd';
const HOMO = { 'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x', 'у': 'y', 'і': 'i', 'ѕ': 's', 'ԁ': 'd', 'ɡ': 'g', 'ӏ': 'l' };
// Strong link detector: entities, disguised dots ("site dot com", "site(.)com", full-width dots, homoglyphs, spaces)
export function sus(text, ents) {
  if ((ents || []).some((x) => ['url', 'text_link'].includes(x.type))) return true;
  const n = String(text).normalize('NFKC').toLowerCase().replace(/[\u200b-\u200f\u2060\ufeff]/g, '').replace(/[а-яіѕԁɡӏ]/g, (c) => HOMO[c] || c)
    .replace(/[\(\[\{<]\s*(dot|d0t|d\.o\.t|ডট)\s*[\)\]\}>]/g, '.').replace(/\s+(dot|d0t|ডট)\s+/g, '.').replace(/[\(\[\{<]\s*\.\s*[\)\]\}>]/g, '.')
    .replace(/[。｡·•﹒∙]/g, '.').replace(/\s*\.\s*/g, '.');
  return /(https?:|ftp:|www\.|\/\/|t\.me|telegram\.(me|dog)|wa\.me|bit\.ly|tinyurl|discord\.gg|youtu\.be)/.test(n) || new RegExp('(^|[^a-z0-9])[a-z0-9-]{3,}\\.(' + TLD + ')(?![a-z0-9])').test(n);
}

export async function createBot(e, uid, U, token, origin) {
  const me = await tg(token, 'getMe'); if (!me.ok) return { code: 'bad' };
  const made = +(await getS(e, 'user:' + uid, 'bots_made')) || 0, cnt = (await one(e, 'SELECT COUNT(*) c FROM bots WHERE owner=?', uid)).c;
  if (U.vip ? cnt >= U.bot_limit : (cnt >= 1 || made >= 1)) return { code: 'limit' };
  if (await one(e, 'SELECT id FROM bots WHERE token=?', token)) return { code: 'dup' };
  const secret = rnd(16), r = await run(e, 'INSERT INTO bots(owner,token,username,name,secret,created) VALUES(?,?,?,?,?,?)', uid, token, me.result.username, me.result.first_name, secret, Date.now());
  const id = r.meta.last_row_id, wh = await tg(token, 'setWebhook', { url: origin + '/tg/bot/' + id, secret_token: secret, allowed_updates: ['message'] });
  await setS(e, 'user:' + uid, 'bots_made', made + 1);
  await log(e, 'bot_created', '@' + me.result.username + ' webhook=' + wh.ok);
  return { ok: 1, id, me: me.result, wh: wh.ok };
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
  const info = (b) => `✅ Bot created!\nName: ${b.name}\nUsername: @${b.username}\n\nOpen your bot, send /start, and use the Control Panel button there to manage everything.`;
  const menu = async () => {
    const jb = (await getS(e, 'global', 'join_on')) === '0' ? [] : (await all(e, 'SELECT label,url FROM join_buttons')).map((x) => [{ text: x.label, url: x.url }]);
    return say((await getS(e, 'global', 'welcome')) || '👋 Welcome! Create and manage your own Telegram group bot.', kb([...jb, [{ text: '🤖 Create Bot', callback_data: 'cb' }, { text: '⭐ VIP', callback_data: 'vip' }], [{ text: '🆘 Help', callback_data: 'help' }]]));
  };
  const pkgs = async () => {
    const l = await getS(e, 'global', 'contact'), ps = await all(e, 'SELECT title,body FROM packages ORDER BY id');
    return say('⭐ VIP Packages\n\n' + (ps.length ? ps.map((p) => `📦 ${p.title}\n${p.body}`).join('\n\n') : 'No packages are available yet.') + (U.vip ? '\n\n✅ You already have VIP.' : '') + (l ? '' : '\n\n(The admin has not set a contact link yet.)'), l ? kb([[{ text: '📩 Contact Admin', url: l }]]) : undefined);
  };
  if (cb) {
    await tg(T, 'answerCallbackQuery', { callback_query_id: cb.id });
    if (cb.data === 'cb') {
      const bs = await all(e, 'SELECT name,username FROM bots WHERE owner=?', f.id), made = +(await getS(e, 'user:' + f.id, 'bots_made')) || 0;
      if (U.vip ? bs.length >= U.bot_limit : (bs.length >= 1 || made >= 1)) return say((bs.length ? bs.map(info).join('\n\n') + '\n\n' : '') + (U.vip ? 'You have reached your bot limit.' : 'Free users can create only 1 bot. Get VIP to create more.'));
      await run(e, "UPDATE users SET state='token' WHERE id=?", f.id);
      return say('1️⃣ Create a new bot in BotFather\n2️⃣ Send its token here (your message will be deleted)', kb([[{ text: '🤖 BotFather', url: 'https://t.me/BotFather' }]]));
    }
    if (cb.data === 'vip') return (await getS(e, 'user:' + f.id, 'verified')) ? pkgs() : say('📱 Please verify your phone number first. Only your own contact is accepted.', { keyboard: [[{ text: '📱 Verify my contact', request_contact: true }]], one_time_keyboard: true, resize_keyboard: true });
    if (cb.data === 'help') { const it = await all(e, "SELECT label,url FROM buttons WHERE bot=0 AND scope='help'"); return say((await getS(e, 'global', 'help_text')) || 'No help has been added yet.', it.length ? kb(it.map((x) => [{ text: x.label, url: x.url }])) : undefined); }
    return;
  }
  if (m.contact) {
    if (m.contact.user_id !== f.id) return say('⚠️ Please send your own contact.');
    await setS(e, 'user:' + f.id, 'verified', '1'); await setS(e, 'user:' + f.id, 'phone', String(m.contact.phone_number || '').slice(0, 30));
    await say('✅ Contact verified!', { remove_keyboard: true }); return pkgs();
  }
  const tx = m.text || '';
  if (/^\/(x\/)?adme/.test(tx)) return say('🔐 Main Admin Panel', kb([[{ text: '🔐 Open Admin Panel', web_app: { url: origin + '/x/adme' } }]]));
  if (tx.startsWith('/start')) { await run(e, "UPDATE users SET state='' WHERE id=?", f.id); return menu(); }
  if (U.state !== 'token' || !tx) return;
  await tg(T, 'deleteMessage', { chat_id: chat, message_id: m.message_id });
  const r = await createBot(e, f.id, U, tx.trim(), origin);
  if (!r.ok) return say({ bad: '❌ Invalid token. Try again.', limit: 'Free users can create only 1 bot. Get VIP to create more.', dup: '⚠️ This bot is already added.' }[r.code]);
  await run(e, "UPDATE users SET state='' WHERE id=?", f.id);
  return say(info({ name: r.me.first_name, username: r.me.username }) + (r.wh ? '' : '\n\n⚠️ Webhook could not be set. Please contact the admin.'));
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

let lastErr = '';
export const aiErr = () => lastErr;
const GEM = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
async function freeModels(e) {
  const c = await getS(e, 'global', 'or_free'), t = +(await getS(e, 'global', 'or_free_ts')) || 0;
  if (c && Date.now() - t < 3600e3) return JSON.parse(c);
  try {
    const l = ((await (await fetch('https://openrouter.ai/api/v1/models')).json()).data || []).map((x) => x.id).filter((x) => x.endsWith(':free')).slice(0, 25);
    if (l.length) { await setS(e, 'global', 'or_free', JSON.stringify(l)); await setS(e, 'global', 'or_free_ts', Date.now()); return l; }
  } catch (x) {}
  return c ? JSON.parse(c) : ['meta-llama/llama-3.3-70b-instruct:free', 'google/gemma-3-27b-it:free'];
}
async function apiList(e, bot, cfg) {
  let a = await all(e, 'SELECT * FROM ai_keys WHERE bot=? ORDER BY prio,id', bot.id);
  if (!a.length && cfg.ai_key) a = [{ kind: cfg.ai_kind || 'openrouter', url: cfg.ai_url || '', k: cfg.ai_key, model: cfg.ai_model || '' }];
  return a.filter((x) => x.kind !== 'custom' || x.url);
}
// Tries every connected API in order; Auto = all free models, next one when a limit is hit
async function aiCore(e, bot, cfg, sys, text) {
  for (const a of await apiList(e, bot, cfg)) {
    for (const mdl of a.model ? [a.model] : a.kind === 'openrouter' ? await freeModels(e) : a.kind === 'gemini' ? GEM : []) {
      try { const out = await ask(a.kind, a.url || '', a.k, mdl, sys, text); if (!out) throw new Error('empty'); await log(e, 'ai_request', `bot ${bot.id} ${mdl}`); return out; }
      catch (x) { lastErr = `${a.kind} ${mdl}: ${x.message}`; await log(e, 'ai_fail', `bot ${bot.id} ${lastErr}`); }
    }
  }
  return null;
}
export async function aiReply(e, bot, cfg, text, u, group) {
  lastErr = '';
  if (cfg.ai_on !== '1' || !(await apiList(e, bot, cfg)).length) return null;
  const fb = cfg.ai_fallback || 'Sorry, I cannot answer that right now. Please contact the group admin.';
  const files = await all(e, 'SELECT id,name,kind FROM files WHERE bot=? LIMIT 50', bot.id);
  const tone = { friendly: 'Be warm and friendly.', formal: 'Be formal and polite.', direct: 'Answer directly and briefly, no small talk.', detail: 'Give clear, detailed, step-by-step answers.' }[cfg.ai_tone || 'friendly'] || '';
  const sys = (cfg.ai_prompt || 'You are a helpful Telegram group assistant.') + `\nYour name is ${cfg.ai_name || 'Assistant'}.` + (cfg.ai_admin ? ` The group admin is ${cfg.ai_admin}.` : '') + ` ${tone} Reply in the user's language.\n\nKnowledge Base:\n` + (cfg.ai_kb || '(empty)').slice(0, 15000)
    + (files.length ? '\n\nFiles you can send (title [type] id):\n' + files.map((f) => `- ${f.name} [${f.kind}] id=${f.id}`).join('\n') + '\nIf the user asks for or about one of these files, put the marker [[FILE:id]] in your reply (you may add one short sentence). Never write the file contents yourself.' : '')
    + '\n\nUser: ' + (u.first_name || '') + ' | Group: ' + (group || '') + '\nIf the answer is not in the knowledge base or files and you do not know it, reply exactly NO_ANSWER.';
  const out = await aiCore(e, bot, cfg, sys, text);
  if (!out) { await log(e, 'ai_fallback', 'bot ' + bot.id); return fb; }
  if (out.includes('NO_ANSWER')) return fb;
  await bump(e, bot.id, 'ai'); return out;
}
// AI moderation: catches disguised links / bad content that the normal filters missed
export async function aiCheck(e, bot, cfg, text) {
  if (cfg.ai_on !== '1' || !(await apiList(e, bot, cfg)).length) return null;
  const out = await aiCore(e, bot, cfg, 'You are a strict Telegram group moderator. Decide whether the user text contains a link or website address (including disguised forms such as "site dot com", "site(.)com", letters separated by spaces or symbols, or words for "dot" in any language), advertising/promotion, or abusive language. Reply with JSON only: {"violation":true|false,"reason":"short reason"}.', String(text).slice(0, 1500));
  try { const j = JSON.parse(out.match(/\{[\s\S]*\}/)[0]); return j.violation ? String(j.reason || 'rule violation').slice(0, 120) : null; } catch (x) { return null; }
}

// Show added commands in the Telegram "/" menu of the connected group
export async function syncCmds(e, bot) {
  if (!bot.group_id) return;
  const scope = { type: 'chat', chat_id: bot.group_id }, rows = await all(e, 'SELECT name,resp FROM commands WHERE bot=? LIMIT 100', bot.id);
  if (!rows.length) return tg(bot.token, 'deleteMyCommands', { scope });
  return tg(bot.token, 'setMyCommands', { scope, commands: rows.map((r) => ({ command: r.name, description: r.resp.replace(/\s+/g, ' ').slice(0, 60) || r.name })) });
}

const isAdm = async (T, chat, uid) => { const r = await tg(T, 'getChatMember', { chat_id: chat, user_id: uid }); return r.ok && ['creator', 'administrator'].includes(r.result.status); };
const WHY = { url: 'links are not allowed', bad: 'bad language is not allowed', flood: 'please do not flood the chat', dup: 'please do not repeat messages' };

export async function handleBot(e, bot, upd, origin) {
  const m = upd.message; if (!m) return;
  const T = bot.token, c = m.chat, u = m.from || {};
  if (c.type === 'private') {
    if (bot.ub) return tg(T, 'sendMessage', { chat_id: c.id, text: '⛔ This bot’s admin has been blocked.' });
    if (m.photo) {
      const cf = await cfgOf(e, bot.id); if (cf.await_logo !== String(u.id)) return;
      await setS(e, 'bot:' + bot.id, 'await_logo', '');
      const fl = await tg(T, 'getFile', { file_id: m.photo[m.photo.length - 1].file_id });
      let ok = false;
      try {
        const img = await (await fetch(`https://api.telegram.org/file/bot${T}/${fl.result.file_path}`)).blob(), fd = new FormData();
        fd.append('photo', JSON.stringify({ type: 'static', photo: 'attach://logo' })); fd.append('logo', img, 'logo.jpg');
        ok = (await (await fetch(`https://api.telegram.org/bot${T}/setMyProfilePhoto`, { method: 'POST', body: fd })).json()).ok;
      } catch (x) {}
      return tg(T, 'sendMessage', { chat_id: c.id, text: ok ? '✅ The bot’s logo has been changed!' : '⚠️ Telegram did not allow changing the logo directly. Use @BotFather → /setuserpic → choose this bot → send the photo.' });
    }
    if (!(m.text || '').startsWith('/start')) return;
    let okAdm = u.id === bot.owner;
    if (!okAdm) { const a = await one(e, 'SELECT id FROM bot_admins WHERE bot=? AND (tg_id=? OR (tg_id IS NULL AND username=lower(?)))', bot.id, u.id, u.username || ''); if (a) { okAdm = true; await run(e, 'UPDATE bot_admins SET tg_id=? WHERE id=?', u.id, a.id); } }
    if (okAdm) return tg(T, 'sendMessage', { chat_id: c.id, text: '👋 Welcome, ' + (u.first_name || '') + '!\nOpen the Control Panel to manage your bot.', reply_markup: kb([[{ text: '🌐 Open Control Panel', web_app: { url: origin + '/p?b=' + bot.id } }]]) });
    const mu = await getS(e, 'global', 'main_username');
    return tg(T, 'sendMessage', { chat_id: c.id, text: 'The Control Panel is for Bot Admins only.', reply_markup: mu ? kb([[{ text: 'Create Your Bot', url: 'https://t.me/' + mu }]]) : undefined });
  }
  if (c.id !== bot.group_id) return;
  const tx = m.text || m.caption || '', mention = !!tx && new RegExp('@' + bot.username + '\\b', 'i').test(tx);
  if (bot.ub) { if (mention) await tg(T, 'sendMessage', { chat_id: c.id, text: '⛔ This bot’s admin has been blocked, so the bot is not working.', reply_to_message_id: m.message_id }); return; }
  const cfg = await cfgOf(e, bot.id);
  if (m.new_chat_members && cfg.welcome_on === '1') { for (const n of m.new_chat_members) await tg(T, 'sendMessage', { chat_id: c.id, text: vars(cfg.welcome_text || '👋 Welcome {name} to {group_name}! Please follow the group rules.', n, c.title), reply_markup: await btns(e, bot.id, 'welcome') }); return; }
  if (u.is_bot) return;
  await bump(e, bot.id, 'msgs');
  const now = Date.now(); let ac;
  const isA = async () => (ac ??= await isAdm(T, c.id, u.id));
  const punish = async (usr, mid, how, why) => {
    const lim = +(cfg.warn_limit || 3); let n = 0;
    if (how === 'delete' || how === 'both') { await tg(T, 'deleteMessage', { chat_id: c.id, message_id: mid }); await bump(e, bot.id, 'deleted'); }
    if (how === 'warn' || how === 'both') {
      await run(e, 'INSERT INTO warnings(bot,uid,n) VALUES(?,?,1) ON CONFLICT(bot,uid) DO UPDATE SET n=n+1', bot.id, usr.id);
      n = (await one(e, 'SELECT n FROM warnings WHERE bot=? AND uid=?', bot.id, usr.id)).n; await bump(e, bot.id, 'warns');
    }
    if (how === 'mute' || (n && n >= lim)) { await tg(T, 'restrictChatMember', { chat_id: c.id, user_id: usr.id, permissions: { can_send_messages: false }, until_date: Math.floor(Date.now() / 1000) + 3600 }); await run(e, 'UPDATE warnings SET n=0 WHERE bot=? AND uid=?', bot.id, usr.id); }
    await tg(T, 'sendMessage', { chat_id: c.id, text: how === 'mute' ? `🔇 ${usr.first_name} has been muted for 1 hour (${why})` : `⚠️ ${usr.first_name}, warning: ${why}${n ? ` (${Math.min(n, lim)}/${lim})` : ''}` });
    return log(e, 'moderation', `bot ${bot.id} user ${usr.id} ${why}`);
  };
  const bad = (cfg.bad_words || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean), low0 = tx.toLowerCase();
  let rule = null;
  if (cfg.url_on === '1' && sus(tx, m.entities || m.caption_entities)) rule = 'url';
  else if (cfg.bad_on === '1' && bad.some((w) => low0.includes(w))) rule = 'bad';
  if (!rule && (cfg.flood_on === '1' || cfg.dup_on === '1')) {
    const hh = low0.slice(0, 200);
    await run(e, 'INSERT INTO msglog VALUES(?,?,?,?)', bot.id, u.id, now, hh);
    if (cfg.flood_on === '1' && (await one(e, 'SELECT COUNT(*) c FROM msglog WHERE bot=? AND uid=? AND ts>?', bot.id, u.id, now - 1000 * (+cfg.flood_s || 10))).c > (+cfg.flood_n || 5)) rule = 'flood';
    else if (tx && cfg.dup_on === '1' && (await one(e, 'SELECT COUNT(*) c FROM msglog WHERE bot=? AND uid=? AND h=? AND ts>?', bot.id, u.id, hh, now - 60000)).c > 1) rule = 'dup';
  }
  if (rule && !(await isA())) return punish(u, m.message_id, cfg[rule + '_act'] || 'both', WHY[rule]);
  if (!tx) return;
  if (tx[0] === '/') {
    const row = await one(e, 'SELECT resp FROM commands WHERE bot=? AND name=?', bot.id, tx.slice(1).split(/[\s@]/)[0].toLowerCase());
    if (row) { await bump(e, bot.id, 'cmds'); return tg(T, 'sendMessage', { chat_id: c.id, text: vars(row.resp, u, c.title), reply_markup: await btns(e, bot.id, 'command') }); }
    return;
  }
  if (mention) {
    const q = tx.replace(new RegExp('@' + bot.username, 'ig'), '').trim(), rp = m.reply_to_message, rtx = rp ? rp.text || rp.caption || '' : '';
    if (rtx && rp.from && !rp.from.is_bot) {
      const why = await aiCheck(e, bot, cfg, rtx);
      if (why && !(await isAdm(T, c.id, rp.from.id))) {
        await punish(rp.from, rp.message_id, cfg.url_act || 'both', 'AI review: ' + why);
        return tg(T, 'sendMessage', { chat_id: bot.owner, text: `🚨 The AI caught a message that got past your filters.\nGroup: ${c.title}\nUser: ${rp.from.first_name}${rp.from.username ? ' @' + rp.from.username : ''}\nReason: ${why}\nMessage: ${rtx.slice(0, 300)}` });
      }
    }
    if (q || rtx) {
      const a = await aiReply(e, bot, cfg, (rtx ? `[Replied message: ${rtx.slice(0, 500)}]\n` : '') + (q || 'Explain the replied message briefly.'), u, c.title);
      if (a) {
        const ids = [...a.matchAll(/\[\[FILE:(\d+)\]\]/g)].map((x) => +x[1]).slice(0, 3), clean = a.replace(/\[\[FILE:\d+\]\]/g, '').trim();
        if (clean) await tg(T, 'sendMessage', { chat_id: c.id, text: clean.slice(0, 4000), reply_to_message_id: m.message_id });
        for (const fid of ids) {
          const fl = await one(e, 'SELECT name,kind,body FROM files WHERE id=? AND bot=?', fid, bot.id);
          if (fl) await tg(T, 'sendMessage', fl.kind === 'code' ? { chat_id: c.id, parse_mode: 'HTML', text: `<b>${esc(fl.name)}</b>\n<pre><code>${esc(fl.body.slice(0, 3600))}</code></pre>`, reply_to_message_id: m.message_id } : { chat_id: c.id, text: `${fl.name}\n${fl.body}`.slice(0, 4000), reply_to_message_id: m.message_id });
        }
      }
    }
    return;
  }
  const low = tx.toLowerCase();
  for (const r of await all(e, 'SELECT * FROM auto_replies WHERE bot=?', bot.id)) {
    const t = r.trig.toLowerCase();
    if ((r.mode === 'exact' && tx === r.trig) || (r.mode === 'ci' && low === t) || (r.mode === 'contains' && low.includes(t))) return tg(T, 'sendMessage', { chat_id: c.id, text: vars(r.resp, u, c.title), reply_to_message_id: m.message_id });
  }
}
