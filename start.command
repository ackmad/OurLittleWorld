#!/bin/bash

# Pindah ke direktori tempat file ini berada
cd "$(dirname "$0")"

echo "🧹 Membersihkan port yang menggantung (3001, 5173, 5174)..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:5174 | xargs kill -9 2>/dev/null || true

echo "🚀 Memulai Our Little World (Frontend & Backend)..."
npm run dev &
PID=$!

# Tunggu 3 detik agar Vite & Node server menyala
sleep 3
echo "🌍 Membuka browser..."
open "http://localhost:5173"

# Menahan window terminal & menyambungkan SIGINT (CTRL+C)
trap "kill $PID" EXIT
wait $PID
