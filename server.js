const http = require("http");
const fs = require("fs");
const path = require("path");
const { Router } = require("./router");
const ordersRoutes = require("./routes/orders");
const miscRoutes = require("./routes/misc");
const metricsRoutes = require("./routes/metrics");
const cartRoutes = require("./routes/cart");
const simulator = require("./simulator");

const router = new Router();
ordersRoutes.register(router);
miscRoutes.register(router);
metricsRoutes.register(router);
cartRoutes.register(router);

router.get("/health", (ctx, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", service: "kirana-grid-core" }));
});

router.get("/", (ctx, res) => {
  const html = fs.readFileSync(path.join(__dirname, "control-tower-v2.html"), "utf8");
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(html);
});

router.get("/storefront", (ctx, res) => {
  const html = fs.readFileSync(path.join(__dirname, "storefront.html"), "utf8");
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(html);
});

const server = http.createServer((req, res) => router.handle(req, res));

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Kirana Grid core API listening on http://localhost:${PORT}`);
  simulator.start();
  console.log("Live simulator running — orders, driver movement, and SLA sweeps are real events now.");
});

module.exports = server;
