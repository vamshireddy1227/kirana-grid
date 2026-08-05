const db = require("../db");
const { json } = require("../router");
const metricsService = require("../services/metrics");
const heatmapService = require("../services/heatmap");
const demoService = require("../services/demo");

function register(router) {
  // GET /metrics/:cityId — everything the metrics panel needs in one call
  router.get("/metrics/:cityId", (ctx, res) => {
    json(res, 200, metricsService.cityMetrics(ctx.params.cityId));
  });

  // GET /metrics — all cities at once, for a global rollup view
  router.get("/metrics", (ctx, res) => {
    json(res, 200, { cities: metricsService.allCitiesMetrics() });
  });

  // GET /admin/heatmap/:cityId — normalized zone demand for the map
  router.get("/admin/heatmap/:cityId", (ctx, res) => {
    json(res, 200, { cityId: ctx.params.cityId, zones: heatmapService.cityHeatmap(ctx.params.cityId) });
  });

  // POST /admin/demo/start — ramp up order frequency + force drivers online
  router.post("/admin/demo/start", (ctx, res) => {
    json(res, 200, demoService.start());
  });

  router.post("/admin/demo/stop", (ctx, res) => {
    json(res, 200, demoService.stop());
  });

  router.get("/admin/demo/status", (ctx, res) => {
    json(res, 200, demoService.status());
  });
}

module.exports = { register };
