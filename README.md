# Group Control Bot Builder (database: tggroupbot)

1. `wrangler login`
2. `wrangler d1 create tggroupbot`  → copy the `database_id` into `wrangler.toml`
3. `wrangler d1 execute tggroupbot --remote --file=schema.sql`
4. `wrangler deploy`
5. Open `https://<worker>/x/adme` → create the Main Admin → log in → "Main Bot" tab → paste the bot token → Connect & Auto Setup
6. In the Main Bot send `/start`. Send `/x/adme` to get the Admin Panel button.

Cron runs every minute: auto posts, broadcast queue, VIP expiry, cleanup.
