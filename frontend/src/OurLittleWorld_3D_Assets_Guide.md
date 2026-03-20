# 🌍 Our Little World — 3D Assets Documentation
**Game Engine:** Three.js | **Format:** GLB (GLTF Binary) | **Scale:** 1 unit = 1 meter  
**Total Assets:** 47 GLB files | **Total Size:** ~2.2 MB  
**Style:** Low Poly Stylized | **Shading:** Flat  

---

> **Untuk Game Developer:**  
> Semua file siap digunakan langsung di Three.js menggunakan `GLTFLoader`.  
> Setiap file sudah di-unwrap UV, di-bake texture atlas, dan sudah include **animasi embedded** (AnimationClip).  
> Scale sudah 1:1 — karakter 1.65m bisa masuk pintu rumah cottage yang ~2.5m tinggi.

---

## 📋 Daftar File & Struktur Folder

```
models/
├── characters/          ← Karakter pemain (perlu Mixamo rig untuk animasi lengkap)
│   ├── Elfan_Game.glb
│   └── Savira_Game.glb
│
├── npc/                 ← NPC & makhluk hidup (animasi embedded)
│   ├── cat.glb
│   ├── butterfly_a.glb
│   ├── butterfly_b.glb
│   ├── butterfly_c.glb
│   ├── butterfly_d.glb
│   ├── bee.glb
│   ├── bird.glb
│   ├── rabbit.glb
│   └── firefly.glb
│
├── environment/         ← Environment & bangunan
│   ├── island_terrain.glb
│   ├── cottage_exterior.glb
│   ├── tree_large.glb
│   ├── tree_small.glb
│   ├── flower_round.glb
│   ├── flower_daisy.glb
│   ├── flower_tulip.glb
│   ├── pond.glb
│   ├── pond_water.glb
│   ├── dock.glb
│   ├── boat.glb
│   └── campfire.glb
│
├── furniture/           ← Furnitur interior
│   ├── sofa.glb
│   ├── fireplace.glb
│   ├── bookshelf.glb
│   ├── bed.glb
│   ├── memory_jar.glb
│   ├── record_player.glb
│   ├── mirror.glb
│   ├── kitchen_table.glb
│   ├── kitchen_chair.glb
│   ├── plant_succulent.glb
│   ├── plant_medium.glb
│   ├── plant_tall.glb
│   ├── photo_frames.glb
│   ├── balcony_chair.glb
│   ├── balcony_table.glb
│   ├── carpet.glb
│   ├── house_sign.glb
│   └── fence_pots.glb
│
└── props/               ← Props & efek visual
    ├── fish.glb
    ├── garden_lamp.glb
    ├── picnic_blanket.glb
    ├── shooting_star.glb
    ├── fireworks.glb
    └── rain_effect.glb
```

---

## 🔧 Cara Load di Three.js

```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer } from 'three';

const loader = new GLTFLoader();

// Load model dengan animasi
loader.load('models/npc/cat.glb', (gltf) => {
  const model = gltf.scene;
  scene.add(model);

  // Play animasi pertama (loop otomatis)
  const mixer = new AnimationMixer(model);
  const action = mixer.clipAction(gltf.animations[0]);
  action.play();

  // Update di render loop
  // mixer.update(delta);
});
```

---

## 👤 KATEGORI A — KARAKTER PEMAIN

### A1 · `Elfan_Game.glb`
| Property | Value |
|---|---|
| **Ukuran** | 1.00W × 0.27D × 1.64H meter |
| **Polygon** | 230 (Body: 200, Hair: 30) |
| **File Size** | 36 KB |
| **Animasi** | ❌ Perlu di-rig via Mixamo (upload FBX) |
| **Origin** | Tengah telapak kaki (0, 0, 0) |
| **Sub-Meshes** | `Elfan_Body` (kulit, hoodie biru, celana, sepatu) · `Elfan_Hair` (rambut hitam block low-poly) |

**Deskripsi:**  
Karakter utama Elfan — humanoid low-poly chibi ringan, tinggi 1.64m, proporsi sedikit kepala lebih besar dari realistis. Hoodie biru muda, celana abu-gelap, sneakers hitam, rambut hitam pendek.

**Untuk Developer:**
- Upload `Elfan_TPose_Mixamo.fbx` ke [mixamo.com](https://mixamo.com) untuk auto-rig
- Download animasi: `Idle`, `Walk`, `Run`, `Jump`, `Sit`, `Wave`, `Dance`, `Head Shake`
- Re-export sebagai GLB dengan animasi embedded
- Di Three.js: `mixer.clipAction(animations['Idle']).play()`

```javascript
// Nama di atas kepala
const nameLabel = createTextSprite('Elfan');
nameLabel.position.set(0, 1.9, 0); // 0.3m di atas kepala
elfanModel.add(nameLabel);
```

---

### A2 · `Savira_Game.glb`
| Property | Value |
|---|---|
| **Ukuran** | 0.96W × 0.26D × 1.60H meter |
| **Polygon** | 278 (Body: 236, Hair: 42) |
| **File Size** | 43 KB |
| **Animasi** | ❌ Perlu di-rig via Mixamo (upload FBX) |
| **Origin** | Tengah telapak kaki (0, 0, 0) |
| **Sub-Meshes** | `Savira_Body` (kulit, dress pink, cardigan krem, sepatu coklat) · `Savira_Hair` (rambut coklat panjang sebahu) |

**Deskripsi:**  
Karakter utama Savira — sedikit lebih pendek dari Elfan (1.60m). Dress pink lembut dengan cardigan krem, sepatu flat coklat. Rambut coklat panjang sebahu. Mata sedikit lebih besar dari Elfan, ekspresi ramah-ceria.

**Untuk Developer:**
- Sama seperti Elfan — upload `Savira_TPose_Mixamo.fbx` ke Mixamo
- Animasi Dance harus sinkron dengan Elfan (gunakan animasi yang sama)
- Scale sedikit berbeda dari Elfan — perlu disesuaikan agar proporsional di scene bersamaan

---

## 🐾 KATEGORI B — NPC & MAKHLUK HIDUP

### B1 · `cat.glb`
| Property | Value |
|---|---|
| **Ukuran** | 0.12W × 0.10D × 0.19H meter (posisi duduk) |
| **Polygon** | 394 (Body: 358, Tail: 36) |
| **File Size** | 194 KB |
| **Animasi** | ✅ `cat_idle_sit` — 72 frame loop (3 detik) |
| **Bones** | 5 bones: `spine`, `head`, `tail_1`, `tail_2`, `tail_3` |
| **Origin** | Tengah badan bawah (lantai) |
| **Warna** | Calico — putih dengan patch oranye & coklat |

**Deskripsi:**  
Kucing NPC utama bergaya low-poly cute. Posisi idle: duduk tegak. Mata kuning-hijau ekspresif, hidung pink segitiga, 3 kumis tiap sisi.

**Animasi Detail:**
- `cat_idle_sit`: ekor sweep kiri-kanan sinusoidal (amplitudo makin besar ke ujung ekor), kepala noleh kiri-kanan tiap ~2 detik. Loop seamless.

**Untuk Developer:**
```javascript
// Jadwal harian kucing (sesuai GDD Section 6.2)
const catSchedule = {
  '06:00-10:00': 'walk',        // aktif, berlarian
  '10:00-15:00': 'sleep',       // tidur di karpet
  '15:00-19:00': 'sit_window',  // duduk di jendela
  '19:00-23:00': 'cat_idle_sit',// duduk di balkon
  '23:00-06:00': 'sleep',       // tidur di sofa
};

// Deteksi proximity pemain
const distanceToPlayer = cat.position.distanceTo(player.position);
if (distanceToPlayer < 0.5) {
  playAnimation('happy');   // pemain pelan → kucing senang
} else if (distanceToPlayer < 1.5 && playerSpeed > 3) {
  playAnimation('scared');  // pemain lari → kucing lari
}
```

---

### B2 · `butterfly_a.glb` / `butterfly_b.glb` / `butterfly_c.glb` / `butterfly_d.glb`
| Property | Value |
|---|---|
| **Ukuran** | 0.09W × 0.03D × 0.17H meter |
| **Polygon** | 68 per kupu-kupu |
| **File Size** | 85 KB per file |
| **Animasi** | ✅ `BF_X_fly` — 9 frame loop (flutter cepat) |
| **Bones** | 3 bones: `body`, `wing_L`, `wing_R` |
| **Origin** | Tengah badan |

**Varian Warna:**
| File | Warna Utama | Pola |
|---|---|---|
| `butterfly_a.glb` | Kuning `#F2C800` | Oranye |
| `butterfly_b.glb` | Biru muda `#73B8F2` | Putih |
| `butterfly_c.glb` | Oranye `#E66A14` | Hitam |
| `butterfly_d.glb` | Pink `#F28DB5` | Putih |

**Animasi Detail:**  
Wing flutter (sayap naik-turun cepat, ±40°), body oscillate naik-turun pelan (±0.008m). Cycle 9 frame sangat cepat menyerupai flutter kupu-kupu asli.

**Untuk Developer:**
```javascript
// Jalur terbang random halus menggunakan CatmullRomCurve3
import { CatmullRomCurve3, Vector3 } from 'three';

const flightPath = new CatmullRomCurve3([
  new Vector3(randomX(), 0.5 + Math.random(), randomZ()),
  // ... generate 5-8 waypoint random di area taman
]);
// Update posisi setiap frame + play animasi fly
// Kupu-kupu hinggap di bahu jika pemain diam > 5 detik
```

---

### B3 · `bee.glb`
| Property | Value |
|---|---|
| **Ukuran** | 0.11W × 0.14D × 0.09H meter |
| **Polygon** | 134 |
| **File Size** | 100 KB |
| **Animasi** | ✅ `bee_hover` — 72 frame loop (3 detik) |
| **Bones** | 3 bones: `body`, `wing_L`, `wing_R` |
| **Origin** | Tengah badan |
| **Warna** | Kuning-hitam striped (3 stripe kuning, 2 hitam) |

**Animasi Detail:**  
Sayap flutter super cepat (cycle 5 frame), body oscillate Z ±0.005m naik-turun, body wobble rotasi Z ±5° secara sinusoidal. Kesan: terbang melayang di tempat, bergetar menggemaskan.

**Untuk Developer:**
```javascript
// Lebah tidak menyengat — hanya dekorasi hidup
// Spawn di sekitar bunga dan pohon
// Hover path: Perlin noise untuk gerakan organik
import { createNoise3D } from 'simplex-noise';
const noise = createNoise3D();
// bee.position.x += noise(t, 0, 0) * 0.01;
// bee.position.z += noise(0, t, 0) * 0.01;
```

---

### B4 · `bird.glb`
| Property | Value |
|---|---|
| **Ukuran** | ~0.2m (burung kecil seperti pipit) |
| **Polygon** | 266 (Body: 254, Wing L: 6, Wing R: 6) |
| **File Size** | 149 KB |
| **Animasi** | ✅ `bird_perch_idle` — 60 frame loop |
| **Bones** | 6 bones: `body`, `head`, `wing_L`, `wing_R`, `leg_L`, `leg_R` |
| **Sub-Meshes** | `Bird_Body_Mesh`, `Bird_WingMesh_L`, `Bird_WingMesh_R` |
| **Warna** | Biru cerah Robin-style, paruh & kaki oranye |

**Animasi Detail:**
- `bird_perch_idle`: kepala noleh kiri-kanan (±15°) tiap 2-3 detik, badan naik-turun ±0.004m (efek bernapas). Loop 60 frame.

**Untuk Developer:**
```javascript
// Burung muncul jam 06:00, pergi jam 17:30
// Hinggap di pagar, dahan pohon, dan windowsill
// Terbang pergi saat pemain mendekat < 2m
const birdSpawnTime = { start: 6, end: 17.5 }; // jam real-time

// Saat pemain terlalu dekat:
if (dist < 2.0 && playerApproachingFast) {
  playAnimation('takeoff'); // one-shot, lalu despawn
}
```

---

### B5 · `rabbit.glb`
| Property | Value |
|---|---|
| **Ukuran** | 0.12W × 0.17D × 0.27H meter (duduk) |
| **Polygon** | 417 |
| **File Size** | 189 KB |
| **Animasi** | ✅ `rabbit_idle_sit` — 72 frame loop (3 detik) |
| **Bones** | 7 bones: `spine`, `head`, `ear_L`, `ear_R`, `tail`, `front_L`, `front_R` |
| **Warna** | Putih krem dengan perut lebih terang, mata biru muda |

**Animasi Detail:**
- `rabbit_idle_sit`: telinga twitch asimetris (L dan R bergerak di frame berbeda, ±8-10°), ekor wiggle sinusoidal (±12°). Sangat menggemaskan.

**Untuk Developer:**
```javascript
// Kelinci ada di halaman belakang (sesuai GDD Section 3.1)
// Bisa didekati pelan-pelan
const approachSpeed = player.velocity.length();
if (approachSpeed < 1.0 && dist < 1.5) {
  playAnimation('pet');         // pemain pelan → kelinci diam
} else if (approachSpeed > 2.5 && dist < 3.0) {
  playAnimation('scared_run');  // pemain cepat → kelinci lari
}
```

---

### B6 · `firefly.glb`
| Property | Value |
|---|---|
| **Ukuran** | 0.06 × 0.06 × 0.05 meter per instance |
| **Polygon** | 41 per kunang-kunang (3 instance dalam file) |
| **File Size** | 32 KB |
| **Animasi** | ✅ `FF_0X_float` — 72 frame loop, phase berbeda tiap instance |
| **Material** | Emissive kuning-hijau `#CCFF66` |
| **Instances** | 3 kunang dalam satu file (`Firefly_00`, `Firefly_01`, `Firefly_02`) |

**Animasi Detail:**  
Posisi oscillate sinusoidal (X: ±0.018m, Z: ±0.015m), rotasi Y pelan, scale pulse (±0.25) untuk efek glow flicker. Setiap instance punya fase berbeda agar tidak bergerak serentak.

**Untuk Developer:**
```javascript
// Muncul jam 19:00, hilang jam 06:00 (sesuai GDD Section 3.2)
const currentHour = new Date().getHours();
if (currentHour >= 19 || currentHour < 6) {
  spawnFireflies(); // spawn 8-15 instance
}

// Tambah PointLight sebagai child tiap kunang
const ffLight = new THREE.PointLight(0xFFFFAA, 0.5, 0.4);
fireflyMesh.add(ffLight);
// Flicker: ffLight.intensity = 0.2 + Math.random() * 0.8 setiap 300-800ms
```

---

## 🏝️ KATEGORI C — ENVIRONMENT & PULAU

### C1 · `island_terrain.glb`
| Property | Value |
|---|---|
| **Ukuran** | 17.12W × 11.59D × 7.80H meter |
| **Polygon** | 497 (terrain + 8 rock formations) |
| **File Size** | 101 KB |
| **Animasi** | ❌ Static mesh |
| **Origin** | Center bawah pulau (0, 0, 0) |
| **Sub-Meshes** | `Island_Terrain` (terrain + batu bawah) |

**Deskripsi:**  
Floating island berbentuk oval memanjang. Permukaan atas memiliki variasi ketinggian (bukit kecil). Tepi terpotong tajam ke bawah dengan 3 layer extrude. 8 batu blocky menggantung di bawah.

**Zone Layout (dari kiri ke kanan):**
| Material | Warna | Area |
|---|---|---|
| `Grass` | `#7CB87A` hijau | Area rumput utama |
| `Path` | `#A0785A` coklat | Jalan setapak |
| `Cliff` | `#8B5E3C` | Tebing samping |
| `Pond` | `#5B9BB5` | Cekungan kolam |
| `Rock` | `#707070` | Batu bawah pulau |
| `RockDark` | `#484840` | Batu gelap + moss |

**Untuk Developer:**
```javascript
// Island di-load sekali, tidak bergerak
// Untuk musim: ganti material Grass via shader
const seasonColors = {
  spring: 0x8FD44A,   // hijau cerah
  summer: 0x5A8C3E,   // hijau tua
  autumn: 0xD4812A,   // oranye-merah
  winter: 0xE8EEF0,   // putih abu
};
// grassMaterial.color.setHex(seasonColors[currentSeason]);
```

---

### C1b · `pond_water.glb`
| Property | Value |
|---|---|
| **Ukuran** | 4.40W × 3.74D × 0.00H meter (flat plane) |
| **Polygon** | 12 |
| **File Size** | 1 KB |
| **Animasi** | ❌ Static (ripple via shader) |
| **Material** | Transparan 72%, emissive `#4DBECC` |

**Untuk Developer:**
```javascript
// Ganti material dengan shader air Three.js
// Efek ripple, refraction, dan refleksi bulan via ShaderMaterial
waterMesh.material = new THREE.MeshStandardMaterial({
  color: 0x4DBECC,
  transparent: true,
  opacity: 0.72,
  roughness: 0.05,
  metalness: 0.2,
});
// Bayangan bulan di air: environment map reflection
```

---

### C2 · `cottage_exterior.glb`
| Property | Value |
|---|---|
| **Ukuran** | 6.96W × 9.93D × 7.26H meter |
| **Polygon** | 506 (Main: 362, Windows: 144) |
| **File Size** | 78 KB |
| **Animasi** | ❌ Static (pintu/jendela via Three.js rotation) |
| **Sub-Meshes** | `Cottage_Main` (struktur utama) · `Cottage_Windows` (kaca jendela) |

**Deskripsi:**  
Rumah cottage 2 lantai bergaya jadul-estetik. Dinding sage green `#8FAF8A`, atap terracotta `#C4714A`, balkon lantai 2, cerobong double, lampu entrance emissive, 8 jendela dengan kaca & shutter kayu.

**⚠️ Penting untuk Developer — Karakter Bisa Masuk:**
- Tinggi pintu: **~2.5m** → karakter Elfan (1.64m) dan Savira (1.60m) **BISA MASUK** ✅
- Lebar pintu: **~1.0m** → cukup untuk satu karakter
- Tinggi lantai ke plafon: **~2.7m** (lantai 1), **~2.4m** (lantai 2)

**Warna Material:**
| Element | Hex | Material Name |
|---|---|---|
| Dinding | `#8FAF8A` | `Wall` |
| Atap | `#C4714A` | `Roof` |
| Kayu (pintu, jendela) | `#8B6145` | `Wood` |
| Batu (teras, fondasi) | `#C0B8A8` | `Stone` |
| Trim/lisplang | `#F5F0E8` | `Trim` |
| Lampu entrance | `#FFE580` emissive | `LampGlow` |

**Untuk Developer:**
```javascript
// Interior cottage = scene terpisah, di-load saat karakter mendekati pintu
player.on('nearDoor', () => {
  transitionToInterior('living_room');
});

// Animasi pintu (tidak di Blender, handled Three.js)
const door = cottage.getObjectByName('Door_Panel');
door.rotation.y = MathUtils.lerp(door.rotation.y, targetAngle, 0.1);

// Lampu entrance aktif malam hari
const hour = new Date().getHours();
lampGlow.visible = (hour >= 18 || hour < 6);
```

---

### C3a · `tree_large.glb`
| Property | Value |
|---|---|
| **Ukuran** | 3.18W × 2.78D × 5.73H meter |
| **Polygon** | 288 |
| **File Size** | 39 KB |
| **Animasi** | ✅ `tree_wind_sway` — 120 frame loop (5 detik) |
| **Bones** | 6 bones: `trunk`, `canopy_C`, `canopy_L`, `canopy_R`, `canopy_F`, `canopy_B` |
| **Warna** | Batang `#5C3D1E` · Daun 3 tone: `#5A8C3E`, `#4A7A2E`, `#6AAB50` |

**Animasi Detail:**  
Trunk sway pelan (±2.5° X, ±1.5° Y), setiap canopy section bergerak independen dengan amplitudo berbeda dan fase offset. Efek: pohon terkena angin sepoi-sepoi, organik dan alami.

**Untuk Developer:**
```javascript
// Intensitas angin bisa dikontrol dari sistem cuaca
const windIntensity = weatherSystem.getWindSpeed(); // 0.0 - 1.0
mixer.timeScale = 0.5 + windIntensity * 1.5; // slow saat tenang, cepat saat angin kencang
```

---

### C3b · `tree_small.glb`
| Property | Value |
|---|---|
| **Ukuran** | 1.83W × 1.41D × 3.50H meter |
| **Polygon** | 115 |
| **File Size** | 18 KB |
| **Animasi** | ✅ `tree_small_wind` — 96 frame loop (4 detik) |
| **Bones** | 4 bones: `trunk`, `canopy_C`, `canopy_L`, `canopy_R` |

---

### C4a · `flower_round.glb` · `flower_daisy.glb` · `flower_tulip.glb`
| Property | Flower Round | Flower Daisy | Flower Tulip |
|---|---|---|---|
| **Ukuran** | 0.32W × 0.46H | 0.33W × 0.39H | 0.27W × 0.59H |
| **Polygon** | 94 | 71 | 49 |
| **File Size** | 16 KB | 13 KB | 8 KB |
| **Animasi** | ✅ `flower_round_sway` | ✅ `flower_daisy_sway` | ✅ `flower_tulip_sway` |
| **Style** | Peony/Rose, 2 layer petal | Daisy, 9 petal memanjang | Tulip, 5 kelopak oval |

**Animasi Detail:**  
Gentle sway (batang condong ±3° X, ±2° Y) dengan fase offset berbeda per bunga. Loop 96 frame = 4 detik.

**Warna Tersedia (material swap):**
- `Flower_Round`: Pink `#F4A0C0` / Ungu `#C9A0DC`
- `Flower_Daisy`: Putih / Kuning pucat
- `Flower_Tulip`: Merah muda `#FF6B8A` / Oranye `#FF8C42`

---

### C5 · `pond.glb`
| Property | Value |
|---|---|
| **Ukuran** | 5.38W × 3.95D × 0.63H meter |
| **Polygon** | 116 (tepi batu + dinding + dasar pasir) |
| **File Size** | 19 KB |
| **Animasi** | ❌ Static (efek air via `pond_water.glb` + shader) |

**Sub-komponen:**
- **Tepi batu**: 12 batu oval melingkar, warna abu-abu `#9B9B9B`
- **Dinding dalam**: abu gelap + moss hijau `#6B8C5A`
- **Dasar pasir**: krem-coklat `#C4A882`
- **Air**: gunakan `pond_water.glb` terpisah, material ID sendiri untuk shader replacement

**Untuk Developer:**
```javascript
// Ikan berenang di kolam — dikontrol Three.js path
// Interaksi lempar makanan
pond.addEventListener('click', () => {
  throwFood(pond.center); // spawn ripple particle
  // Ikan navigate ke titik jatuh makanan
  fish.forEach(f => f.setTarget(foodDropPosition));
});
```

---

### C6 · `dock.glb`
| Property | Value |
|---|---|
| **Ukuran** | 2.18W × 3.49D × 2.55H meter (termasuk tiang ke bawah) |
| **Polygon** | 241 |
| **File Size** | 39 KB |
| **Animasi** | ❌ Static |

**Komponen:** 9 papan kayu, 8 tiang vertikal, railing kiri-kanan, lampu taman di ujung (emissive `#FFE580`), 2 anak tangga.

---

### C6b · `boat.glb`
| Property | Value |
|---|---|
| **Ukuran** | 1.27W × 2.68D × 1.80H meter |
| **Polygon** | 85 |
| **File Size** | 16 KB |
| **Animasi** | ✅ `boat_bob` — 72 frame loop (3 detik) |

**Animasi Detail:**  
Posisi Z oscillate ±0.022m (naik-turun), rotasi X ±1.0° dan Y ±0.8° (roll & pitch kecil). Efek: perahu goyang di air.

```javascript
// Pemain bisa duduk di perahu — trigger animasi Sit
// Perahu mengikuti gerakan air (boat_bob)
const sitPosition = boat.getObjectByName('Boat_Bench_F').getWorldPosition();
player.sitAt(sitPosition);
```

---

### C7 · `campfire.glb`
| Property | Value |
|---|---|
| **Ukuran** | 0.96W × 0.84D × 0.85H meter |
| **Polygon** | 222 (cincin batu + kayu + bara) |
| **File Size** | 31 KB |
| **Animasi** | ✅ `campfire_flicker` — 48 frame loop (2 detik) |

**Animasi Detail:**  
Scale bergetar kecil secara random (±0.04 XY, ±0.08 Z). Efek: bara api bergoyang-goyang.

**Komponen:**
- `CampStone`: 10 batu oval melingkar, abu-abu gelap `#555555`
- `LogWood`: 4 batang silinder kayu coklat `#5C3D1E`, ujung hitam terbakar
- `Ember`: flat plane emissive oranye-merah `#FF6B2B` — basis particle api Three.js

**Untuk Developer:**
```javascript
// Api = Three.js particle system di atas bara emissive
const fireLight = new THREE.PointLight(0xFF8C42, 1.5, 3.0);
campfire.add(fireLight);
// Toggle on/off
campfire.getObjectByName('Ember').material.emissiveIntensity = isLit ? 1.0 : 0.0;
fireLight.visible = isLit;
```

---

## 🛋️ KATEGORI D — FURNITUR & INTERIOR

> **Catatan:** Semua furnitur adalah static mesh — tidak ada rigging. Polygon budget ketat karena banyak objek dalam satu scene interior.

### D1 · `sofa.glb`
| Property | Value |
|---|---|
| **Ukuran** | 2.44W × 0.96D × 0.97H meter |
| **Polygon** | 70 |
| **File Size** | 14 KB |
| **Warna** | Sage green `#B5CEAC` · Kaki kayu `#8B6145` · Bantal: Pink, Kuning, Sage |

**Deskripsi:** Sofa 3-seater empuk, sandaran sedikit miring ke belakang, 4 kaki silinder kayu pendek, 3 bantal dekoratif warna-warni.

---

### D2 · `fireplace.glb`
| Property | Value |
|---|---|
| **Ukuran** | 1.68W × 0.63D × 1.93H meter |
| **Polygon** | 92 |
| **File Size** | 18 KB |
| **Sub-Meshes** | Frame batu, mantel kayu, interior gelap, ember emissive, lilin, 2 bingkai foto mini |

**Deskripsi:** Perapian ruang tamu. Frame batu warm gray `#9B8B7B`, mantel kayu `#8B6145`. Bara api (ember) emissive oranye — ini basis untuk particle api Three.js.

**Untuk Developer:**
```javascript
// Perapian menyala otomatis saat malam
const isNight = hour >= 19 || hour < 6;
ember.material.emissiveIntensity = isNight ? 1.0 : 0.0;
// Toggle via interaksi [E]
```

---

### D3 · `bookshelf.glb`
| Property | Value |
|---|---|
| **Ukuran** | 1.18W × 0.30D × 2.06H meter |
| **Polygon** | 180 |
| **File Size** | 31 KB |
| **Sub-Meshes** | Frame rak (kayu gelap `#6B4423`) + 19 buku warna-warni di 3 rak |

**Deskripsi:** Rak buku tinggi 5 rak, penuh buku warna-warni (merah, biru, hijau, ungu, kuning, oranye, krem) dengan ketebalan dan tinggi bervariasi.

**Untuk Developer:**
```javascript
// Setiap buku bisa di-click (raycast)
// Beberapa buku berisi pesan rahasia dari Elfan untuk Savira (GDD Section 4.4)
book.onClick = () => {
  if (book.hasSecretMessage) {
    openBookUI(book.messageContent);
  } else {
    // Animasi buku keluar dari rak: book.position.z -= 0.1
  }
};
```

---

### D4 · `bed.glb`
| Property | Value |
|---|---|
| **Ukuran** | 2.72W × 1.89D × 1.25H meter (termasuk nightstand & lampu) |
| **Polygon** | 145 |
| **File Size** | 28 KB |
| **Sub-Meshes** | Rangka kayu, kasur, selimut quilt, 3 bantal, nightstand, lampu tidur (emissive) |

**Deskripsi:** Tempat tidur double, headboard dengan slat detail, selimut quilt pastel, 3 bantal (putih, pink, sage). Nightstand dengan lampu tidur emissive kuning hangat.

**Untuk Developer:**
```javascript
// Lampu tidur menyala otomatis malam (GDD Section 4.3)
const nightLamp = bed.getObjectByName('BD_LampGlow');
nightLamp.material.emissiveIntensity = isNight ? 1.0 : 0.0;
```

---

### D5 · `memory_jar.glb`
| Property | Value |
|---|---|
| **Ukuran** | 0.19W × 0.20D × 0.54H meter |
| **Polygon** | 81 |
| **File Size** | 17 KB |
| **Animasi** | ✅ `memoryjar_pulse` — 96 frame loop (scale pulse ±3%) |
| **Material** | Kaca semi-transparan 42%, glow emissive kuning `#FFF0AA` |

**Deskripsi:** Toples kaca Memory Jar. Di dalam: 3 kertas gulung kecil krem, label kertas di badan. Interior emissive kuning hangat (simbol kenangan).

**Untuk Developer:**
```javascript
// Memory Jar (GDD Section 4.4 & 7.3)
// Click → buka UI "buku terbuka" berisi daftar memories
memoryJar.onClick = () => {
  const memories = await server.getMemories(roomId);
  openMemoryUI(memories); // UI bergaya diary/buku
};
// Format memory: "Elfan & Savira melihat shooting star, 13 Maret 2026, 22:14"

// Glow pulse saat malam
if (isNight) {
  mixer.clipAction(animations['memoryjar_pulse']).play();
}
```

---

### D6 · `record_player.glb`
| Property | Value |
|---|---|
| **Ukuran** | 0.50W × 0.40D × 0.27H meter |
| **Polygon** | 86 |
| **File Size** | 18 KB |
| **Animasi** | ✅ `recordplayer_spin` — 48 frame loop (1 rotasi penuh, linear) |

**Deskripsi:** Record player vintage. Base kayu, turntable hitam, tonearm silver, 2 knob depan. Vinyl hitam dengan label merah "Our Little World OST".

**Untuk Developer:**
```javascript
// Putar musik saat di perpustakaan (GDD Section 4.4)
// Tonearm berputar saat playing
const spinAnim = mixer.clipAction(animations['recordplayer_spin']);
audioSystem.onRoomEnter('library', () => {
  spinAnim.play();
  audioSystem.play('ambient_taylor_swift_instrumental');
});
```

---

### D7 · `mirror.glb`
| Property | Value |
|---|---|
| **Ukuran** | 0.62W × 0.20D × 1.31H meter |
| **Polygon** | 38 |
| **File Size** | 8 KB |
| **Material** | Frame kayu `#8B6145` · Permukaan: metalness 0.95, roughness 0.02 |

**Untuk Developer:**
```javascript
// Easter egg: karakter melambai saat berdiri di depan cermin (GDD Section 7.2)
const distToMirror = player.position.distanceTo(mirror.position);
if (distToMirror < 1.0) {
  playAnimation(player, 'Wave'); // one-shot
  // Tampilkan sprite/image karakter terbalik di mirror surface
}
```

---

### D8 · `kitchen_table.glb` + `kitchen_chair.glb`
| Property | Table | Chair |
|---|---|---|
| **Ukuran** | 1.86W × 0.86D × 0.81H | 0.46W × 0.48D × 1.13H |
| **Polygon** | 42 | 60 per kursi |
| **File Size** | 8 KB | 20 KB (2 kursi) |
| **Warna** | Kayu hangat `#A07850` | Kayu + dudukan krem |

---

### D9 · `plant_succulent.glb` · `plant_medium.glb` · `plant_tall.glb`
| Property | Succulent | Medium | Tall |
|---|---|---|---|
| **Ukuran** | 0.18W × 0.30H | 0.36W × 0.74H | 0.45W × 1.07H |
| **Polygon** | 71 | 49 | 47 |
| **File Size** | 12 KB | 10 KB | 9 KB |
| **Style** | Kaktus/rosette, pot terra cotta | Monstera/fern, pot putih | Tall corner plant, pot sage |

**Untuk Developer:**
```javascript
// Angin via vertex shader Three.js (tidak di Blender untuk hemat polygon)
// Atau: slight position oscillation
plant.onUpdate = (delta) => {
  plant.rotation.x = Math.sin(Date.now() * 0.001) * 0.02; // gentle sway
};
```

---

### D10 · `photo_frames.glb`
| Property | Value |
|---|---|
| **Ukuran** | Total set: 1.10W × 0.04D × 0.50H meter |
| **Polygon** | 36 |
| **File Size** | 8 KB |
| **Varian** | Small (0.20×0.25m) · Medium (0.30×0.35m) · Large (0.40×0.50m) |
| **Warna** | Kayu natural / Putih krem / Hitam vintage |

**Untuk Developer:**
```javascript
// Photo wall: foto asli Elfan & Savira (GDD Section 7.3)
// Interior plane tiap frame = Canvas texture
frames.forEach(frame => {
  const photoURL = await getUserPhoto(frame.id);
  const texture = new THREE.TextureLoader().load(photoURL);
  frame.getObjectByName(`${frame.id}_Inner`).material.map = texture;
});
```

---

### D11 · `balcony_chair.glb` + `balcony_table.glb`
| Property | Chair (×2) | Table |
|---|---|---|
| **Ukuran** | 0.48W × 0.49D × 1.07H | 0.60W × 0.60D × 0.62H |
| **Polygon** | 66 per kursi | 39 |
| **File Size** | 23 KB (2 kursi) | 7 KB |
| **Style** | Garden chair, cushion pink | Bistro round table, 3 kaki |

**Untuk Developer:**
```javascript
// Pemain bisa duduk di kursi balkon berdua (GDD Section 4.5 & 7.1)
// View terbaik untuk melihat sunset, bintang, shooting star
chair.sitPoint = chair.position.clone().add(new THREE.Vector3(0, 0.5, 0));
if (bothPlayersSitting && bothPlayersQuiet > 10000) { // 10 detik
  triggerStargazing(); // special animation / effect
}
```

---

### D12 · `carpet.glb`
| Property | Value |
|---|---|
| **Ukuran** | 3.10W × 2.10D × 0.03H meter |
| **Polygon** | 18 |
| **File Size** | 5 KB |
| **Warna** | Base quilt pastel, border pink, pattern sage green |

---

### D13 · `house_sign.glb`
| Property | Value |
|---|---|
| **Ukuran** | 0.80W × 0.11D × 0.72H meter |
| **Polygon** | 36 |
| **File Size** | 8 KB |

**Untuk Developer:**
```javascript
// Tulisan bisa dikustomisasi (GDD Section 7.3)
// Area tengah = Canvas texture untuk dynamic text
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
ctx.font = '48px Nunito';
ctx.fillText(customText || 'Our Little World', 10, 50);
const signTexture = new THREE.CanvasTexture(canvas);
sign.getObjectByName('SN_Text').material.map = signTexture;
```

---

### D14 · `fence_pots.glb`
| Property | Value |
|---|---|
| **Ukuran** | 2.02W × 0.24D × 0.96H meter |
| **Polygon** | 86 |
| **File Size** | 17 KB |
| **Komponen** | 5 papan pagar + 2 tiang + 2 pot bunga (sage & putih) + bunga pink & kuning |

---

## ✨ KATEGORI E — PROPS & EFEK VISUAL

### E1 · `fish.glb`
| Property | Value |
|---|---|
| **Ukuran** | 0.20W × 0.31D × 0.14H meter per ikan |
| **Polygon** | 171 per ikan (4 ikan dalam file) |
| **File Size** | 90 KB |
| **Animasi** | ✅ `Fish_X_swim` — 24 frame loop (1 detik), fase berbeda tiap ikan |
| **Bones** | 2 bones per ikan: `body`, `tail` |
| **Instances** | `Fish_A` (oranye), `Fish_B` (merah-putih), `Fish_C` (kuning), `Fish_D` (biru-hijau) |

**Animasi Detail:**  
Ekor sweep kiri-kanan sinusoidal ±22°, linear interpolation untuk gerak smooth. Setiap ikan punya fase offset berbeda (0, 0.25, 0.5, 0.75) agar tidak bergerak serentak.

**Untuk Developer:**
```javascript
// Posisi ikan dikontrol Three.js path (tidak dari animasi Blender)
// Hanya tail sweep yang di-Blender
fish.swimPath = new THREE.CatmullRomCurve3(pondWaypoints, true);
fish.swimSpeed = 0.3 + Math.random() * 0.2; // m/s

// Interaksi lempar makanan (GDD Section 7.1)
onFoodThrow = (pos) => {
  fish.forEach(f => f.setTarget(pos, { excited: true }));
  // Spawn ripple particle di pos
};
```

---

### E2 · `garden_lamp.glb`
| Property | Value |
|---|---|
| **Ukuran** | 0.15W × 0.15D × 0.76H meter |
| **Polygon** | 64 per lampu (2 lampu dalam file) |
| **File Size** | 25 KB |
| **Material** | Tiang besi gelap `#333333` · Kaca emissive kuning `#FFE580` opacity 70% |

**Untuk Developer:**
```javascript
// Aktif jam 17:30+ (GDD Section E2)
lamp.setActive = (active) => {
  lamp.getObjectByName('LanternGlass').material.emissiveIntensity = active ? 1.8 : 0;
  
  // Tambah PointLight sebagai child
  if (active && !lamp.pointLight) {
    lamp.pointLight = new THREE.PointLight(0xFFD580, 0.5, 2.0);
    lamp.pointLight.position.set(0, 0.6, 0);
    lamp.add(lamp.pointLight);
  }
  if (lamp.pointLight) lamp.pointLight.visible = active;
};
```

---

### E3 · `picnic_blanket.glb`
| Property | Value |
|---|---|
| **Ukuran** | 2.02W × 2.00D × 0.34H meter (termasuk aksesori) |
| **Polygon** | 174 |
| **File Size** | 29 KB |
| **Komponen** | Selimut plaid merah-putih, keranjang piknik, 2 cangkir teh, 2 bunga sudut |

**Untuk Developer:**
```javascript
// Aktivitas piknik berdua (GDD Section 7.1)
// Kedua pemain berdiri dekat & [E] → duduk di selimut
blanket.sitTrigger.onBothPlayers = () => {
  elfan.playAnimation('Sit');
  savira.playAnimation('Sit');
  // Posisikan karakter di atas selimut
};
```

---

### E4 · `shooting_star.glb`
| Property | Value |
|---|---|
| **Ukuran** | 1.09W × 0.48D × 0.68H meter |
| **Polygon** | 78 |
| **File Size** | 14 KB |
| **Material** | Kepala: emissive putih-biru intensity 4.0 · Trail: emissive transparan 55% |

**Untuk Developer:**
```javascript
// Shooting star tiap 3-5 menit saat malam (GDD Section 5.1)
// Spawn di atas, meluncur diagonal, scale ke 0 saat hilang
setInterval(() => {
  if (isNight()) spawnShootingStar();
}, (3 + Math.random() * 2) * 60000); // 3-5 menit

function spawnShootingStar() {
  const star = shootingStarModel.clone();
  star.position.set(randomX(), 15, randomZ()); // spawn tinggi
  // Animate: move diagonal + scale to 0
  gsap.to(star.position, { x: '-=8', y: '-=6', duration: 3, ease: 'power1.in' });
  gsap.to(star.scale, { x: 0, y: 0, z: 0, delay: 2, duration: 1 });
}
```

---

### E5 · `fireworks.glb`
| Property | Value |
|---|---|
| **Ukuran** | 0.35W × 0.35D × 0.28H meter per burst |
| **Polygon** | 312 per warna (5 warna dalam file) |
| **File Size** | 210 KB |
| **Animasi** | ✅ Scale burst: muncul 0→1.2→1.0→0 tiap ~20-30 frame |
| **Instances** | `Firework_R`, `Firework_G`, `Firework_B`, `Firework_Y`, `Firework_W` |

**Untuk Developer:**
```javascript
// Kembang api tepat jam 00:00 (GDD Section 7.2 Easter Eggs)
if (hour === 0 && minute === 0) {
  launchFireworks(5, 10); // 5-10 burst random
}

// Spawn di langit tinggi dengan random positions
function launchFireworks(count, duration) {
  for (let i = 0; i < count; i++) {
    const fw = getRandomFirework(); // R/G/B/Y/W
    fw.position.set(randomX(-10, 10), 8 + Math.random() * 4, randomZ(-10, 10));
    setTimeout(() => {
      mixer.clipAction(fw.animations[0]).play(); // burst animation
    }, i * 400 + Math.random() * 800);
  }
}
```

---

### E6 · `rain_effect.glb`
| Property | Value |
|---|---|
| **File Size** | 59 KB |
| **Animasi** | ✅ `rain_fall` (drops jatuh, linear) + `splash_expand` (rings expand) |
| **Sub-Meshes** | `Rain_Drops` (12 tetesan, layer jatuh) · `Rain_Splash_Effect` (4 splash ring + genangan) |

**Untuk Developer:**
```javascript
// Hujan ringan (GDD Section 5.2)
weatherSystem.onWeatherChange = (type) => {
  if (type === 'rain') {
    rainModel.visible = true;
    mixer.clipAction(animations['rain_fall']).play();
    mixer.clipAction(animations['splash_expand']).play();
    audioSystem.play('rain_ambient');
    
    // Karakter basah jika di luar > 10 detik
    if (playerOutdoors && outdoorDuration > 10) {
      player.setWet(true);
      // Trigger animasi Head Shake setelah masuk indoor
    }
  }
};
```

---

## 📁 Daftar Lengkap Nama File untuk Dipindahkan

Copy perintah ini di **Terminal** Mac kamu untuk memindahkan semua file ke Desktop:

```bash
# Buat struktur folder
mkdir -p ~/Desktop/OurLittleWorld/models/{characters,npc,environment,furniture,props}
mkdir -p ~/Desktop/OurLittleWorld/source

# Source folder temp
SRC="/var/folders/1m/q82fzh9d4kg3gyt1dy66l9dr0000gn/T"

# ── KARAKTER ──
cp "$SRC/Elfan_Game.glb"   ~/Desktop/OurLittleWorld/models/characters/
cp "$SRC/Savira_Game.glb"  ~/Desktop/OurLittleWorld/models/characters/

# ── NPC & MAKHLUK ──
cp "$SRC/cat.glb"          ~/Desktop/OurLittleWorld/models/npc/
cp "$SRC/butterfly_a.glb"  ~/Desktop/OurLittleWorld/models/npc/
cp "$SRC/butterfly_b.glb"  ~/Desktop/OurLittleWorld/models/npc/
cp "$SRC/butterfly_c.glb"  ~/Desktop/OurLittleWorld/models/npc/
cp "$SRC/butterfly_d.glb"  ~/Desktop/OurLittleWorld/models/npc/
cp "$SRC/bee.glb"          ~/Desktop/OurLittleWorld/models/npc/
cp "$SRC/bird.glb"         ~/Desktop/OurLittleWorld/models/npc/
cp "$SRC/rabbit.glb"       ~/Desktop/OurLittleWorld/models/npc/
cp "$SRC/firefly.glb"      ~/Desktop/OurLittleWorld/models/npc/

# ── ENVIRONMENT ──
cp "$SRC/island_terrain.glb"    ~/Desktop/OurLittleWorld/models/environment/
cp "$SRC/pond_water.glb"        ~/Desktop/OurLittleWorld/models/environment/
cp "$SRC/cottage_exterior.glb"  ~/Desktop/OurLittleWorld/models/environment/
cp "$SRC/tree_large.glb"        ~/Desktop/OurLittleWorld/models/environment/
cp "$SRC/tree_small.glb"        ~/Desktop/OurLittleWorld/models/environment/
cp "$SRC/flower_round.glb"      ~/Desktop/OurLittleWorld/models/environment/
cp "$SRC/flower_daisy.glb"      ~/Desktop/OurLittleWorld/models/environment/
cp "$SRC/flower_tulip.glb"      ~/Desktop/OurLittleWorld/models/environment/
cp "$SRC/pond.glb"              ~/Desktop/OurLittleWorld/models/environment/
cp "$SRC/dock.glb"              ~/Desktop/OurLittleWorld/models/environment/
cp "$SRC/boat.glb"              ~/Desktop/OurLittleWorld/models/environment/
cp "$SRC/campfire.glb"          ~/Desktop/OurLittleWorld/models/environment/

# ── FURNITUR ──
cp "$SRC/sofa.glb"           ~/Desktop/OurLittleWorld/models/furniture/
cp "$SRC/fireplace.glb"      ~/Desktop/OurLittleWorld/models/furniture/
cp "$SRC/bookshelf.glb"      ~/Desktop/OurLittleWorld/models/furniture/
cp "$SRC/bed.glb"            ~/Desktop/OurLittleWorld/models/furniture/
cp "$SRC/memory_jar.glb"     ~/Desktop/OurLittleWorld/models/furniture/
cp "$SRC/record_player.glb"  ~/Desktop/OurLittleWorld/models/furniture/
cp "$SRC/mirror.glb"         ~/Desktop/OurLittleWorld/models/furniture/
cp "$SRC/kitchen_table.glb"  ~/Desktop/OurLittleWorld/models/furniture/
cp "$SRC/kitchen_chair.glb"  ~/Desktop/OurLittleWorld/models/furniture/
cp "$SRC/plant_succulent.glb"~/Desktop/OurLittleWorld/models/furniture/
cp "$SRC/plant_medium.glb"   ~/Desktop/OurLittleWorld/models/furniture/
cp "$SRC/plant_tall.glb"     ~/Desktop/OurLittleWorld/models/furniture/
cp "$SRC/photo_frames.glb"   ~/Desktop/OurLittleWorld/models/furniture/
cp "$SRC/balcony_chair.glb"  ~/Desktop/OurLittleWorld/models/furniture/
cp "$SRC/balcony_table.glb"  ~/Desktop/OurLittleWorld/models/furniture/
cp "$SRC/carpet.glb"         ~/Desktop/OurLittleWorld/models/furniture/
cp "$SRC/house_sign.glb"     ~/Desktop/OurLittleWorld/models/furniture/
cp "$SRC/fence_pots.glb"     ~/Desktop/OurLittleWorld/models/furniture/

# ── PROPS & EFEK ──
cp "$SRC/fish.glb"           ~/Desktop/OurLittleWorld/models/props/
cp "$SRC/garden_lamp.glb"    ~/Desktop/OurLittleWorld/models/props/
cp "$SRC/picnic_blanket.glb" ~/Desktop/OurLittleWorld/models/props/
cp "$SRC/shooting_star.glb"  ~/Desktop/OurLittleWorld/models/props/
cp "$SRC/fireworks.glb"      ~/Desktop/OurLittleWorld/models/props/
cp "$SRC/rain_effect.glb"    ~/Desktop/OurLittleWorld/models/props/

# ── SOURCE BLEND FILES ──
cp "$SRC/Elfan_OurLittleWorld.blend"         ~/Desktop/OurLittleWorld/source/
cp "$SRC/Savira_OurLittleWorld.blend"        ~/Desktop/OurLittleWorld/source/
cp "$SRC/Cat_OurLittleWorld.blend"           ~/Desktop/OurLittleWorld/source/
cp "$SRC/Creatures_B2_B6_OurLittleWorld.blend" ~/Desktop/OurLittleWorld/source/
cp "$SRC/Island_OurLittleWorld.blend"        ~/Desktop/OurLittleWorld/source/
cp "$SRC/Cottage_OurLittleWorld.blend"       ~/Desktop/OurLittleWorld/source/
cp "$SRC/Environment_C3_C7.blend"            ~/Desktop/OurLittleWorld/source/
cp "$SRC/Furniture_D_OurLittleWorld.blend"   ~/Desktop/OurLittleWorld/source/
cp "$SRC/Props_E_OurLittleWorld.blend"       ~/Desktop/OurLittleWorld/source/

echo "✅ Semua file berhasil dipindahkan ke ~/Desktop/OurLittleWorld/"
```

---

## 📊 Summary Sheet

| Kategori | Jumlah File | Total Size | Animasi |
|---|---|---|---|
| A — Karakter | 2 | 79 KB | ❌ (via Mixamo) |
| B — NPC & Makhluk | 9 | 1,043 KB | ✅ semua ada animasi |
| C — Environment | 12 | 475 KB | ✅ pohon, bunga, perahu, api |
| D — Furnitur | 18 | 261 KB | ✅ memory jar, record player |
| E — Props & Efek | 6 | 427 KB | ✅ semua ada animasi |
| **TOTAL** | **47** | **~2.2 MB** | |

---

## ⚡ Quick Reference — Animasi Names

| Model | Action Name | Frame | Loop |
|---|---|---|---|
| Cat | `cat_idle_sit` | 72 (3s) | ✅ |
| Butterfly A-D | `BF_A_fly` ~ `BF_D_fly` | 9 (0.38s) | ✅ |
| Bee | `bee_hover` | 72 (3s) | ✅ |
| Bird | `bird_perch_idle` | 60 (2.5s) | ✅ |
| Rabbit | `rabbit_idle_sit` | 72 (3s) | ✅ |
| Firefly | `FF_00_float` ~ `FF_02_float` | 72 (3s) | ✅ |
| Tree Large | `tree_wind_sway` | 120 (5s) | ✅ |
| Tree Small | `tree_small_wind` | 96 (4s) | ✅ |
| Flower × 3 | `flower_X_sway` | 96 (4s) | ✅ |
| Boat | `boat_bob` | 72 (3s) | ✅ |
| Campfire | `campfire_flicker` | 48 (2s) | ✅ |
| Memory Jar | `memoryjar_pulse` | 96 (4s) | ✅ |
| Record Player | `recordplayer_spin` | 48 (2s) | ✅ |
| Fish A-D | `Fish_X_swim` | 24 (1s) | ✅ |
| Shooting Star | (object animation) | 60 (2.5s) | ❌ one-shot |
| Fireworks | (scale burst) | 30 (1.25s) | ❌ one-shot |
| Rain Drops | `rain_fall` | 48 (2s) | ✅ |
| Rain Splash | `splash_expand` | 36 (1.5s) | ❌ one-shot |

---

## 🔗 Resources

- **Three.js GLTFLoader**: https://threejs.org/docs/#examples/en/loaders/GLTFLoader
- **Mixamo (Karakter Rig + Animasi)**: https://mixamo.com
- **Three.js AnimationMixer**: https://threejs.org/docs/#api/en/animation/AnimationMixer
- **gltf.report (Preview GLB)**: https://gltf.report

---

*Dokumentasi ini dibuat untuk game "Our Little World" — Elfan & Savira, 2026* 🌍  
*"Selalu hidup, selalu hangat."*