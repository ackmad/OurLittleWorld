# 🔊 Sound Effects (SFX)

Simpan semua sound effects pendek di sini.

## Format yang Didukung
- `.mp3` — Direkomendasikan
- `.ogg` — Alternatif web-friendly
- `.wav` — Untuk efek dengan presisi timing tinggi

## Konvensi Penamaan
```
sfx_footstep_grass.mp3      — Langkah di rumput
sfx_footstep_wood.mp3       — Langkah di kayu/teras
sfx_footstep_sand.mp3       — Langkah di pasir
sfx_water_splash.mp3        — Percikan air (lempar batu)
sfx_door_open.mp3           — Pintu dibuka
sfx_door_close.mp3          — Pintu ditutup
sfx_cat_meow.mp3            — Suara kucing
sfx_cat_purr.mp3            — Kucing dimanjakan
sfx_rabbit_squeak.mp3       — Suara kelinci
sfx_butterfly_flutter.mp3   — Kepak kupu-kupu
sfx_flower_pick.mp3         — Petik bunga
sfx_stone_throw.mp3         — Lempar batu
sfx_ui_click.mp3            — Klik tombol UI
sfx_notification.mp3        — Toast notification
sfx_memory_save.mp3         — Simpan kenangan
sfx_jump.mp3                — Lompat
sfx_land.mp3                — Mendarat
```

## Cara Pakai
```js
function playSFX(name, volume = 0.6) {
  const s = new Audio(`/audio/sfx/${name}`);
  s.volume = volume;
  s.play();
}
playSFX('sfx_footstep_grass.mp3');
```
