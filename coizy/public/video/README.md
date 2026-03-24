# 🎬 Video

Simpan semua file video di sini.

## Format yang Didukung
- `.mp4` (H.264) — **Direkomendasikan** (kompatibilitas browser luas)
- `.webm` (VP9/AV1) — Web-optimized, ukuran lebih kecil
- `.mov` — macOS native (perlu konversi untuk web)

## Konvensi Penamaan
```
intro_cutscene.mp4      — Video intro game
memory_playback.mp4     — Video kenangan
tutorial_walk.mp4       — Video tutorial berjalan
```

## Cara Pakai sebagai VideoTexture (Three.js)
```js
// Untuk video texture pada objek 3D (misal: TV, layar)
const video = document.createElement('video');
video.src = '/video/memory_playback.mp4';
video.loop = true;
video.muted = true;
video.playsInline = true;
await video.play();

const videoTexture = new THREE.VideoTexture(video);
const mat = new THREE.MeshBasicMaterial({ map: videoTexture });
```

## Cara Pakai sebagai Overlay UI
```js
// Untuk cutscene / intro
const overlay = document.getElementById('video-overlay');
overlay.src = '/video/intro_cutscene.mp4';
overlay.play();
```
