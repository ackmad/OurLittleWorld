# Our Little World

🌸 *Rumah digital Elfan & Savira — selalu hidup, selalu hangat.*

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + Three.js |
| Realtime | Supabase Realtime (Broadcast + Presence) |
| Deploy Frontend | Vercel |

---

## Cara Jalankan (Development)

### 1. Frontend

```bash
cd coizy
npm install
npm run dev
```

Game berjalan di `http://localhost:5173`

---

## Kontrol Game

| Tombol | Fungsi |
|---|---|
| W A S D / Arrow Keys | Gerak karakter |
| Shift + W | Lari |
| Space | Lompat |
| Mouse klik-drag | Putar kamera |
| Scroll wheel | Zoom in/out |
| E | Interaksi dengan objek |
| F | Masuk / keluar bangunan |
| Esc | Menu mini |

---

## Fitur Utama

- 🌅 **Langit real-time** — berubah sesuai jam device (fajar, pagi, siang, sore, sunset, malam)
- ⭐ **Bintang & shooting star** — ratusan bintang berkedip, shooting star tiap 3–5 menit
- 🐱 **Kucing NPC** — punya jadwal harian sendiri
- 🦋 **Kupu-kupu, lebah, burung, kelinci, kunang-kunang** — semua hidup
- 🌧️ **Sistem cuaca** — hujan, kabut pagi, angin, salju (Desember)
- 💕 **Multiplayer 2 orang** — join dengan kode room, sync posisi real-time
- 📖 **Memory Jar** — game otomatis menyimpan momen bersama
- ✨ **Bintang bernama** — klik bintang → beri nama → tersimpan permanen
- 🎆 **Kembang api** — otomatis jam 00:00
- 💕 **Easter eggs** — diam bareng → muncul hati, dll

---

## Struktur Project

```
litleworld/
├── frontend/
│   ├── src/
│   │   ├── main.js                  ← Game entry, game loop
│   │   ├── scenes/
│   │   │   └── World.js             ← Island + cottage + environment
│   │   ├── characters/
│   │   │   ├── PlayerController.js  ← WASD + camera + interaction
│   │   │   ├── RemotePlayer.js      ← Partner player (network)
│   │   │   └── NPCManager.js        ← Cat, butterflies, bees, birds...
│   │   └── systems/
│   │       ├── SkySystem.js         ← Real-time sky + stars + shooting stars
│   │       ├── WeatherSystem.js     ← Rain, snow, wind, fog
│   │       ├── AudioSystem.js       ← Zone audio + SFX
│   │       └── MultiplayerSystem.js ← Socket.io client
│   ├── index.html                   ← UI overlays (loading, join, HUD)
│   └── vite.config.js
└── backend/
    ├── server.js                    ← Express + Socket.io room system
    └── data/                        ← memories.json, named_stars.json
```

---

## Deploy

### Vercel (Vercel-only)

```bash
# dari root project:
# Vercel akan menjalankan:
# buildCommand: cd coizy && npm install && npm run build
# outputDirectory: coizy/dist
```

Set environment variable di Vercel (Project Settings → Environment Variables):
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_ENABLE_PAUSE_MENU=true
```

Untuk local dev, buat file `coizy/.env` berisi variable yang sama.

Panduan detail setup realtime ada di `coizy/SUPABASE_SETUP.md`.

### Checklist Verifikasi 2 Pemain

- Buka game di 2 browser/device.
- Pastikan pemain kedua muncul dan gerak sinkron realtime.
- Uji interaksi bersama (`emote`, `door`, `flower`, `generator`).
- Tutup salah satu client, pastikan peer menghilang dari client lain.
- Uji kasus room penuh (maksimal 2 pemain).

---

*Dibuat dengan cinta untuk Elfan & Savira 🌸*
