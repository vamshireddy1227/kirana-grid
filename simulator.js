const db = require("./db");
const { assignOrder } = require("./services/assignment");
const { checkOrders } = require("./services/sla");
const { broadcast } = require("./sse");

const flaggedAtRisk = new Set(); // order ids already broadcast as at-risk, avoid repeat spam

// ── Driver states ───────────────────────────────────────────────────
// offline    -> not working
// online     -> idle, available for assignment
// assigned   -> accepted an order, en route to pickup
// delivering -> picked up, en route to dropoff
//
// ── Order lifecycle ─────────────────────────────────────────────────
// placed -> assigned -> picked_up -> in_transit -> delivered (or sla-breached delivered)

function distanceStep(from, to, factor) {
  return { lat: from.lat + (to.lat - from.lat) * factor, lng: from.lng + (to.lng - from.lng) * factor };
}

function pointInZone(zone) {
  const ang = Math.random() * Math.PI * 2;
  const r = Math.random() * zone.radius_km * 0.008;
  return { lat: zone.lat + Math.cos(ang) * r, lng: zone.lng + Math.sin(ang) * r };
}

// Every driver has a target it walks toward each tick. When it's a delivery
// leg, the target is the order's pickup or dropoff point rather than a
// random wander point — that's what makes movement read as "going somewhere"
// instead of aimless drifting.
function moveDrivers() {
  db.drivers.forEach((d) => {
    const dx = d.target.lat - d.lat;
    const dy = d.target.lng - d.lng;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.0005) {
      if (d.status === "online") {
        const zone = db.findZone(d.zone_id);
        d.target = pointInZone(zone);
      }
      // assigned/delivering drivers hold position at pickup/dropoff until
      // the order timer (which simulates traffic + handling time) fires.
    } else {
      const next = distanceStep(d, d.target, 0.06);
      d.lat = next.lat;
      d.lng = next.lng;
    }
  });

  db.cities.forEach((c) => {
    const cityDrivers = db.drivers.filter((d) => d.city_id === c.id);
    broadcast(c.id, "driver_moved", {
      cityId: c.id,
      ts: Date.now(),
      drivers: cityDrivers.map((d) => ({ id: d.id, lat: d.lat, lng: d.lng, status: d.status, zoneId: d.zone_id })),
    });
  });
}

function spawnOrder() {
  const openBusinesses = db.businesses.filter((b) => b.is_open);
  const business = openBusinesses[Math.floor(Math.random() * openBusinesses.length)];
  if (!business) return;
  const zone = db.findZone(business.zone_id);

  const order = {
    id: db.uid("ord"),
    business_id: business.id,
    zone_id: zone.id,
    city_id: business.city_id,
    status: "placed",
    dropoff: pointInZone(zone),
    sla_minutes: 18 + Math.floor(Math.random() * 12),
    placed_at: Date.now(),
    driver_id: null,
  };
  db.orders.push(order);
  db.logEvent(order.id, "order_created", { businessId: business.id });
  db.recordOrderCreated(order.city_id, zone.id);

  broadcast(order.city_id, "order_created", {
    cityId: order.city_id, ts: Date.now(),
    orderId: order.id, businessId: business.id, businessName: business.name,
    zoneId: zone.id, zoneName: zone.name, lat: business.lat, lng: business.lng,
  });

  const { driver, explanation } = assignOrder({ order, business, drivers: db.drivers });
  if (!driver) {
    broadcast(order.city_id, "order_queued", { cityId: order.city_id, ts: Date.now(), orderId: order.id, zoneId: zone.id });
    return;
  }

  driver.current_batch_load += 1;
  driver.status = "assigned";
  driver.target = { lat: business.lat, lng: business.lng }; // walk to pickup
  order.status = "assigned";
  order.driver_id = driver.id;
  order.assigned_at = Date.now();
  db.logEvent(order.id, "order_assigned", { driverId: driver.id, explanation });

  broadcast(order.city_id, "order_assigned", {
    cityId: order.city_id, ts: Date.now(),
    orderId: order.id, driverId: driver.id, businessId: business.id,
    dropoff: order.dropoff, slaMinutes: order.sla_minutes, explanation,
  });

  // Traffic jitter: pickup + transit legs each get a random extra delay,
  // simulating the unpredictability a fixed ETA formula can't capture.
  const trafficFactor = 0.7 + Math.random() * 0.8; // 0.7x-1.5x baseline time
  const pickupMs = (3000 + Math.random() * 4000) * trafficFactor;
  const transitMs = (6000 + Math.random() * 9000) * trafficFactor;

  setTimeout(() => {
    const current = db.findOrder(order.id);
    if (!current || current.status === "cancelled") return;
    current.status = "picked_up";
    driver.status = "delivering";
    driver.target = order.dropoff;
    db.logEvent(order.id, "order_picked_up", {});
    broadcast(order.city_id, "order_picked_up", { cityId: order.city_id, ts: Date.now(), orderId: order.id, driverId: driver.id });

    setTimeout(() => {
      const c2 = db.findOrder(order.id);
      if (!c2 || c2.status === "cancelled") return;
      c2.status = "in_transit";
      db.logEvent(order.id, "order_in_transit", {});
      broadcast(order.city_id, "order_in_transit", { cityId: order.city_id, ts: Date.now(), orderId: order.id, driverId: driver.id });

      const finalLegMs = 2000 + Math.random() * 3000 * trafficFactor;
      setTimeout(() => {
        const c3 = db.findOrder(order.id);
        if (!c3 || c3.status === "cancelled") return;
        const elapsedMin = (Date.now() - c3.placed_at) / 60000;
        const onTime = elapsedMin <= c3.sla_minutes;
        c3.status = "delivered";
        c3.delivered_at = Date.now();
        driver.status = "online";
        driver.current_batch_load = Math.max(0, driver.current_batch_load - 1);
        const revenue = Math.round(30 + Math.random() * 280);
        db.cityRevenue[order.city_id] = (db.cityRevenue[order.city_id] || 0) + revenue;
        db.recordOrderCompleted(order.city_id, +elapsedMin.toFixed(1), onTime);
        flaggedAtRisk.delete(order.id);

        if (onTime) {
          db.logEvent(order.id, "order_delivered", { revenue });
          broadcast(order.city_id, "order_delivered", {
            cityId: order.city_id, ts: Date.now(), orderId: order.id, driverId: driver.id,
            revenue, onTime: true, elapsedMin: +elapsedMin.toFixed(1),
          });
        } else {
          db.logEvent(order.id, "sla_violation", { revenue });
          broadcast(order.city_id, "sla_violation", {
            cityId: order.city_id, ts: Date.now(), orderId: order.id, driverId: driver.id,
            revenue, onTime: false, elapsedMin: +elapsedMin.toFixed(1),
          });
        }
      }, finalLegMs);
    }, transitMs);
  }, pickupMs);
}

function runSlaSweep() {
  db.cities.forEach((c) => {
    const cityOrders = db.orders.filter((o) => o.city_id === c.id);
    const { atRisk } = checkOrders(cityOrders);
    atRisk.forEach((r) => {
      if (!flaggedAtRisk.has(r.orderId)) {
        flaggedAtRisk.add(r.orderId);
        broadcast(c.id, "sla_risk", { cityId: c.id, ts: Date.now(), ...r });
      }
    });
  });
}

function start() {
  setInterval(moveDrivers, 400);
  setInterval(() => {
    // Demo mode raises spawn frequency by allowing a probabilistic extra
    // spawn per tick, rather than restarting the interval at a new period.
    spawnOrder();
    if (db.demoState.active && Math.random() < (db.demoState.spawnMultiplier - 1) / db.demoState.spawnMultiplier) {
      spawnOrder();
    }
  }, 2200);
  setInterval(runSlaSweep, 3000);
  setInterval(db.decayZoneDemand, 5000);
}

module.exports = { start };
