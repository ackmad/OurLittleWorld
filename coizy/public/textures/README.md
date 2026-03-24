# 🖼️ Textures

Simpan semua file image texture untuk material 3D di sini.

## Format yang Didukung
- `.png` — Direkomendasikan (support alpha/transparency)
- `.jpg` / `.jpeg` — Untuk tekstur tanpa alpha (ukuran lebih kecil)
- `.webp` — Modern, ukuran kecil (support alpha)
- `.ktx2` — Format terkompresi GPU (performa terbaik)

## Struktur Subfolder (Rekomendasi)
```
textures/
├── terrain/
│   ├── grass_diffuse.png
│   ├── grass_normal.png
│   ├── sand_diffuse.png
│   └── rock_diffuse.png
├── house/
│   ├── wood_diffuse.png
│   ├── thatch_diffuse.png
│   └── stone_diffuse.png
├── ui/
│   ├── paper_bg.png
│   └── book_cover.png
└── misc/
    ├── noise.png
    └── gradient.png
```

## Cara Pakai di Three.js
```js
import * as THREE from 'three';
const loader = new THREE.TextureLoader();
const tex = loader.load('/textures/terrain/grass_diffuse.png');
tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
tex.repeat.set(4, 4);
const mat = new THREE.MeshStandardMaterial({ map: tex });
```
