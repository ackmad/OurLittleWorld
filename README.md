# Our Little World

🌸 *Rumah digital Elfan & Savira — selalu hidup, selalu hangat.*

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + Three.js |
| Backend | Node.js + Express + Socket.io |
| Deploy Frontend | Vercel |
| Deploy Backend | Railway |

---

## Cara Jalankan (Development)

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Server berjalan di `http://localhost:3001`

### 2. Frontend

```bash
cd frontend
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

### Frontend → Vercel

```bash
cd frontend
npm run build
# Upload dist/ ke Vercel, atau connect GitHub repo
```

Set environment variable di Vercel:
```
VITE_SERVER_URL=https://your-railway-backend.up.railway.app
```

### Backend → Railway

Connect GitHub repo, set root directory ke `backend/`, Railway auto-detect Node.js.

---

*Dibuat dengan cinta untuk Elfan & Savira 🌸*
