# 🧠 Procedural 3D Models

Model-model NPC dan objek 3D yang **dibangun secara prosedural** menggunakan Three.js geometry primitives (tanpa file eksternal GLB/GLTF).

> Untuk model import dari Blender/Sketchfab, lihat `public/models3d/`.

## File di Folder Ini

| File | Deskripsi |
|------|-----------|
| `CatModel.js` | Model kucing chibi (SphereGeo + Cone + Capsule), lengkap dengan state machine animasi (IDLE/WALK/SIT/PET/FLEE), sistem blink, dan heart particles |
| `RabbitModel.js` | Model kelinci chibi (SphereGeo + Capsule), state machine 9 state (IDLE/WALK/SNIFF/EAT/DRINK/GROOM/ALERT/FLEE/TAME), animasi hopping |
| `ButterflyModel.js` | Model kupu-kupu (ShapeGeometry sayap kustom), 5 varian warna, canvas texture procedural, animasi kepak wing dengan phase offset |

## Interface Standar

Setiap model mengikuti interface yang sama:

```js
const model = createXxxModel(scene);
// Returns:
{
  root: THREE.Group,    // Group utama, tambahkan ke scene/gameGroup
  update: fn(delta, time)  // Panggil di setiap frame
}
```

## Menambah Model Baru

1. Buat file `NamaModel.js` di folder ini
2. Export fungsi `createNamaModel(scene)`
3. Return `{ root, update }`
4. Import di `WorldBuilder.js` dan spawn di `buildFauna()`
5. Daftarkan ke `NPCManager` jika butuh AI behaviour
