# Group Control Bot Builder (Cloudflare Workers + D1)

## Setup
1. `npm i -g wrangler && wrangler login`
2. `wrangler d1 create gcbb`  -> copy database_id into wrangler.toml
3. `wrangler d1 execute gcbb --remote --file=schema.sql`
4. `wrangler secret put MAIN_BOT_TOKEN`   (Main Bot token from @BotFather)
   `wrangler secret put WEBHOOK_SECRET`   (random string: A-Z a-z 0-9 _ -)
5. `wrangler deploy`
6. Open `https://<your-worker>/x/adme` -> create the Main Admin (only once) -> Settings -> "Set Main Webhook".
7. Send /start to the Main Bot.

## Files
index.js (entry/routing) · telegram.js (bots, moderation, AI router, cron) · panel.js (user web panel)
admin.js (/x/adme) · database.js (D1 helpers, auth) · schema.sql · wrangler.toml

## Notes
- Cooldown uses real restrictChatMember; Telegram treats until_date < 30s as permanent, so minimum is 30s.
- Bot tokens / AI keys are stored in D1 as plain text (never sent to the browser). Add encryption if needed.
- Broadcast: first 20 sent immediately, rest by cron (25/min, change with BC_BATCH var).
- AI replies when the bot is @mentioned or replied to in the group.
- Bot must be group admin with Delete, Restrict, Pin permissions.
