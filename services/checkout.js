const db = require("../db");

const TAX_RATE = 0.05; // flat 5% — new addition, not something that existed before; documented as such

// Never trust totals computed by the frontend. Recompute everything here
// from the actual current product prices, then snapshot those exact
// values onto each OrderItem — so if a merchant changes a price tomorrow,
// every order placed today keeps showing what the customer actually paid.
function checkout({ customerId, dropoff, slaMinutes, paymentMethod }) {
  const cart = db.carts[customerId];
  if (!cart || cart.items.length === 0) {
    return { error: "empty_cart" };
  }
  if (!dropoff || typeof dropoff.lat !== "number" || typeof dropoff.lng !== "number") {
    return { error: "dropoff_required" };
  }

  const business = db.findBusiness(cart.business_id);
  if (!business) return { error: "unknown_business" };

  // Validate stock and snapshot line items in one pass — fail the whole
  // checkout if anything's short, rather than partially creating an order.
  const lineItems = [];
  for (const ci of cart.items) {
    const product = db.findProduct(ci.product_id);
    if (!product) return { error: "product_unavailable", productId: ci.product_id };
    if (product.stock_qty < ci.quantity) {
      return { error: "insufficient_stock", productId: ci.product_id, available: product.stock_qty };
    }
    lineItems.push({ product, quantity: ci.quantity });
  }

  const zone = db.findZone(business.zone_id);
  const subtotal = +lineItems.reduce((sum, li) => sum + li.product.price * li.quantity, 0).toFixed(2);
  const deliveryFee = zone ? zone.base_delivery_fee : 25;
  const tax = +(subtotal * TAX_RATE).toFixed(2);
  const total = +(subtotal + deliveryFee + tax).toFixed(2);

  const order = {
    id: db.uid("ord"),
    business_id: business.id,
    zone_id: business.zone_id,
    city_id: business.city_id,
    customer_id: customerId,
    status: "placed", // awaiting merchant, not yet handed to the assignment engine
    dropoff,
    payment_method: paymentMethod || "cod",
    subtotal,
    delivery_fee: deliveryFee,
    tax,
    total,
    sla_minutes: slaMinutes || 30,
    placed_at: Date.now(),
    driver_id: null,
  };
  db.orders.push(order);

  lineItems.forEach((li) => {
    db.orderItems.push({
      id: db.uid("oi"),
      order_id: order.id,
      product_id: li.product.id,
      product_name_snapshot: li.product.name,
      quantity: li.quantity,
      unit_price: li.product.price,
      subtotal: +(li.product.price * li.quantity).toFixed(2),
    });
    li.product.stock_qty -= li.quantity; // decrement real stock
  });

  db.logEvent(order.id, "order_created", { customerId, itemCount: lineItems.length });
  db.recordOrderCreated(order.city_id, order.zone_id);

  // Cart is cleared only after everything above succeeded.
  db.carts[customerId] = { customer_id: customerId, business_id: null, items: [] };

  return { order, items: db.getOrderItems(order.id) };
}

module.exports = { checkout, TAX_RATE };
