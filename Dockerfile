# Zero runtime dependencies (see package.json) — this build never touches
# npm install, so there's nothing to cache-bust or go stale. Alpine keeps
# the image small since we're not compiling anything.
FROM node:20-alpine

WORKDIR /app

# Copied separately from source so Docker's layer cache still works if you
# later add real dependencies — this line stops mattering functionally
# today but keeps the Dockerfile correct for when it does.
COPY package.json ./

COPY . .

ENV PORT=4000
EXPOSE 4000

# No shell wrapper — direct exec form so Node receives signals (SIGTERM on
# docker stop) correctly instead of a shell swallowing them.
CMD ["node", "server.js"]
