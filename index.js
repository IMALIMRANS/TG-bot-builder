// Entry point: routing, webhooks, scheduler
import { one, run, getS, log } from './database.js';
import { handleMain, handleBot, tick } from './telegram.js';
import { panel } from './panel.js';
import { admin } from './admin.js';

export default {
  async fetch(r, e) {
    const u = new URL(r.url), p = u.pathname, post = r.method === 'POST';
    const hdr = r.headers.get('x-telegram-bot-api-secret-token');
    try {
      if (p === '/tg/main' && post) {
        const sec = await getS(e, 'global', 'main_secret');
        if (!sec || hdr !== sec) return new Response('forbidden', { status: 403 });
        await handleMain(e, await r.json(), u.origin); return new Response('ok');
      }
      const m = p.match(/^\/tg\/bot\/(\d+)$/);
      if (m && post) {
        const bot = await one(e, 'SELECT b.*,u.blocked ub FROM bots b LEFT JOIN users u ON u.id=b.owner WHERE b.id=?', +m[1]);
        if (!bot || !hdr || hdr !== bot.secret) return new Response('forbidden', { status: 403 });
        if (bot.status) await handleBot(e, bot, await r.json(), u.origin);
        return new Response('ok');
      }
      if (p === '/p' || p.startsWith('/p/') || p.startsWith('/api/p/')) return await panel(r, e, u);
      if (p.startsWith('/x/adme') || p.startsWith('/api/a/')) return await admin(r, e, u);
    } catch (x) { await log(e, 'error', p + ' ' + x).catch(() => {}); return p.startsWith('/tg/') ? new Response('ok') : new Response('Server error', { status: 500 }); }
    return new Response('Group Control Bot Builder');
  },
  async scheduled(ev, e, ctx) {
    ctx.waitUntil((async () => {
      const now = Date.now();
      await run(e, 'DELETE FROM sessions WHERE exp<?', now);
      await run(e, 'UPDATE users SET vip=0,bot_limit=1,vip_till=0 WHERE vip_till>0 AND vip_till<?', now);
      await tick(e).catch((x) => log(e, 'error', 'tick ' + x));
    })());
  },
};
