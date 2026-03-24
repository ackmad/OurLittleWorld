# 🎵 Music / Background Audio

Simpan semua file musik latar di sini.

## Format yang Didukung
- `.mp3` — Direkomendasikan (kompatibilitas luas)
- `.ogg` — Alternatif (ukuran lebih kecil)
- `.wav` — Uncompressed (kualitas tinggi)

## Konvensi Penamaan
```
bgm_main.mp3        — Musik utama (looping)
bgm_night.mp3       — Musik malam hari
bgm_rain.mp3        — Musik saat hujan
bgm_indoor.mp3      — Musik di dalam rumah
bgm_memory.mp3      — Musik saat buka Memory Book
```

## Cara Pakai di main.js
```js
const bgm = new Audio('/audio/music/bgm_main.mp3');
bgm.loop = true;
bgm.volume = 0.5;
bgm.play();
```
