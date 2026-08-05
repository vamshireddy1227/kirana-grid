const db = require("../db");

// Everything the "advanced metrics panel" needs, computed on read rather
// than pushed on every tick — cheap at this scale, and it means the
// dashboard always gets a consistent snapshot instead of partial updates.

function ordersPerMinute(cityId) {
  const ts = db.metrics.orderTimestamps[cityId] || [];
  const cutoff = Date.now() - 60000;
  return ts.filter((t) => t >= cutoff).length;
}

function avgDeliveryMinutes(cityId) {
  const durations = db.metrics.deliveryDurationsMin[cityId] || [];
  if (durations.length === 0) return null;
  const sum = durations.reduce((a, b) => a + b, 0);
  return +(sum / durations.length).toFixed(1);
}

function slaSuccessRate(cityId) {
  const delivered = db.metrics.deliveredCount[cityId] || 0;
  const breaches = db.metrics.slaBreachCount[cityId] || 0;
  if (delivered === 0) return 100;
  return +(100 * (1 - breaches / delivered)).toFixed(1);
}

function cityMetrics(cityId) {
  const cityOrders = db.orders.filter((o) => o.city_id === cityId);
  const cityDrivers = db.drivers.filter((d) => d.city_id === cityId);
  const activeStatuses = ["placed", "assigned", "picked_up", "in_transit"];

  return {
    cityId,
    totalOrders: db.metrics.totalOrders[cityId] || 0,
    activeDeliveries: cityOrders.filter((o) => activeStatuses.includes(o.status)).length,
    availableDrivers: cityDrivers.filter((d) => d.status === "online").length,
    totalDrivers: cityDrivers.length,
    avgDeliveryMinutes: avgDeliveryMinutes(cityId),
    slaSuccessRate: slaSuccessRate(cityId),
    revenue: +(db.cityRevenue[cityId] || 0).toFixed(2),
    ordersPerMinute: ordersPerMinute(cityId),
    deliveredCount: db.metrics.deliveredCount[cityId] || 0,
    slaBreachCount: db.metrics.slaBreachCount[cityId] || 0,
  };
}

function allCitiesMetrics() {
  return db.cities.map((c) => cityMetrics(c.id));
}

module.exports = { cityMetrics, allCitiesMetrics, ordersPerMinute, avgDeliveryMinutes, slaSuccessRate };
