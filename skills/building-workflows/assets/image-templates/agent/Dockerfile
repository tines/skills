FROM oven/bun:1.4.2

WORKDIR /app
COPY . .
RUN --mount=type=cache,target=/root/.bun/install/cache bun install

VOLUME ["conversations"]
CMD ["bun", "./agent.ts"]
