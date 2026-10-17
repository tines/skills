FROM oven/bun:1.4.3

WORKDIR /app
COPY package.json bun.lock* ./
RUN --mount=type=cache,target=/root/.bun/install/cache --mount=type=tmpfs,target=/tmp bun install
COPY --link . .

VOLUME ["conversations"]
CMD ["bun", "./agent.ts"]
