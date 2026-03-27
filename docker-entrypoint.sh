#!/bin/sh
set -e

echo "Waiting for database..."

while ! nc -z db 5432; do
  sleep 0.5
done

echo "Database started"

npx prisma migrate deploy

exec "$@"
