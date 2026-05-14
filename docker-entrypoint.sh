#!/bin/sh
set -e

echo "Waiting for database..."

while ! nc -z db 5432; do
  sleep 0.5
done

echo "Database started"

pnpm exec prisma generate
pnpm exec prisma migrate deploy

exec "$@"
