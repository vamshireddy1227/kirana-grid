const { distanceKm } = require("./geo");

// Groups "placed" orders in the same zone into driver-sized batches, then
// sequences each batch's stops. A full VRP solver is overkill below ~15 stops
// at hyperlocal distances — nearest-neighbor construction + 2-opt improvement
// gets within a few percent of optimal at a fraction of the cost.

const MAX_STOPS_PER_BATCH = 4;

function routeDistance(stops) {
  let total = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    total += distanceKm(stops[i], stops[i + 1]);
  }
  return total;
}

function nearestNeighborRoute(start, points) {
  const route = [start];
  const remaining = [...points];
  let current = start;
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = distanceKm(current, p);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    current = remaining.splice(bestIdx, 1)[0];
    route.push(current);
  }
  return route;
}

// Classic 2-opt: repeatedly try reversing a segment of the route; keep the
// reversal if it shortens total distance. Stop point (start) is pinned.
function twoOptImprove(route) {
  let improved = true;
  let best = route;
  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        if (routeDistance(candidate) < routeDistance(best) - 1e-6) {
          best = candidate;
          improved = true;
        }
      }
    }
  }
  return best;
}

// pendingOrders: [{ id, dropoff: {lat,lng}, businessId }]
// businesses: lookup for pickup coordinates
function buildBatches({ pendingOrders, businesses, driverStart }) {
  const batches = [];
  let queue = [...pendingOrders];

  while (queue.length) {
    const batch = queue.splice(0, MAX_STOPS_PER_BATCH);
    // Stops = one pickup per distinct business in the batch, then all dropoffs.
    const pickupIds = [...new Set(batch.map((o) => o.businessId))];
    const pickups = pickupIds.map((id) => ({
      type: "pickup",
      businessId: id,
      lat: businesses[id].lat,
      lng: businesses[id].lng,
    }));
    const dropoffs = batch.map((o) => ({
      type: "dropoff",
      orderId: o.id,
      lat: o.dropoff.lat,
      lng: o.dropoff.lng,
    }));

    const naive = nearestNeighborRoute(driverStart, [...pickups, ...dropoffs]);
    const optimized = twoOptImprove(naive);

    batches.push({
      orderIds: batch.map((o) => o.id),
      stops: optimized.slice(1), // drop the synthetic driver-start point
      totalKm: +routeDistance(optimized).toFixed(2),
      naiveKm: +routeDistance(naive).toFixed(2),
    });
  }
  return batches;
}

module.exports = { buildBatches, routeDistance };
