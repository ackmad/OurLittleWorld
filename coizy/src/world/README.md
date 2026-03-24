# 🌍 World Builders

Modul-modul yang bertanggung jawab membangun dan mengelola dunia 3D.

## File di Folder Ini

| File | Deskripsi |
|------|-----------|
| `WorldBuilder.js` | **Entry point** pembangunan dunia. Membangun terrain, ocean, pohon, batu, bunga, dermaga, dan memanggil `HouseBuilder` + spawn fauna |
| `HouseBuilder.js` | Membangun cottage secara detail: pondasi, dinding, atap 3-layer, pintu pivot, jendela, teras bertangga, cerobong, sistem asap animasi, 6+ lampu, ivy, physics colliders |

## Alur Kerja

```
WorldBuilder.build()
├── buildIsland()       → Terrain heightmap + physics trimesh
├── buildOcean()        → Ocean GLSL shader plane
├── buildOakTrees()     → 10 pohon oak (5-layer visual)
├── buildBirchTrees()   → 3 pohon birch
├── buildBushes()       → 15 semak
├── buildBoulders()     → (reserved)
├── buildScatteredRocks()  → 45 batu acak + physics
├── buildCliffRocks()   → 40 batu tebing
├── buildHouse()        → HouseBuilder.build()
├── buildFlowers()      → 30 bunga interaktable
├── buildLogPile()      → (reserved)
├── buildDock()         → 6 papan dermaga
└── buildFauna()        → Cat × 2, Rabbit × 3, Butterfly × 6
```

## Update Loop

```js
worldBuilder.update(time, delta);
// → Update ocean shader uniform
// → Update HouseBuilder (smoke particles, fireplace flicker)
```
