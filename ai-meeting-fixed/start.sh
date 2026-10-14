#!/bin/bash
echo "================================================"
echo "  AI Meeting Intelligence v2"
echo "  Starting backend + frontend..."
echo "================================================"
echo ""

# Install backend deps
echo "📦 Installing backend dependencies..."
cd backend && npm install --silent
echo "✅ Backend deps installed"

# Seed database
echo "🌱 Seeding demo data..."
npm run seed 2>/dev/null && echo "✅ Demo accounts created" || echo "⚠️  Seed skipped (data may already exist)"

# Start backend in background
echo "🚀 Starting backend on port 5000..."
npm run dev &
BACKEND_PID=$!
sleep 3

# Install + start frontend
echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend && npm install --silent
echo "✅ Frontend deps installed"
echo "🌐 Starting frontend on port 3000..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "================================================"
echo "  ✅ App running!"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:5000"
echo "  Admin:    admin@demo.com / password123"
echo "  User:     jane@demo.com / password123"
echo "================================================"
echo ""
echo "Press Ctrl+C to stop both servers"

wait $BACKEND_PID $FRONTEND_PID
