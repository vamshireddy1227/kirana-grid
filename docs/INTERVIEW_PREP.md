# Interview Prep: Kirana Grid (Real-Time Hyperlocal Logistics)

Everything here is grounded in what you actually built — the numbers,
algorithm weights, and design decisions match your real code. Say these
things because they're true, not because they sound good. That's also
your best defense against follow-up questions: you're describing your own
decisions, not reciting a script you don't fully own.

---

## 1. The 60-second elevator pitch

Read this out loud a few times until it stops sounding read. Don't
memorize it word-for-word — memorize the *shape* (5 beats: what it is →
the one interesting problem → how you solved it → the honest scope → the
one thing you're proud of).

> "I built a real-time control tower for a hyperlocal delivery network —
> think the dispatch dashboard behind something like Swiggy Instamart.
> The interesting problem wasn't the UI, it was the backend: when an order
> comes in, which driver do you assign it to, in real time, at scale?
>
> I built a weighted scoring engine — it looks at distance, but also the
> driver's current load and their on-time track record — and it explains
> its own decision in plain English, not just a black-box score. Orders
> flow through a full lifecycle — placed, assigned, picked up, in transit,
> delivered — pushed to the dashboard live over Server-Sent Events, with
> an SLA monitor that flags at-risk orders before they're actually late,
> and a demand heatmap that decays over time so it reflects what's
> happening *right now*.
>
> It's a single Node process, zero external dependencies, one Docker
> command to run anywhere. The data layer is in-memory today — by design,
> for a demo — but it's shaped exactly like the Postgres schema it's meant
> to sit on, so that swap is contained to one file, not a rewrite.
>
> The part I'm proudest of is that explainability — most dispatch demos
> just pick the nearest driver. Mine tells you *why* it picked the one it
> did."

**Why this structure works:** it front-loads the interesting technical
decision (not "I made a delivery app"), gives one concrete differentiator
(explainability) they'll remember and can ask about, and volunteers the
honest limitation before they find it — which reads as senior, not weak.

---

## 2. Deep technical explanation — talking points, not a textbook

Speak these as answers to "walk me through the architecture," building
from high level down. Don't dump all of this at once — this is fuel for
follow-ups, not one long monologue.

### Architecture, high to low

**High level:** "One Node process serves both the API and the dashboard.
A background simulator drives activity through the same code paths a real
order-placement API call would use — so the demo isn't a separate fake
path, it's exercising the real assignment engine."

**Mid level:** "Three real-time-relevant pieces: an SSE hub that keeps
open connections per city and broadcasts events, a simulator that owns
the order lifecycle and driver movement, and a set of pure services —
assignment, batching, SLA, metrics, heatmap — that the simulator and the
REST routes both call into. Metrics and heatmap are computed on read, not
pushed every tick, because that keeps the numbers consistent — the client
polls those every few seconds rather than trying to derive aggregates
from a stream of deltas itself."

**Low level (only if asked):** "The router is hand-rolled — regex path
matching, JSON body parsing — about 80 lines. I did that deliberately
instead of Express because I had zero network access in my dev sandbox at
the time; it turned into a good excuse to actually understand what a
router does instead of trusting a framework for it."

*(If you didn't build it under that specific constraint, adjust — but the
underlying point, "I understand what's under the abstraction," is worth
keeping regardless of why.)*

### Event flow (SSE)

"Each client opens one long-lived HTTP connection per city
(`/stream/:cityId`). The server holds a `Set` of connected clients; when
something happens — an order created, a driver moved — it writes a
`event: name\ndata: {...}\n\n` frame to every client subscribed to that
city. The browser's native `EventSource` API handles reconnection for
free. Driver position updates are batched — one event per city per tick
with every driver's position, not one event per driver — because at real
scale, fan-out cost matters more than event granularity."

### Order lifecycle

"Five states: placed, assigned, picked up, in transit, delivered — or it
diverts to an SLA-violation outcome if it's late. Every transition is a
real state change in the store, logged to an event audit trail, and
broadcast. Nothing on the dashboard is a status that isn't backed by an
actual record — that was a rule I held myself to."

### Driver assignment logic

"Every online driver in the order's zone gets scored:
55% weight on distance, minus 25% on their on-time rate, plus 15% on
their current load, plus a large fixed penalty if their vehicle type
doesn't fit the order — a bike can't take a bulk warehouse order. Lowest
score wins. Then I generate a plain-English explanation from whichever
1-2 factors actually drove the decision, not a dump of every number —
that's a judgment call, not just formatting."

### Metrics + SLA

"SLA monitoring runs on an 80%-elapsed threshold — flag an order as
at-risk before it's actually late, not after, so there's time to act.
Metrics — total orders, SLA success rate, average delivery time, revenue,
orders per minute — are computed from rolling counters, not stored as
pre-aggregated numbers, so they're always consistent with the underlying
order records."

### Heatmap

"Every new order bumps its zone's demand counter. Every few seconds, all
counters decay by a fixed factor — so a zone that was busy an hour ago
doesn't stay 'hot' forever. Normalize against the busiest zone in the city
and you get a 0-to-1 intensity the frontend maps straight to a color."

---

## 3. System design interview mode

Below: the interviewer's question, then a strong sample answer. Read the
answer, then try answering out loud from memory before checking it again.
The goal isn't the exact wording — it's the reasoning pattern.

---

**Q: How would you scale this to a million users?**

> "First I'd separate what actually needs to scale. The read-heavy parts —
> metrics, heatmap — scale horizontally trivially, they're stateless
> computations over data in a real datastore. The stateful part is the SSE
> connections and the in-memory order/driver state — that's the hard part.
>
> I'd split it three ways: (1) move the data layer to Postgres for orders
> and a real-time store — Redis — for driver positions and online-driver
> sets per zone, since that's exactly the low-latency, high-write pattern
> Redis is built for. (2) Put the assignment/batching/SLA logic behind a
> proper message queue — Kafka or even just SQS — so order-placed events
> get processed by a pool of assignment workers instead of one process
> handling everything inline. (3) For the SSE fan-out itself, you can't
> have one process holding a million open connections — you'd shard
> clients across multiple gateway instances by city or region, with
> Redis pub/sub (or Kafka) as the backbone so any gateway instance can
> broadcast an event that originated on a different instance."

**Q: Why SSE instead of WebSockets?**

> "Because the client only ever receives — it never needs to push data
> back in real time. SSE gives you that over plain HTTP: no extra
> handshake protocol, automatic reconnection built into the browser's
> EventSource API, and it plays nicely with standard HTTP infrastructure
> like load balancers and proxies without special config. WebSockets earn
> their complexity the moment you need bidirectional push — say, a driver
> app streaming live GPS *up* to the server. That's actually the natural
> next piece of this system, and it's the one place I'd reach for
> WebSockets specifically."

**Q: How would you handle failures?**

> "A few layers. At the request level: the router already catches handler
> exceptions and returns a clean error instead of crashing the process —
> but right now it leaks the raw error message, which I'd fix by logging
> the full error server-side and returning just a request ID to the
> client. At the business-logic level: what happens if a driver goes
> offline mid-delivery? Right now the simulator's timeout chain does a
> basic existence check but doesn't reassign the order — in a real system
> that's a gap I'd close with a driver-heartbeat check that triggers
> reassignment if a driver goes silent mid-delivery. At the infra level:
> SSE connections will drop — clients need to reconnect and resync via the
> snapshot endpoint, which is exactly why I built snapshot-then-stream as
> two separate steps instead of one combined call."

**Q: How would you optimize the assignment logic?**

> "Today it's O(drivers-in-zone) per order, which is fine at hyperlocal
> scale — a zone has maybe a few dozen online drivers. At real scale I'd
> keep that part, since it's already cheap, but I'd change *when* it runs:
> instead of scoring synchronously in the request path, publish an
> 'order-placed' event and let a pool of assignment workers consume it,
> so a burst of orders doesn't serialize behind one process. I'd also
> revisit the weights — they're currently fixed constants I chose by
> intuition (distance 55%, reliability 25%, load 15%); a real system
> would tune those against actual delivered-on-time outcomes, probably
> with a simple regression or even just A/B testing different weight
> sets against real SLA data."

---

## 4. Tricky follow-up questions

**"What breaks first at 10x your current load?"**
> "The in-memory store — it's a single JS object graph in one process.
> No sharding, no persistence, doesn't survive a restart. That's the
> honest first bottleneck, and I'd say so directly rather than pretend
> it's not there."

**"Why not just always assign the nearest driver? Isn't that simpler and good enough?"**
> "It's simpler, but it's locally optimal and globally worse. A driver
> 300m away who's already got 3 orders queued and a mediocre on-time rate
> will make *that* delivery late even though it looked like the 'obviously
> right' choice. Weighing load and reliability trades a small amount of
> per-decision simplicity for meaningfully better fleet-wide SLA
> performance — that's the actual bet the whole feature makes."

**"Your heatmap decays 8% every 5 seconds — how did you pick that number, and what happens if it's wrong?"**
> "Honestly, it was a starting guess, not derived from data — that's a
> fair thing to admit. If it decays too fast, a zone that's genuinely
> having a rough hour looks 'cooled off' between bursts; too slow, and a
> zone that was busy an hour ago stays falsely 'hot.' In a real system I'd
> tune it against actual order-arrival variance per zone, probably with an
> exponential moving average with a time constant chosen from historical
> demand data rather than a flat multiplier."

**"What's the trade-off in using SSE instead of plain polling?"**
> "Polling is simpler and stateless — no held-open connections — but you
> either poll too slowly and add latency, or poll too fast and waste
> requests on 'nothing changed.' SSE trades that for held-open connections
> per client, which is real cost at scale (memory, file descriptors) but
> gets you near-zero latency without wasted requests. My metrics and
> heatmap endpoints actually *do* use polling, deliberately — they're
> cheap to compute and don't need sub-second freshness, so I didn't pay
> the SSE cost for them. That split was intentional, not an oversight."

**"How do you know your SLA numbers are actually correct and not just optimistic simulation?"**
> "Fair challenge. The simulator generates the underlying events, so in
> that sense the 'orders' are synthetic — but the SLA calculation itself
> isn't: it's the same `elapsed / sla_minutes` ratio logic that would run
> against real order timestamps. I actually unit-tested that piece in
> isolation with a synthetic order set — safe, at-risk, and breached cases
> — before wiring it into the live simulator, specifically so I could
> trust the logic independent of whether the data feeding it was real or
> simulated."

---

## 5. "If I had more time, I would..."

Frame every one of these as a specific next step you've actually thought
through, not a vague buzzword drop. Pick 2-3 to go deep on if asked —
don't try to name all four in one breath.

- **Message queue (Kafka/SQS):** "Decouple order creation from
  assignment — publish an event, let a worker pool consume it. That's
  what lets a burst of 10,000 orders not serialize behind one process,
  and it's also just the correct pattern for anything event-driven at
  scale — my simulator already emits discrete events, so this is
  extending an existing seam, not bolting on something foreign."

- **Microservices split:** "Right now it's one process for pragmatic
  reasons — zero deployment complexity for a demo. The natural seams are
  already there in the code, though: assignment, batching, SLA, and
  metrics are separate service files that only talk through the data
  layer. Splitting them into separate deployable services is mostly an
  infrastructure change at this point, not a redesign."

- **DB scaling:** "Postgres for the transactional order/business data,
  sharded by city once any single city's write volume justifies it — this
  is a multi-city system by design, so city is a natural, already-present
  shard key. Driver location goes in Redis or a time-series store, not
  Postgres — that's high-write, short-retention data, the wrong shape for
  a relational table."

- **Caching:** "Heatmap and metrics are exactly the kind of read-heavy,
  slightly-stale-is-fine data caching exists for — a short TTL cache (a
  few seconds) in front of those endpoints would cut database load
  substantially at real traffic without changing the freshness users
  actually perceive."

---

## 6. Natural speaking style — the meta-rules

- **Say "I chose X because Y," not "X is the industry standard."**
  Ownership reads as seniority; parroting best-practices vocabulary
  without a because-clause reads as memorized.
- **Volunteer the honest limitation before they find it.** You did this
  already in the elevator pitch (in-memory store). Do it again whenever
  it's relevant — it's the single biggest signal of seniority in this
  whole prep guide.
- **Short sentences for the punchline, longer ones for the reasoning.**
  "Lowest score wins" lands harder right after three clauses explaining
  the weights than buried in the middle of one long sentence.
- **When you don't know something, say what you'd do to find out** —
  not "I'm not sure" and stop. "I'd tune that against real outcome data,
  I don't have a principled number for it today" is a complete, confident
  answer to a question you can't fully answer.
- **Don't over-defend the toy parts.** The simulator is a simulator, the
  weights are hand-picked, the decay constant is a guess — say so plainly
  and move to what *is* solid (the algorithm shapes, the event
  architecture, the honesty about what's not solid). Confidence comes
  from knowing which parts are real, not from claiming everything is.
