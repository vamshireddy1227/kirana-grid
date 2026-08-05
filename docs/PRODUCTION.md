# Production Improvements — Recommendations

These are **not implemented** — the instruction for this pass was to
improve presentation and deployment without touching core system logic.
This is the honest list of what a reviewer would correctly flag as missing
for real production use, with concrete pointers to where each would land.

## Security

- **No authentication anywhere.** Every endpoint is public. Before any real
  deployment beyond a demo: JWT-based auth per the `roles` design in the
  original `architecture.md` (super_admin / city_admin / business_owner /
  driver / customer), checked in `router.js` before handlers run.
- **No input validation beyond type checks.** `routes/orders.js` checks
  `dropoff` shape but not, e.g., that lat/lng fall within a sane range, or
  that `slaMinutes` isn't negative. Add a small validation layer at the top
  of each route handler.
- **CORS is wide open** (`Access-Control-Allow-Origin: *` in `router.js`).
  Fine for a public demo API, wrong for anything with real user data —
  restrict to known origins once there's a real frontend deploy target.
- **No rate limiting.** A single client could hammer `POST /orders` or open
  unlimited SSE connections. See below.

## Rate limiting

Nothing in `router.js` limits request rate today. The natural place for it:
a small token-bucket check per IP (or per API key, once auth exists)
wrapping `Router.handle()` before it dispatches to a route — reject with
`429` before the handler runs. SSE connections specifically should be
capped per-IP (`sse.js`'s `addClient`) since each one is a held-open socket.

## Error handling

`router.js` already catches handler exceptions and returns `500` with the
error message — fine for a demo, wrong for production: error messages can
leak internals. Before real use: log the full error server-side, return a
generic message + a request ID to the client.

`simulator.js`'s `setTimeout` chains (pickup → transit → delivery) don't
currently handle the order being deleted or the driver going offline
mid-flight beyond a basic existence check — worth a closer look if orders
ever need to be cancellable mid-delivery by a real user action.

## Logging

There is currently no structured logging — only the two `console.log`
lines in `server.js` on boot. For production:

- Request logging (method, path, status, duration) as middleware in
  `Router.handle()`.
- Structured (JSON) logs so they're queryable in whatever aggregator you
  land on (see Monitoring below) — even a simple
  `console.log(JSON.stringify({...}))` is enough to start, no library
  needed given this project's zero-dependency philosophy.
- The existing `db.orderEvents` audit trail is a reasonable foundation for
  business-event logging (order lifecycle) — it just isn't persisted or
  exported anywhere yet.

## Monitoring

- `/health` exists and is wired into the Docker healthcheck — that's the
  minimum viable monitoring signal and it's already there.
- No metrics export in a standard format (Prometheus, StatsD). The
  `services/metrics.js` numbers are the right *content* — exposing them at
  `/metrics/prometheus` in `text/plain` exposition format would be a small,
  high-value addition without touching the calculation logic at all.
- No alerting. SLA breaches are visible in the dashboard but nothing pages
  anyone — a natural extension of `services/sla.js`'s existing at-risk
  detection is to fire a webhook instead of (or alongside) the SSE
  broadcast once breach rate crosses a threshold.

## The one structural gap that matters most

Everything above is additive — bolt it on without touching what exists.
The one gap that changes existing code is the in-memory store: `db.js`
needs to become a real Postgres pool (schema already specified in
`architecture.md`) before this survives a restart or scales past one
process. Every service and route already goes through `db.js`'s exported
functions rather than touching arrays directly, which is exactly what
makes that swap contained instead of a rewrite — but it is still real work,
not a config flag.
