const RISK_THRESHOLD = 0.8; // flag once 80% of the SLA window has elapsed

function checkOrders(orders) {
  const now = Date.now();
  const atRisk = [];
  const breached = [];

  orders.forEach((o) => {
    if (["delivered", "cancelled", "failed"].includes(o.status)) return;
    if (!o.sla_minutes || !o.placed_at) return;
    const elapsedMin = (now - o.placed_at) / 60000;
    const ratio = elapsedMin / o.sla_minutes;
    if (ratio >= 1) {
      breached.push({ orderId: o.id, elapsedMin: +elapsedMin.toFixed(1), slaMinutes: o.sla_minutes });
    } else if (ratio >= RISK_THRESHOLD) {
      atRisk.push({ orderId: o.id, elapsedMin: +elapsedMin.toFixed(1), slaMinutes: o.sla_minutes });
    }
  });

  return { atRisk, breached };
}

module.exports = { checkOrders, RISK_THRESHOLD };
