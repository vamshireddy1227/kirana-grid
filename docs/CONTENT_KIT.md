# Content Kit — Visibility & Career Growth

A note before any of this: virality tools amplify what's actually there.
The reason this is usable for that at all is that the underlying claims
are true and specific — a real assignment algorithm, real event
architecture, real trade-off decisions you can defend. Every draft below
leans on that instead of hype words, because "real-time" and
"production-ready" are worn out from overuse — specificity is what still
gets attention.

---

## 1. LinkedIn viral post

Formatting note: short lines, lots of white space, no walls of text — that's
what actually performs on LinkedIn, not a stylistic preference.

```
Most "delivery app" portfolio projects assign orders to the nearest
driver and call it done.

I got annoyed by how lazy that is, so I built the dispatch engine I
thought it should have:

→ Weighs distance AND driver load AND on-time reliability
→ Generates a plain-English reason for every decision it makes
→ Streams every order and driver update live over Server-Sent Events
→ Flags SLA risk *before* an order is late, not after
→ Runs a demand heatmap that decays over time instead of just piling up

It's a real-time control tower for a hyperlocal delivery network — the
kind of dashboard behind Swiggy Instamart or Blinkit, built from scratch.

The one thing I actually care about, out of all of it:

When the system assigns an order, it doesn't just pick a driver — it
tells you why. "Nearest available and high reliability" isn't a canned
string, it's generated from the real score the engine computed.

Zero external dependencies. One Docker command runs the whole thing
anywhere.

The data layer is in-memory — by design, for a demo — but it's shaped
exactly like the Postgres schema it's meant to sit on. I'd rather tell
you that upfront than have you find it in the code.

Live demo: [link]
Code + architecture docs: [link]

If you've built real-time dispatch or logistics systems and see something
I got wrong, I'd genuinely like to hear it.
```

**Why this works, mechanically:** the hook (line 1-2) creates a small
disagreement, which stops the scroll better than an announcement would.
The arrows are scannable in under 3 seconds on mobile. It names one
specific feature to remember (the explainability) instead of a feature
list nobody retains. It volunteers the limitation before a commenter can
"well actually" you — that's what makes the CTA at the end land as
genuine instead of engagement-bait.

**Post this only after** the live demo link actually works — a viral post
with a dead or spun-down link converts curiosity into the worst possible
first impression.

---

## 2. Twitter / X thread (8 tweets)

```
1/
Built a real-time logistics dispatch engine — the dashboard kind behind
hyperlocal delivery apps.

Most versions of this project just pick the nearest driver.

Mine explains itself. Thread on how 🧵

2/
The core problem: order comes in, which driver gets it?

"Nearest" sounds obviously right until you notice that a driver 300m away
with 3 orders already queued will make YOUR delivery late.

So I built a weighted scorer instead.

3/
score = 0.55×distance − 0.25×reliability + 0.15×load
(+ a big penalty if the vehicle type doesn't fit the order)

Lowest score wins. Then I generate a plain-English reason from whichever
1-2 factors actually drove it — not a dump of every number.

4/
Real-time layer: Server-Sent Events, not WebSockets.

Client only ever receives, never pushes back — SSE gives you that over
plain HTTP, auto-reconnects in every browser for free, no extra protocol
to manage.

5/
Order lifecycle is 5 real states: placed → assigned → picked_up →
in_transit → delivered.

Every transition is a real record, logged, and broadcast live. Nothing on
the dashboard is a status that isn't backed by an actual state change.

6/
SLA monitoring flags orders at 80% of their time window elapsed — before
they're late, not after. Small detail, but it's the difference between a
system you can act on and one that just tells you what already happened.

7/
Zero external dependencies. Hand-rolled HTTP router, hand-rolled SSE hub.
One Docker command runs the whole thing anywhere.

Not because frameworks are bad — I wanted to actually understand what's
under the abstraction for once.

8/
In-memory data store — I'll say that straight up, not hide it. Shaped
exactly like the Postgres schema it's meant to sit on, so swapping it is
one file, not a rewrite. Just not done yet.

Live demo: [link]
Code: [link]

Would love pushback from anyone who's built this for real.
```

**Thread mechanics:** tweet 1 has zero technical content on purpose — it's
pure hook, technical depth starts at 2. Each tweet is one idea, so it
survives being screenshotted and shared out of context. The formula in
tweet 3 is the single most "save-worthy" tweet in the thread — it's the
one most likely to get quote-tweeted by someone with an opinion about the
weights, which is good, not bad — that's a comment section that builds
credibility, not the kind that damages it.

---

## 3. Demo video scripts

### 30-second version (Reels / Shorts / TikTok-style)

Screen: dashboard already running, Demo Mode already on before recording starts.

```
[0:00] Screen: map with drivers moving, orders flowing
VOICE: "This is a live dispatch system I built — every dot is a driver,
actually moving, right now."

[0:06] Screen: zoom/point at metrics row
VOICE: "Every number here — orders, SLA rate, revenue — computed live
from real backend events."

[0:12] Screen: cut to the assignment explanation panel, an order just got assigned
VOICE: "Here's the part I actually care about — it doesn't just pick a
driver, it tells you why."
[Read the explanation text on screen out loud]

[0:20] Screen: quick cut to code — the scoring function, 2-3 seconds
VOICE: "Distance, driver load, reliability — real weighted logic, not a
mock."

[0:26] Screen: terminal, `docker compose up`, then back to dashboard
VOICE: "One Docker command, zero dependencies. Link's in the caption."
```

Keep total cuts to 5-6 max — more than that in 30 seconds reads as frantic
rather than energetic.

### 2-minute version (YouTube / LinkedIn native video)

Structure matches `docs/DEMO_SCRIPT.md` almost exactly — use that as the
verbal script. Screen directions to layer on top:

```
[0:00-0:15] Face to camera or voiceover over the dashboard already live.
Open on the map, not a title card — the motion is the hook.

[0:15-0:35] Metrics row — screen-record a slow pan/zoom across the cards
while explaining what's real about them.

[0:35-1:05] THE CENTERPIECE. Trigger or wait for a fresh assignment,
screen-record the explanation panel updating in real time. Don't cut away
until the full sentence has appeared on screen — let it breathe.

[1:05-1:20] Heatmap — point at a zone changing color as orders land there.

[1:20-1:35] Click Start Demo live on screen, show the order-rate sparkline
visibly climb.

[1:35-2:00] Cut to a quick code scroll — assignment.js's scoring function,
the SSE broadcast call — 3-4 seconds each, not a full read-through.
Close on the GitHub URL and live link on screen, both spoken and shown.
```

**One rule for both scripts:** never say "as you can see" about something
that isn't currently on screen — record the screen action first, write
narration to match it, not the reverse. Mismatched voiceover-to-footage
is the single most common thing that makes dev demo videos feel amateur.

---

## 4. GitHub showcase content

### Banner title ideas (pick one, don't stack them)

- **Kirana Grid** — Real-Time Hyperlocal Logistics Control Platform
- **Kirana Grid** — The Dispatch Engine That Explains Itself
- **Kirana Grid** — Live Control Tower for Hyperlocal Delivery

### Tagline options

- "Nearest driver isn't the answer. This is."
- "Real-time dispatch, with a reason for every decision."
- "Zero dependencies. One command. A live logistics control tower."
- "Built the dispatch algorithm I wished delivery-app demos actually had."

### Feature highlight bullets (for the repo's top-of-README strip or a Twitter bio link page)

- 🧠 Explainable driver assignment — not a black box
- 🔴 True real-time via Server-Sent Events, not polling dressed up
- 📊 Live metrics computed from real event counters
- 🔥 Demand heatmap that decays — reflects now, not ever
- 🐳 One Docker command, zero npm dependencies

### Screenshot captions

- *"Every dot on this map is a driver, actually moving, live."*
- *"The assignment engine doesn't just pick a driver — it explains why."*
- *"Zone heat reflects the last few minutes, not an all-time count."*
- *"One button ramps the whole system up for a live-feeling demo."*

---

## 5. Personal brand positioning

**How to describe yourself (short bio line):**
> "Backend/systems-leaning developer — I like the parts of an app most
> people skip: real-time architecture, algorithm design, and being honest
> in docs about what's not finished yet."

That last clause is doing real work — it's specific and slightly
unusual, which is exactly what makes a one-line bio memorable instead of
interchangeable with every other "full-stack developer" bio.

**The niche you're actually in:** not "full-stack," not "web developer" —
**real-time systems / backend architecture, with product sense.** The
project demonstrates three things at once that most student projects
don't combine: (1) a genuine algorithm with tunable trade-offs, not CRUD;
(2) real-time/event-driven architecture, not request-response only; (3)
honest scoping — knowing and stating what's a demo vs. what's production.
That combination — technical depth *plus* calibrated honesty — is the
actual differentiator. Lean into it explicitly rather than trying to also
claim frontend-design or ML or whatever else feels safer to also mention.

**How to stand out from other students specifically:** most student
portfolios either (a) clone a well-known app's UI with a fake backend, or
(b) build a real backend with a UI they clearly didn't think about. You
did neither — the UI exists specifically to make the backend's real
behavior visible. Say that explicitly when asked "what makes this
different" — it's a genuinely accurate answer, not spin.

---

## 6. Posting strategy

**Order of releases — spread over 2-3 weeks, not one day:**
1. LinkedIn post (highest reach-per-effort for recruiters specifically)
2. Twitter thread, 1-2 days later (different audience, some overlap is fine)
3. Demo video (native upload to LinkedIn/YouTube), a few days after that —
   let the post's comments inform what to emphasize in the video
4. A short "here's what I'd build next" follow-up post 1-2 weeks later —
   this is the single highest-leverage post type for standing out, because
   almost nobody posts a credible follow-up. Reference `docs/PRODUCTION.md`
   for genuine, specific next steps — not vague "more features coming."

**Timing:** weekday mornings (8-10am your audience's timezone) consistently
outperform weekends for career-oriented content — recruiters and engineers
browse LinkedIn during commute/coffee, not weekend leisure time.

**Frequency:** don't post more than 2-3 times a week even during this
launch window — a feed of nothing but one project reads as one-note. Mix
in a short technical note or opinion between the launch posts if you have
one worth sharing.

**What to post next, after the launch window:** the strongest recurring
content isn't more announcements — it's **process**: "here's a bug I hit
building X and how I found it," "here's a design decision I'd make
differently now," "here's what a code review taught me." Announcement
posts get you a spike; process posts get you a following, because they're
the only kind that make someone want your *next* post too, not just this
one.

**The single biggest momentum killer:** posting the launch content and
then going quiet for a month. Even one honest reply to every comment in
the first 24 hours does more for reach than a second post would — the
algorithm and human trust both respond to genuine engagement, not
volume.
