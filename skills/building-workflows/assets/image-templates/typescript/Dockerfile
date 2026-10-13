FROM oven/bun:1.4.3

WORKDIR /app
COPY package.json* bun.lock* ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
  if [ -f package.json ]; then bun install; fi
COPY --link . .

CMD ["bun", "./script.ts"]
