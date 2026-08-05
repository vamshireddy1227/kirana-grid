const db = require("../db");
const { json } = require("../router");
const { distanceKm } = require("../services/geo");
const { buildBatches } = require("../services/batching");
const { checkOrders } = require("../services/sla");
const { addClient } = require("../sse");
const metricsService = require("../services/metrics");
const heatmapService = require("../services/heatmap");

function register(router) {
  // GET /admin/cities/:id/snapshot — everything the dashboard needs to bootstrap
  // before live events start arriving: zones, businesses, drivers, metrics, heatmap.
  router.get("/admin/cities/:id/snapshot", (ctx, res) => {
    const cityId = ctx.params.id;
    json(res, 200, {
      zones: db.zones.filter((z) => z.city_id === cityId),
      businesses: db.businesses.filter((b) => b.city_id === cityId),
      drivers: db.drivers.filter((d) => d.city_id === cityId),
      activeOrders: db.orders.filter((o) => o.city_id === cityId && !["delivered", "cancelled", "failed"].includes(o.status)),
      revenue: db.cityRevenue[cityId] || 0,
      metrics: metricsService.cityMetrics(cityId),
      heatmap: heatmapService.cityHeatmap(cityId),
      demoMode: db.demoState.active,
    });
  });

  // GET /snapshot/:cityId — alias for /admin/cities/:id/snapshot (path-param form)
  router.get("/snapshot/:cityId", (ctx, res) => {
    const cityId = ctx.params.cityId;
    json(res, 200, {
      zones: db.zones.filter((z) => z.city_id === cityId),
      businesses: db.businesses.filter((b) => b.city_id === cityId),
      drivers: db.drivers.filter((d) => d.city_id === cityId),
      activeOrders: db.orders.filter((o) => o.city_id === cityId && !["delivered", "cancelled", "failed"].includes(o.status)),
      revenue: db.cityRevenue[cityId] || 0,
      metrics: metricsService.cityMetrics(cityId),
      heatmap: heatmapService.cityHeatmap(cityId),
      demoMode: db.demoState.active,
    });
  });

  // GET /stream/:cityId — alias for /live/stream?cityId= (path-param form)
  router.get("/stream/:cityId", (ctx, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(": connected\n\n");
    addClient(res, ctx.params.cityId || "all");
    return new Promise(() => {});
  });

  // GET /live/stream?cityId=city_hyd — Server-Sent Events. Pass cityId=all for every city.
  router.get("/live/stream", (ctx, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(": connected\n\n");
    addClient(res, ctx.query.cityId || "all");
    // Intentionally never resolves — the connection stays open until the client disconnects.
    return new Promise(() => {});
  });

  // GET /businesses/nearby?lat&lng&radius
  router.get("/businesses/nearby", (ctx, res) => {
    const lat = parseFloat(ctx.query.lat);
    const lng = parseFloat(ctx.query.lng);
    const radius = parseFloat(ctx.query.radius) || 5;
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return json(res, 400, { error: "lat_lng_required" });
    }
    const results = db.businesses
      .map((b) => ({ ...b, distanceKm: +distanceKm({ lat, lng }, b).toFixed(2) }))
      .filter((b) => b.distanceKm <= radius && b.is_open)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    json(res, 200, { count: results.length, results });
  });

  // POST /drivers/:id/status  { status: "online"|"offline" }
  router.post("/drivers/:id/status", (ctx, res) => {
    const driver = db.findDriver(ctx.params.id);
    if (!driver) return json(res, 404, { error: "not_found" });
    const { status } = ctx.body;
    if (!["online", "offline"].includes(status)) {
      return json(res, 400, { error: "invalid_status" });
    }
    driver.status = status;
    json(res, 200, { driver });
  });

  // GET /admin/cities/:id/live
  router.get("/admin/cities/:id/live", (ctx, res) => {
    const cityId = ctx.params.id;
    const cityOrders = db.orders.filter((o) => o.city_id === cityId);
    const cityDrivers = db.drivers.filter((d) => d.city_id === cityId);
    json(res, 200, {
      cityId,
      activeOrders: cityOrders.filter((o) => !["delivered", "cancelled", "failed"].includes(o.status)).length,
      onlineDrivers: cityDrivers.filter((d) => d.status === "online").length,
      totalDrivers: cityDrivers.length,
      ordersByStatus: cityOrders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {}),
    });
  });

  // POST /admin/batch/:zoneId — run the batching + 2-opt route optimizer
  // on all "placed" (unassigned) orders in a zone
  router.post("/admin/batch/:zoneId", (ctx, res) => {
    const zoneId = ctx.params.zoneId;
    const pending = db.orders.filter((o) => o.zone_id === zoneId && o.status === "placed");
    if (pending.length === 0) {
      return json(res, 200, { zoneId, batches: [], message: "No pending orders to batch." });
    }
    const businessLookup = Object.fromEntries(db.businesses.map((b) => [b.id, b]));
    const zoneDrivers = db.drivers.filter((d) => d.zone_id === zoneId && d.status === "online");
    if (zoneDrivers.length === 0) {
      return json(res, 200, { zoneId, batches: [], message: "No online drivers in this zone." });
    }
    const driverStart = { lat: zoneDrivers[0].lat, lng: zoneDrivers[0].lng };

    const batches = buildBatches({
      pendingOrders: pending.map((o) => ({ id: o.id, dropoff: o.dropoff, businessId: o.business_id })),
      businesses: businessLookup,
      driverStart,
    });

    batches.forEach((batch) => {
      const driver = zoneDrivers.shift() || zoneDrivers[0];
      batch.orderIds.forEach((oid) => {
        const order = db.findOrder(oid);
        order.status = "assigned";
        order.driver_id = driver ? driver.id : null;
        order.batch_id = batch.orderIds.join("+");
        db.logEvent(oid, "order_batched", { batchSize: batch.orderIds.length });
      });
    });

    json(res, 200, { zoneId, batchCount: batches.length, batches });
  });

  // GET /admin/sla/:cityId — orders approaching or past their SLA window
  router.get("/admin/sla/:cityId", (ctx, res) => {
    const cityOrders = db.orders.filter((o) => o.city_id === ctx.params.cityId);
    const result = checkOrders(cityOrders);
    json(res, 200, result);
  });

  router.get("/cities", (ctx, res) => {
    json(res, 200, { cities: db.cities, zones: db.zones });
  });
}

module.exports = { register };
