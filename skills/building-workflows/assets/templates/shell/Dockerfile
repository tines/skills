FROM debian:13-slim

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl jq sqlite3 && \
    rm -rf /var/lib/apt/lists/* /var/log/apt /var/log/dpkg.log /var/cache/ldconfig/aux-cache
COPY --link . .

CMD ["sh", "./script.sh"]
