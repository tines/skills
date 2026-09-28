FROM oven/bun:1.4.2

WORKDIR /app
COPY . .
RUN --mount=type=cache,target=/root/.bun/install/cache \
  if [ -f package.json ]; then bun install; fi

CMD ["bun", "./script.ts"]
