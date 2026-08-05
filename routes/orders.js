const db = require("../db");
const { json } = require("../router");
const { assignOrder } = require("../services/assignment");
const { distanceKm } = require("../services/geo");

function register(router) {
  // POST /orders  { businessId, dropoff:{lat,lng}, slaMinutes? }
  router.post("/orders", (ctx, res) => {
    const { businessId, dropoff, slaMinutes } = ctx.body;
    const business = db.findBusiness(businessId);
    if (!business) return json(res, 400, { error: "unknown_business" });
    if (!dropoff || typeof dropoff.lat !== "number" || typeof dropoff.lng !== "number") {
      return json(res, 400, { error: "dropoff_required", detail: "dropoff:{lat,lng} required" });
    }

    const order = {
      id: db.uid("ord"),
      business_id: business.id,
      zone_id: business.zone_id,
      city_id: business.city_id,
      status: "placed",
      dropoff,
      sla_minutes: slaMinutes || 25,
      placed_at: Date.now(),
      driver_id: null,
    };
    db.orders.push(order);
    db.logEvent(order.id, "order_created", { businessId });
    db.recordOrderCreated(order.city_id, order.zone_id);

    const { driver, candidates, explanation } = assignOrder({
      order,
      business,
      drivers: db.drivers,
    });

    if (!driver) {
      db.logEvent(order.id, "order_queued", { reason: "no_online_driver_in_zone" });
      return json(res, 201, {
        order,
        assignment: null,
        message: "No online driver available in this zone yet — order queued for batching.",
      });
    }

    driver.current_batch_load += 1;
    order.status = "assigned";
    order.driver_id = driver.id;
    order.assigned_at = Date.now();
    db.logEvent(order.id, "order_assigned", { driverId: driver.id, explanation });

    json(res, 201, {
      order,
      assignment: {
        driverId: driver.id,
        vehicleType: driver.vehicle_type,
        explanation,
        winningScore: candidates[0],
        allCandidates: candidates,
      },
    });
  });

  router.get("/orders/:id", (ctx, res) => {
    const order = db.findOrder(ctx.params.id);
    if (!order) return json(res, 404, { error: "not_found" });
    const events = db.orderEvents.filter((e) => e.order_id === order.id);
    json(res, 200, { order, events });
  });

  // PATCH /orders/:id/status  { status }
  router.patch("/orders/:id/status", (ctx, res) => {
    const order = db.findOrder(ctx.params.id);
    if (!order) return json(res, 404, { error: "not_found" });
    const { status } = ctx.body;
    const valid = ["assigned", "picked_up", "in_transit", "delivered", "cancelled", "failed"];
    if (!valid.includes(status)) return json(res, 400, { error: "invalid_status", valid });

    order.status = status;
    if (status === "delivered") {
      order.delivered_at = Date.now();
      const driver = db.findDriver(order.driver_id);
      if (driver) driver.current_batch_load = Math.max(0, driver.current_batch_load - 1);
      const elapsedMin = (order.delivered_at - order.placed_at) / 60000;
      const onTime = elapsedMin <= order.sla_minutes;
      db.recordOrderCompleted(order.city_id, +elapsedMin.toFixed(1), onTime);
    }
    db.logEvent(order.id, status === "delivered" ? "order_delivered" : `order_${status}`, {});
    json(res, 200, { order });
  });

  router.get("/orders/:id/track", (ctx, res) => {
    const order = db.findOrder(ctx.params.id);
    if (!order) return json(res, 404, { error: "not_found" });
    const driver = order.driver_id ? db.findDriver(order.driver_id) : null;
    const etaKm = driver ? distanceKm(driver, order.dropoff) : null;
    json(res, 200, {
      orderId: order.id,
      status: order.status,
      driverLocation: driver ? { lat: driver.lat, lng: driver.lng } : null,
      distanceRemainingKm: etaKm !== null ? +etaKm.toFixed(2) : null,
    });
  });
}

module.exports = { register };
