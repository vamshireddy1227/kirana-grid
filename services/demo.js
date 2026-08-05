const db = require("../db");

function start() {
  db.demoState.active = true;
  db.demoState.spawnMultiplier = 3.5; // more frequent orders
  db.demoState.startedAt = Date.now();
  // Force a healthy share of drivers online so batches/assignments actually
  // fire instead of queuing — a demo with half the fleet offline looks broken.
  db.drivers.forEach((d) => {
    if (Math.random() < 0.85) d.status = "online";
  });
  return status();
}

function stop() {
  db.demoState.active = false;
  db.demoState.spawnMultiplier = 1;
  db.demoState.startedAt = null;
  return status();
}

function status() {
  return { ...db.demoState };
}

module.exports = { start, stop, status };
