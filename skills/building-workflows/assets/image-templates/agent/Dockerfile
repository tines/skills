FROM oven/bun:1.4.2

WORKDIR /app
COPY package.json bun.lock* ./
RUN --mount=type=cache,target=/root/.bun/install/cache bun install
COPY --link . .

VOLUME ["conversations"]
CMD ["bun", "./agent.ts"]
