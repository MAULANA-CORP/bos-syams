#!/bin/sh
set -eu

attempt=1
max_attempts=30
until npx prisma migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database migration gagal setelah $max_attempts percobaan."
    exit 1
  fi
  echo "Database belum siap, retry migration ($attempt/$max_attempts)..."
  attempt=$((attempt + 1))
  sleep 2
done

exec node server.js
