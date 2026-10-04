import { mainBot, userBot, cron } from './telegram.js';
import { panel } from './panel.js';
import { admin } from './admin.js';
import { one } from './database.js';

const H = 'x-telegram-bot-api-secret-token';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), p = url.pathname;
    try {
      if (req.method === 'POST' && p === '/tg/main') {
        if (!env.WEBHOOK_SECRET || req.headers.get(H) !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
        const up = await req.json();
        ctx.waitUntil(mainBot(env, url.origin, up).catch(console.error));
        return new Response('ok');
      }
      const m = /^\/tg\/bot\/(\d+)$/.exec(p);
      if (req.method === 'POST' && m) {
        const bot = await one(env, 'SELECT * FROM bots WHERE id=?', +m[1]);
        if (!bot || req.headers.get(H) !== bot.secret) return new Response('forbidden', { status: 403 });
        const up = await req.json();
        ctx.waitUntil(userBot(env, url.origin, bot, up).catch(console.error));
        return new Response('ok');
      }
      if (p === '/') return new Response('Group Control Bot Builder', { headers: { 'content-type': 'text/plain' } });
      if (p.startsWith('/x/adme') || p.startsWith('/api/a/')) return await admin(env, req, url);
      if (p === '/p' || p.startsWith('/p/') || p.startsWith('/api/p/')) return await panel(env, req, url);
      return new Response('Not found', { status: 404 });
    } catch (e) {
      console.error(e);
      return new Response('error', { status: 500 });
    }
  },
  async scheduled(ev, env, ctx) {
    ctx.waitUntil(cron(env).catch(console.error));
  },
};
