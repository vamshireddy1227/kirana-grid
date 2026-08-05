# Resume + LinkedIn Content

## Resume bullet points (ATS-optimized)

Pick 2-4 depending on the role — don't use all of them, it reads as padding.

- Designed and built a real-time hyperlocal logistics control platform
  (Node.js, Server-Sent Events) featuring a weighted order-assignment
  algorithm, nearest-neighbor + 2-opt delivery route batching, and live SLA
  monitoring, deployed with Docker for one-command reproducibility.
- Implemented an event-driven order lifecycle (5 states) with sub-second
  real-time updates to a live operations dashboard, handling concurrent
  multi-city simulation with isolated per-city metrics and state.
- Built a driver-assignment scoring engine weighing distance, current load,
  and historical on-time rate, with automated human-readable explanation
  generation for each dispatch decision.
- Developed a live analytics layer (orders/minute, SLA success rate,
  average delivery time, revenue) computed from streaming event data and
  a decaying demand-heatmap engine for zone-level operational visibility.
- Architected a zero-dependency Node.js backend (no external packages) with
  a from-scratch HTTP router, SSE broadcast hub, and in-memory data layer
  schema-matched to a production Postgres design for a documented,
  low-friction migration path.

## Project description (for a resume "Projects" section or portfolio site)

**Kirana Grid — Real-Time Hyperlocal Logistics Control Platform**
A live operations dashboard for a hyperlocal delivery network: real-time
order tracking, an explainable driver-assignment engine, delivery route
batching, SLA monitoring, and multi-city demand analytics. Built end-to-end
(backend, real-time event system, dashboard) with zero external
dependencies and a one-command Docker deployment.
*Tech: Node.js, Server-Sent Events, vanilla JS/SVG, Docker*
[Live demo] · [GitHub]

## LinkedIn post

Two versions — pick the tone that matches how you actually post.

### Version A — plainer, still confident

I built a real-time logistics control tower from scratch — the kind of
dispatch dashboard behind hyperlocal delivery apps — to go deeper on
real-time systems than a tutorial project would take me.

What it does:
→ Live order tracking over Server-Sent Events, not polling
→ A driver-assignment engine that scores distance, load, and reliability —
  and explains its own decisions in plain English
→ Delivery batching with a nearest-neighbor + 2-opt route optimizer
→ Live SLA monitoring and a demand heatmap that decays over time so it
  reflects what's happening *now*
→ Zero external dependencies — one Docker command runs the whole thing

The part I'm most proud of isn't the dashboard, it's that the assignment
engine tells you *why* it picked a driver instead of just picking one.
That "explainability" habit is something I want to carry into every system
I build.

Live demo: [link]
Code + architecture docs: [link]

Would love feedback from anyone who's built real-time dispatch or
logistics systems for a living — I'm sure there are rough edges I can't
see yet.

#buildinpublic #softwareengineering #realtimesystems #nodejs

### Version B — shorter, punchier

Spent the last stretch building this: a live control tower for a
hyperlocal delivery network. Real-time order tracking, an
assignment engine that explains its own decisions, route batching, SLA
monitoring — one Docker command to run the whole thing, zero external
dependencies.

The screenshot doesn't do the real-time part justice — every dot on that
map is actually moving, live, right now.

[link]

Built to go deeper on real-time systems design than most portfolio
projects bother to. Happy to walk through the architecture with anyone
curious — details are in the repo.

#softwareengineering #nodejs #systemdesign

---

**Note on both drafts:** fill in the actual live link and repo link before
posting, and swap any claim you can't back up in a follow-up comment (e.g.
if someone asks about the in-memory store, the honest answer is in
`docs/PRODUCTION.md` — don't oversell durability you don't have).
