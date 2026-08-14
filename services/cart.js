const db = require("../db");

// No auth exists in this system (documented gap since the first build) —
// carts are keyed by a client-supplied customerId (a guest token the
// frontend generates and remembers), not a real logged-in user.

function getOrCreateCart(customerId) {
  if (!db.carts[customerId]) {
    db.carts[customerId] = { customer_id: customerId, business_id: null, items: [] };
  }
  return db.carts[customerId];
}

// A cart belongs to exactly one business at a time — mixing products from
// two different stores into one checkout doesn't make sense for a
// hyperlocal single-pickup order. Reject rather than silently drop items.
function addItem(customerId, productId, quantity) {
  const product = db.findProduct(productId);
  if (!product) return { error: "unknown_product" };
  if (quantity < 1) return { error: "invalid_quantity" };

  const cart = getOrCreateCart(customerId);
  if (cart.items.length > 0 && cart.business_id !== product.business_id) {
    return { error: "cart_single_business", detail: "Cart already has items from a different store — clear it first." };
  }
  cart.business_id = product.business_id;

  const existing = cart.items.find((i) => i.product_id === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ id: db.uid("citem"), product_id: productId, quantity });
  }
  return { cart: hydrateCart(cart) };
}

function updateItemQuantity(customerId, itemId, quantity) {
  const cart = getOrCreateCart(customerId);
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) return { error: "not_found" };
  if (quantity < 1) return { error: "invalid_quantity" };
  item.quantity = quantity;
  return { cart: hydrateCart(cart) };
}

function removeItem(customerId, itemId) {
  const cart = getOrCreateCart(customerId);
  const before = cart.items.length;
  cart.items = cart.items.filter((i) => i.id !== itemId);
  if (cart.items.length === before) return { error: "not_found" };
  if (cart.items.length === 0) cart.business_id = null;
  return { cart: hydrateCart(cart) };
}

function clearCart(customerId) {
  db.carts[customerId] = { customer_id: customerId, business_id: null, items: [] };
  return { cart: hydrateCart(db.carts[customerId]) };
}

// Attaches live product data + computed subtotal for display. Checkout
// re-derives everything from scratch server-side rather than trusting
// this — this is only for showing the cart back to the client.
function hydrateCart(cart) {
  const items = cart.items.map((i) => {
    const product = db.findProduct(i.product_id);
    const unitPrice = product ? product.price : 0;
    return {
      id: i.id,
      product_id: i.product_id,
      product_name: product ? product.name : "(removed)",
      unit_price: unitPrice,
      quantity: i.quantity,
      subtotal: +(unitPrice * i.quantity).toFixed(2),
      in_stock: product ? product.stock_qty >= i.quantity : false,
    };
  });
  const subtotal = +items.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2);
  const business = cart.business_id ? db.findBusiness(cart.business_id) : null;
  return {
    customer_id: cart.customer_id,
    business_id: cart.business_id,
    business_name: business ? business.name : null,
    items,
    subtotal,
  };
}

module.exports = { getOrCreateCart, addItem, updateItemQuantity, removeItem, clearCart, hydrateCart };
