import * as THREE from 'three';

// ============================================================
//  HouseBuilder.js — Coizy "Our Little World"
//  Vintage Cozy Cottage v3 — Proporsi Benar + Asap Animasi + Lighting
//
//  PERBAIKAN v3:
//  - Proporsi rumah diperbaiki (teras tidak seperti rumah panggung)
//  - Atap lebih curam dan organik dengan 3 layer jerami
//  - Cerobong TEGAK LURUS tidak miring
//  - Sistem asap animasi partikel yang benar (update() loop)
//  - 5+ lampu yang benar-benar menerangi rumah dari dalam dan luar
//  - Flicker animasi pada lampu perapian
//  - Semua posisi Y dikalibrasi ulang dari ground level = 0
// ============================================================

export class HouseBuilder {
    constructor(gameGroup, interactables, physicsWorld, RAPIER) {
        this.gameGroup    = gameGroup;
        this.interactables = interactables;
        this.physicsWorld = physicsWorld;
        this.RAPIER       = RAPIER;

        // Sistem smoke particles — diupdate tiap frame
        this.smokeParticles = [];
        this.smokeGroup     = null;

        // Referensi lampu untuk animasi
        this.fireplaceLight = null;
        this.porchLight     = null;

        this.C = {
            // Updated to Pastel Coizy Colors
            wallCream:   0xFDDBB4, wallCream2:  0xFFF0A8, // Peach & Butter
            beamDark:    0xFF9E6C, beamMed:     0xF8C840, beamLight: 0xF8D4E4, // Tangerine, Sunshine, Rose Mist
            thatchTop:   0xF8D4E4, thatchMid:   0xE878A8, thatchBot: 0xFF9E6C, // Rose mist, bubblegum, tangerine
            ridgeBeam:   0xA898E8, // Lilac
            stone:       0xDDD4F8, stoneDark:   0xA898E8, stoneMoss: 0xC8F0D8, // Lavender, Lilac, Mint
            brick:       0xFF9E6C, brickMortar: 0xFDDBB4, // Tangerine, Peach
            doorWood:    0xFDDBB4, doorDark:    0xFF9E6C, // Peach, Tangerine
            windowFrame: 0x7CC8A0, shutterGreen:0xC8F0D8, // Sage, Mint
            glass:       0xC2E4FB, // Baby Blue
            ivyDark:     0x7CC8A0, ivyLight:    0xC8F0D8, ivyFall:   0xFF9E6C, // Sage, Mint, Tangerine
            flowerPink:  0xE878A8, flowerWhite: 0xFFF0A8, flowerLav: 0xA898E8, // Bubblegum, Butter, Lilac
            potTerra:    0xFF9E6C, brass:       0xF8C840, ironDark:  0xA898E8, // Tangerine, Sunshine, Lilac
            porchWood:   0xFDDBB4, railWood:    0xFF9E6C, // Peach, Tangerine
        };
    }

    // ── Helpers ───────────────────────────────────────────────
    _mat(color, o = {}) {
        return new THREE.MeshStandardMaterial({
            color,
            roughness:   o.r   ?? 0.88,
            metalness:   o.m   ?? 0.0,
            flatShading: o.flat ?? false,
            transparent: o.t   ?? false,
            opacity:     o.op  ?? 1.0,
            side:        o.side ?? THREE.FrontSide,
            depthWrite:  o.dw  ?? true,
        });
    }

    _box(w, h, d, col, o = {}) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this._mat(col, o));
        mesh.castShadow    = o.sh ?? true;
        mesh.receiveShadow = o.sh ?? true;
        return mesh;
    }

    _cyl(rt, rb, h, seg, col, o = {}) {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), this._mat(col, o));
        mesh.castShadow    = o.sh ?? true;
        mesh.receiveShadow = o.sh ?? true;
        return mesh;
    }

    _sph(r, seg, col, o = {}) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), this._mat(col, o));
        mesh.castShadow    = o.sh ?? true;
        mesh.receiveShadow = o.sh ?? true;
        return mesh;
    }

    _p(mesh, x, y, z, rx=0, ry=0, rz=0) {
        mesh.position.set(x, y, z);
        if (rx) mesh.rotation.x = rx;
        if (ry) mesh.rotation.y = ry;
        if (rz) mesh.rotation.z = rz;
        return mesh;
    }

    _add(parent, mesh, x, y, z, rx=0, ry=0, rz=0) {
        parent.add(this._p(mesh, x, y, z, rx, ry, rz));
        return mesh;
    }

    // ─────────────────────────────────────────────────────────
    //  MAIN BUILD
    // ─────────────────────────────────────────────────────────
    build(posX, posY, posZ) {
        const root = new THREE.Group();
        root.position.set(posX, posY, posZ);
        root.name = 'HOUSE_Root';
        this.gameGroup.add(root);

        this._buildFoundation(root);
        this._buildWalls(root);
        this._buildRoof(root);
        this._buildDoor(root);
        this._buildWindows(root);
        this._buildPorch(root);
        this._buildChimney(root);
        this._buildSmokeSystem(root);
        this._buildLighting(root);
        this._buildIvy(root);
        this._buildWindowBoxes(root);
        this._buildDetails(root);
        this._setupPhysics(posX, posY, posZ);

        console.log('🏠 HouseBuilder v3: Rumah selesai!');
        return root;
    }

    // ─────────────────────────────────────────────────────────
    //  1. PONDASI
    // ─────────────────────────────────────────────────────────
    _buildFoundation(root) {
        const C = this.C;
        // Platform batu tinggi (High stone base)
        // Layer 1: Base block
        this._add(root, this._box(6.8, 1.1, 5.4, C.stone, { r: 0.95, flat: true }), 0, 0.55, 0);
        // Layer 2: Transition block
        this._add(root, this._box(6.4, 1.1, 5.0, C.stoneDark, { r: 0.9, flat: true }), 0, 1.65, 0);

        // Dekorasi batu di sekeliling pondasi
        const stPos = [
            [-3.2,0.5,-2.2], [-3.2,1.5,0.5], [3.2,0.5,2.2], [3.2,1.5,-1.5],
            [0,0.8,-2.6], [1.8,1.2,-2.6], [-1.8,0.4,2.6], [0.5,1.6,2.6]
        ];
        stPos.forEach(([x, y, z], i) => {
            const s = new THREE.Mesh(
                new THREE.IcosahedronGeometry(0.25 + (i%3)*0.08, 0),
                this._mat(i%2===0 ? C.stone : C.stoneMoss, { r: 0.95 })
            );
            s.castShadow = true;
            s.position.set(x, y, z);
            s.rotation.set(Math.random()*0.5, Math.random()*Math.PI, Math.random()*0.3);
            root.add(s);
        });
    }

    // ─────────────────────────────────────────────────────────
    //  2. DINDING
    // ─────────────────────────────────────────────────────────
    _buildWalls(root) {
        const C = this.C;
        const wBase = 2.2;  // ELEVASI RUMAH: 2.2 unit dari tanah
        const wH    = 4.2;   // Dinding dibuat lebih tinggi sedikit (4.2 vs 3.8)
        const wTop  = wBase + wH;
        this.wBase = wBase; // Simpan untuk helper lain

        // Dinding inti solid — DIKOREKSI (Centered door area)
        // House Width: 5.3 total (-2.65 to 2.65)
        // Door Opening: X from -0.7 to 0.7 (Width 1.4)
        this._add(root, this._box(1.95, wH, 0.2, C.wallCream), -1.675, wBase+wH/2, -2.42); // Left Wall
        this._add(root, this._box(1.95, wH, 0.2, C.wallCream),  1.675, wBase+wH/2, -2.42); // Right Wall
        // Menutup lubang di atas pintu dengan membuat dinding atas lebih tebal dan rendah
        this._add(root, this._box(1.4, 1.4, 0.2, C.wallCream),  0, wTop-0.7, -2.42);      // Top Wall (above door)

        this._add(root, this._box(5.3, wH, 0.2, C.wallCream2), 0, wBase+wH/2, 2.42);  // Back
        this._add(root, this._box(0.2, wH, 4.84, C.wallCream2),-2.65, wBase+wH/2, 0); // Left
        this._add(root, this._box(0.2, wH, 4.84, C.wallCream),  2.65, wBase+wH/2, 0); // Right

        // Horizontal planks
        const pH = 0.16, gap = 0.02;
        const nP = Math.floor(wH / (pH+gap));
        for (let i = 0; i < nP; i++) {
            const py  = wBase + i*(pH+gap) + pH/2;
            const col = i%3===0 ? C.beamLight : C.wallCream;
            const o   = { sh: false, r: 0.9 };

            if (py < wTop-1.4) {
                // Hanya kiri & kanan lubang pintu
                this._add(root, this._box(1.97, pH, 0.07, col, o), -1.675, py, -2.46);
                this._add(root, this._box(1.97, pH, 0.07, col, o),  1.675, py, -2.46);
            } else {
                // Full width di atas pintu (X from -2.65 to 2.65)
                this._add(root, this._box(5.3, pH, 0.07, col, o), 0, py, -2.46);
            }
            this._add(root, this._box(5.3, pH, 0.07, col, o), 0, py, 2.46);

            // Samping polos tanpa celah jendela untuk menghindari bug objek
            this._add(root, this._box(0.07, pH, 4.8, col, o), -2.66, py, 0);
            this._add(root, this._box(0.07, pH, 4.8, col, o),  2.66, py, 0);
        }

        // Corner beams
        [[-2.65,-2.42],[2.65,-2.42],[-2.65,2.42],[2.65,2.42]].forEach(([x,z]) => {
            this._add(root, this._box(0.24, wH+0.2, 0.24, C.beamDark), x, wBase+wH/2, z);
        });

        // Top trim
        this._add(root, this._box(5.3, 0.21, 0.24, C.beamDark), 0, wTop+0.1, -2.42);
        this._add(root, this._box(5.3, 0.21, 0.24, C.beamDark), 0, wTop+0.1, 2.42);
        this._add(root, this._box(0.24, 0.21, 4.88, C.beamDark),-2.65, wTop+0.1, 0);
        this._add(root, this._box(0.24, 0.21, 4.88, C.beamDark), 2.65, wTop+0.1, 0);
    }

    // ─────────────────────────────────────────────────────────
    //  3. ATAP — 3 layer jerami, lebih curam
    // ─────────────────────────────────────────────────────────
    _buildRoof(root) {
        const C = this.C;
        const wBase = this.wBase;
        const baseY = wBase + 4.2 - 0.2; // Mulai dari atas dinding
        const rW = 7.2, rD = 6.4, rH = 3.8;

        const mkShape = (w, h, sx=0) => {
            const s = new THREE.Shape();
            s.moveTo(-(w/2-sx), 0); s.lineTo(w/2-sx, 0); s.lineTo(0, h); s.closePath();
            return s;
        };

        // Layer 1 bottom
        const r1 = new THREE.Mesh(
            new THREE.ExtrudeGeometry(mkShape(rW, rH), { depth: rD, bevelEnabled: false }),
            this._mat(C.thatchBot, { r: 0.96, flat: true })
        );
        r1.castShadow = true;
        r1.position.set(0, baseY, -rD/2);
        root.add(r1);

        // Layer 2 mid
        const r2 = new THREE.Mesh(
            new THREE.ExtrudeGeometry(mkShape(rW-0.32, rH-0.08, 0.16), { depth: rD-0.28, bevelEnabled: false }),
            this._mat(C.thatchMid, { r: 0.92, flat: true })
        );
        r2.castShadow = true;
        // Posisi Y dinaikkan sedikit agar bidang bawahnya tidak tabrakan/z-fight dengan r1 (Plafon)
        r2.position.set(0, baseY + 0.03, -(rD/2-0.14));
        root.add(r2);

        // Layer 3 top
        const r3 = new THREE.Mesh(
            new THREE.ExtrudeGeometry(mkShape(rW-0.72, rH-0.22, 0.36), { depth: rD-0.58, bevelEnabled: false }),
            this._mat(C.thatchTop, { r: 0.88, flat: true })
        );
        r3.castShadow = true;
        // Posisi Y dinaikkan sedikit agar tidak z-fight dengan r2
        r3.position.set(0, baseY + 0.06, -(rD/2-0.29));
        root.add(r3);
        
        // Papan kayu solid untuk Plafon / Ceiling dari dalam rumah agar bersih & bebas lag
        this._add(root, this._box(5.0, 0.1, 4.6, C.beamLight), 0, baseY - 0.06, 0);

        // Ridge
        this._add(root, this._box(0.22, 0.22, rD+0.38, C.ridgeBeam), 0, baseY+rH+0.1, 0);

        // Gable ends
        const gGeo = new THREE.ExtrudeGeometry(mkShape(rW, rH), { depth: 0.2, bevelEnabled: false });
        [-(rD/2+0.08), rD/2-0.12].forEach(zg => {
            const gable = new THREE.Mesh(gGeo, this._mat(C.wallCream, { r: 0.85 }));
            gable.castShadow = true;
            gable.position.set(0, baseY, zg);
            root.add(gable);
            [-1,1].forEach(side => {
                const bLen = Math.hypot(rW/2, rH) + 0.1;
                const gtb = this._box(bLen, 0.12, 0.14, C.beamDark);
                gtb.position.set(side * rW/4, baseY + rH/2, zg + 0.1);
                gtb.rotation.z = side * -Math.atan2(rH, rW/2);
                root.add(gtb);
            });
        });

        // Overhang brackets
        [-2.2,-0.6,0.8,2.3].forEach(xb => {
            this._add(root, this._box(0.12,0.44,0.4, C.beamDark), xb, baseY+0.2, -rD/2+0.12);
            this._add(root, this._box(0.12,0.44,0.4, C.beamDark), xb, baseY+0.2,  rD/2-0.12);
        });
    }

    // ─────────────────────────────────────────────────────────
    //  4. PINTU
    // ─────────────────────────────────────────────────────────
    _buildDoor(root) {
        const C = this.C;
        const dBase = this.wBase;

        const pivot = new THREE.Group();
        pivot.position.set(-0.6, dBase, -2.43); // Adjusted for X=0 center door
        pivot.name = 'DOOR_PIVOT';
        root.add(pivot);
        this.doorPivot = pivot; // Simpan referensi untuk update physics

        const dH = 2.8; // Perbaiki tinggi pintu dari 2.6 jadi 2.8 untuk menutup lubang atas
        const doorThick = 0.1;
        const door = this._box(1.2, dH, doorThick, C.doorWood, { r: 0.82 });
        door.position.set(0.6, dH/2, 0); // Center of mesh at X=0
        door.name = 'DOOR_MAIN';
        door.userData = { type: 'door', label: '[E] Masuk ke Rumah' };
        pivot.add(door);
        this.interactables.push(door);

        // Panel & Dekorasi untuk KEDUA sisi pintu (depan & belakang)
        [1, -1].forEach(dir => {
            const zOff = dir * (doorThick / 2); // +/- 0.05
            
            // High panel and low panel 
            // Posisi panel ditekan sedikit ke dalam (0.015) dengan tebal 0.04 agar overlap sempurna dengan pintu
            [{ y:2.1, h:1.0 },{ y:0.8, h:1.1 }].forEach(({ y, h }) => {
                const pan = this._box(0.9, h, 0.04, C.beamMed, { sh: false });
                pan.position.set(0.6, y, zOff + dir*0.015); 
                pivot.add(pan);
            });
            
            // Inner decorative lighter panel for top
            // Ditekan agak keluar (0.035) agar tidak tabrakan dengan high panel
            const panI = this._box(0.75, 0.85, 0.02, C.beamLight, { sh: false });
            panI.position.set(0.6, 2.1, zOff + dir*0.035); 
            pivot.add(panI);

            // Brass knob (Dimajukan ke 0.045 agar menonjol cantik)
            const knob = this._sph(0.055, 10, C.brass, { r:0.12, m:0.9, sh:false });
            knob.position.set(1.05, 1.35, zOff + dir*0.045); 
            pivot.add(knob);
            
            // Engsel hitam tebal (overlap merasuk ke dalam kusen pintu)
            [0.45, 1.45, 2.45].forEach(yh => {
                const h = this._box(0.08, 0.16, 0.06, C.ironDark, { r:0.35, m:0.85, sh:false });
                h.position.set(0.04, yh, zOff + dir*0.02); 
                pivot.add(h);
            });
        });

        // Frame dinaikkan sedikit untuk menampung pintu yang lebih tinggi
        this._add(root, this._box(0.14, dH, 0.14, C.doorDark), -0.65, dBase + dH/2, -2.42);
        this._add(root, this._box(0.14, dH, 0.14, C.doorDark),  0.65, dBase + dH/2, -2.42);
        // Lintang atas frame pintu pas dengan pintu tinggi dH (2.8)
        this._add(root, this._box(1.44, 0.16, 0.14, C.doorDark), 0, dBase + dH + 0.08, -2.42);

        // Transom dihapus/digantikan pintu yang lebih tinggi agar lebih keren & tidak floating bolong

        // Threshold & mat
        this._add(root, this._box(1.4,0.07,0.22,C.beamDark), 0, dBase, -2.44);
        this._add(root, this._box(1.1,0.04,0.65,0x7A6040,{r:0.98}), 0, 0.72, -2.88);
    }

    // ─────────────────────────────────────────────────────────
    //  5. JENDELA
    // ─────────────────────────────────────────────────────────
    _buildWindows(root) {
        const yW = this.wBase + 2.1;
        [
            { x:-1.5,  y:yW, z:-2.44, d:'front', w:0.9,  h:1.2 },
            // Jendela samping dan belakang dihapus untuk fix bug objek menembus dinding
        ].forEach(w => this._oneWindow(root, w));
    }

    _oneWindow(root, { x, y, z, d, w, h }) {
        const C = this.C;
        const lr = d==='left'||d==='right';
        const gW = lr ? 0.06 : w, gD = lr ? w : 0.06;

        this._add(root, this._box(gW,h,gD, C.glass, { r:0.05, m:0.12, t:true, op:0.72, sh:false }), x, y, z);

        const fW = lr?0.13:w+0.22, fD = lr?w+0.22:0.13;
        this._add(root, this._box(fW,h+0.22,fD, C.windowFrame), x, y, z);

        // Glazing bars
        this._add(root, this._box(lr?0.07:w-0.04, 0.05, lr?w-0.04:0.07, C.windowFrame,{sh:false}), x,y,z);
        this._add(root, this._box(lr?0.07:0.05, h-0.04, lr?0.05:0.07, C.windowFrame,{sh:false}), x,y,z);

        // Sill
        const sW=lr?0.22:w+0.45, sD=lr?w+0.45:0.22;
        this._add(root, this._box(sW,0.1,sD, C.beamMed), x, y-h/2-0.06, z);

        // Shutters
        const shW=lr?0.06:w*0.56, shD=lr?w*0.56:0.06;
        [-1,1].forEach(side => {
            const oX = lr?0 : side*(w*0.56/2+w/2+0.07);
            const oZ = lr?side*(w*0.56/2+w/2+0.07):0;
            this._add(root, this._box(shW,h+0.12,shD, C.shutterGreen), x+oX, y, z+oZ);
            for (let li=0;li<5;li++) {
                const ly = y-h/2+(li+0.5)*(h/5);
                const lW=lr?0.07:w*0.5, lD=lr?w*0.5:0.07;
                this._add(root, this._box(lW,0.03,lD, C.ivyDark,{sh:false}), x+oX, ly, z+oZ);
            }
        });
    }

    // ─────────────────────────────────────────────────────────
    //  6. TERAS — Di atas tanah, bukan panggung
    //  Lantai teras hanya 0.06 unit di atas tanah
    // ─────────────────────────────────────────────────────────
    _buildPorch(root) {
        const C = this.C;
        const floorY = this.wBase;
        
        // --- 1. LANTAI TERAS ---
        // Papan teras dipendekkan kedalamannya (depth) dan digeser maju agar tidak menembus lantai dalam rumah
        this._add(root, this._box(9.4, 0.2, 4.7, C.porchWood), 0, floorY + 0.05, -4.77);

        // Papan lantai individual untuk tekstur (Rapat & Rapi)
        for (let xi=-4.5; xi<=4.5; xi+=0.35) {
            const col = (Math.abs(xi) % 0.7 < 0.3) ? C.porchWood : C.beamLight;
            this._add(root, this._box(0.32, 0.06, 4.65, col, { sh: false, r: 0.9 }), xi, floorY + 0.16, -4.75);
        }

        // Tiang teras dengan pondasi batu yang rapat
        const tH = 3.6;
        const pillarBaseY = floorY + 0.15;
        [[-4.4, -7.05], [4.4, -7.05], [-4.4, -2.35], [4.4, -2.35]].forEach(([px, pz]) => {
            // Foundation
            this._add(root, this._box(0.35, 0.2, 0.35, C.stone), px, floorY + 0.1, pz);
            // Main Pillar
            this._add(root, this._cyl(0.12, 0.14, tH, 8, C.beamDark), px, pillarBaseY + tH/2, pz);
            // Cap
            this._add(root, this._box(0.32, 0.15, 0.32, C.beamDark), px, pillarBaseY + tH + 0.07, pz);
        });

        // Balok horizontal di atas tiang
        const beamY = pillarBaseY + tH + 0.1;
        this._add(root, this._box(9.2, 0.2, 0.2, C.beamDark), 0, beamY, -7.05);
        this._add(root, this._box(0.2, 0.2, 4.9, C.beamDark), -4.4, beamY, -4.7);
        this._add(root, this._box(0.2, 0.2, 4.9, C.beamDark),  4.4, beamY, -4.7);

        // --- 2. TANGGA (DARI TANAH KE TERAS) ---
        const numSteps = 10;
        const stepWidth = 3.0;
        const stepDepth = 0.55;
        const stepRise = (floorY + 0.15) / numSteps;
        
        for (let i = 0; i < numSteps; i++) {
            // i=0 adalah anak tangga pertama yang nempel ke teras (Z=-7.2)
            const sy = (floorY + 0.15) - (i + 1) * stepRise;
            const sz = -7.45 - (i * stepDepth);
            this._add(root, this._box(stepWidth, 0.2, stepDepth + 0.05, C.porchWood), 0.1, sy, sz);
            
            // Pillar pendukung pagar tangga (Balusters)
            if (i < 8) { // Sampai bawah
                [-stepWidth/2 - 0.1, stepWidth/2 + 0.2].forEach(sx => {
                    this._add(root, this._box(0.1, 1.2, 0.1, C.railWood), sx, sy + 0.6, sz);
                });
            }
        }
        
        // --- 3. PEGAR (RAILING) TERAS & TANGGA ---
        // Handrail tangga (Dua batang landai presisi)
        const hTotalZ = numSteps * stepDepth;
        const hTotalY = numSteps * stepRise;
        const hRailLen = Math.hypot(hTotalZ, hTotalY) + 0.4;
        const hRailTilt = Math.atan2(hTotalY, hTotalZ);

        [-stepWidth/2 - 0.1, stepWidth/2 + 0.2].forEach(sx => {
            const hRail = this._box(0.12, 0.1, hRailLen, C.railWood, { r: 1.0 });
            hRail.rotation.x = -hRailTilt; // FIXED: Added negative sign to match stair downward slope
            // Posisi handrail agar menyambung mulus dengan pagar dan tiang
            this._add(root, hRail, sx, floorY + 0.05, -7.5 - hTotalZ / 2 + stepDepth / 2);
        });

        // Pagar teras sekeliling dengan sambungan rapi
        const railY = floorY + 1.1; 
        this._add(root, this._box(3.2, 0.12, 0.12, C.railWood), -3.05, railY, -7.2); // Depan Kiri
        this._add(root, this._box(3.2, 0.12, 0.12, C.railWood),  3.25, railY, -7.2); // Depan Kanan (Gap ditengah 3.1 unit untuk tangga)
        
        this._add(root, this._box(0.12, 0.12, 4.9, C.railWood), -4.6, railY, -4.75); // Samping Kiri
        this._add(root, this._box(0.12, 0.12, 4.9, C.railWood),  4.7, railY, -4.75); // Samping Kanan
        
        // Balusters (Pilar-pilar kecil pagar)
        for (let bx = -4.5; bx <= 4.6; bx += 0.45) {
            if (Math.abs(bx - 0.1) < 1.55) continue; // Gap bersih untuk pintu tangga
            this._add(root, this._box(0.06, 1.0, 0.06, C.beamLight, { sh: false }), bx, floorY + 0.55, -7.2);
        }
        // Balusters samping
        for (let bz = -2.5; bz >= -7.0; bz -= 0.5) {
            this._add(root, this._box(0.06, 1.0, 0.06, C.beamLight, { sh: false }), -4.6, floorY + 0.55, bz);
            this._add(root, this._box(0.06, 1.0, 0.06, C.beamLight, { sh: false }),  4.7, floorY + 0.55, bz);
        }

        // Pot bunga (Posisi yang tidak melayang)
        this._potFlower(root, -4.0, floorY + 0.15, -3.5, C.flowerPink);
        this._potFlower(root,  4.0, floorY + 0.15, -3.5, C.flowerLav);
        this._potFlower(root, -3.8, floorY + 0.15, -6.8, C.flowerWhite);
        this._potFlower(root,  3.8, floorY + 0.15, -6.8, C.flowerPink);
    }

    _potFlower(root, x, y, z, fc) {
        const C = this.C;
        this._add(root, this._cyl(0.18,0.22,0.4,10, C.potTerra), x, y+0.2, z);
        this._add(root, this._cyl(0.16,0.16,0.06,8, 0x5A3820,{sh:false}), x, y+0.39, z);
        this._add(root, this._cyl(0.018,0.022,0.32,5, C.ivyDark,{sh:false}), x, y+0.57, z);
        [[0,0.76,0],[0.1,0.73,0.1],[-0.1,0.74,-0.08]].forEach(([fx,fy,fz]) => {
            this._add(root, this._sph(0.09,7,fc,{sh:false}), x+fx, y+fy, z+fz);
        });
    }

    // ─────────────────────────────────────────────────────────
    //  7. CEROBONG — TEGAK LURUS, rotation = (0,0,0)
    // ─────────────────────────────────────────────────────────
    _buildChimney(root) {
        const C = this.C;
        const wBase = this.wBase;

        // Shaft bata — HARUS rotation (0,0,0), posisi fix
        const shaftH = 6.5;
        const shaft = this._box(0.82, shaftH, 0.82, C.brick, { r: 0.92, flat: true });
        // Cerobong center X:1.5, Z:1.2
        shaft.position.set(1.5, wBase + 3.0, 1.2);
        shaft.rotation.set(0, 0, 0); 
        root.add(shaft);

        // Mortar lines
        for (let ci=0; ci<16; ci++) {
            const m = this._box(0.84, 0.04, 0.84, C.brickMortar, { sh:false });
            m.position.set(1.5, wBase + 0.5 + ci*0.42, 1.2);
            root.add(m);
        }

        const topY = wBase + 6.2;
        // Sub-cap
        const sc = this._box(0.95,0.15,0.95, C.stoneDark);
        sc.position.set(1.5, topY, 1.2);
        root.add(sc);

        // Cap utama
        const cap = this._box(1.1,0.2,1.1, C.stone);
        cap.position.set(1.5, topY + 0.18, 1.2);
        root.add(cap);

        // Lubang
        const hole = this._cyl(0.2,0.2,0.2,8, 0x111111, { sh:false });
        hole.position.set(1.5, topY + 0.32, 1.2);
        root.add(hole);
    }

    // ─────────────────────────────────────────────────────────
    //  8. SISTEM ASAP — Partikel animasi nyata
    //  Setiap partikel: sphere yang naik, membesar, fade out
    // ─────────────────────────────────────────────────────────
    _buildSmokeSystem(root) {
        this.smokeGroup = new THREE.Group();
        const topY = this.wBase + 6.6;
        this.smokeGroup.position.set(1.5, topY, 1.2);
        root.add(this.smokeGroup);

        // Base material asap
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0xC0BCBA,
            transparent: true,
            opacity: 0.0,
            roughness: 1.0,
            metalness: 0.0,
            depthWrite: false,
            side: THREE.DoubleSide,
        });

        for (let i = 0; i < 14; i++) {
            const radius = 0.12 + Math.random() * 0.06;
            const geo = new THREE.SphereGeometry(radius, 7, 7);
            const mat = baseMat.clone();
            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow    = false;
            mesh.receiveShadow = false;
            mesh.renderOrder   = 999; // render di atas segalanya

            mesh.userData = {
                life:       0,
                maxLife:    2.8 + Math.random() * 2.0,
                speed:      0.28 + Math.random() * 0.22,
                driftX:     (Math.random() - 0.5) * 0.07,
                driftZ:     (Math.random() - 0.5) * 0.07,
                startScale: 0.45 + Math.random() * 0.35,
                delay:      i * 0.22, // stagger spawn
                idx:        i,
            };

            // Sembunyikan dulu sebelum aktif
            mesh.visible = false;
            mesh.position.set(
                (Math.random()-0.5)*0.08,
                0,
                (Math.random()-0.5)*0.08
            );

            this.smokeGroup.add(mesh);
            this.smokeParticles.push(mesh);
        }
        console.log(`💨 SMOKE: ${this.smokeParticles.length} partikel asap siap dianimasikan`);
    }

    // ─────────────────────────────────────────────────────────
    //  9. LIGHTING — 7 lampu total
    // ─────────────────────────────────────────────────────────
    _buildLighting(root) {
        const floorY = this.wBase;
        // 1. Key light — matahari buatan, menerangi fasad depan
        const key = new THREE.DirectionalLight(0xFFF8E8, 2.8);
        key.position.set(10, 18, -12); // Elevated
        key.target.position.set(0, floorY + 2, 0);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.near   = 0.5;
        key.shadow.camera.far    = 60;
        key.shadow.camera.left   = -15;
        key.shadow.camera.right  = 15;
        key.shadow.camera.top    = 15;
        key.shadow.camera.bottom = -15;
        key.shadow.bias = -0.001; // Fix Shadow Acne / Garis-garis lag
        root.add(key);
        root.add(key.target);

        // 2. Fill light dari kiri (sisi barat)
        const fill = new THREE.DirectionalLight(0xDDE8FF, 1.4);
        fill.position.set(-12, 10, 8);
        root.add(fill);

        // 4. Perapian dalam
        const fire = new THREE.PointLight(0xFF8822, 4.0, 16);
        fire.position.set(0, floorY + 1.2, 0.5);
        root.add(fire);
        this.fireplaceLight = fire;

        // 5. Lampu teras
        const porch = new THREE.PointLight(0xFFE080, 4.0, 12);
        porch.position.set(0.1, floorY + 3.1, -3.55);
        root.add(porch);
        this.porchLight = porch;

        // Visual lantern
        this._add(root, this._box(0.24, 0.4, 0.24, 0x2A2A2A,{r:0.4,m:0.8}), 0.1, floorY + 2.95, -3.62);
        this._add(root, this._box(0.16, 0.3, 0.16, 0xFFE888,{r:0.1,t:true,op:0.9,sh:false}), 0.1, floorY + 2.95, -3.62);

        // 6. Lampu interior ambient
        const intL = new THREE.PointLight(0xFFD0A0, 2.5, 14);
        intL.position.set(0, floorY + 2.8, 0);
        root.add(intL);
    }

    // ─────────────────────────────────────────────────────────
    //  10. IVY
    // ─────────────────────────────────────────────────────────
    _buildIvy(root) {
        const C = this.C;
        const b = this.wBase;
        const ip = [
            [-2.7, b+0.6, 0.5, 0.38], [-2.7, b+1.2, 0.9, 0.32], [-2.7, b+1.8, 0.4, 0.42],
            [-2.7, b+2.4, 0.7, 0.36], [-2.7, b+1.0, 1.4, 0.40],
            [-2.4, b+0.8, -2.5, 0.35], [-2.0, b+1.4, -2.5, 0.40]
        ];
        ip.forEach(([x,y,z,s],i) => {
            const col = i%5===0?C.ivyFall:(i%3===0?C.ivyLight:C.ivyDark);
            const leaf = this._box(s*1.2,s*0.04,s*1.0, col,{sh:false});
            leaf.position.set(x,y,z);
            leaf.rotation.set((Math.random()-0.5)*0.5, Math.random()*Math.PI,(Math.random()-0.5)*0.35);
            root.add(leaf);
        });
        for (let ii=0;ii<4;ii++) {
            const sh=0.7+ii*0.28;
            const st = this._cyl(0.013,0.018,sh,4, C.beamDark,{sh:false});
            st.position.set(-2.68, 0.9+sh/2+ii*0.12, 0.5+ii*0.28);
            st.rotation.z=(Math.random()-0.5)*0.28;
            root.add(st);
        }
        [[2.55,1.0,-2.4,0.28],[2.55,1.5,-2.3,0.25],[2.55,2.0,-2.2,0.3],[2.6,2.5,-2.0,0.22]].forEach(
            ([x,y,z,s]) => this._add(root, this._sph(s,6,C.flowerPink,{sh:false}), x,y,z)
        );
    }

    // ─────────────────────────────────────────────────────────
    //  11. WINDOW BOXES
    // ─────────────────────────────────────────────────────────
    _buildWindowBoxes(root) {
        const C = this.C;
        const b = this.wBase;
        [
            { x:-1.5,  y:b+1.52, z:-2.52, lr:false, fc:C.flowerWhite },
            // Planter box samping dan belakang dihapus mengikuti jendela
        ].forEach(({ x,y,z,lr,fc }) => {
            const bW=lr?0.15:1.1, bD=lr?1.1:0.15;
            this._add(root, this._box(bW,0.2,bD, C.beamDark), x,y,z);
            this._add(root, this._box(bW-0.04,0.07,bD-0.04, 0x5A3820,{sh:false}), x,y+0.1,z);
            const n=lr?4:5;
            for (let fi=0;fi<n;fi++) {
                const off=(fi/(n-1)-0.5)*(lr?0.72:0.78);
                const sH=0.14+Math.random()*0.1;
                const st=this._cyl(0.016,0.018,sH,4,C.ivyDark,{sh:false});
                st.position.set(x+(lr?0:off),y+0.16+sH/2,z+(lr?off:0));
                root.add(st);
                const fl=this._sph(0.07+Math.random()*0.025,6,fc,{sh:false});
                fl.position.set(x+(lr?0:off),y+0.16+sH+0.07,z+(lr?off:0));
                root.add(fl);
            }
        });
    }

    // ─────────────────────────────────────────────────────────
    //  12. DETAIL EKSTERIOR
    // ─────────────────────────────────────────────────────────
    _buildDetails(root) {
        const C = this.C;
        const b = this.wBase;

        // Sapu
        this._add(root, this._cyl(0.022, 0.022, 1.6, 5, C.beamMed), -2.4, b + 0.75, -3.08, 0, 0, 0.15);
        this._add(root, this._cyl(0.09, 0.18, 0.28, 8, C.thatchBot), -2.35, b + 0.1, -3.08, 0, 0, 0.15);

        // Tong kayu
        this._add(root, this._cyl(0.19, 0.22, 0.52, 10, C.beamDark), 3.0, b + 0.3, -3.08);

        // Crate
        this._add(root, this._box(0.45, 0.4, 0.45, C.beamLight), -3.0, b + 0.25, -3.8);

        // Batu jalan lebih banyak dan tertata ke arah tangga
        for (let pi = 0; pi < 10; pi++) {
            const ps = new THREE.Mesh(
                new THREE.IcosahedronGeometry(0.16 + pi * 0.02, 0),
                this._mat(pi % 2 === 0 ? C.stone : C.stoneDark, { r: 0.95 })
            );
            ps.castShadow = true;
            // Stone path starts AFTER the stairs (Z: -12.5 and beyond)
            ps.position.set((pi % 3 - 1.5) * 0.8, 0.04, -13.0 - Math.floor(pi / 3) * 1.5);
            ps.rotation.y = pi * 0.82;
            root.add(ps);
        }

        // Lampu jalan
        this._add(root, this._cyl(0.038, 0.038, 1.8, 6, C.ironDark, { r: 0.4, m: 0.8 }), 2.7, 0.9, -5.82);
        this._add(root, this._box(0.2, 0.2, 0.2, 0x2A2A2A, { r: 0.4, m: 0.8 }), 2.7, 1.9, -5.82);
        this._add(root, this._box(0.14, 0.14, 0.14, 0xFFE080, { r: 0.1, t: true, op: 0.9, sh: false }), 2.7, 1.9, -5.82);
        const ll = new THREE.PointLight(0xFFE080, 1.4, 5.5);
        ll.position.set(2.7, 1.95, -5.82); root.add(ll);
    }

    // ─────────────────────────────────────────────────────────
    //  13. PHYSICS
    // ─────────────────────────────────────────────────────────
    _setupPhysics(px, py, pz) {
        if (!this.physicsWorld || !this.RAPIER) return;
        const R = this.RAPIER;
        const b = 2.2;

        const mb = this.physicsWorld.createRigidBody(
            R.RigidBodyDesc.fixed().setTranslation(px, py+b+2.1, pz)
        );
        // Dinding Depan (DIKOREKSI kearah X=0 pintu)
        this.physicsWorld.createCollider(R.ColliderDesc.cuboid(0.975,2.1,0.12).setTranslation(-1.675,0,-2.42), mb);
        this.physicsWorld.createCollider(R.ColliderDesc.cuboid(0.975,2.1,0.12).setTranslation( 1.675,0,-2.42), mb);
        this.physicsWorld.createCollider(R.ColliderDesc.cuboid(0.7,0.6,0.12).setTranslation(0,1.5,-2.42), mb);
        
        // Dinding Lain
        this.physicsWorld.createCollider(R.ColliderDesc.cuboid(2.65,2.1,0.12).setTranslation(0,0,2.42),   mb);
        this.physicsWorld.createCollider(R.ColliderDesc.cuboid(0.12,2.1,2.42).setTranslation(-2.65,0,0),  mb);
        this.physicsWorld.createCollider(R.ColliderDesc.cuboid(0.12,2.1,2.42).setTranslation(2.65,0,0),   mb);

        // Lantai rumah
        const fBody = this.physicsWorld.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(px, py+b, pz));
        this.physicsWorld.createCollider(R.ColliderDesc.cuboid(3.4, 0.1, 2.7), fBody);

        // Pintu Utama Kinematic Physics (Agar tidak tembus saat ditutup dan bisa update rotasi saat dibuka)
        this.doorRB = this.physicsWorld.createRigidBody(
            R.RigidBodyDesc.kinematicPositionBased().setTranslation(px - 0.6, py + b, pz - 2.43)
        );
        this.physicsWorld.createCollider(R.ColliderDesc.cuboid(0.6, 1.3, 0.05).setTranslation(0.6, 1.3, 0), this.doorRB);

        // Lantai teras expanded
        const pb = this.physicsWorld.createRigidBody(
            R.RigidBodyDesc.fixed().setTranslation(px, py+b, pz-5.0)
        );
        this.physicsWorld.createCollider(R.ColliderDesc.cuboid(4.7,0.08,2.6), pb);

        // --- PHYSICS PAGAR & TERAS (Anti-tembus oleh player) ---
        const fenceBody = this.physicsWorld.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(px, py+b+0.6, pz));
        this.physicsWorld.createCollider(R.ColliderDesc.cuboid(0.1, 0.6, 2.5).setTranslation(-4.6, 0, -4.75), fenceBody); // Kiri
        this.physicsWorld.createCollider(R.ColliderDesc.cuboid(0.1, 0.6, 2.5).setTranslation( 4.7, 0, -4.75), fenceBody); // Kanan
        this.physicsWorld.createCollider(R.ColliderDesc.cuboid(1.5, 0.6, 0.1).setTranslation(-3.1, 0, -7.2), fenceBody);  // Depan Kiri
        this.physicsWorld.createCollider(R.ColliderDesc.cuboid(1.5, 0.6, 0.1).setTranslation( 3.2, 0, -7.2), fenceBody);  // Depan Kanan

        // Tangga (Wider 3.0)
        const numS = 10;
        for (let i = 0; i < numS; i++) {
            // Samakan dengan visual
            const sy = b - (i + 1) * (b/numS);
            const sz = -7.5 - (i * 0.5);
            const sb = this.physicsWorld.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(px, py+sy, pz+sz));
            this.physicsWorld.createCollider(R.ColliderDesc.cuboid(1.5, 0.1, 0.28), sb);
        }

        // --- WALL DI SAMPING TANGGA (Agar pemain tidak jatuh menyamping) ---
        const stairsWall = this.physicsWorld.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(px, py+b/2, pz-10.0));
        this.physicsWorld.createCollider(R.ColliderDesc.cuboid(0.1, 1.5, 2.8).setTranslation(-1.75, 0, 0), stairsWall);
        this.physicsWorld.createCollider(R.ColliderDesc.cuboid(0.1, 1.5, 2.8).setTranslation( 1.75, 0, 0), stairsWall);

        console.log('⚙️ PHYSICS: Collider rumah panggung v5 (Refined) selesai');
    }

    // ─────────────────────────────────────────────────────────
    //  UPDATE — Dipanggil dari WorldBuilder.update() tiap frame
    // ─────────────────────────────────────────────────────────
    update(delta, time) {
        this._tickSmoke(delta, time);
        this._tickLightFlicker(time);
        
        // Sync rotasi pintu dengan rigidbody-nya
        if (this.doorRB && this.doorPivot) {
            const rot = this.doorPivot.rotation;
            const q = new THREE.Quaternion().setFromEuler(rot);
            this.doorRB.setNextKinematicRotation(q);
        }
    }

    _tickSmoke(delta, time) {
        if (!this.smokeParticles.length) return;
        const t = time * 0.001; // konversi ke detik

        this.smokeParticles.forEach((p, idx) => {
            const d = p.userData;

            // Tunggu delay awal
            if (t < d.delay) return;

            d.life += delta;

            // Reset saat siklus selesai
            if (d.life >= d.maxLife) {
                d.life = 0;
                p.position.set(
                    (Math.random()-0.5)*0.1, 0, (Math.random()-0.5)*0.1
                );
                p.scale.setScalar(d.startScale);
                p.material.opacity = 0;
                p.visible = true;
                d.driftX = (Math.random()-0.5)*0.07;
                d.driftZ = (Math.random()-0.5)*0.07;
                d.speed  = 0.26 + Math.random()*0.22;
                d.maxLife= 2.6 + Math.random()*2.2;
                return;
            }

            p.visible = true;
            const prog = d.life / d.maxLife; // 0..1

            // Gerak naik + drift + wobble
            p.position.y += d.speed * delta;
            p.position.x += d.driftX * delta + Math.sin(t*1.8 + idx*1.5)*0.005;
            p.position.z += d.driftZ * delta + Math.cos(t*1.4 + idx*1.2)*0.004;

            // Scale membesar (asap mengembang)
            const sc = d.startScale + prog * 2.2;
            p.scale.setScalar(sc);

            // Opacity kurva: fade in → hold → fade out
            let op = 0;
            if (prog < 0.12) {
                op = (prog / 0.12) * 0.38;
            } else if (prog < 0.55) {
                op = 0.38;
            } else {
                op = (1 - (prog-0.55)/0.45) * 0.38;
            }
            p.material.opacity = op;

            // Warna: lebih putih di awal, lebih abu di akhir
            const gv = 0.70 + prog*0.22;
            p.material.color.setRGB(gv, gv, gv);
        });
    }

    _tickLightFlicker(time) {
        if (!this.fireplaceLight) return;
        const t = time * 0.001;

        // 3 layer flicker noise
        const flicker =
            Math.sin(t * 7.8)  * 0.40 +
            Math.sin(t * 23.1) * 0.25 +
            Math.sin(t * 51.3) * 0.15;

        this.fireplaceLight.intensity = 3.5 + flicker * 0.9;

        // Warna bergeser orange ↔ kuning
        const r = 1.0;
        const g = 0.44 + flicker * 0.14;
        const b = 0.04 + Math.abs(flicker) * 0.04;
        this.fireplaceLight.color.setRGB(r, g, b);

        // Porch flicker halus
        if (this.porchLight) {
            this.porchLight.intensity = 2.8 + Math.sin(t*3.5)*0.22;
        }
    }
}