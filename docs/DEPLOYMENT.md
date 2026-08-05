# Deployment Guide

Kirana Grid is a single Node process (zero external dependencies, in-memory
store) that serves both the API and the dashboard on one port. That makes
deployment simpler than a typical split frontend/backend app — there's one
service to deploy, not two.

**Honesty check before you deploy:** the data store is in-memory. Every
deploy, restart, or scale-to-zero event wipes it back to seed state. That's
correct for a live demo (the whole point is watching orders flow in real
time) but means this isn't yet suitable for a second instance behind a load
balancer, or for data you need to persist. See `docs/PRODUCTION.md` for
what closing that gap would take.

---

## Option A — Render (recommended for a free, public demo link)

1. Push this repo to GitHub.
2. In Render: **New → Web Service**, connect the repo.
3. Settings:
   - **Environment:** Docker (Render will detect the `Dockerfile` automatically)
     — or, if you'd rather skip Docker: **Environment:** Node, **Build
     command:** `npm install`, **Start command:** `npm start`.
   - **Instance type:** Free tier is enough for a demo.
   - **Health check path:** `/health`
4. Render injects `PORT` automatically — `server.js` already reads
   `process.env.PORT`, so no config needed there.
5. Deploy. Your dashboard is live at `https://<your-service>.onrender.com/`.

Free-tier caveat: Render spins down idle free services and cold-starts on
the next request (10–30s delay). Fine for a portfolio link you share
deliberately; annoying if you want it always warm — upgrade the instance
type if so.

## Option B — Railway

1. **New Project → Deploy from GitHub repo.**
2. Railway auto-detects the `Dockerfile` and builds it. No config needed —
   `PORT` is injected automatically and `server.js` already reads it.
3. Under **Settings → Networking**, generate a public domain.
4. Done — Railway also gives you build/deploy logs in the same dashboard,
   useful when you're demoing "here's the CI/CD too."

## Option C — Docker, anywhere (your own VM, DigitalOcean, EC2, etc.)

```bash
git clone <your-repo-url>
cd kirana-grid
docker compose up -d --build
```

That's the literal one-command run this project was built for. Reachable
at `http://<host>:4000/`. To run on a different port:

```bash
PORT=8080 docker compose up -d --build
```

To run without Docker at all (also just one command):

```bash
npm install   # no-op today, zero deps — future-proofs it
npm start
```

## Option D — Fly.io

```bash
fly launch          # detects the Dockerfile, creates fly.toml
fly deploy
```

Fly's free allowance covers this comfortably — one small always-on machine
is enough for a demo with a handful of concurrent viewers.

---

## Environment variables

Only one exists today:

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `4000` | Most PaaS providers inject their own — `server.js` already respects it. |

Copy `.env.example` to `.env` for local overrides; it's git-ignored.

## Production build steps

There isn't a separate build step — no bundler, no TypeScript compile, no
CSS pipeline. `npm start` (or the Dockerfile's `CMD`) runs `server.js`
directly. This is a deliberate tradeoff documented in the main README: zero
dependencies means zero build step, which is exactly what makes "one
command, anywhere" true. The tradeoff is you're not getting React/JSX or a
bundler's dead-code elimination — fine for this project's size, worth
revisiting if the frontend grows substantially.

## After deploying: point the dashboard at itself

The dashboard's API-base field defaults to `http://localhost:4000`. When
you deploy, open the live URL and update that field to match the deployed
origin (or leave it — same-origin requests work automatically since the
dashboard is served from the same server as the API, so in practice you
usually don't need to touch it at all).
