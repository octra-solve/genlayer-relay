#!/bin/bash

# --- CONFIG ---
ROOT_DIR="$(pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
FRONTEND_CONFIG="$FRONTEND_DIR/public/runtime-config.json"
DEFAULT_PORT=3000
MAX_WAIT=30

# ---- START BACKEND -----
echo " Starting backend..."
cd "$BACKEND_DIR"

# Read PORT from .env or fallback
PORT=$(grep -E '^PORT=' "$BACKEND_DIR/.env" | cut -d '=' -f2 | tr -d ' ')
PORT=${PORT:-$DEFAULT_PORT}

# Start backend in background
npm run dev &

BACKEND_PID=$!

# Trap to kill backend on exit
trap "kill $BACKEND_PID" EXIT

# Wait for backend health check
echo " Waiting for backend to be healthy..."
WAITED=0
until curl -s "http://localhost:$PORT/health" | grep -q '"status":"ok"'; do
  sleep 1
  WAITED=$((WAITED+1))
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "❌ Backend failed to start in $MAX_WAIT seconds"
    exit 1
  fi
done

echo " Backend is live on http://localhost:$PORT"

# ----- WRITE BACKEND URL TO FRONTEND CONFIG ---
echo "✏️ Writing backend URL to frontend config..."
cat <<EOT > "$FRONTEND_CONFIG"
{
  "BACKEND_URL": "http://localhost:$PORT"
}
EOT
echo "Frontend config updated"

# ---- START FRONTEND ---
echo "🚀 Starting frontend..."
cd "$FRONTEND_DIR"
npm run dev
