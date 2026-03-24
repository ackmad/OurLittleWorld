# 🤖 Core Systems

Modul sistem inti game yang mengelola AI, physics, dan behaviour NPC.

## File di Folder Ini

| File | Deskripsi |
|------|-----------|
| `NPCManager.js` | Mengelola semua NPC (kucing, kelinci, kupu-kupu, burung) menggunakan sistem `SimpleVehicle` (steering behavior manual). Tidak bergantung library eksternal. |

## NPCManager

```js
const npcManager = new NPCManager(worldBuilderRef, playerGroup);

// Setup NPC (dipanggil dari WorldBuilder)
npcManager.setupCat(catMesh);
npcManager.setupRabbit(rabbitMesh);
npcManager.setupButterfly(butterflyMesh);

// Update setiap frame (dipanggil dari animate loop)
npcManager.update(delta);
```

## SimpleVehicle (Internal)

Sistem steering behavior ringan di dalam NPCManager:
- `wander(delta)` — Pergerakan mengembara acak
- `flee(target, panicDist)` — Lari menjauhi target
- `applyForce(force)` — Terapkan gaya dengan max speed clamp
- `update(delta, environment)` — Update posisi + obstacle avoidance
