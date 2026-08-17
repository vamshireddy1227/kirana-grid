const db = require("../db");
const { json } = require("../router");
const { broadcast } = require("../sse");

function register(router) {
  // GET /drivers/roster?cityId=... — pick-your-identity list for the Driver App
  // (no auth exists, so a real person "becomes" one of the seeded driver
  // records rather than signing up — documented limitation, not hidden).
  router.get("/drivers/roster", (ctx, res) => {
    const cityId = ctx.query.cityId;
    const list = db.drivers
      .filter((d) => !cityId || d.city_id === cityId)
      .map((d) => ({ id: d.id, vehicle_type: d.vehicle_type, status: d.status, real_controlled: d.real_controlled, rating: d.rating }));
    json(res, 200, { drivers: list });
  });

  // POST /drivers/:id/go-online-real  { lat, lng }
  // A real person takes over this driver record. From this point, the
  // simulator will never move it — only /location updates below do.
  router.post("/drivers/:id/go-online-real", (ctx, res) => {
    const driver = db.findDriver(ctx.params.id);
    if (!driver) return json(res, 404, { error: "not_found" });
    const { lat, lng } = ctx.body;
    driver.real_controlled = true;
    driver.status = "online";
    if (typeof lat === "number" && typeof lng === "number") {
      driver.lat = lat;
      driver.lng = lng;
      driver.target = { lat, lng }; // stop any residual simulated walk toward an old target
    }
    broadcast(driver.city_id, "driver_moved", {
      cityId: driver.city_id, ts: Date.now(),
      drivers: [{ id: driver.id, lat: driver.lat, lng: driver.lng, status: driver.status, zoneId: driver.zone_id }],
    });
    json(res, 200, { driver });
  });

  // POST /drivers/:id/go-offline-real — hands the driver back to simulator control
  router.post("/drivers/:id/go-offline-real", (ctx, res) => {
    const driver = db.findDriver(ctx.params.id);
    if (!driver) return json(res, 404, { error: "not_found" });
    driver.real_controlled = false;
    driver.status = "offline";
    json(res, 200, { driver });
  });

  // POST /drivers/:id/location  { lat, lng } — the actual real-time GPS report.
  // Only takes effect if this driver is currently real-controlled — this
  // isn't a backdoor to fake-move a simulator-controlled driver.
  router.post("/drivers/:id/location", (ctx, res) => {
    const driver = db.findDriver(ctx.params.id);
    if (!driver) return json(res, 404, { error: "not_found" });
    if (!driver.real_controlled) return json(res, 400, { error: "not_real_controlled", detail: "Call go-online-real first." });
    const { lat, lng } = ctx.body;
    if (typeof lat !== "number" || typeof lng !== "number") return json(res, 400, { error: "lat_lng_required" });
    driver.lat = lat;
    driver.lng = lng;
    broadcast(driver.city_id, "driver_moved", {
      cityId: driver.city_id, ts: Date.now(),
      drivers: [{ id: driver.id, lat: driver.lat, lng: driver.lng, status: driver.status, zoneId: driver.zone_id }],
    });
    json(res, 200, { ok: true });
  });

  // GET /drivers/:id/current-order — what this driver should be acting on right now
  router.get("/drivers/:id/current-order", (ctx, res) => {
    const driver = db.findDriver(ctx.params.id);
    if (!driver) return json(res, 404, { error: "not_found" });
    const activeStatuses = ["assigned", "picked_up", "in_transit"];
    const order = db.orders.find((o) => o.driver_id === driver.id && activeStatuses.includes(o.status));
    if (!order) return json(res, 200, { order: null });
    const business = db.findBusiness(order.business_id);
    const items = db.getOrderItems(order.id);
    json(res, 200, { order, business, items });
  });
}

module.exports = { register };
