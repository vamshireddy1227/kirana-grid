// In-memory store shaped exactly like the Postgres schema in architecture.md.
// Swapping this for a real `pg` pool later means the services/routes above it
// do not change — they only ever call db.* functions, never touch storage directly.

let uidCounter = 1;
function uid(prefix) {
  return `${prefix}_${(uidCounter++).toString(36)}${Date.now().toString(36).slice(-4)}`;
}

const cities = [
  { id: "city_hyd", name: "Hyderabad", state: "Telangana", tier: 1 },
  { id: "city_vizag", name: "Visakhapatnam", state: "Andhra Pradesh", tier: 2 },
];

const zones = [
  { id: "zone_banjara", city_id: "city_hyd", name: "Banjara Hills", lat: 17.4156, lng: 78.4347, base_delivery_fee: 25, radius_km: 2.5 },
  { id: "zone_hitech", city_id: "city_hyd", name: "Hitech City", lat: 17.4483, lng: 78.3915, base_delivery_fee: 30, radius_km: 3 },
  { id: "zone_secun", city_id: "city_hyd", name: "Secunderabad", lat: 17.4399, lng: 78.4983, base_delivery_fee: 22, radius_km: 2.5 },
  { id: "zone_gachi", city_id: "city_hyd", name: "Gachibowli", lat: 17.4401, lng: 78.3489, base_delivery_fee: 28, radius_km: 2.5 },
  { id: "zone_mvp", city_id: "city_vizag", name: "MVP Colony", lat: 17.7326, lng: 83.3332, base_delivery_fee: 20, radius_km: 2 },
  { id: "zone_dwaraka", city_id: "city_vizag", name: "Dwaraka Nagar", lat: 17.7231, lng: 83.3016, base_delivery_fee: 20, radius_km: 2 },
];

function jitter(base, spread) {
  return base + (Math.random() - 0.5) * spread;
}

const businesses = [];
const products = [];
zones.forEach((z, zi) => {
  const count = 3 + (zi % 3);
  for (let i = 0; i < count; i++) {
    const b = {
      id: uid("biz"),
      zone_id: z.id,
      city_id: z.city_id,
      name: `${z.name} ${["Supermarket", "Pharmacy", "Kirana Store", "Warehouse"][i % 4]}`,
      category: ["supermarket", "pharmacy", "kirana", "warehouse"][i % 4],
      lat: jitter(z.lat, 0.02),
      lng: jitter(z.lng, 0.02),
      service_radius_km: 5,
      is_open: true,
    };
    businesses.push(b);
    for (let p = 0; p < 3; p++) {
      products.push({
        id: uid("prod"),
        business_id: b.id,
        name: `Item ${p + 1}`,
        price: Math.round(jitter(150, 200)),
        stock_qty: Math.floor(jitter(40, 60)),
      });
    }
  }
});

const drivers = [];
zones.forEach((z, zi) => {
  const count = 4 + (zi % 3);
  for (let i = 0; i < count; i++) {
    drivers.push({
      id: uid("drv"),
      zone_id: z.id,
      city_id: z.city_id,
      vehicle_type: i % 5 === 0 ? "van" : "bike",
      status: Math.random() > 0.35 ? "online" : "offline",
      lat: jitter(z.lat, 0.02),
      lng: jitter(z.lng, 0.02),
      rating: +(4 + Math.random()).toFixed(2),
      completed_deliveries: Math.floor(Math.random() * 400),
      on_time_rate: +(80 + Math.random() * 20).toFixed(1),
      current_batch_load: 0,
      target: { lat: jitter(z.lat, 0.02), lng: jitter(z.lng, 0.02) },
    });
  }
});

const orders = [];
const orderEvents = [];
const cityRevenue = Object.fromEntries(cities.map((c) => [c.id, 0]));

// ── Metrics support structures ─────────────────────────────────────
// Kept separate from the core tables above (mirrors how a real system
// would keep this in a metrics/analytics store, not the transactional one).
const metrics = {
  totalOrders: Object.fromEntries(cities.map((c) => [c.id, 0])),
  deliveredCount: Object.fromEntries(cities.map((c) => [c.id, 0])),
  slaBreachCount: Object.fromEntries(cities.map((c) => [c.id, 0])),
  deliveryDurationsMin: Object.fromEntries(cities.map((c) => [c.id, []])), // capped ring buffer per city
  orderTimestamps: Object.fromEntries(cities.map((c) => [c.id, []])), // for orders/minute
  zoneDemand: Object.fromEntries(zones.map((z) => [z.id, 0])), // rolling count, decays over time
};

const MAX_DURATION_SAMPLES = 100;
const MAX_TIMESTAMP_SAMPLES = 300;

function recordOrderCreated(cityId, zoneId) {
  metrics.totalOrders[cityId] = (metrics.totalOrders[cityId] || 0) + 1;
  const ts = metrics.orderTimestamps[cityId];
  ts.push(Date.now());
  if (ts.length > MAX_TIMESTAMP_SAMPLES) ts.shift();
  metrics.zoneDemand[zoneId] = (metrics.zoneDemand[zoneId] || 0) + 1;
}

function recordOrderCompleted(cityId, durationMin, onTime) {
  metrics.deliveredCount[cityId] = (metrics.deliveredCount[cityId] || 0) + 1;
  if (!onTime) metrics.slaBreachCount[cityId] = (metrics.slaBreachCount[cityId] || 0) + 1;
  const durations = metrics.deliveryDurationsMin[cityId];
  durations.push(durationMin);
  if (durations.length > MAX_DURATION_SAMPLES) durations.shift();
}

// Demand decays over time so the heatmap reflects recent activity, not
// all-time totals — otherwise the first zone to get busy stays "hottest" forever.
function decayZoneDemand() {
  Object.keys(metrics.zoneDemand).forEach((zid) => {
    metrics.zoneDemand[zid] = Math.max(0, metrics.zoneDemand[zid] * 0.92);
  });
}

// ── Demo mode ───────────────────────────────────────────────────────
// Global multiplier the simulator reads each tick. Demo mode = faster order
// spawn rate + higher forced online-driver ratio, so the dashboard reads as
// a "real company running live" instead of a sparse trickle of test events.
const demoState = { active: false, spawnMultiplier: 1, startedAt: null };

function logEvent(orderId, event, metadata = {}) {
  orderEvents.push({ order_id: orderId, event, metadata, ts: Date.now() });
}

module.exports = {
  uid,
  cities,
  zones,
  businesses,
  products,
  drivers,
  orders,
  orderEvents,
  cityRevenue,
  metrics,
  demoState,
  recordOrderCreated,
  recordOrderCompleted,
  decayZoneDemand,
  logEvent,
  findZone: (id) => zones.find((z) => z.id === id),
  findBusiness: (id) => businesses.find((b) => b.id === id),
  findDriver: (id) => drivers.find((d) => d.id === id),
  findOrder: (id) => orders.find((o) => o.id === id),
};
