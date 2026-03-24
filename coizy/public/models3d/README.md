# 🗿 3D Models Import (GLB / GLTF)

Simpan file model 3D yang **diimport dari tools eksternal** (Blender, Sketchfab, dll) di sini.

> Catatan: Model yang **dibangun secara prosedural** di Three.js ada di `src/models/`.

## Format yang Didukung
- `.glb` — **Direkomendasikan** (binary, semua dalam 1 file: geo + material + anim)
- `.gltf` + `.bin` + gambar — Format terpisah, lebih mudah diedit
- `.fbx` — Perlu konversi ke GLB dulu via Blender

## Struktur Subfolder (Rekomendasi)
```
models3d/
├── characters/
│   ├── elfan_avatar.glb
│   └── savira_avatar.glb
├── furniture/
│   ├── sofa.glb
│   ├── table.glb
│   └── bookshelf.glb
├── environment/
│   ├── well.glb
│   ├── barrel.glb
│   └── signpost.glb
└── props/
    ├── axe.glb
    └── telescope.glb
```

## Cara Pakai
```js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const loader = new GLTFLoader();
// Opsional: Draco compression untuk file lebih kecil
const draco = new DRACOLoader();
draco.setDecoderPath('/draco/');
loader.setDRACOLoader(draco);

loader.load('/models3d/furniture/sofa.glb', (gltf) => {
  const model = gltf.scene;
  model.position.set(0, 2.2, 0);
  scene.add(model);
});
```
