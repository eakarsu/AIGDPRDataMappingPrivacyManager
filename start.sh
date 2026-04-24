#!/bin/bash

# AI GDPR Data Mapping & Privacy Manager - Start Script
# Cleans ports, seeds database, starts backend + frontend with hot reload

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=3001
FRONTEND_PORT=3000

echo "============================================="
echo "  GDPR Privacy Manager - Starting Up"
echo "============================================="

# Function to clean up on exit
cleanup() {
  echo ""
  echo "Shutting down..."
  if [ ! -z "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null || true
  fi
  if [ ! -z "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID 2>/dev/null || true
  fi
  # Kill any remaining processes on our ports
  lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
  lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
  echo "Goodbye!"
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Step 1: Clean used ports
echo ""
echo "[1/6] Cleaning ports $BACKEND_PORT and $FRONTEND_PORT..."
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
echo "  Ports cleaned."

# Step 2: Check prerequisites
echo ""
echo "[2/6] Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo "  ERROR: Node.js is not installed. Please install Node.js 18+."
  exit 1
fi
echo "  Node.js: $(node --version)"

if ! command -v npm &> /dev/null; then
  echo "  ERROR: npm is not installed."
  exit 1
fi
echo "  npm: $(npm --version)"

# Check PostgreSQL
if command -v pg_isready &> /dev/null; then
  if pg_isready -q; then
    echo "  PostgreSQL: Running"
  else
    echo "  WARNING: PostgreSQL does not appear to be running."
    echo "  Attempting to start PostgreSQL..."
    if command -v brew &> /dev/null; then
      brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
    fi
    sleep 2
    if ! pg_isready -q; then
      echo "  ERROR: Could not start PostgreSQL. Please start it manually."
      exit 1
    fi
  fi
else
  echo "  PostgreSQL: pg_isready not found, assuming running"
fi

# Step 3: Check .env file
echo ""
echo "[3/6] Checking environment..."
if [ ! -f "$PROJECT_DIR/.env" ]; then
  echo "  ERROR: .env file not found at project root."
  exit 1
fi
echo "  .env file found."

# Step 4: Install dependencies
echo ""
echo "[4/6] Installing dependencies..."
cd "$PROJECT_DIR/backend"
npm install --silent 2>&1 | tail -1
echo "  Backend dependencies installed."

cd "$PROJECT_DIR/frontend"
npm install --silent 2>&1 | tail -1
echo "  Frontend dependencies installed."

# Step 5: Seed database
echo ""
echo "[5/6] Seeding database..."
cd "$PROJECT_DIR/backend"
node seed.js
echo "  Database seeded."

# Step 6: Start servers with hot reload
echo ""
echo "[6/6] Starting servers..."
echo ""

# Start backend with nodemon for hot reload
cd "$PROJECT_DIR/backend"
npx nodemon server.js &
BACKEND_PID=$!
echo "  Backend started on port $BACKEND_PORT (PID: $BACKEND_PID) with hot reload"

# Start frontend
cd "$PROJECT_DIR/frontend"
BROWSER=none PORT=$FRONTEND_PORT npm start &
FRONTEND_PID=$!
echo "  Frontend started on port $FRONTEND_PORT (PID: $FRONTEND_PID) with hot reload"

echo ""
echo "============================================="
echo "  GDPR Privacy Manager is running!"
echo "============================================="
echo ""
echo "  Frontend:  http://localhost:$FRONTEND_PORT"
echo "  Backend:   http://localhost:$BACKEND_PORT"
echo "  API Health: http://localhost:$BACKEND_PORT/api/health"
echo ""
echo "  Demo Login:"
echo "    Email:    admin@privacyguard.com"
echo "    Password: Admin@2026!"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo "============================================="

# Wait for any background process to exit
wait
