const db = require("../db");

// Normalizes each zone's decaying demand counter (see db.decayZoneDemand)
// against the busiest zone in that city, so the frontend can just map
// intensity 0..1 straight to a fill opacity or color stop.
function cityHeatmap(cityId) {
  const cityZones = db.zones.filter((z) => z.city_id === cityId);
  const demands = cityZones.map((z) => db.metrics.zoneDemand[z.id] || 0);
  const max = Math.max(1, ...demands);

  return cityZones
    .map((z) => ({
      zoneId: z.id,
      zoneName: z.name,
      lat: z.lat,
      lng: z.lng,
      demand: +(db.metrics.zoneDemand[z.id] || 0).toFixed(2),
      intensity: +((db.metrics.zoneDemand[z.id] || 0) / max).toFixed(3),
    }))
    .sort((a, b) => b.demand - a.demand);
}

module.exports = { cityHeatmap };
