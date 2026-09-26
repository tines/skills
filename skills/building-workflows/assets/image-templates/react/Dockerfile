FROM oven/bun:1.4.2

WORKDIR /app
COPY . .
RUN --mount=type=cache,target=/root/.bun/install/cache \
  bun install && \
  bun build ./mount.tsx --minify --target=browser --define 'process.env.NODE_ENV="production"' --outfile ./bundle.js && \
  bunx --bun @tailwindcss/cli@4.2.2 -i ./globals.css -o ./output.css --minify

CMD ["bun", "./render.ts"]
