# 🌸 Game Design Document (GDD)
## **Coizy — Our Little World**

> **Versi Dokumen:** 1.0  
> **Tanggal:** 23 Maret 2026  
> **Status:** Aktif Dikembangkan (Alpha)  
> **Penulis:** Elfan & Savira  

---

## Daftar Isi

1. [Ringkasan Proyek](#1-ringkasan-proyek)
2. [Visi & Filosofi Desain](#2-visi--filosofi-desain)
3. [Informasi Teknis](#3-informasi-teknis)
4. [Dunia & Setting](#4-dunia--setting)
5. [Karakter Pemain](#5-karakter-pemain)
6. [Sistem Kontrol](#6-sistem-kontrol)
7. [Sistem Fisika & Gerakan](#7-sistem-fisika--gerakan)
8. [Dunia & Lingkungan](#8-dunia--lingkungan)
9. [NPC & Fauna](#9-npc--fauna)
10. [Sistem Interaksi](#10-sistem-interaksi)
11. [Sistem Inventaris & Item](#11-sistem-inventaris--item)
12. [Sistem Memori & Kenangan](#12-sistem-memori--kenangan)
13. [Multiplayer & Jaringan](#13-multiplayer--jaringan)
14. [UI & HUD](#14-ui--hud)
15. [Visual & Estetika](#15-visual--estetika)
16. [Audio (Rencana)](#16-audio-rencana)
17. [Arsitektur Kode](#17-arsitektur-kode)
18. [Struktur File Proyek](#18-struktur-file-proyek)
19. [Status Implementasi & Backlog](#19-status-implementasi--backlog)
20. [Spawn & Reset Sistem](#20-spawn--reset-sistem)

---

## 1. Ringkasan Proyek

| Atribut | Detail |
|---|---|
| **Nama Game** | Coizy — *Our Little World* |
| **Genre** | Cozy Exploration / Social Sandbox |
| **Platform** | Web Browser (Desktop) |
| **Target Pemain** | 2 Orang (Pasangan — Elfan & Savira) |
| **Mode** | 2-Player Online Co-op (Room-based) |
| **Perspektif** | First-Person / Third-Person (Toggle) |
| **Engine** | Three.js + Rapier3D (WebAssembly Physics) |
| **Backend** | Node.js + Socket.IO |
| **Bahasa UI** | Bahasa Indonesia |

**Konsep Inti:**
Coizy adalah dunia 3D mini berbasis pulau yang hanya bisa diakses oleh dua orang tertentu menggunakan kode akses rahasia. Dunia ini dibuat sebagai ruang privat untuk berbagi moment kebersamaan: berjalan-jalan di pulau, berinteraksi dengan hewan, mengukir nama di batu, memberi nama bintang, dan menyimpan kenangan bersama dalam sebuah buku harian digital.

---

## 2. Visi & Filosofi Desain

### 2.1 Tagline
> *"Dunia kecil yang hanya milik kita."*

### 2.2 Pilar Desain

| # | Pilar | Deskripsi |
|---|---|---|
| 1 | **Keintiman** | Hanya 2 pemain. Tidak ada orang lain. Dunia ini eksklusif milik mereka. |
| 2 | **Kenangan** | Setiap interaksi bisa menjadi memori yang tercatat secara permanen. |
| 3 | **Ketenangan** | Tidak ada misi, tidak ada ancaman, tidak ada musuh. Hanya eksplorasi. |
| 4 | **Estetika** | Visual "Chunky Flat Pastel" — lembut, hangat, dan menyenangkan secara visual. |

### 2.3 Filosofi Visual — "Chunky Flat Pastel"

Terinspirasi dari genre Ghibli, Animal Crossing, dan VRChat Cozy Worlds:
- **Warna:** Palet pastel cerah (Peach, Mint, Lavender, Baby Blue, Rose Mist, Butter)
- **Bentuk:** Chunky (gemuk, bulat, tidak tajam). Outline hitam tipis via `OutlineEffect`
- **Bayangan:** Shadow berwarna (bukan hitam polos), ambient oklusi blobby
- **Karakter:** Chibi/Chubby dengan mata besar dan pipi kemerahan
- **Langit:** Gradient 3-layer (Baby Blue → Lilac mix → Rose Mist)
- **Outline Effect:** Tebal `0.0035`, warna warm gray pastel `(0.65, 0.55, 0.45)`

### 2.4 Tone & Feel
- Hangat seperti sore di rumah pedesaan
- Senang, playful, tapi juga melankolis in a good way
- Tidak kompetitif. Tidak ada skor. Tidak ada kemenangan.

---

## 3. Informasi Teknis

### 3.1 Stack Teknologi

```
Frontend (coizy/)
├── three.js               — Rendering 3D WebGL
├── @dimforge/rapier3d-compat — Physics engine (WebAssembly)
├── three/examples/jsm     — EffectComposer, PostProcessing, OutlineEffect, CSS2DRenderer
├── gsap                   — Animasi UI/tween
├── socket.io-client       — Koneksi real-time ke backend
├── vite                   — Dev server & bundler
└── vanilla JS (ES Modules)

Backend (backend/)
├── express                — HTTP server & REST API
├── socket.io              — Real-time WebSocket
├── cors                   — Cross-origin support
└── fs/json                — Persistensi data lokal (JSON file)
```

### 3.2 Renderer Configuration

| Parameter | Nilai |
|---|---|
| Renderer | `THREE.WebGLRenderer` (antialias: true) |
| Pixel Ratio | `min(devicePixelRatio, 0.8)` — sengaja sedikit rendah untuk performa |
| Shadow Map | `THREE.PCFShadowMap` (1024×1024) |
| Tone Mapping | `THREE.ACESFilmicToneMapping` |
| Exposure | `1.3` |
| Post-Processing | Bloom (strength 0.25) + Vignette |
| Outline Effect | `OutlineEffect` wrapping renderer |

### 3.3 Physics Configuration

| Parameter | Nilai |
|---|---|
| Engine | RAPIER (Dimforge) — WebAssembly |
| Gravity | `(0, -20, 0)` m/s² |
| Player Collider | `Capsule (radius: 0.4, halfHeight: 0.5)` |
| Terrain Collider | `Trimesh` dari PlaneGeometry subdivisi tinggi |
| Collision Layers | `TERRAIN (0x1)`, `STATIC (0x2)`, `DYNAMIC (0x4)`, `PLAYER (0x8)`, `NPC (0x10)`, `TRIGGER (0x20)` |

### 3.4 Port & Environment

| Service | Port | Keterangan |
|---|---|---|
| Frontend Dev Server (Vite) | `5173` (default) | `npm run dev` di `/coizy` |
| Backend (Express + Socket.IO) | `3001` | `npm start` di `/backend` |

---

## 4. Dunia & Setting

### 4.1 Konsep Dunia

Dunia berlokasi di sebuah **pulau terapung** berbentuk elips di tengah lautan. Pulau ini adalah satu-satunya daratan yang ada — dikelilingi oleh laut tanpa batas yang menghilang ke cakrawala.

### 4.2 Dimensi Pulau

| Parameter | Nilai |
|---|---|
| Ukuran Terrain Geometry | `120 × 100 unit` (PlaneGeometry) |
| Resolusi Heightmap | `220 × 180 segmen` (high-density) |
| Zona Dataran Tinggi (Plateau) | Radius 0.0 – 0.65 (relatif) |
| Zona Lereng | Radius 0.65 – 0.82 |
| Zona Pantai | Radius 0.82 – 0.95 |
| Titik Paling Tinggi | ~2.8 unit (Plateau tengah) |
| Ocean Plane | `1600 × 1600` unit, animasi shader GLSL |

### 4.3 Biome & Zona

```
┌─────────────────────────────────────────┐
│              LAUTAN                     │
│    ┌───────────────────────────┐        │
│    │  PANTAI (Butter/Peach)    │        │
│    │  ┌─────────────────────┐  │        │
│    │  │  OAK TREES ZONE     │  │        │
│    │  │   ┌─────────┐       │  │        │
│    │  │   │  RUMAH  │ HILLS │  │        │
│    │  │   │ (Plateau│       │  │        │
│    │  │   └─────────┘       │  │        │
│    │  │  BIRCH TREES ZONE   │  │        │
│    │  │     RAWA (Swamp)    │  │        │
│    │  │  SCATTERED ROCKS    │  │        │
│    │  └─────────────────────┘  │        │
│    │        CLIFF ROCKS        │        │
│    └───────────────────────────┘        │
│         DOCK (Dermaga selatan)          │
└─────────────────────────────────────────┘
```

| Biome | Warna | Lokasi |
|---|---|---|
| Pantai (Sand) | Butter (#FFF0A8) + Peach (#FDDBB4) | Pinggiran pulau (dist 0.68–0.85) |
| Dataran Hijau (Grass) | Mint (#C8F0D8) + Sage (#7CC8A0) | Daratan utama |
| Puncak Bukit (Peak) | Rose Mist + Bubblegum | Titik tinggi (h > 2.5) |
| Tebing (Cliff) | Lavender (#DDD4F8) + Lilac (#A898E8) | Area curam |
| Rawa (Swamp) | Baby Blue (#C2E4FB) | Area tertentu di tengah |
| Laut | Shader GLSL: Teal → Cyan → Milky foam | Mengelilingi pulau |

### 4.4 Bangunan Utama — The Cottage

Satu-satunya bangunan di pulau: sebuah **cottage bergaya vintage** yang dibangun oleh `HouseBuilder.js`.

| Komponen | Detail |
|---|---|
| Fondasi | Dua layer batu (Lavender + Lilac), tinggi ~2.2 unit |
| Dinding | Papan kayu horizontal (Peach + Butter), 12+ modul planks |
| Atap | 3-layer jerami (Rose Mist → Bubblegum → Tangerine), curam |
| Pintu | Pivot system (buka/tutup animasi GSAP), interaktable |
| Jendela | 1 jendela depan dengan daun jendela (Sage/Mint) |
| Teras | Platform lebar dengan pagar baluster dan pot bunga |
| Tangga | 10 anak tangga dari tanah ke teras |
| Cerobong | Bata Tangerine dengan sistem partikel asap animasi |
| Lampu | 6+ lampu (perapian, teras, interior, lampu jalan, key light, fill light) |
| Ivy | Dedaunan rambat di sisi kiri rumah |
| Smoke System | 14 partikel asap yang naik, membesar, dan fade out secara loop |

### 4.5 Fitur Lingkungan Lainnya

| Elemen | Jumlah | Deskripsi |
|---|---|---|
| Oak Trees | 10 pohon | 5-layer sistem (AO shadow, deep shade, shadow, body, highlight) |
| Birch Trees | 3 pohon | Lighter colored, 4-layer, batang putih |
| Bushes | 15 semak | Tersebar acak |
| Scattered Rocks | 45 batu | Acak, punya physics collider |
| Cliff Rocks | 40 batu | Mengelilingi pinggiran pulau |
| Flowers | 30 bunga | 3 warna (pink, kuning, biru) |
| Dock (Dermaga) | 1 dermaga | 6 papan kayu ke arah selatan laut |
| Wind Particles | 20 partikel | 12 daun hijau + 8 kelopak pink, animasi angin |
| Ocean | 1 plane | Shader GLSL dengan 3-layer ombak diagonal + foam pantai |
| Island Bottom | 1 cone | Bagian bawah pulau (tampak dari sudut tertentu) |

---

## 5. Karakter Pemain

### 5.1 Daftar Karakter

| ID | Nama | Kode Akses | Warna | Spawn Position |
|---|---|---|---|---|
| P1 | **Elfan** | `220108` | Baby Blue `#4da6ff` | X: 3.3, Y: 5.6, Z: -4.3 |
| P2 | **Savira** | `150108` | Pink `#ff66b2` | X: -4.1, Y: 5.6, Z: -4.8 |

### 5.2 Desain Visual Karakter (Chibi Chubby)

Karakter dibangun dari geometri primitif Three.js:

```
Komponen Visual Karakter:
├── Body        — SphereGeometry (r: 0.48) — warna player
├── Head        — SphereGeometry (r: 0.42) — warna player
├── Left Eye    — SphereGeometry (r: 0.065) — hitam gelap
├── Right Eye   — SphereGeometry (r: 0.065) — hitam gelap
│   ├── Eye Highlight (putih kecil)
│   └── Eye Highlight (putih kecil)
├── Left Blush  — CircleGeometry (r: 0.07) — oranye/pink, transparan 45%
├── Right Blush — CircleGeometry (r: 0.07)
├── Left Arm    — CapsuleGeometry — warna player, miring 0.4 rad
├── Right Arm   — CapsuleGeometry
├── Left Leg    — CapsuleGeometry
├── Right Leg   — CapsuleGeometry
└── Blob Shadow — PlaneGeometry (1.2×1.2) — ungu gelap, transparan 20%
```

### 5.3 Physics Body Pemain

| Parameter | Nilai |
|---|---|
| Physics Shape | Capsule (radius: 0.4, halfHeight: 0.5) |
| Friction | 0.0 (sliding gratis terhadap dinding) |
| Restitution | 0.0 (tidak mental) |
| Linear Damping | 0.01 |
| Angular Damping | 1.0 |
| Rotasi Dikunci | Ya (lockRotations) — tidak bisa jungkir balik |

### 5.4 State Pemain

```
playerState bisa berupa:
  'idle'           — bergerak bebas
  'leaning'        — bersandar di pohon
  'sitting_pond'   — duduk di tepi kolam
  'sitting_rock'   — duduk di batu
  'sitting_bench'  — duduk di bangku
  'sitting_sofa'   — duduk di sofa
  'sitting_rooftop'— duduk di kursi atap
```

### 5.5 Animasi Karakter

Animasi dilakukan secara *procedural* (bukan skeletal):
- **Berjalan:** Ayunan lengan dan kaki via sine wave terhadap waktu
- **Idle:** Sedikit breathing bob (naik-turun lembut)
- **Sprint:** Frekuensi animasi meningkat
- **Emote:** Triggered oleh tombol 1-5 atau Emote Wheel (Q)

---

## 6. Sistem Kontrol

### 6.1 Kontrol Dasar

| Tombol | Aksi |
|---|---|
| `W` | Jalan maju |
| `S` | Jalan mundur |
| `A` | Jalan ke kiri |
| `D` | Jalan ke kanan |
| `SHIFT` | Sprint (kecepatan 12 unit/s vs jalan 6 unit/s) |
| `CTRL` | Jongkok/Crouch (kecepatan 2 unit/s) |
| `SPACE` | Melompat (jump force: 16.5, dengan coyote time 0.12s) |
| `MOUSE` | Arahkan kamera (Pointer Lock) |

### 6.2 Kontrol Aksi

| Tombol | Aksi |
|---|---|
| `E` | Interaksi utama (door, cat, rabbit, flower, dll) |
| `Q` | Buka Emote Wheel |
| `F` | Lempar batu ke air |
| `C` | Toggle kamera 1st / 3rd person |
| `V` | Toggle Free Cam (Mata Tuhan) — mode kamera terbang bebas |
| `ESC` | Pause Menu / Lepas pointer lock |
| `1` | Emote cepat: Hai 👋 |
| `2` | Emote cepat: Dansa 💃 |
| `3` | Emote cepat: Duduk 🧘 |
| `4` | Emote cepat: Peace ✌️ |
| `5` | Emote cepat: Peluk 🫂 |

### 6.3 Sistem Pointer Lock

- Kamera dikunci ke canvas saat `inGame = true`
- Klik pada canvas → `requestPointerLock()`
- ESC → exit pointer lock → Pause Menu muncul otomatis
- Mouse Sensitivity: default `0.002`, configurable via Settings
- Pitch clamped: `±(π/2 - 0.05)` → ≈ ±85°
- Yaw: `cameraYaw -= event.movementX * sensitivity`

### 6.4 Free Cam (God Mode)

Saat mode `V`:
- Kamera dilepas dari `playerGroup` dan dipindah ke root scene
- WASD + Space/Ctrl untuk terbang bebas
- Sprint: kecepatan ×2 (20 → 40 unit/s dalam delta)
- Transisi keluar: GSAP tween 1.2s kembali ke posisi kepala pemain

---

## 7. Sistem Fisika & Gerakan

### 7.1 Physics Loop

- `physicsWorld.step()` dipanggil di setiap frame render
- Error handling: jika crash `'unreachable'` atau `'recursive'`, skip frame
- Player visual di-sync ke `playerBody.translation()`

### 7.2 Kecepatan Gerakan

| Mode | Kecepatan |
|---|---|
| Jalan Normal | 6.0 unit/s |
| Sprint | 12.0 unit/s |
| Crouch | 2.0 unit/s |
| Free Cam Normal | 20 unit/s × delta |
| Free Cam Sprint | 40 unit/s × delta |

### 7.3 Sistem Jump

| Parameter | Nilai |
|---|---|
| Jump Force | `16.5` (vertical velocity) |
| Gravity | `-22` unit/s² |
| Max Fall Speed | `-30` unit/s |
| Coyote Time | `0.12` detik (bisa lompat setelah berjalan dari tepi) |
| Jump Buffer | Diimplementasikan (`jumpBufferTimer`) |
| Ground Detection | Ray cast ke bawah 1.25 unit, tolerance 1.45 |

### 7.4 Slope & Boundary

- Slope > 70°: tidak dianggap grounded (tidak bisa lompat)
- Slope 45–70°: slide push horizontal
- Boundary polygon: hexagonal ~55 unit radius
- Jatuh di bawah Y = -30 → auto-respawn
- Ground snap: jika body < (terrain - 3.0), teleport ke terrain + 1.2

### 7.5 Arah Gerakan

Gerakan selalu **relatif terhadap arah pandang kamera** (`cameraYaw`):
```javascript
forward = (-sin(cameraYaw), 0, -cos(cameraYaw))
right   = ( cos(cameraYaw), 0, -sin(cameraYaw))
```

### 7.6 Rotasi Karakter Visual

- Saat bergerak: karakter menghadap ke arah vector gerakan
- Saat diam: karakter menghadap ke arah kamera (membelakangi view)
- Rotasi diinterpolasi dengan lerp (0.15 per frame) — smooth rotation

---

## 8. Dunia & Lingkungan

### 8.1 Heightmap Terrain

Terrain menggunakan fungsi `getHeight(x, z)` berbasis noise procedural:

```
Layer 1 — Base Landmass:
  dist 0.0–0.20 : Plateau rata (h = 2.8)
  dist 0.20–0.65: Lereng landai (lerp 2.8 → 1.2)
  dist 0.65–0.82: Lereng ke pantai (lerp → 0.18)

Layer 2 — Underwater Gradient:
  dist > 0.84   : Semakin dalam (h -= (dist - 0.84) * 2.5)

Layer 3 — Hills & Swamps (hanya di dist < 0.68):
  nHills > 0.4  : Bukit (pow(nHills-0.4, 1.8) * 5.0, max +5)
  nSwamp > 0.5  : Rawa (pow(nSwamp-0.5, 2.0) * 3.0, cekungan -3)

Cutoff: dist > 1.2 → abyss (turun cepat ke -10)
```

### 8.2 Terrain Collision

- `ColliderDesc.trimesh(vertices, indices)` dari PlaneGeometry
- Setiap vertex dikonversi ke world-space termasuk offset `Y + 0.15`
- Terrain collision layer: `TERRAIN (0x0001)` vs semua

### 8.3 Ocean Shader

Ocean menggunakan GLSL custom vertex + fragment shader:

**Vertex Shader:**
```glsl
// Gelombang base lambat
wave = sin(pos.x * 0.04 + time * 1.5) * 0.2
     + cos(pos.y * 0.03 + time * 0.8) * 0.15
```

**Fragment Shader — 3 Layer Ombak Diagonal:**
```glsl
// Distorsi organik (Wobble)
wobble = sin(diagY * 0.2 + time * 0.8) * 2.0
       + cos(diagX * 0.15 - time * 0.5) * 1.5

// 3 gelombang bergerak:
w1 = sin((diagX + wobble) * 0.25 - time * 1.2)
w2 = sin((diagX + wobble*0.8 + diagY*0.1) * 0.35 - time * 1.6)
w3 = sin((diagX + wobble*1.2 - diagY*0.15) * 0.45 - time * 2.0)

// Beach foam + fade to background
```

Warna: `Deep Teal (#48A8C4) → Shore Cyan (#A8D8E8) → Foam (#DAEEF8)`

### 8.4 Lighting Setup

| Sumber Cahaya | Tipe | Warna | Intensitas | Keterangan |
|---|---|---|---|---|
| `ambientLight` | AmbientLight | `#7B5830` (Warm Amber) | 0.4 | Base shadow filler |
| `sunLight` | DirectionalLight | `#FFF6D4` (Warm Cream) | 2.5 | Bayangan utama, shadow map 1024 |
| `hemiLight` | HemisphereLight | Sky: `#F8D4E4`, Ground: `#7B5830` | 0.9 | Gradasi objek atas-bawah |
| House Key Light | DirectionalLight | `#FFF8E8` | 2.8 | Menerangi fasad rumah |
| House Fill Light | DirectionalLight | `#DDE8FF` | 1.4 | Sisi barat rumah |
| Fireplace | PointLight | `#FF8822` | 4.0 | Radius 16, inside house |
| Porch Lantern | PointLight | `#FFE080` | 4.0 | Radius 12, depan rumah |
| Interior Ambient | PointLight | `#FFD0A0` | 2.5 | Radius 14, dalam rumah |
| Street Lamp | PointLight | `#FFE080` | 1.4 | Radius 5.5, di jalan |

---

## 9. NPC & Fauna

### 9.1 Sistem NPC

NPC dikelola oleh `NPCManager.js` menggunakan **SimpleVehicle** — sistem steering behavior manual tanpa library eksternal.

**SimpleVehicle Features:**
- `applyForce(force)` — dengan max speed clamp
- `wander(delta, radius, jitter)` — pergerakan acak organik
- `flee(target, panicDist, delta)` — lari dari target
- `update(delta, environment)` — obstacle avoidance via ray box intersection

### 9.2 Kucing (Cat) — `CatModel.js`

| Atribut | Detail |
|---|---|
| Spawn | 2 ekor: `(-8, 12)` dan `(6, -8)` |
| Max Speed | 0.8 unit/s (normal), 3.5 unit/s (flee) |
| Interaction | `[E] Elus Kucing` → speech bubble "Purrr... 🐈" + sparkle |

**State Machine Kucing:**
```
States: IDLE → WALK → SIT → (kembali ke IDLE)
        IDLE/SIT → PET (jika di-elus)
        IDLE/WALK → FLEE (jika pemain lari dekat < 4u kecepatan > 5)

Timing:
  IDLE  : 5–13 detik
  WALK  : 4–10 detik (wander)
  SIT   : 15–30 detik (kemudian reset ke IDLE)
  PET   : 5 detik
  FLEE  : 3 detik

Setelah 3x WALK → masuk state SIT (wander counter reset)
```

**Physics:**
- Ground Y dicek setiap 5 frame (cached, dioptimasi performa)
- `mesh.position.y = lerp(y, groundY + 0.5, 0.2)` — smooth climbing
- Boundary clamp: `±25` unit di X dan Z

### 9.3 Kelinci (Rabbit) — `RabbitModel.js`

| Atribut | Detail |
|---|---|
| Spawn | 3 ekor: `(-18,-10)`, `(15,15)`, `(-28,5)` |
| Max Speed | 1.5 unit/s (jalan), 5.0 unit/s (flee) |
| Interaction | `[E] Dekati Kelinci` + animasi sparkle |

**State Machine Kelinci:**
```
States: GRAZE → WALK → IDLE → ALERT → FLEE → TAME

Triggers:
  playerSpeed > 5.0 && dist < 5.0 → FLEE
  dist < 1.5 && speed < 1.0 && isBeingPet → TAME (8 detik)
  dist < 2.5 → ALERT (diam di tempat)
```

- `homePos` tersimpan, kelinci punya "area jelajah" sendiri
- Ground Y: `lerp(y, groundY + 0.44, 0.2)` — sedikit lebih rendah dari kucing
- Boundary clamp: `±45` unit

### 9.4 Kupu-Kupu (Butterfly) — `ButterflyModel.js`

| Atribut | Detail |
|---|---|
| Jumlah | 6 ekor |
| Varian | `monarch`, `morpho`, `swallowtail`, `rose`, `emerald` |
| Max Speed | 1.5 unit/s |

**State Machine Kupu-Kupu:**
```
States:
  FLYING      — mengikuti Catmull-Rom curve (5 control point acak)
  HOVERING    — melayang diam (1.5–3 detik)
  SEEKING_LAND— mendekati titik landing (pohon, batu, dinding)
  LANDED      — istirahat di permukaan (2–5 detik)
  TAKING_OFF  — naik 1.2 unit/s selama 0.4 detik
  LAND_ON_PLAYER — hinggap di bahu pemain (jika pemain diam dekat)

Special:
  ≈5% peluang per detik untuk hinggap di bahu pemain
  saat pemain diam dalam radius 1.2 unit
  → Trigger emoji 🦋 + socket emit
```

**Collision Avoidance (In-flight):**
- Raycast forward 1.0 unit setiap 0.5 detik
- Jika menabrak mesh → generate curve baru (dodge)

**Banking:**
- Rotasi Z = lerp terhadap lateral velocity (banking saat belok)

### 9.5 Burung (Bird) — Terencana

```
States: PERCHED → FLYING → PERCHED
  PERCHED: diam di pohon, terbang jika pemain < 4 unit
  FLYING:  lerp ke target random, lalu perch di pohon baru
```
*(Diimplementasikan di NPCManager tapi model belum dibuat)*

---

## 10. Sistem Interaksi

### 10.1 Mekanisme Deteksi

- `THREE.Raycaster` dari pusat layar (koordinat `(0,0)` di normalized space)
- Jarak maksimal check: `~3.5 unit` (di `updatePhysics` loop)
- `promptObj` adalah `CSS2DObject` yang mengikuti objek yang terdeteksi
- Prompt `[E] Label` muncul saat interactable terdeteksi

### 10.2 Daftar Interaktable Lengkap

| Tipe | Label | Aksi |
|---|---|---|
| `tree` | `[E] Bersandar` | Toggle `playerState = 'leaning'` + dialog acak |
| `flower` | `[E] Petik Bunga` | +1 item ke inventory, flower hilang 60 detik, sync ke partner |
| `pond` | `[E] Duduk di Kolam` | Toggle `sitting_pond` |
| `bench` | `[E] Duduk di Bangku` | Toggle `sitting_bench`, teleport ke posisi bangku |
| `sofa` | `[E] Duduk di Sofa` | Toggle `sitting_sofa` |
| `rooftop_chair` | `[E] Duduk di Atap` | Toggle `sitting_rooftop` |
| `door` | `[E] Masuk ke Rumah` | Animasi buka/tutup pintu (GSAP rotate Y ±90°), sync ke partner |
| `memory_book` | `[E] Buku Kenangan` | Buka modal Memory Book |
| `bookshelf` | `[E] Buku` | Buka modal Memory Book (placeholder) |
| `sign` | `[E] Papan Nama` | Buka dialog rename rumah |
| `crate` | `[E] Buka Peti` | Animasi wiggle scale, sync ke partner |
| `drum` | `[E] Ambil Air` | Toast "Mengambil air dari drum 💧" |
| `generator` | `[E] Generator` | Animasi vibrate, toggle listrik rumah |
| `stump` | `[E] Tebang` | Animasi kapak swing, +1 Log |
| `ivy` | `[E] Ivy` | Animasi bergoyang |
| `vinyl` | `[E] Piringan Hitam` | Toggle musik, sync ke partner |
| `notepad` | `[E] Catatan` | Buka shared notepad modal |
| `fireplace` | `[E] Perapian` | Toast "Hangat sekali 🔥", brief exposure increase |
| `telescope` | `[E] Teleskop` | Toggle FOV: 75° ↔ 30° (zoom) |
| `star` | `[E] Beri Nama Bintang` | Buka dialog input nama bintang |
| `beach_stone` | `[E] Ukir Batu` | Buka dialog input ukiran |
| `ladder` | `[E] Tangga` | Teleport +4.5 unit Y (naik) atau -4.5 (turun) |
| `cat` | `[E] Elus Kucing` | "Purrr 🐈" + sparkle + `isBeingPet = true` |
| `rabbit` | `[E] Dekati Kelinci` | "Kelinci senang 🐰" + sparkle + `isBeingPet = true` |

### 10.3 Cooldown Interaksi

- `interactionCooldown: Map<uuid, timestamp>`
- **Bunga:** cooldown 60.000 ms (60 detik) sebelum respawn & bisa dipetik lagi
- Bunga respawn dengan animasi `gsap.to(scale, bounce.out, 1.5s)`

### 10.4 Throw Stone

Tombol `F` — meluncurkan batu berpanah (projectile):
- Geometri: `DodecahedronGeometry(0.18)`
- Arah: mengikuti arah pandang kamera
- Kecepatan awal: 24 unit/s + arc ke atas +7 unit/s
- Fisika manual (bukan Rapier): `vy -= 25 * dt` (gravity)
- Deteksi tabrakan: ocean Y < 0.38 → efek percikan air `createEffect`
- Deteksi tanah: `y < groundY && |x| < 32 && |z| < 26` → efek tanah
- Sync ke partner: `socket.emit('interaction', { type: 'stone_splash' })`

---

## 11. Sistem Inventaris & Item

### 11.1 Inventaris Bunga

```javascript
inventory = {
  lavender: 0,   // 🌸 Bunga Lavender (warna pink)
  daisy:    0,   // 🌼 Bunga Daisy (warna kuning)
  heather:  0    // 🌺 Bunga Heather (warna biru)
}
```

- Ditampilkan di HUD kanan bawah sebagai slot ikon
- Slot transparan (opacity 0.4) jika count = 0, solid (1.0) jika > 0
- Animasi `pop` saat item bertambah
- Bunga bisa dimakan/dibuang di masa depan (belum diimplementasikan)

### 11.2 Rock Carvings (Ukiran Batu)

- Data tersimpan di `localStorage` key: `coizy_carvings`
- Format: `{ "rock_X.x_Z.x": "Teks ukiran" }`
- Label ditampilkan sebagai `CSS2DObject` di atas batu
- Persisten offline per browser

### 11.3 Named Stars (Bintang Bernama)

- Data tersimpan di `localStorage` (lokal) DAN backend `named_stars.json` (global shared)
- Format: `{ starId: "Nama bintang" }`
- Label ditampilkan di langit via `CSS2DObject`
- Trigger memory otomatis saat 2 pemain online bersama

---

## 12. Sistem Memori & Kenangan

### 12.1 Memory Book

Modal **"Buku Harian Bersama"** — dibuka dari interactable `memory_book` atau pause menu.

| Halaman | Konten |
|---|---|
| Halaman Kiri | Textarea shared notes — bisa diedit |
| Halaman Kanan | Album Foto — grid foto + tombol "Tambah Foto" |

### 12.2 Auto-Memory System

Backend secara otomatis membuat entri memori saat event khusus terjadi:

| Event | Deskripsi Memori |
|---|---|
| `shoot_star` | "Elfan & Savira melihat shooting star bersama" |
| `dance` | "Elfan & Savira berdansa bersama di depan perapian" |
| `campfire` | "Elfan & Savira duduk di api unggun bersama" |
| `sit_together` | "Elfan & Savira duduk berdampingan" |
| `piknik` | "Elfan & Savira piknik di taman" |
| `midnight_fireworks` | "Elfan & Savira merayakan tengah malam bersama 🎆" |
| `named_star` | "Elfan & Savira memberi nama bintang: 'Nama'" |

- Memori hanya dibuat jika **kedua** pemain online (2 players di room)
- Maksimum 200 memori tersimpan (FIFO)
- Memori dapat dilihat via GET `/api/memories`

### 12.3 Data Persistensi Backend

| File | Isi | Format |
|---|---|---|
| `backend/data/memories.json` | Riwayat kenangan | Array JSON |
| `backend/data/named_stars.json` | Bintang bernama | Array JSON |
| `backend/data/special_dates.json` | Tanggal spesial | Array JSON |

---

## 13. Multiplayer & Jaringan

### 13.1 Arsitektur Multiplayer

```
Pemain A                    Backend Server              Pemain B
(Browser)                   (Node.js + Socket.IO)       (Browser)
    │                              │                        │
    │── create_room/join_room ──►  │                        │
    │◄── roomCode + initial data ──│                        │
    │                              │◄── join_room ──────────│
    │◄── player_joined ────────────│── player_joined ──────►│
    │                              │                        │
    │── player_move (60fps) ──────►│── player_moved ───────►│
    │◄── player_moved ─────────────│◄── player_move ─────── │
    │                              │                        │
    │── interaction (event) ──────►│── interaction ─────────│►
    │◄── memory_created ───────────│── memory_created ──────│►
```

### 13.2 Socket Events

| Event (Client → Server) | Data | Keterangan |
|---|---|---|
| `create_room` | `{name, color}` | Buat room baru, dapatkan kode 4 huruf |
| `join_room` | `{roomCode, name, color}` | Bergabung ke room (auto-create jika belum ada) |
| `player_move` | `{x, y, z, ry, anim}` | Update posisi per frame |
| `interaction` | `{type, ...data}` | Broadcast event interaksi |
| `get_memories` | - | Ambil semua kenangan |
| `name_star` | `{starId, name, x, y, z}` | Simpan nama bintang |
| `get_stars` | - | Ambil semua bintang bernama |
| `set_special_date` | `{month, day, label}` | Simpan tanggal spesial |
| `get_nameplate` | - | Ambil nama rumah |
| `set_nameplate` | `{name}` | Ubah nama rumah (broadcast ke room) |

| Event (Server → Client) | Keterangan |
|---|---|
| `player_joined` | Pemain baru masuk room |
| `player_left` | Pemain disconnect |
| `player_moved` | Update posisi pemain lain |
| `interaction` | Broadcast event interaksi |
| `memory_created` | Kenangan baru tersimpan |
| `star_named` | Bintang baru diberi nama |
| `nameplate_updated` | Nama rumah berubah |

### 13.3 Room System

- Kode room: 4 karakter (A-Z, 2-9 tanpa karakter ambigu)
- Max 2 pemain per room
- Room dihapus otomatis saat kosong
- Auto-create: jika join room yang belum ada → dibuat baru

### 13.4 Representasi Pemain Lain (Peers)

```javascript
peers: {
  [socketId]: {
    mesh: THREE.Group,    // visual avatar
    nameLabel: CSS2DObject,
    lastPos: Vector3,
    targetPos: Vector3    // diinterpolasi di setiap frame
  }
}
```

---

## 14. UI & HUD

### 14.1 Alur UI

```
[LOBBY SCREEN]
  → Logo "Coizy" + Terminal-style login box
  → Input passcode (password, 6 digit)
  → Error message (animated, makin lucu setiap salah)

         ↓ Login Berhasil

[LOADING SCREEN]
  → Progress bar: 10% → 30% → 50% → 70% → 90% → 100%
  → Status text: "Menginisialisasi dunia..." → "Selamat datang! 🌸"
  → Durasi: ~2-4 detik (tergantung perangkat)

         ↓ Loading Selesai

[IN-GAME HUD]
  → Crosshair (+)
  → Compass bar (atas tengah): N/S/E/W + derajat
  → Player info (atas kiri): avatar badge + nama + koordinat XYZ
  → Room code label
  → Quick emotes hint bar (atas)
  → Inventory slots kanan bawah: 🌸/🌼/🌺 + count
  → Speech bubbles container (overlay)
  → Interaction prompt (CSS2D, mengikuti objek)

         ↓ ESC

[PAUSE MENU]
  Kiri — Panel Menu: Lanjutkan | Pengaturan | Buku Kenangan | Buku Harapan | Catatan Bersama | Keluar
  Kanan — Panduan Bermain (scrollable guide)
              ├ Kontrol Dasar
              ├ Aktivitas & Interaksi
              └ Fitur Spesial
```

### 14.2 Modal UI

| Modal ID | Trigger | Konten |
|---|---|---|
| `#memory-book` | `[E]` di memory_book/bookshelf, Pause → Buku Kenangan | Shared diary + album foto |
| `#star-dialog` | `[E]` di star interactable | Input nama bintang |
| `#carve-dialog` | `[E]` di beach_stone | Input teks ukiran |
| `#emote-wheel` | Tombol `Q` | 5 item emote radial |
| `#pause-menu` | `ESC` | Menu utama + panduan |
| `#settings-panel` | Pengaturan di pause menu | Visual/Audio/Kontrol tabs |
| `#shared-notepad-modal` | `[E]` di notepad | Shared notepad |

### 14.3 Pengaturan (Settings)

| Tab | Setting | Rentang |
|---|---|---|
| Visual | Kecerahan (`toneMappingExposure`) | 0.5 – 1.5 |
| Visual | Efek Glow/Bloom (toggle) | On/Off |
| Visual | Jarak Pandang (`fog.far`) | 50 – 250 |
| Audio | Volume Utama | 0 – 100 |
| Kontrol | Sensitivitas Mouse | 0.001 – 0.01 |
| Kontrol | Invert Y-Axis | On/Off |

### 14.4 Font

| Font | Digunakan Untuk |
|---|---|
| `Baloo 2` (wght 500, 700) | UI utama, tombol, label |
| `VT323` | Terminal/lobby text |
| `Caveat` | Handwritten style (buku harian) |

---

## 15. Visual & Estetika

### 15.1 Palet Warna Lengkap

```
COIZY PRIMARY PALETTE:
  Peach       #FDDBB4    Tanah / Kayu hangat
  Mint        #C8F0D8    Daun / Rumput utama
  Lavender    #DDD4F8    Pondasi / Batu
  Baby Blue   #C2E4FB    Langit / Air dangkal
  Rose Mist   #F8D4E4    Horizon / Atap atas
  Butter      #FFF0A8    Pantai / Panel cerah
  
ACCENT COLORS:
  Sage        #7CC8A0    Detail hijau lebih gelap
  Lilac       #A898E8    Aksen ungu
  Bubblegum   #E878A8    Highlight / Bunga
  Tangerine   #FF9E6C    Frame / Dekorasi
  Sunshine    #F8C840    Knob / Aksen emas
  Sky Blue    #60B8E8    Air kolam
```

### 15.2 Post-Processing Pipeline

```
Render Pass
    ↓
UnrealBloomPass (strength: 0.25, radius: 0.5, threshold: 0.75)
    ↓
ShaderPass (VignetteShader: offset 1.1, darkness 0.5)
    ↓
OutlineEffect render (wrapping composer output)
    ↓
CSS2DRenderer (labels, prompts)
    ↓
Canvas Output
```

**Note:** `composer.render()` dan `effect.render()` tidak bisa dipakai bersamaan (double render → FPS drop). Saat ini hanya `effect.render()` yang digunakan.

### 15.3 Sky System

Custom sphere gradient shader (SkyDome):
- `colorTop`: Baby Blue `#C2E4FB` (Zenith)
- `colorMid`: Lilac-Pink mix `#E0C8E8` (Mid)
- `colorBot`: Rose Mist `#F8D4E4` (Horizon)
- SkyDome selalu mengikuti posisi kamera (tidak pernah ter-clip)
- Fog: `Fog(0xF8D4E4, near: 45, far: 180)` — aerial perspective

### 15.4 Wind Particles

- 20 partikel total: 12 daun hijau + 8 kelopak pink
- Geometri: `CircleGeometry(0.12, 6)` bertransformasi jadi lonjong (scale Y: 0.5)
- Bergerak dari kanan ke kiri, dengan oscillasi vertikal sine wave
- Wrap-around: bila X < -40 → reset ke X = +40 dengan posisi Y acak

---

## 16. Audio (Rencana)

*Audio belum diimplementasikan secara penuh. Berikut rencana desain:*

| Sumber | Suara | Trigger |
|---|---|---|
| Ambient | Suara angin lembut, ombak jauh | Loop konstan saat in-game |
| Footsteps | Landtile yang berbeda: grass, wood, sand | Saat bergerak (per step) |
| UI | Klik tombol, notifikasi toast | Interaksi UI |
| NPC | "Meo" kucing, "Bok" kelinci, kepakan kupu | State transitions |
| Environment | Percikan air, pintu berderit, gemerisik daun | Event interaksi |
| Vinyl Player | Musik lo-fi / jazz piano | Toggle via interaksi vinyl |
| Memory | Musik kotak musik lembut | Saat Memory Book dibuka |

Volume Settings:
- Master volume slider tersedia di Settings Panel
- Volume Bloom / Reverb bisa diset lebih lanjut

---

## 17. Arsitektur Kode

### 17.1 Inisialisasi Sequence

```
1. Script dimuat (main.js)
2. THREE.js setup (renderer, camera, scene, lights, sky, fog)
3. Lobby island + wind particles dibuat
4. Animate loop MULAI (berjalan sebelum login)
   └── Lobby island berputar + mengambang animasi
5. UI Login aktivasi (TIDAK tunggu RAPIER)
   
   [USER MEMASUKKAN KODE]
   
6. proceedToWorld(player) dipanggil
   └── GSAP fadout UI + zoom kamera ke pulau
   └── initGameEngine(player) dipanggil (async, paralel)
7. initGameEngine:
   a. Show loading screen
   b. RAPIER.init() (await WebAssembly)
   c. World physics = new RAPIER.World(gravity)
   d. Player physics body & visual dibuat
   e. NPCManager dibuat
   f. WorldBuilder.build() (async, dengan progress callback)
   g. Camera dipasang ke playerGroup
   h. PointerLock setup
   i. Network init (Socket.IO)
   j. UI setup (buttons, events)
   k. 100% loading → hide loading screen → game mulai
```

### 17.2 Animate Loop

```javascript
animate() {
  requestAnimationFrame(animate)
  delta = min(rawDelta, 0.05)  // max 50ms, mencegah spiral

  if (!inGame) {
    lobbyGroup.animate()        // pulau lobby animasi
  }

  if (inGame) {
    updatePhysics(delta, time)  // RAPIER step + player movement
    updateCameraRotation()      // apply yaw/pitch ke camera quaternion
    worldBuilder.update()       // ocean time uniform, smoke
    npcManager.update()         // semua NPC update
    skyDome.followCamera()      // prevent clip
    windParticles.update()      // daun/kelopak angin
  }

  effect.render(scene, camera)   // OutlineEffect render
  labelRenderer.render(scene, camera) // CSS2D labels
}
```

### 17.3 Hot Module Replacement (HMR) Guards

- `window._coizyRenderer` → dispose renderer lama saat HMR
- `window._coizyLabelRenderer` → remove DOM element lama
- `window._coizyStopEngine` → stop previous animate loop
- `window._oldGameGroup` → remove scene group lama

---

## 18. Struktur File Proyek

```
OurLittleWorld/
├── README.md
├── package.json              — Root package (workspace manager)
├── start.command             — Script untuk start semua service (macOS)
│
├── coizy/                    — Frontend (Three.js game)
│   ├── index.html            — Entry HTML (UI structure, modal templates)
│   ├── style.css             — Global CSS (19KB, semua UI styles)
│   ├── main.js               — Entry point utama (2168 baris, ~81KB)
│   │                           Core: scene, render loop, physics, controls,
│   │                           player, network, interaction, UI
│   ├── WorldBuilder.js       — Terrain, ocean, trees, rocks, flowers, fauna
│   ├── HouseBuilder.js       — Cottage: foundation, walls, roof, door,
│   │                           windows, porch, chimney, smoke, lighting,
│   │                           ivy, physics colliders
│   ├── NPCManager.js         — AI behaviour: cat, rabbit, butterfly, bird
│   ├── CatModel.js           — Model visual & animasi kucing
│   ├── RabbitModel.js        — Model visual & animasi kelinci
│   ├── ButterflyModel.js     — Model visual & animasi kupu-kupu
│   ├── .env                  — Environment variables (VITE_ENABLE_PAUSE_MENU=true)
│   └── package.json          — Dependencies: three, rapier3d, gsap, socket.io-client, vite
│
└── backend/                  — Backend (Node.js server)
    ├── server.js             — Express + Socket.IO server (232 baris)
    ├── nodemon.json          — Nodemon config
    ├── package.json          — Dependencies: express, socket.io, cors
    └── data/                 — Persistent data storage (JSON files)
        ├── memories.json     — Riwayat kenangan bersama
        ├── named_stars.json  — Bintang-bintang yang diberi nama
        └── special_dates.json— Tanggal spesial
```

---

## 19. Status Implementasi & Backlog

### 19.1 ✅ Sudah Diimplementasikan (Alpha Complete)

| Fitur | Status |
|---|---|
| Terrain procedural + physics trimesh | ✅ Selesai |
| Ocean animasi GLSL shader | ✅ Selesai |
| Cottage dengan semua detail | ✅ Selesai |
| Trees, rocks, flowers, dock | ✅ Selesai |
| Player chibi visual + physics | ✅ Selesai |
| First-person + Third-person toggle | ✅ Selesai |
| Free cam (God Mode) | ✅ Selesai |
| Jump (dengan coyote time + buffer) | ✅ Selesai |
| Sprint / Crouch | ✅ Selesai |
| Pointer Lock system | ✅ Selesai |
| Camera yaw/pitch (quaternion proper) | ✅ Selesai |
| NPC Cat (AI + model) | ✅ Selesai |
| NPC Rabbit (AI + model) | ✅ Selesai |
| NPC Butterfly (AI + model, 5 varian) | ✅ Selesai |
| Interaksi pintu (buka/tutup, sync) | ✅ Selesai |
| Flower pickup + inventory | ✅ Selesai |
| Throw stone + water splash effect | ✅ Selesai |
| Rock carving (localStorage) | ✅ Selesai |
| Star naming (localStorage + backend) | ✅ Selesai |
| Memory Book (diary + photo) | ✅ Sebagian |
| Socket.IO multiplayer | ✅ Selesai |
| Peer representation (avatar + nameplate) | ✅ Selesai |
| Auto-memory system | ✅ Selesai |
| Pause Menu + In-game Guide | ✅ Selesai |
| Settings Panel (Visual/Audio/Control) | ✅ UI Selesai |
| Emote Wheel (5 emote) | ✅ UI Selesai |
| Loading screen + progress | ✅ Selesai |
| Login screen + animasi | ✅ Selesai |
| Speech bubbles | ✅ Selesai |
| Toast notifications | ✅ Selesai |
| Compass bar | ✅ Selesai |
| Coordinate display HUD | ✅ Selesai |
| Wind particles (leaves + petals) | ✅ Selesai |
| Smoke particles chimney | ✅ Selesai |
| Sky dome gradient shader | ✅ Selesai |
| Bloom + Vignette post-processing | ✅ Selesai |
| Outline effect (OutlineEffect) | ✅ Selesai |
| Respawn system (per-player safe spawn) | ✅ Selesai |
| HMR guards (hot reload safe) | ✅ Selesai |
| Debug mode + debug logger | ✅ Selesai |

### 19.2 🚧 Dalam Pengerjaan / Perlu Perbaikan

| Fitur | Status | Catatan |
|---|---|---|
| Cat model collision/positioning | 🚧 Bug Fix | File aktif dibuka: CatModel.js |
| Settings fungsionalitas penuh | 🚧 Partial | UI ada tapi beberapa efek belum terhubung |
| Emote animasi 3D | 🚧 Partial | State ada tapi animasi visual belum polished |
| Photo album upload | 🚧 Partial | UI placeholder, belum ada upload logic |
| Shared notepad sync | 🚧 Partial | Modal ada, sinkronisasi belum penuh |

### 19.3 📋 Backlog / Rencana

| Fitur | Prioritas |
|---|---|
| Audio: ambient + footsteps + NPC sounds | Tinggi |
| Burung (Bird NPC) model visual | Sedang |
| Bintang di langit malam (star field) | Sedang |
| Sistem siang/malam (day/night cycle) | Sedang |
| Lebih banyak interactable di dalam rumah | Sedang |
| Api unggun (campfire) dengan efek api | Sedang |
| Wishing stone / harapan bersama | Sedang |
| Photo capture in-game (screenshot) | Rendah |
| Seasonal events (hujan, salju, dst.) | Rendah |
| Mobile controls | Tidak ada rencana |

---

## 20. Spawn & Reset Sistem

### 20.1 Titik Spawn

| Pemain | X | Y | Z | Keterangan |
|---|---|---|---|---|
| Elfan | 3.3 | 5.6 | -4.3 | Sekitar depan tangga rumah |
| Savira | -4.1 | 5.6 | -4.8 | Dekat kiri teras |
| Default | 0 | 8 | 0 | Fallback jika nama tidak dikenali |

### 20.2 Respawn Trigger

Otomatis respawn saat:
- `playerBody.translation().y < -30` (jatuh dari pulau)

### 20.3 Safe Respawn Function

```javascript
respawnPlayer() {
  setTranslation(spawnX, spawnY, spawnZ)
  setLinvel(0, 0, 0)
  wakeUp()                  // pastikan tidak sleeping
  cameraYaw = 0
  cameraPitch = -0.1        // sedikit menghadap ke bawah (alami)
  playerGroup.rotation.y = 0
}
```

---

## Catatan Pengembangan

> **Alfan & Savira** — Dunia ini diciptakan sebagai ruang khusus untuk kalian.
> Setiap baris kode, setiap pohon, setiap bintang yang bisa diberi nama —
> semuanya dibuat dengan satu tujuan: memberikan kalian tempat untuk
> membuat kenangan bersama, kapanpun dan dimanapun kalian ingin. 🌸
>
> *"It's not about the destination, it's about who you walk with."*

---

*GDD ini dihasilkan berdasarkan analisis codebase aktual per 23 Maret 2026.*  
*Dokumen ini harus diperbarui setiap kali ada perubahan signifikan pada arsitektur atau fitur.*
