# Demo Script

A ~3-minute walkthrough. Written to be read once and then performed from
memory — it's a sequence of "click this, say this," not a script to read
aloud verbatim.

## Setup (before anyone's watching)

```bash
docker compose up -d --build
```

Open the deployed/local URL. Optionally hit **Start Demo** in the top bar
right away so there's already visible activity by the time anyone looks —
don't make them wait for the first order.

---

## 1. Open on the map (15s)

> "This is a live control tower for a hyperlocal delivery network — think
> the dispatch view behind Swiggy or Instamart, built from scratch. What
> you're looking at right now is real: those dots are drivers actually
> moving, that line is an actual order being tracked between a business and
> a driver."

Point at a driver mid-delivery. Let one order complete on screen if timing
allows — the ticker line turning green is a good beat to pause on.

## 2. Metrics row (20s)

> "Every number up here — total orders, SLA success rate, revenue, orders
> per minute — is computed by the backend from real event data, polled
> live. Nothing on this page is a static mock."

Point out the SLA gauge specifically — it's the easiest single number to
explain and ties directly to a business concept (on-time delivery %).

## 3. The assignment explanation panel (30s) — this is the highlight

> "Here's the part I'm actually proud of. Most demo dispatch systems just
> assign the nearest driver. This one doesn't — it's a weighted scoring
> engine that factors in distance, the driver's current load, and their
> on-time track record. And it explains itself."

Wait for (or trigger, via Start Demo) a fresh `order_assigned` event and
read the explanation text aloud as it appears:

> "'Driver X assigned because nearest available and high reliability' —
> that sentence is generated from the actual score components the engine
> computed, not a template. If you ask me why a specific driver won, I can
> show you the number."

## 4. Heatmap (15s)

> "Zone color intensity is demand, decaying over time — so it reflects
> what's busy *right now*, not an all-time total that only ever goes up."

## 5. Demo mode (10s)

> "This button is a legitimate feature, not just a demo trick — ops teams
> use exactly this kind of control to stress-test a system before a big
> sale event."

Click **Start Demo** if not already on; point at the order rate visibly
climbing on the sparkline.

## 6. Close with the engineering, not just the UI (30s)

> "Under the hood: it's a real-time backend with Server-Sent Events, a
> weighted assignment algorithm, a route optimizer using nearest-neighbor
> plus 2-opt for delivery batching, and a metrics/heatmap layer computed
> from live counters — zero external dependencies, one Docker command to
> run anywhere. Architecture and the event-flow diagrams are in the repo
> if you want the detail."

---

## If someone asks a hard question

**"Is this connected to a real database?"**
> "No — in-memory by design for this demo, shaped exactly like the
> Postgres schema it's meant to sit on. Swapping the store is a one-file
> change (`db.js`); nothing else in the codebase touches storage directly."
Honest, not defensive — this is a genuinely reasonable scoping decision
for a portfolio piece and it's fine to say so plainly.

**"Why not WebSockets?"**
> "SSE because the client only ever needs to receive, never send back in
> real time — one-directional push over plain HTTP, reconnects
> automatically, no extra protocol. WebSockets is the right call the
> moment there's a driver app pushing live GPS *up* — that's the natural
> next piece."

**"What would break at real scale?"**
> "The in-memory store, first — it doesn't survive a restart or a second
> instance. Then the batching engine's first-available driver assignment,
> which should use the same scoring logic as single-order assignment.
> Both are called out explicitly in the repo's docs, not things I'm
> pretending aren't there."
