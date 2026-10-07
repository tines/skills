FROM oven/bun:1.4.2

WORKDIR /app
COPY package.json bun.lock* ./
RUN --mount=type=cache,target=/root/.bun/install/cache bun install
COPY --link . .
RUN bun build ./mount.tsx --minify --target=browser --define 'process.env.NODE_ENV="production"' --outfile ./bundle.js && \
  bun run --bun tailwindcss -i ./globals.css -o ./output.css --minify

CMD ["bun", "./render.ts"]
