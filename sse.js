// Minimal SSE hub. Swap for Socket.io in production (the architecture doc's
// realtime-gateway service) — every broadcast() call here maps 1:1 to a
// io.to(room).emit() call there. SSE is used only because this sandbox has
// no network access to npm install a WebSocket library.

const clients = new Set(); // { res, cityId }

function addClient(res, cityId) {
  const client = { res, cityId };
  clients.add(client);
  res.on("close", () => clients.delete(client));
  return client;
}

function broadcast(cityId, event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((c) => {
    if (c.cityId === "all" || c.cityId === cityId) {
      c.res.write(payload);
    }
  });
}

module.exports = { addClient, broadcast };
