FROM oven/bun:1.4.3

WORKDIR /app

# Db2’s native driver needs libxml2, and its installer invokes the local Bun binary.
RUN apt-get update && apt-get install -y --no-install-recommends libxml2 && \
    rm -rf /var/lib/apt/lists/* && ln -s /usr/local/bin/bun ./bun
COPY package.json* bun.lock* ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
  if [ -f package.json ]; then bun install; fi
COPY --link . .

CMD ["bun", "./script.ts"]
