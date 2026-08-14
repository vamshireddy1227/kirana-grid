const { URL } = require("url");

// Minimal but real router: path params, query params, JSON body parsing,
// JSON responses. Swap this file for Express later — every route handler
// below already has the (req, res) => {} shape Express expects.
class Router {
  constructor() {
    this.routes = []; // {method, pattern: RegExp, keys: [string], handler}
  }

  add(method, path, handler) {
    const keys = [];
    const pattern = new RegExp(
      "^" +
        path
          .split("/")
          .map((seg) => {
            if (seg.startsWith(":")) {
              keys.push(seg.slice(1));
              return "([^/]+)";
            }
            return seg;
          })
          .join("/") +
        "$"
    );
    this.routes.push({ method, pattern, keys, handler });
  }

  get(path, handler) {
    this.add("GET", path, handler);
  }
  post(path, handler) {
    this.add("POST", path, handler);
  }
  patch(path, handler) {
    this.add("PATCH", path, handler);
  }
  put(path, handler) {
    this.add("PUT", path, handler);
  }
  delete(path, handler) {
    this.add("DELETE", path, handler);
  }

  async handle(req, res) {
    const url = new URL(req.url, "http://localhost");
    const match = this.routes.find(
      (r) => r.method === req.method && r.pattern.test(url.pathname)
    );

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (!match) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "not_found", path: url.pathname }));
      return;
    }

    const params = {};
    const values = match.pattern.exec(url.pathname).slice(1);
    match.keys.forEach((k, i) => (params[k] = values[i]));
    const query = Object.fromEntries(url.searchParams.entries());

    let body = {};
    if (["POST", "PATCH", "PUT"].includes(req.method)) {
      body = await parseBody(req);
    }

    const ctx = { params, query, body };
    try {
      await match.handler(ctx, res);
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: "internal_error", message: err.message }));
    }
  }
}

function parseBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
  });
}

function json(res, status, payload) {
  res.writeHead(status);
  res.end(JSON.stringify(payload, null, 2));
}

module.exports = { Router, json };
