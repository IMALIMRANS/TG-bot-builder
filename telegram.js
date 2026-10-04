import { all, one, run, now, getS, log, incr, rand } from './database.js';

export const tg = async (t, m, p = {}) => {
  try {
    const r = await fetch(`https://api.telegram.org/bot${t}/${m}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p) });
    return await r.json();
  } catch (e) { return { ok: false, description: String(e) }; }
};

const chunk = (a, n) => a.reduce((r, x, i) => (i % n ? r[r.length - 1].push(x) : r.push([x]), r), []);
const kb = b => (b && b.length ? { inline_keyboard: chunk(b.map(x => ({ text: x.label, url: x.url })), 2) } : undefined);
const btns = (e, bot, scope) => all(e, 'SELECT label,url FROM buttons WHERE bot_id=? AND scope=?', bot, scope);
const fill = (t, u, g) => String(t || '').replace(/\{name\}/g, u.first_name || '').replace(/\{username\}/g, u.username ? '@' + u.username : (u.first_name || '')).replace(/\{user_id\}/g, u.id).replace(/\{group_name\}/g, g || '');

export async function upsertUser(e, u, chat) {
  await run(e, `INSERT INTO users(tg_id,username,first_name,chat_id,created_at,last_active) VALUES(?,?,?,?,?,?)
    ON CONFLICT(tg_id) DO UPDATE SET username=excluded.username,first_name=excluded.first_name,chat_id=COALESCE(excluded.chat_id,chat_id),last_active=excluded.last_active`,
    u.id, u.username || null, u.first_name || '', chat || null, now(), now());
  return one(e, 'SELECT * FROM users WHERE tg_id=?', u.id);
}
async function loginUrl(e, o, uid) {
  const t = rand(24);
  await run(e, 'INSERT INTO login_tokens VALUES(?,?,?)', t, uid, now() + 600);
  return `${o}/p/login?t=${t}`;
}
// 'all' (owner) | array of perms (bot admin) | null
export async function botAccess(e, bot, u) {
  if (bot.owner_id === u.id) return 'all';
  const a = await one(e, 'SELECT * FROM bot_admins WHERE bot_id=? AND (tg_id=? OR lower(username)=lower(?))', bot.id, u.tg_id, u.username || '');
  return a ? (a.perms || '').split(',') : null;
}

/* ---------------- MAIN BOT ---------------- */
export async function mainBot(env, o, up) {
  const T = env.MAIN_BOT_TOKEN, S = await getS(env, 'global');
  const send = (c, text, x = {}) => tg(T, 'sendMessage', { chat_id: c, text, ...x });
  const vipMsg = (c, u) => send(c, '⭐ VIP Request\n\nVIP নিতে Admin-এর সাথে যোগাযোগ করুন।' + (u.vip ? '\n\n✅ আপনি VIP। Bot limit: ' + u.bot_limit : ''),
    S.admin_contact ? { reply_markup: { inline_keyboard: [[{ text: '💬 Contact Admin', url: S.admin_contact }]] } } : {});

  if (up.callback_query) {
    const q = up.callback_query;
    tg(T, 'answerCallbackQuery', { callback_query_id: q.id });
    const u = await upsertUser(env, q.from, q.message?.chat.id || q.from.id);
    if (u.blocked) return;
    if (q.data === 'create') {
      await run(env, 'UPDATE users SET state=? WHERE id=?', 'token', u.id);
      return send(q.from.id, S.botfather_text || 'Bot তৈরি করতে BotFather থেকে Bot Token নিয়ে এখানে পাঠান।', { reply_markup: { inline_keyboard: [[{ text: '🤖 Open BotFather', url: 'https://t.me/BotFather' }]] } });
    }
    if (q.data === 'vip') {
      if (!u.phone) {
        await run(env, 'UPDATE users SET state=? WHERE id=?', 'contact', u.id);
        return send(q.from.id, '📱 Contact Verification\n\nনিচের বাটনে চেপে আপনার Contact শেয়ার করুন।', { reply_markup: { keyboard: [[{ text: '📱 Share Contact', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true } });
      }
      return vipMsg(q.from.id, u);
    }
    return;
  }

  const m = up.message;
  if (!m || m.chat.type !== 'private' || !m.from) return;
  const u = await upsertUser(env, m.from, m.chat.id);
  if (u.blocked) return;
  const text = m.text || '';

  if (m.contact) {
    if (m.contact.user_id !== m.from.id) return send(m.chat.id, '❌ নিজের Contact শেয়ার করুন।');
    await run(env, 'UPDATE users SET phone=?,state=NULL WHERE id=?', m.contact.phone_number, u.id);
    log(env, 'verify', u.id, 'Contact verified');
    await send(m.chat.id, '✅ Verification complete', { reply_markup: { remove_keyboard: true } });
    return vipMsg(m.chat.id, u);
  }
  if (/^\/start/.test(text)) {
    await run(env, 'UPDATE users SET state=NULL WHERE id=?', u.id);
    const rowsK = [[{ text: '🤖 Create Bot', callback_data: 'create' }, { text: '⭐ VIP', callback_data: 'vip' }], [{ text: '🌐 Open', url: await loginUrl(env, o, u.id) }]];
    for (const j of await all(env, 'SELECT * FROM join_buttons WHERE enabled=1')) rowsK.push([{ text: j.label, url: j.url }]);
    return send(m.chat.id, S.main_welcome || '👋 Welcome!\n\nGroup Control Bot Builder-এ স্বাগতম।\n\nআপনি এখান থেকে নিজের Telegram Group Control Bot তৈরি ও পরিচালনা করতে পারবেন।', { reply_markup: { inline_keyboard: rowsK } });
  }
  if (u.state === 'token' && text) {
    tg(T, 'deleteMessage', { chat_id: m.chat.id, message_id: m.message_id }); // hide token from chat
    return connectBot(env, o, u, text.trim(), (t, x) => send(m.chat.id, t, x));
  }
}

async function connectBot(env, o, u, token, send) {
  if (!/^\d+:[\w-]{30,}$/.test(token)) return send('❌ Token সঠিক নয়। আবার পাঠান।');
  const lim = u.vip ? u.bot_limit : 1;
  const c = (await one(env, 'SELECT COUNT(*) n FROM bots WHERE owner_id=?', u.id)).n;
  if (c >= lim) return send(`❌ আপনার Bot limit (${lim}) শেষ। বেশি Bot-এর জন্য /start → ⭐ VIP`);
  if (await one(env, 'SELECT id FROM bots WHERE token=?', token)) return send('❌ এই Bot আগে থেকেই connected।');
  const me = await tg(token, 'getMe');
  if (!me.ok) return send('❌ Token invalid।');
  log(env, 'token', u.id, 'Token verified @' + me.result.username);
  const secret = rand(16);
  const r = await run(env, 'INSERT INTO bots(owner_id,token,bot_tg_id,name,username,secret,created_at) VALUES(?,?,?,?,?,?,?)', u.id, token, me.result.id, me.result.first_name, me.result.username, secret, now());
  const id = r.meta.last_row_id;
  const w = await tg(token, 'setWebhook', { url: `${o}/tg/bot/${id}`, secret_token: secret, allowed_updates: ['message', 'callback_query'] });
  await run(env, 'UPDATE bots SET webhook_ok=? WHERE id=?', w.ok ? 1 : 0, id);
  await run(env, 'UPDATE users SET state=NULL WHERE id=?', u.id);
  log(env, 'bot', id, 'Bot created; webhook ' + (w.ok ? 'ok' : w.description));
  return send(`✅ Bot Connected\n\nBot Name: ${me.result.first_name}\nUsername: @${me.result.username}\nOwner: ${u.username ? '@' + u.username : u.first_name}\n\nWebhook: ${w.ok ? '✅ Connected' : '❌ ' + w.description}`,
    { reply_markup: { inline_keyboard: [[{ text: '🌐 Open Control Panel', url: await loginUrl(env, o, u.id) }]] } });
}

/* ---------------- USER BOT ---------------- */
export async function userBot(env, o, bot, up) {
  if (!bot.status) return;
  const m = up.message;
  if (!m || !m.from) return;
  if (m.chat.type === 'private') return privateMsg(env, o, bot, m);
  if (bot.group_chat_id && m.chat.id === bot.group_chat_id) return groupMsg(env, bot, m);
}

async function privateMsg(env, o, bot, m) {
  if (!/^\/start/.test(m.text || '')) return;
  const T = bot.token, u = await upsertUser(env, m.from, m.chat.id);
  const acc = await botAccess(env, bot, u);
  if (acc) {
    if (acc !== 'all') await run(env, 'UPDATE bot_admins SET tg_id=? WHERE bot_id=? AND tg_id IS NULL AND lower(username)=lower(?)', u.tg_id, bot.id, u.username || '');
    return tg(T, 'sendMessage', { chat_id: m.chat.id, text: `👋 Welcome, ${m.from.first_name}!\n\nআপনার Group Control Bot-এর সব Control করতে নিচের Open button ব্যবহার করুন।`, reply_markup: { inline_keyboard: [[{ text: '🌐 Open Control Panel', url: await loginUrl(env, o, u.id) }]] } });
  }
  const g = await getS(env, 'global');
  const rowsK = [];
  if (g.main_bot_username) rowsK.push([{ text: '🤖 Create Your Bot', url: 'https://t.me/' + g.main_bot_username }]);
  rowsK.push([{ text: '🌐 Bot Builder', url: o }]);
  return tg(T, 'sendMessage', { chat_id: m.chat.id, text: '👋 Welcome!\n\nএই Bot-এর Control Panel শুধুমাত্র Bot Admin-এর জন্য।\n\nনিজের Group Control Bot তৈরি করতে Bot Builder ব্যবহার করুন।', reply_markup: { inline_keyboard: rowsK } });
}

async function groupMsg(env, bot, m) {
  const T = bot.token, chat = m.chat.id, g = bot.group_title || '';
  const S = await getS(env, 'bot:' + bot.id);
  const send = (text, x = {}) => tg(T, 'sendMessage', { chat_id: chat, text, ...x });

  if (m.new_chat_members) {
    for (const u of m.new_chat_members) {
      if (u.is_bot) continue;
      incr(env, bot.id, 'members');
      if (S.welcome_on !== '0') await send(fill(S.welcome_text || '👋 Welcome {name}!\n\nWelcome to {group_name}.', u, g), { reply_markup: kb(await btns(env, bot.id, 'welcome')) });
    }
    return;
  }
  if (m.from.is_bot) return;
  await incr(env, bot.id, 'messages');

  const cm = await tg(T, 'getChatMember', { chat_id: chat, user_id: m.from.id });
  const st = cm.result?.status, isAdm = st === 'creator' || st === 'administrator';
  const text = m.text || m.caption || '';

  if (!isAdm && (await moderate(env, bot, S, m, text, send))) return;

  // Commands
  const c = /^\/(\w+)(@\w+)?/.exec(text);
  if (c) {
    const r = await one(env, 'SELECT * FROM commands WHERE bot_id=? AND lower(cmd)=? AND enabled=1', bot.id, c[1].toLowerCase());
    if (r) { incr(env, bot.id, 'commands'); await send(fill(r.response, m.from, g), { reply_markup: kb(await btns(env, bot.id, 'command')) }); }
  } else if (text) {
    // Auto reply
    const lt = text.toLowerCase();
    for (const r of await all(env, 'SELECT * FROM auto_replies WHERE bot_id=? AND enabled=1', bot.id)) {
      const ok = r.mode === 'exact' ? text === r.trig : r.mode === 'ci' ? lt.includes(r.trig.toLowerCase()) : text.includes(r.trig);
      if (ok) { await send(fill(r.reply, m.from, g), { reply_to_message_id: m.message_id }); break; }
    }
    // AI (mention or reply to bot)
    const mention = text.toLowerCase().includes('@' + bot.username.toLowerCase());
    const replyToBot = m.reply_to_message?.from?.id === bot.bot_tg_id;
    if (S.ai_on === '1' && S.ai_key && (mention || replyToBot)) {
      const q = text.replace(new RegExp('@' + bot.username, 'ig'), '').trim();
      if (q) {
        const a = await aiAnswer(env, bot, S, q, g);
        incr(env, bot.id, 'ai');
        await send(a, { reply_to_message_id: m.message_id });
      }
    }
  }

  // Cooldown (real Telegram restriction; Telegram treats until_date < 30s as permanent, so min 30s)
  const cd = +S.cooldown_s || 0;
  if (cd > 0 && !isAdm) {
    const secs = Math.max(30, cd), till = now() + secs;
    const r = await tg(T, 'restrictChatMember', { chat_id: chat, user_id: m.from.id, permissions: { can_send_messages: false }, until_date: till });
    if (r.ok) {
      await run(env, 'INSERT INTO cooldowns(bot_id,tg_id,chat_id,till) VALUES(?,?,?,?) ON CONFLICT(bot_id,tg_id) DO UPDATE SET till=excluded.till', bot.id, m.from.id, chat, till);
      const mm = String(Math.floor(secs / 60)).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0');
      await send(`⏳ ${m.from.username ? '@' + m.from.username : m.from.first_name}\n\nআপনি আবার message পাঠাতে পারবেন: ${mm}:${ss}`);
    }
  }
}

async function moderate(env, bot, S, m, text, send) {
  const T = bot.token, chat = m.chat.id;
  let deleted = false;
  const act = async (key, why) => {
    const a = S[key] || 'delete_warn';
    if (a.includes('delete')) { await tg(T, 'deleteMessage', { chat_id: chat, message_id: m.message_id }); incr(env, bot.id, 'deleted'); deleted = true; }
    if (a.includes('warn')) await warn(env, bot, S, m, why, send);
    if (a === 'restrict') {
      await tg(T, 'restrictChatMember', { chat_id: chat, user_id: m.from.id, permissions: { can_send_messages: false }, until_date: now() + (+S.mute_min || 60) * 60 });
      await run(env, 'DELETE FROM cooldowns WHERE bot_id=? AND tg_id=?', bot.id, m.from.id);
    }
    log(env, 'moderation', bot.id, `${why} user=${m.from.id} action=${a}`);
    return true;
  };
  if (S.mod_url === '1' && text) {
    const ents = [...(m.entities || []), ...(m.caption_entities || [])];
    if (ents.some(x => x.type === 'url' || x.type === 'text_link') || /(https?:\/\/|t\.me\/|www\.)\S+/i.test(text)) return act('act_url', 'URL');
  }
  if (S.mod_bad === '1' && text) {
    const lt = text.toLowerCase();
    for (const w of await all(env, 'SELECT word FROM bad_words WHERE bot_id=?', bot.id)) if (w.word && lt.includes(w.word)) return act('act_bad', 'Bad word');
  }
  if ((S.mod_flood === '1' || S.mod_dup === '1')) {
    const h = text ? text.toLowerCase().slice(0, 200) : '';
    await run(env, 'DELETE FROM msglog WHERE at<?', now() - 120);
    await run(env, 'INSERT INTO msglog(bot_id,tg_id,at,h) VALUES(?,?,?,?)', bot.id, m.from.id, now(), h);
    if (S.mod_flood === '1') {
      const n = +S.flood_n || 5, s = +S.flood_s || 10;
      const c = await one(env, 'SELECT COUNT(*) n FROM msglog WHERE bot_id=? AND tg_id=? AND at>=?', bot.id, m.from.id, now() - s);
      if (c.n > n) return act('act_flood', 'Flood');
    }
    if (S.mod_dup === '1' && h) {
      const c = await one(env, 'SELECT COUNT(*) n FROM msglog WHERE bot_id=? AND tg_id=? AND h=? AND at>=?', bot.id, m.from.id, h, now() - 60);
      if (c.n >= 2) return act('act_dup', 'Duplicate');
    }
  }
  return deleted;
}

async function warn(env, bot, S, m, why, send) {
  const lim = +S.warn_limit || 3, name = m.from.username ? '@' + m.from.username : m.from.first_name;
  await run(env, 'INSERT INTO warnings(bot_id,tg_id,count) VALUES(?,?,1) ON CONFLICT(bot_id,tg_id) DO UPDATE SET count=count+1', bot.id, m.from.id);
  const w = await one(env, 'SELECT count FROM warnings WHERE bot_id=? AND tg_id=?', bot.id, m.from.id);
  incr(env, bot.id, 'warnings');
  if (w.count >= lim) {
    await tg(bot.token, 'restrictChatMember', { chat_id: m.chat.id, user_id: m.from.id, permissions: { can_send_messages: false }, until_date: now() + (+S.mute_min || 60) * 60 });
    await run(env, 'UPDATE warnings SET count=0 WHERE bot_id=? AND tg_id=?', bot.id, m.from.id);
    await run(env, 'DELETE FROM cooldowns WHERE bot_id=? AND tg_id=?', bot.id, m.from.id);
    await send(`🔇 ${name} muted (Warnings ${lim}/${lim})`);
  } else await send(`⚠️ ${name} — ${why}\nWarnings: ${w.count}/${lim}`);
}

/* ---------------- GROUP CONNECT ---------------- */
export async function connectGroup(env, bot, input) {
  let g = String(input || '').trim().replace(/^https?:\/\/t\.me\//, '').replace(/^@/, '').split('/')[0].split('?')[0];
  if (!g) return { ok: false, error: 'Group username/link দিন' };
  if (!/^-?\d+$/.test(g)) g = '@' + g;
  const c = await tg(bot.token, 'getChat', { chat_id: g });
  if (!c.ok) return { ok: false, error: 'Group পাওয়া যায়নি: ' + c.description };
  if (!['group', 'supergroup'].includes(c.result.type)) return { ok: false, error: 'এটি Group নয়' };
  const m = await tg(bot.token, 'getChatMember', { chat_id: c.result.id, user_id: bot.bot_tg_id });
  if (!m.ok || m.result.status !== 'administrator') return { ok: false, error: 'Bot-কে Group-এ Admin বানান' };
  const need = { can_delete_messages: 'Delete Messages', can_restrict_members: 'Restrict Members', can_pin_messages: 'Pin Messages' };
  const miss = Object.keys(need).filter(k => !m.result[k]).map(k => need[k]);
  if (miss.length) return { ok: false, error: 'Permission নেই: ' + miss.join(', ') };
  if (await one(env, 'SELECT id FROM bots WHERE group_chat_id=? AND id!=?', c.result.id, bot.id)) return { ok: false, error: 'এই Group অন্য Bot-এ connected' };
  const n = await tg(bot.token, 'getChatMemberCount', { chat_id: c.result.id });
  await run(env, 'UPDATE bots SET group_chat_id=?,group_title=? WHERE id=?', c.result.id, c.result.title, bot.id);
  log(env, 'group', bot.id, 'Group connected: ' + c.result.title);
  return { ok: true, title: c.result.title, members: n.result, status: 'Administrator' };
}

/* ---------------- AI ROUTER ---------------- */
export function detectKind(key) {
  key = String(key || '');
  return key.startsWith('sk-or-') ? 'openrouter' : key.startsWith('AIza') ? 'gemini' : 'custom';
}
export async function detectAI(key) {
  const kind = detectKind(key);
  let models = [];
  if (kind === 'openrouter') {
    try {
      const j = await (await fetch('https://openrouter.ai/api/v1/models')).json();
      models = (j.data || []).filter(x => x.pricing && x.pricing.prompt === '0').map(x => x.id).slice(0, 50);
    } catch {}
  }
  return { kind, models };
}

async function callAI(c, key, system, q) {
  try {
    if (c.kind === 'gemini') {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.model)}:generateContent`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: q }] }] }),
      });
      if (!r.ok) return null;
      const j = await r.json();
      return (j.candidates?.[0]?.content?.parts || []).map(p => p.text).join('').trim() || null;
    }
    let url = c.kind === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : String(c.url || '');
    if (!url) return null;
    if (c.kind === 'custom' && !/\/chat\/completions\/?$/.test(url)) url = url.replace(/\/$/, '') + '/chat/completions';
    const r = await fetch(url, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
      body: JSON.stringify({ model: c.model, messages: [{ role: 'system', content: system }, { role: 'user', content: q }], max_tokens: 600 }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

export async function aiAnswer(env, bot, S, q, group) {
  const kind = S.ai_kind || 'openrouter', fb = S.ai_fallback || 'দুঃখিত, আমি এই প্রশ্নের উত্তর জানি না।';
  const cand = [];
  if (S.ai_model) cand.push({ kind, url: S.ai_url, model: S.ai_model });
  // global fallback chain (managed by Main Admin), same provider kind only
  for (const r of await all(env, 'SELECT m.model,p.api_url FROM ai_models m JOIN ai_providers p ON p.id=m.provider_id WHERE m.enabled=1 AND p.enabled=1 AND p.kind=? ORDER BY m.priority,m.id', kind)) {
    if (kind === 'custom' && r.api_url !== S.ai_url) continue;
    if (!cand.some(c => c.model === r.model)) cand.push({ kind, url: kind === 'custom' ? S.ai_url : r.api_url, model: r.model });
  }
  const system = `${S.ai_prompt || 'You are a helpful assistant for a Telegram group. Reply briefly in the language of the question.'}\nGroup name: ${group}\n\nKnowledge base:\n${S.ai_knowledge || '(none)'}\n\nIf you cannot answer from the knowledge or you are unsure, reply with exactly: NO_ANSWER`;
  for (const c of cand) {
    const a = await callAI(c, S.ai_key, system, q);
    await run(env, 'INSERT INTO ai_usage(bot_id,model,ok,at) VALUES(?,?,?,?)', bot.id, c.model, a ? 1 : 0, now()).catch(() => {});
    if (a) return a.includes('NO_ANSWER') ? fb : a;
    log(env, 'ai_fallback', bot.id, 'Model failed: ' + c.model);
  }
  log(env, 'ai_fail', bot.id, 'All models failed');
  return fb;
}

/* ---------------- BROADCAST / CRON ---------------- */
export async function pumpBroadcast(env, limit) {
  limit = limit || +env.BC_BATCH || 25;
  const rows = await all(env, 'SELECT q.id,q.chat_id,b.text FROM bq q JOIN broadcasts b ON b.id=q.bid WHERE q.st=0 ORDER BY q.id LIMIT ?', limit);
  const upd = [];
  for (const r of rows) {
    const x = await tg(env.MAIN_BOT_TOKEN, 'sendMessage', { chat_id: r.chat_id, text: r.text });
    const st = x.ok ? 1 : (x.error_code === 403 ? 3 : 2);
    upd.push(env.DB.prepare('UPDATE bq SET st=? WHERE id=?').bind(st, r.id));
  }
  if (upd.length) { await env.DB.batch(upd); log(env, 'broadcast', null, `Sent batch of ${upd.length}`); }
}

export async function cron(env) {
  const t = now();
  // Auto posts
  const due = await all(env, 'SELECT p.*,b.token,b.group_chat_id,b.status FROM scheduled_posts p JOIN bots b ON b.id=p.bot_id WHERE p.enabled=1 AND p.next_run<=? LIMIT 20', t);
  for (const p of due) {
    if (p.status && p.group_chat_id) {
      const r = await tg(p.token, 'sendMessage', { chat_id: p.group_chat_id, text: p.text, reply_markup: kb(await btns(env, p.bot_id, 'post')) });
      incr(env, p.bot_id, 'posts');
      log(env, 'autopost', p.bot_id, r.ok ? 'Posted #' + p.id : 'Failed: ' + r.description);
    }
    if (p.rep === 'once') await run(env, 'UPDATE scheduled_posts SET enabled=0 WHERE id=?', p.id);
    else {
      const step = p.rep === 'daily' ? 86400 : p.rep === 'weekly' ? 604800 : Math.max(1, p.interval_min || 60) * 60;
      let n = p.next_run; do { n += step; } while (n <= t);
      await run(env, 'UPDATE scheduled_posts SET next_run=? WHERE id=?', n, p.id);
    }
  }
  // Cooldown expiry -> explicitly restore permissions
  for (const c of await all(env, 'SELECT c.*,b.token FROM cooldowns c JOIN bots b ON b.id=c.bot_id WHERE c.till<=? LIMIT 20', t)) {
    await tg(c.token, 'restrictChatMember', { chat_id: c.chat_id, user_id: c.tg_id, permissions: { can_send_messages: true, can_send_audios: true, can_send_documents: true, can_send_photos: true, can_send_videos: true, can_send_video_notes: true, can_send_voice_notes: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: true, can_invite_users: true } });
    await run(env, 'DELETE FROM cooldowns WHERE bot_id=? AND tg_id=?', c.bot_id, c.tg_id);
  }
  await run(env, 'UPDATE users SET vip=0,bot_limit=1 WHERE vip=1 AND vip_expiry IS NOT NULL AND vip_expiry<?', t);
  await run(env, 'DELETE FROM sessions WHERE expires<?', t);
  await run(env, 'DELETE FROM login_tokens WHERE expires<?', t);
  await pumpBroadcast(env);
}
