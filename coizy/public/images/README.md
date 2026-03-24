# 🖼️ Images (UI, Icons & 2D)

Simpan semua gambar 2D untuk keperluan UI, ikon, dan elemen non-texture di sini.

## Isi Saat Ini
- `favicon.svg` — Ikon tab browser
- `icons.svg` — Sprite icon game

## Konvensi Penamaan
```
favicon.svg             — Browser tab icon (sudah ada)
icons.svg               — Icon sprite sheet (sudah ada)
logo.png                — Logo Coizy full
logo_white.svg          — Logo versi putih
ui_book_cover.png       — Cover buku kenangan
ui_frame_*.png          — Frame/border UI
bg_pattern.png          — Pola background (dot grid)
photo_placeholder.png   — Placeholder foto album
```

## Referensi di HTML
```html
<img src="/images/logo.png" alt="Coizy" />
<link rel="icon" href="/images/favicon.svg" />
```

## Referensi di CSS
```css
background-image: url('/images/bg_pattern.png');
```
