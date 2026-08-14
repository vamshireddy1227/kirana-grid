const db = require("../db");
const { json } = require("../router");
const cartService = require("../services/cart");
const checkoutService = require("../services/checkout");

// No auth in this system — customerId is a client-generated guest token,
// passed as a query param (GET/DELETE) or body field (POST/PUT). This is
// a stand-in for real customer identity, not a security boundary.
function getCustomerId(ctx) {
  return ctx.query.customerId || (ctx.body && ctx.body.customerId);
}

function register(router) {
  // GET /cart?customerId=...
  router.get("/cart", (ctx, res) => {
    const customerId = getCustomerId(ctx);
    if (!customerId) return json(res, 400, { error: "customerId_required" });
    const cart = cartService.getOrCreateCart(customerId);
    json(res, 200, cartService.hydrateCart(cart));
  });

  // POST /cart/items  { customerId, productId, quantity }
  router.post("/cart/items", (ctx, res) => {
    const { customerId, productId, quantity } = ctx.body;
    if (!customerId || !productId) return json(res, 400, { error: "customerId_and_productId_required" });
    const result = cartService.addItem(customerId, productId, quantity || 1);
    if (result.error) return json(res, 400, result);
    json(res, 201, result.cart);
  });

  // PUT /cart/items/:id  { customerId, quantity }
  router.patch("/cart/items/:id", (ctx, res) => {
    const customerId = getCustomerId(ctx);
    if (!customerId) return json(res, 400, { error: "customerId_required" });
    const result = cartService.updateItemQuantity(customerId, ctx.params.id, ctx.body.quantity);
    if (result.error) return json(res, result.error === "not_found" ? 404 : 400, result);
    json(res, 200, result.cart);
  });
  // PUT alias — same handler, since PUT is what the spec asked for and
  // PATCH is what fits this codebase's existing verb usage elsewhere.
  router.put("/cart/items/:id", (ctx, res) => {
    const customerId = getCustomerId(ctx);
    if (!customerId) return json(res, 400, { error: "customerId_required" });
    const result = cartService.updateItemQuantity(customerId, ctx.params.id, ctx.body.quantity);
    if (result.error) return json(res, result.error === "not_found" ? 404 : 400, result);
    json(res, 200, result.cart);
  });

  // DELETE /cart/items/:id?customerId=...
  router.delete("/cart/items/:id", (ctx, res) => {
    const customerId = getCustomerId(ctx);
    if (!customerId) return json(res, 400, { error: "customerId_required" });
    const result = cartService.removeItem(customerId, ctx.params.id);
    if (result.error) return json(res, 404, result);
    json(res, 200, result.cart);
  });

  // DELETE /cart?customerId=... — clear whole cart
  router.delete("/cart", (ctx, res) => {
    const customerId = getCustomerId(ctx);
    if (!customerId) return json(res, 400, { error: "customerId_required" });
    json(res, 200, cartService.clearCart(customerId).cart);
  });

  // POST /checkout  { customerId, dropoff:{lat,lng}, slaMinutes?, paymentMethod? }
  router.post("/checkout", (ctx, res) => {
    const { customerId, dropoff, slaMinutes, paymentMethod } = ctx.body;
    if (!customerId) return json(res, 400, { error: "customerId_required" });
    const result = checkoutService.checkout({ customerId, dropoff, slaMinutes, paymentMethod });
    if (result.error) return json(res, 400, result);
    json(res, 201, result);
  });

  // GET /businesses/:id/products — product listing for the storefront browse screen
  router.get("/businesses/:id/products", (ctx, res) => {
    const business = db.findBusiness(ctx.params.id);
    if (!business) return json(res, 404, { error: "not_found" });
    const products = db.products.filter((p) => p.business_id === business.id);
    json(res, 200, { business, products });
  });
}

module.exports = { register };
