# Supabase Realtime Setup (2 Players)

Dokumen ini untuk menyiapkan multiplayer realtime 2 pemain pada frontend `coizy` tanpa backend terpisah.

## 1) Buat Project Supabase

- Buat project baru di Supabase.
- Buka `Project Settings -> API`.
- Salin:
  - `Project URL` -> `VITE_SUPABASE_URL`
  - `anon public key` -> `VITE_SUPABASE_ANON_KEY`

## 2) Set Environment Variable

Set di Vercel:

- `VITE_SUPABASE_URL=https://<project-ref>.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<anon-key>`
- `VITE_ENABLE_PAUSE_MENU=true`

Set di local (`coizy/.env`):

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_ENABLE_PAUSE_MENU=true
```

## 3) Aktifkan Realtime Channel Access

- Di Supabase Dashboard, buka `Database -> Replication / Realtime` dan pastikan realtime aktif.
- Pastikan anon client boleh mengakses Realtime channels (Broadcast + Presence) untuk channel publik.
- Jika project Anda memakai policy ketat, buat policy yang mengizinkan role `anon` subscribe dan broadcast pada channel game.

## 4) Uji Lokal 2 Pemain

- Jalankan `cd coizy && npm run dev`.
- Buka 2 browser berbeda (atau normal + incognito).
- Login kedua pemain.
- Verifikasi:
  - pemain kedua muncul di scene pemain pertama,
  - gerakan sinkron realtime,
  - interaksi (`emote`, `door`, `flower`, dll) tersinkron,
  - saat salah satu tab ditutup, peer hilang otomatis.

## 5) Uji Production di Vercel

- Deploy ke Vercel.
- Pastikan Environment Variables sudah terisi di semua environment yang dipakai (Preview + Production).
- Ulang tes 2 browser seperti di lokal.
- Cek kasus room penuh (maksimal 2 pemain).
