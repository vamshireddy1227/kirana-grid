const { distanceKm, etaMinutes } = require("./geo");

// Weighted scoring, not "nearest driver wins" — that's the thing that looks
// smart in a demo and falls apart under real concurrent load. Lower score = better.
//
// score = w_distance * normDistance
//       - w_reliability * (on_time_rate / 100)
//       + w_load * current_batch_load
//       + vehicleMismatchPenalty
const WEIGHTS = {
  distance: 0.55,
  reliability: 0.25,
  load: 0.15,
  vehicleMismatch: 8, // large fixed penalty, not a tunable ratio — a mismatch should almost always lose
};

const VEHICLE_REQUIREMENTS = {
  warehouse: ["van"], // bulk orders need a van
  supermarket: ["bike", "van"],
  pharmacy: ["bike", "van"],
  kirana: ["bike", "van"],
};

function scoreDriver(driver, business, order) {
  const km = distanceKm(driver, business);
  const normDistance = Math.min(km / 6, 1); // normalize against a 6km hyperlocal ceiling

  const requiredVehicles = VEHICLE_REQUIREMENTS[business.category] || ["bike", "van"];
  const vehicleOk = requiredVehicles.includes(driver.vehicle_type);

  const distanceCost = WEIGHTS.distance * normDistance;
  const reliabilityCost = -WEIGHTS.reliability * (driver.on_time_rate / 100);
  const loadCost = WEIGHTS.load * driver.current_batch_load;
  const vehicleCost = vehicleOk ? 0 : WEIGHTS.vehicleMismatch;
  const score = distanceCost + reliabilityCost + loadCost + vehicleCost;

  return {
    driverId: driver.id,
    km: +km.toFixed(2),
    etaMinutes: etaMinutes(km, driver.vehicle_type),
    onTimeRate: driver.on_time_rate,
    load: driver.current_batch_load,
    vehicleOk,
    score: +score.toFixed(4),
    // Raw cost components, kept separate from the summed score so the
    // explanation generator below can point at exactly what won or lost it.
    components: {
      distance: +distanceCost.toFixed(4),
      reliability: +reliabilityCost.toFixed(4),
      load: +loadCost.toFixed(4),
      vehicle: +vehicleCost.toFixed(4),
    },
  };
}

// Turns the winning candidate's score components into a sentence a human
// (or a dashboard tooltip) can read — "why did it pick that driver".
// Picks the 1-2 factors that actually drove the decision rather than
// dumping every number, since that's what "explanation" means in practice.
function explainAssignment(winner, allCandidates) {
  const reasons = [];

  if (allCandidates.length > 1) {
    const nextBest = allCandidates[1];
    const gap = nextBest.score - winner.score;
    if (winner.km <= 1.5) reasons.push(`nearest available (${winner.km}km)`);
    else if (Math.abs(winner.components.distance) < Math.abs(nextBest.components.distance) - 0.02) {
      reasons.push(`closer than alternatives (${winner.km}km vs ${nextBest.km}km)`);
    }
    if (winner.load === 0 && nextBest.load > 0) reasons.push("no current batch load");
    else if (winner.load < nextBest.load) reasons.push(`lighter load (${winner.load} vs ${nextBest.load})`);
    if (winner.onTimeRate >= 95) reasons.push(`high reliability (${winner.onTimeRate}% on-time)`);
    else if (winner.onTimeRate > nextBest.onTimeRate + 3) reasons.push(`better on-time rate (${winner.onTimeRate}%)`);
    if (reasons.length === 0) reasons.push(`best combined score (margin ${gap.toFixed(3)})`);
  } else {
    reasons.push("only online driver in zone");
  }

  if (!winner.vehicleOk) reasons.push("note: vehicle type is a mismatch for this order category");

  return `Driver ${winner.driverId} assigned because ${reasons.join(" and ")}.`;
}

// Returns the best driver + full scoring breakdown for every candidate considered
// (useful for debugging "why did it pick that driver", not just the winner).
function assignOrder({ order, business, drivers }) {
  const candidates = drivers.filter(
    (d) => d.zone_id === business.zone_id && d.status === "online"
  );
  if (candidates.length === 0) {
    return { driver: null, candidates: [], explanation: null };
  }
  const scored = candidates
    .map((d) => scoreDriver(d, business, order))
    .sort((a, b) => a.score - b.score);

  const winner = drivers.find((d) => d.id === scored[0].driverId);
  const explanation = explainAssignment(scored[0], scored);
  return { driver: winner, candidates: scored, explanation };
}

module.exports = { assignOrder, scoreDriver, explainAssignment };
