# Mission Control — Janet AI Operations Dashboard

Live at: `janet.worldofgrooves.com`

Auth is handled entirely by **Cloudflare Access** (magic link to your email).
The Next.js app itself has no auth layer — Cloudflare gates the domain before
any request reaches Vercel.

---

## Deploy

```bash
npm install

# Create .env.local from .env.example and fill in your Supabase anon key
cp .env.example .env.local

# Push to GitHub
git init && git add . && git commit -m "mission control"
gh repo create worldofgrooves/mission-control --private --push

# Deploy to Vercel
npx vercel --prod
```

Add env vars in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`     → `https://gxavodhoymuozzasfkgj.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your anon key from Supabase Settings → API

## Supabase RLS

The dashboard uses the anon key. Add read policies for authenticated/public access:

```sql
-- Repeat for: mc_agents, mc_tasks, mc_task_comments
CREATE POLICY "Allow read" ON mc_agents FOR SELECT USING (true);
CREATE POLICY "Allow read" ON mc_tasks FOR SELECT USING (true);
CREATE POLICY "Allow read" ON mc_task_comments FOR SELECT USING (true);
```

Since Cloudflare Access is your auth gate, `USING (true)` is fine —
the tables are only reachable through your protected domain.

## Session

Cloudflare Access issues its own session cookie after magic link login.
Survives browser close/reopen. Configurable TTL in Cloudflare Zero Trust dashboard
(default is typically 24h — you can set it to 30 days).
