# Group Control Bot Builder
1. `wrangler login` → `wrangler d1 create gcbb` → database_id কপি করে wrangler.toml-এ বসান
2. `wrangler d1 execute gcbb --remote --file=schema.sql`
3. `wrangler deploy`
4. `https://<worker>/x/adme` → Main Admin তৈরি → Login → "Main Bot" ট্যাবে Token দিয়ে Connect & Auto Setup
5. Main Bot-এ `/start`

## নোট
- আগের ভার্সন থেকে আপডেট করলে `schema.sql` আবার চালান (`CREATE TABLE IF NOT EXISTS`, ডেটা মুছবে না)।
- Cron (প্রতি মিনিটে): Cooldown permission ফেরত, Auto Post, Broadcast queue (২৫টি/মিনিট), VIP মেয়াদ ও পুরনো session পরিষ্কার।
