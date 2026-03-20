#!/bin/bash

# Pindah ke direktori tempat file ini berada
cd "$(dirname "$0")"

# Menjalankan frontend dan backend sekaligus
echo "🚀 Memulai Our Little World (Frontend & Backend)..."
npm run dev
