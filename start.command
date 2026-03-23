#!/bin/bash

# ============================================================
#  OUR LITTLE WORLD — Fast Starter
#  Script ini didesain agar kamu bisa jalankan game 
#  hanya dengan double click saja!
# ============================================================

# Pindah ke direktori project (tempat file ini berada)
cd "$(dirname "$0")"

# 1. Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js belum terinstall! Silakan install di nodejs.org"
    read -p "Tekan ENTER untuk keluar..."
    exit 1
fi

echo "🌸 Mempersiapkan Our Little World..."

# 2. Fungsi Check node_modules
check_modules() {
    local dir=$1
    if [ ! -d "$dir/node_modules" ]; then
        echo "📦 Menginstall dependencies di $dir (mungkin agak lama)..."
        (cd "$dir" && npm install)
    fi
}

echo "🔍 Memeriksa dependensi (npm install)..."
check_modules "."
check_modules "backend"
check_modules "coizy"

# 3. Membersihkan Port (Agar tidak terjadi EADDRINUSE)
echo "🧹 Membersihkan port 3001 & 5173..."
PORTS=(3001 5173)
for port in "${PORTS[@]}"; do
    PID_PORT=$(lsof -ti:$port)
    if [ ! -z "$PID_PORT" ]; then
        echo "   - Menutup proses lama di port $port (PID: $PID_PORT)"
        kill -9 $PID_PORT 2>/dev/null || true
    fi
done

# 4. Menjalankan Frontend & Backend
echo "🚀 Memulai Engine (Backend & Frontend)..."
npm run dev &
MAIN_PID=$!

# 5. Menunggu Server Siap (Polling port 5173)
echo "⏳ Menunggu server siap..."
MAX_WAIT=20
WAIT_COUNT=0
while ! nc -z localhost 5173 &>/dev/null; do
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
        echo "⚠️  Server agak lama menyala, mencoba buka browser sekarang..."
        break
    fi
done

echo "🌍 Membuka browser: http://localhost:5173"
open "http://localhost:5173"

# Menahan terminal agar tidak tertutup jika server masih jalan
# Serta membersihkan semua proses saat terminal ditutup / CTRL+C
cleanup() {
    echo -e "\n🛑 Mematikan server..."
    kill $MAIN_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM EXIT
wait $MAIN_PID
