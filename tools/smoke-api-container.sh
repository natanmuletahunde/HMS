#!/bin/sh
set -eu

IMAGE="${1:-nexus-hms-api:ci}"
SUFFIX="$$"
NETWORK="nexus-hms-smoke-${SUFFIX}"
POSTGRES_CONTAINER="nexus-hms-smoke-postgres-${SUFFIX}"
REDIS_CONTAINER="nexus-hms-smoke-redis-${SUFFIX}"
REDIS_PASSWORD="ci-only-redis-password"
API_CONTAINER="nexus-hms-smoke-api-${SUFFIX}"
API_CONTAINER_2="nexus-hms-smoke-api-2-${SUFFIX}"
UPLOAD_VOLUME="nexus-hms-smoke-uploads-${SUFFIX}"

cleanup() {
  docker rm -f "$API_CONTAINER" "$API_CONTAINER_2" "$POSTGRES_CONTAINER" "$REDIS_CONTAINER" >/dev/null 2>&1 || true
  docker volume rm "$UPLOAD_VOLUME" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker network create "$NETWORK" >/dev/null
docker volume create "$UPLOAD_VOLUME" >/dev/null
docker run -d \
  --name "$POSTGRES_CONTAINER" \
  --network "$NETWORK" \
  -e POSTGRES_DB=hotel_management \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  postgres:16-alpine >/dev/null
docker run -d \
  --name "$REDIS_CONTAINER" \
  --network "$NETWORK" \
  redis:7-alpine redis-server --save "" --appendonly no --requirepass "$REDIS_PASSWORD" >/dev/null

i=0
until docker run --rm --network "$NETWORK" postgres:16-alpine \
  pg_isready -h "$POSTGRES_CONTAINER" -U postgres -d hotel_management >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    docker logs "$POSTGRES_CONTAINER"
    exit 1
  fi
  sleep 1
done

i=0
until docker run --rm --network "$NETWORK" redis:7-alpine \
  redis-cli -h "$REDIS_CONTAINER" -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q PONG; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    docker logs "$REDIS_CONTAINER"
    exit 1
  fi
  sleep 1
done

start_api() {
  docker run -d \
    --name "$1" \
    --network "$NETWORK" \
    -e NODE_ENV=production \
    -e PORT=8080 \
    -e DATABASE_URL="postgresql://postgres:postgres@${POSTGRES_CONTAINER}:5432/hotel_management" \
    -e REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_CONTAINER}:6379" \
    -e SESSION_SECRET=ci-only-session-secret-at-least-32-bytes \
    -v "${UPLOAD_VOLUME}:/app/uploads" \
    "$IMAGE" >/dev/null
}

wait_for_api() {
  i=0
  until docker run --rm --network "$NETWORK" node:20-alpine node -e \
    "fetch('http://$1:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
    >/dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -ge 60 ] || ! docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null | grep -q true; then
      docker logs "$1"
      exit 1
    fi
    sleep 1
  done
}

start_api "$API_CONTAINER"
start_api "$API_CONTAINER_2"
wait_for_api "$API_CONTAINER"
wait_for_api "$API_CONTAINER_2"

docker run --rm \
  --user 1000:1000 \
  -v "${UPLOAD_VOLUME}:/app/uploads" \
  node:20-alpine sh -c \
  'test "$(id -u)" = "1000" && test -w /app/uploads && touch /app/uploads/.runtime-smoke && rm /app/uploads/.runtime-smoke'

echo "Two API replicas, Redis backplane, and shared upload-directory smoke test passed"