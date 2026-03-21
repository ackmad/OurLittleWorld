import * as THREE from 'three';

// ===========================
//  COLOUR PALETTE — Brighter
// ===========================
const C = {
    dirt: 0xA08060,       // dari 0x6B5040 — coklat lebih terang
    grass: 0x8FBF6A,      // dari 0x6AB04C — lebih terang dan lebih kuning-warm
    sand: 0xE8D4A0,       // tetap, sudah bagus
    grassVar1: 0x9AC870,  // dari 0x7EC850
    grassVar2: 0xB0D880,  // dari 0xA8D87A
    oceanNear: 0x3AB4D8, oceanFar: 0x1880B0,
    foundation: 0x9AB090, woodWall: 0xAD8464, wallPeel: 0xF0E8DC, cornerBeam: 0x7A5C45,
    thatchTop: 0xE0BD7A, thatchBot: 0xB09858, ridgeBeam: 0x6A5040,
    doorFrame: 0x5A3828, doorWood: 0x8B6448, doorHinge: 0x2A2A2A, doorKnob: 0xE8C860,
    windowGlass: 0xD8F4FF, shutters: 0x7AAC64,
    lavenderBloom: 0xB890E8, geranium: 0xE84848,
    chimneyBrick: 0xC06040, chimneyMortar: 0xD0B8A8,
    oakBark: 0x7A5530, 
    oakLeaf: 0x7ABB4A,    // dari 0x5AA83C — hijau daun lebih cerah
    oakLeafLight: 0x9ADB66, // dari 0x7ACC50
    birchBark: 0xF0EAE0, 
    birchLeaf: 0xB0E870,  // dari 0x98DC60
    daisyWhite: 0xFFD040, heatherPink: 0xFF80C0, fern: 0x4A8848,
    riverWater: 0xC0EAE0, pondWater: 0x58AACC,
    rockBase: 0xAAA8B0, rockMoss: 0x6A8850,
    monarch: 0xFF9030, morpho: 0x60A8FF, swallowtail: 0xFFE840,
    rabbitWhite: 0xF0E8E0, rabbitPink: 0xFFC0C0,
    floorWood: 0x9A6840, plaster: 0xFFF4E8, beamDark: 0x604030,
    bookRed: 0xC03030, bookGreen: 0x408030, bookNavy: 0x284880, bookBrown: 0x9A6840, bookPurple: 0x703090,
    marble: 0xF0EDE8, sofaPlum: 0x6A4090, rugRed: 0xAA2828, deskOak: 0xAA8850,
    deckWood: 0x9A7040,
};

// ===========================
//  SIMPLE DETERMINISTIC RAND (seed-based)
// ===========================
let _seed = 42;
export const rand = () => { const x = Math.sin(_seed++) * 10000; return x - Math.floor(x); };
export const randRange = (min, max) => min + rand() * (max - min);

// Smooth noise 2D (sin-based, tidak ada karakter unicode, deterministik)
const noise2D = (x, y) => {
    const X = Math.floor(x), Y = Math.floor(y);
    const fx = x - X, fy = y - Y;
    // Smoothstep
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    // Hash corners
    const h = (a, b) => Math.sin(a * 127.1 + b * 311.7) * 43758.5453 % 1;
    const n00 = h(X, Y), n10 = h(X + 1, Y), n01 = h(X, Y + 1), n11 = h(X + 1, Y + 1);
    return (n00 * (1 - ux) + n10 * ux) * (1 - uy) + (n01 * (1 - ux) + n11 * ux) * uy;
};

export class WorldBuilder {
    constructor(scene, gameGroup, interactables, RAPIER, physicsWorld, Layers) {
        this.scene = scene;
        this.interactables = interactables;
        this.gameGroup = gameGroup;
        this.RAPIER = RAPIER;
        this.physicsWorld = physicsWorld;
        this.Layers = Layers;
        this.npcManager = null;
        this.ocean = null;
        this.butterflies = [];
        this.sky = null;
        this.sun = null;
        this.terrainMesh = null;
        _seed = 42; // reset seed for deterministic world
    }

    buildSky() {
        // Sky dan fog di-handle oleh main.js
        // Jangan override di sini
        console.log('🌤️ SKY: Dikelola oleh main.js setupSky()');
    }

    async build(onProgress) {
        this.buildSky();
        if (onProgress) onProgress(10);
        this.buildIsland();
        if (onProgress) onProgress(30);
        this.buildOcean();
        if (onProgress) onProgress(50);
        this.buildHouse();
        if (onProgress) onProgress(65);
        this.buildVegetation();
        if (onProgress) onProgress(75);
        this.buildRiverAndPond();
        if (onProgress) onProgress(85);
        this.buildRocks();
        if (onProgress) onProgress(95);
        this.buildFauna();
        if (onProgress) onProgress(100);
    }

    // ==========================================
    // TERRAIN HEIGHT MAP
    // ==========================================
    getHeight(x, z) {
        let bx = x, by = -z;
        let dist = Math.sqrt(bx*bx + by*by);
        let h = noise2D(bx * 0.04, by * 0.04) * 8
              + noise2D(bx * 0.12, by * 0.08) * 3
              + noise2D(bx * 0.3, by * 0.25) * 0.8;

        // --- PLATEAU PEAK (Bener-bener Flat) ---
        let peakDist = Math.sqrt((bx - 5)**2 + (by - 5)**2);
        if (peakDist < 32) {
            h += Math.max(0, (32 - peakDist) / 3.0) * 1.5;
            if (peakDist < 20) {
                // Hard flatten for a perfect level
                h = 12.5; 
            } else {
                // Sharp transition to plateau
                const t = 1.0 - (peakDist - 20) / 12;
                h = THREE.MathUtils.lerp(h, 12.5, Math.pow(t, 2));
            }
        }

        // --- STABLE HOUSE FOUNDATION (Perfectly Level) ---
        const hx = 10, hz = -5;
        const distToHouse = Math.sqrt((x - hx)**2 + (z - hz)**2);
        if (distToHouse < 16) {
            const targetH = 12.5; // MUST MATCH PEAK HEIGHT
            const factor = Math.pow(Math.max(0, 1 - (distToHouse / 16)), 0.3);
            h = THREE.MathUtils.lerp(h, targetH, factor);
            if (distToHouse < 10) h = targetH; // Hard level under house
        }

        // Falloff shape (island boundary)
        let rad = 48 + Math.sin(Math.atan2(by, bx) * 2) * 8;
        let falloff = Math.max(0, 1 - Math.pow(dist / rad, 2.2));
        h *= falloff;

        if (h < 0.3) h = -1.0; 
        return h;
    }


    // ==========================================
    // BUG 1 & 3 FIX: Island + cross-billboard grass
    // ==========================================
    buildIsland() {
        const geom = new THREE.PlaneGeometry(160, 160, 80, 80);
        geom.rotateX(-Math.PI / 2);
        const pos = geom.attributes.position;
        const colors = [];
        const colorObj = new THREE.Color();

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getZ(i);
            const h = this.getHeight(x, z);
            pos.setY(i, h);

            // --- COLOR LOGIC BASED ON HEIGHT & PEAK DISTANCE ---
            const peakDist = Math.sqrt((x - 5)**2 + (-z - 5)**2); // Match peakDist in getHeight()

            if (h < 0.3) {
                colorObj.setHex(0xD4B896); // Pasir krem warm
            } else if (peakDist < 25) {
                // PUNCAK GUNUNG: Warna Tanah (Dirt) - RADIUS DIPERBESAR
                const dirtColors = [0x8B6B50, 0x795548, 0x6D4C41, 0xA1887F];
                colorObj.setHex(dirtColors[Math.floor(rand() * dirtColors.length)]);
                // Sedikit lerp ke hijau di pinggiran plateau
                if (peakDist > 20) {
                    const t = (peakDist - 20) / 5;
                    colorObj.lerp(new THREE.Color(0x8FBF6A), t);
                }
            } else if (h < 1.5) {
                const t = (h - 0.3) / 1.2;
                colorObj.setHex(0xD4B896).lerp(new THREE.Color(0x8FBF6A), t);
            } else if (h < 4.0) {
                const grassColors = [0x8FBF6A, 0x7AB84A, 0x9AC870, 0xA8CF7A];
                colorObj.setHex(grassColors[Math.floor(rand() * grassColors.length)]);
            } else {
                colorObj.setHex(rand() > 0.6 ? 0x7AB848 : 0x6AAA3C);
            }
            colors.push(colorObj.r, colorObj.g, colorObj.b);
        }
        geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geom.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({ 
            vertexColors: true, 
            roughness: 0.9, 
            metalness: 0.0,
            side: THREE.FrontSide
        });
        const island = new THREE.Mesh(geom, mat);
        island.receiveShadow = true;
        island.castShadow = true;
        this.gameGroup.add(island);
        this.terrainMesh = island; // Exported for raycasting in main.js

        // PHYSICS — TRI-MESH (instead of heights, more accurate)
        const vertices = geom.attributes.position.array;
        const indices = geom.index.array;
        
        try {
            const tmDesc = this.RAPIER.ColliderDesc.trimesh(vertices, indices);
            const groundBody = this.physicsWorld.createRigidBody(this.RAPIER.RigidBodyDesc.fixed());
            this.physicsWorld.createCollider(tmDesc, groundBody);
        } catch(e) {
            console.warn('Physics Trimesh Error:', e.message);
            const fb = this.physicsWorld.createRigidBody(this.RAPIER.RigidBodyDesc.fixed());
            this.physicsWorld.createCollider(this.RAPIER.ColliderDesc.cuboid(80, 0.5, 80), fb);
        }

        // BUG 4 FIX: Grass Cross-Billboard (Perbaikan 3)
        const gColors = [
            0x8FBF6A,  // hijau muda warm — paling cerah
            0x7AB848,  // hijau medium
            0xA0CC70   // hijau kekuningan — paling warm
        ];
        const dummy = new THREE.Object3D();
        const gW = 0.20, gH = 0.38;
        
        // Buat 3 plane saling silang
        const p1 = new THREE.PlaneGeometry(gW, gH); p1.translate(0, gH/2, 0);
        const p2 = p1.clone(); p2.rotateY(Math.PI / 3);
        const p3 = p1.clone(); p3.rotateY(Math.PI / 3 * 2);
        
        for (let i = 0; i < gColors.length; i++) {
            const matG = new THREE.MeshStandardMaterial({ 
                color: gColors[i], 
                side: THREE.DoubleSide, 
                alphaTest: 0.3,
                roughness: 0.9,
                // Tambahkan emissive agar tidak terlalu gelap (Perbaikan 3)
                emissive: new THREE.Color(gColors[i]).multiplyScalar(0.08)
            });
            
            const maxG = 200; // Kurangi density agar performa & visual lebih baik
            const im1 = new THREE.InstancedMesh(p1, matG, maxG);
            const im2 = new THREE.InstancedMesh(p2, matG, maxG);
            const im3 = new THREE.InstancedMesh(p3, matG, maxG);

            im1.castShadow = true; im1.receiveShadow = true;
            im2.castShadow = true; im2.receiveShadow = true;
            im3.castShadow = true; im3.receiveShadow = true;
            
            let placed = 0;
            for (let attempt = 0; attempt < maxG * 8 && placed < maxG; attempt++) {
                const gx = randRange(-42, 42), gz = randRange(-42, 42);
                const gh = this.getHeight(gx, gz);
                if (gh < 1.5 || gh > 11) continue;

                // Jangan spawn terlalu dekat ke rumah
                const distFromHouse = Math.sqrt((gx - 10) ** 2 + (gz + 5) ** 2);
                if (distFromHouse < 7) continue;

                dummy.position.set(gx, gh, gz);
                dummy.rotation.y = rand() * Math.PI * 2;
                dummy.rotation.z = (rand() - 0.5) * 0.25; // slight tilt
                dummy.scale.setScalar(randRange(0.6, 1.3));
                dummy.updateMatrix();
                im1.setMatrixAt(placed, dummy.matrix);
                im2.setMatrixAt(placed, dummy.matrix);
                im3.setMatrixAt(placed, dummy.matrix);
                placed++;
            }
            im1.count = placed; im2.count = placed; im3.count = placed;
            im1.instanceMatrix.needsUpdate = true;
            im2.instanceMatrix.needsUpdate = true;
            im3.instanceMatrix.needsUpdate = true;
            this.gameGroup.add(im1, im2, im3);
        }
    }

    // BUG 6 FIX: Ocean
    buildOcean() {
        const geom = new THREE.PlaneGeometry(1200, 1200, 8, 8);
        geom.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x3AAED8,
            roughness: 0.05,
            metalness: 0.15,
            transparent: true,
            opacity: 0.82,
            envMapIntensity: 1.5
        });
        this.ocean = new THREE.Mesh(geom, mat);
        this.ocean.position.y = 0.0;
        this.ocean.receiveShadow = true;
        this.gameGroup.add(this.ocean);
    }

    buildHouse() {
        const hGroup = new THREE.Group();
        const hx = 10, hz = -5;
        // MUST MATCH NEW TERRAIN HEIGHT (12.5)
        const groundHeight = 12.5; 
        hGroup.position.set(hx, groundHeight, hz);
        hGroup.rotation.y = -Math.PI / 4; 
        this.gameGroup.add(hGroup);

        const buildBox = (w, h, d, color, px, py, pz, cast=true) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
            m.position.set(px, py, pz);
            m.castShadow = cast; m.receiveShadow = true;
            hGroup.add(m);
            return m;
        };

        const buildCyl = (rt, rb, h, seg, color, px, py, pz, rx=0, rz=0, cast=true) => {
            const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
            m.position.set(px, py, pz);
            m.rotation.set(rx, 0, rz);
            m.castShadow = cast; m.receiveShadow = true;
            hGroup.add(m);
            return m;
        };

        const logColor = 0xD29E6B;
        const roofColor = 0xF15C5C;
        const chimneyColor = 0xAAAAAA;
        const woodPropColor = 0x6D4C41;

        // 1. TERAS / DECK (Refined with Railings)
        const deckW = 10, deckD = 6;
        buildBox(deckW, 0.25, deckD, 0x795548, 0, 0.12, 5.5); // Thinner, smoother floor
        // Deck Posts (into the ground)
        for (let x of [-4.5, 4.5]) {
            for (let z of [3, 8]) buildBox(0.3, 1, 0.3, 0x4E342E, x, -0.4, z);
        }
        // Railings
        for (let x of [-4.8, 4.8]) {
            buildBox(0.15, 0.8, 0.15, 0x4E342E, x, 0.5, 5.5 + 2.5); // End posts
        }
        buildBox(deckW, 0.1, 0.15, 0x5D4037, 0, 0.9, 8.4); // Top rail
        for (let i = -4.5; i <= 4.5; i += 1.5) {
            if (Math.abs(i) < 1) continue; // Entrance gap
            buildBox(0.1, 0.8, 0.1, 0x5D4037, i, 0.5, 8.4); // many small rails
        }

        // 2. CHUNKIER LOG WALLS
        const wallW = 8, wallD = 6, logR = 0.5; // Larger logs
        const numLogs = 6;
        for (let i = 0; i < numLogs; i++) {
            const y = i * (logR * 1.5) + logR;
            // Interlocking horizontal logs
            buildCyl(logR, logR, wallW + 1.2, 8, logColor, 0, y, wallD/2, 0, Math.PI/2);
            buildCyl(logR, logR, wallW + 1.2, 8, logColor, 0, y, -wallD/2, 0, Math.PI/2);
            
            const offset = logR * 0.75;
            buildCyl(logR, logR, wallD + 1.2, 8, logColor, wallW/2, y + offset, 0, Math.PI/2, 0);
            buildCyl(logR, logR, wallD + 1.2, 8, logColor, -wallW/2, y + offset, 0, Math.PI/2, 0);
        }

        // 3. ROOF & GABLES
        const roofGroup = new THREE.Group();
        roofGroup.position.y = numLogs * logR * 1.5 + 1.0;
        hGroup.add(roofGroup);
        const rMaterial = new THREE.MeshStandardMaterial({ color: roofColor });
        const rP1 = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 5.5), rMaterial);
        rP1.position.set(0, 1.8, 2.2); rP1.rotation.x = 0.85; roofGroup.add(rP1);
        const rP2 = rP1.clone(); rP2.position.set(0, 1.8, -2.2); rP2.rotation.x = -0.85; roofGroup.add(rP2);
        buildBox(10.2, 0.4, 0.4, 0x880000, 0, 3.8, 0); // Ridge beam

        const gMat = new THREE.MeshStandardMaterial({ color: logColor, side: THREE.DoubleSide });
        for (let xPos of [-wallW/2, wallW/2]) {
            const tri = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(xPos, 0, -wallD/2), new THREE.Vector3(xPos, 0, wallD/2), new THREE.Vector3(xPos, 3, 0)
            ]);
            tri.computeVertexNormals();
            const g = new THREE.Mesh(tri, gMat); g.position.y = numLogs * logR * 1.5 + logR; hGroup.add(g);
        }

        // 4. DOOR & WINDOWS
        buildBox(1.5, 2.8, 0.2, 0x3E2723, 0, 1.4, wallD/2 + 0.1); // Door (Bigger)
        buildBox(0.1, 0.1, 0.1, 0xFFD700, 0.5, 1.4, wallD/2 + 0.25); // Knob
        
        // Window with shutters
        buildBox(1.5, 1.5, 0.1, 0xAADDFF, 2.5, 2.2, wallD/2 + 0.1); // Glass
        buildBox(0.6, 1.5, 0.1, 0x4E342E, 3.6, 2.2, wallD/2 + 0.2); // Shutters
        buildBox(0.6, 1.5, 0.1, 0x4E342E, 1.4, 2.2, wallD/2 + 0.2);

        // 5. SIGNSTPOST: "RUMAH KITA"
        const signGroup = new THREE.Group();
        signGroup.position.set(-4.5, 0.12, 6);
        hGroup.add(signGroup);
        buildBox(0.2, 1.8, 0.2, 0x4E342E, 0, 0.9, 0);
        const plank = buildBox(2.2, 0.8, 0.15, 0x8D6E63, 0, 1.8, 0.1);
        
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#2D1D16'; ctx.font = 'bold 36px "VT323"'; ctx.textAlign = 'center';
        ctx.fillText('RUMAH KITA', 128, 75);
        const txtTex = new THREE.CanvasTexture(canvas);
        const txtMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.7), new THREE.MeshBasicMaterial({ map: txtTex, transparent: true }));
        txtMesh.position.set(0, 1.8, 0.2);
        signGroup.add(txtMesh);

        // 6. DECORATIONS: Bench & Logs
        buildBox(2.5, 0.3, 0.8, 0x5D4037, -3, 0.4, 6.5); // Bench floor
        buildBox(0.2, 0.6, 0.2, 0x5D4037, -4.2, 0.2, 6.5); // Bench legs

        // 7. PATH
        const path = new THREE.Mesh(new THREE.CircleGeometry(5, 32), new THREE.MeshStandardMaterial({ color: 0xE6C98A, roughness: 1 }));
        path.rotateX(-Math.PI/2); path.position.set(0, -0.05, 5.5); path.receiveShadow = true; hGroup.add(path);

        // 8. INTERACTION & PHYSICS
        const doorInt = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 1), new THREE.MeshBasicMaterial({ visible: false }));
        doorInt.position.set(0, 1.5, wallD/2 + 1);
        doorInt.userData = { type: 'door', label: 'Masuk Rumah' };
        hGroup.add(doorInt); this.interactables.push(doorInt);

        const hbDesc = this.RAPIER.RigidBodyDesc.fixed().setTranslation(hx, groundHeight + 2, hz);
        const fb = this.physicsWorld.createRigidBody(hbDesc);
        fb.setRotation({ ...hGroup.quaternion }, true);
        this.physicsWorld.createCollider(this.RAPIER.ColliderDesc.cuboid(wallW/2 + 0.8, 2.5, wallD/2 + 0.8), fb);
        this.physicsWorld.createCollider(this.RAPIER.ColliderDesc.cuboid(5, 0.4, 3).setTranslation(0, -1.8, 5.5), fb); // Porch physics
    }

    buildInterior(hGroup) {
        const iGroup = new THREE.Group();
        iGroup.position.set(0, 0.4, 0);
        hGroup.add(iGroup);

        const floor = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.1, 5.8), new THREE.MeshStandardMaterial({ color: C.floorWood }));
        floor.position.y = 0.05; iGroup.add(floor);

        // Bookshelves (Perbaikan 12)
        const bMat = new THREE.MeshStandardMaterial({ color: C.beamDark });
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.8, 2.0), bMat);
        shelf.position.set(3.7, 1.4, -1); iGroup.add(shelf);
        shelf.userData = { type: 'bookshelf', label: 'Buku di Rak (E)' };
        this.interactables.push(shelf);

        // Vinyl Player (Perbaikan 13)
        const vPlayer = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.8), new THREE.MeshStandardMaterial({ color: 0x333 }));
        vPlayer.position.set(-3.5, 1.0, 2.0);
        vPlayer.userData = { type: 'vinyl', label: 'Putar Musik (E)' };
        iGroup.add(vPlayer); this.interactables.push(vPlayer);

        // Sofa (Perbaikan 14)
        const sofa = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.8, 1.0), new THREE.MeshStandardMaterial({ color: C.sofaPlum }));
        sofa.position.set(0, 0.4, -2.0);
        sofa.userData = { type: 'sofa', label: 'Istirahat di Sofa (E)' };
        iGroup.add(sofa); this.interactables.push(sofa);

        // Fireplace (Perbaikan 15)
        const fp = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 0.6), new THREE.MeshStandardMaterial({ color: C.marble }));
        fp.position.set(0, 0.9, 2.6);
        fp.userData = { type: 'fireplace', label: 'Dekat Perapian (E)' };
        iGroup.add(fp); this.interactables.push(fp);

        // Shared Notepad (Perbaikan 17)
        const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ color: 0xFFFEE0 }));
        paper.position.set(3.0, 0.85, 2.2); paper.rotation.x = -Math.PI/2;
        paper.userData = { type: 'notepad', label: 'Catatan Bersama (E)' };
        iGroup.add(paper); this.interactables.push(paper);

        const memoryBook = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.25), new THREE.MeshStandardMaterial({ color: C.bookBrown }));
        memoryBook.position.set(3, 0.8, 2);
        memoryBook.userData = { type: 'memory_book', label: 'Buka Buku Kenangan' };
        iGroup.add(memoryBook);
        this.interactables.push(memoryBook);
    }

    buildRooftop(hGroup) {
        const rGroup = new THREE.Group();
        rGroup.position.set(0, 3.4, -7);
        hGroup.add(rGroup);

        const deck = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 5), new THREE.MeshStandardMaterial({ color: C.deckWood }));
        rGroup.add(deck);

        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: 0xF0E8DC }));
        chair.position.set(-1, 0.35, 0); 
        chair.userData = { type: 'rooftop_chair', chairId: 1, label: 'Duduk Bersantai (E)' };
        rGroup.add(chair); this.interactables.push(chair);
        
        const chair2 = chair.clone(); chair2.position.set(1, 0.35, 0); 
        chair2.userData = { type: 'rooftop_chair', chairId: 2, label: 'Duduk Bersantai (E)' };
        rGroup.add(chair2); this.interactables.push(chair2);
        
        // Telescope (Perbaikan 20)
        const telescope = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 1.2), new THREE.MeshStandardMaterial({ color: 0x444 }));
        telescope.position.set(0, 0.8, 2.0); telescope.rotation.x = -0.5;
        telescope.userData = { type: 'telescope', label: 'Gunakan Teropong (E)' };
        rGroup.add(telescope); this.interactables.push(telescope);

        const ladder = new THREE.Mesh(new THREE.BoxGeometry(1.5, 6, 0.2), new THREE.MeshStandardMaterial({ color: C.cornerBeam }));
        ladder.position.set(3, -1.5, -4.5); ladder.rotation.x = -0.2;
        ladder.userData = { type: 'ladder', label: 'Naik ke Rooftop (E)' };
        hGroup.add(ladder); this.interactables.push(ladder);
        
        // STARS (Perbaikan 22)
        const starGeom = new THREE.SphereGeometry(0.15, 6, 6);
        const starMat = new THREE.MeshBasicMaterial({ color: 0xFFFEE0 });
        for(let i=0; i<20; i++) {
            const s = new THREE.Mesh(starGeom, starMat);
            const r = 100, theta = rand()*Math.PI*2, phi = rand()*Math.PI*0.4;
            s.position.set(r*Math.sin(phi)*Math.cos(theta), r*Math.cos(phi) + 20, r*Math.sin(phi)*Math.sin(theta));
            s.userData = { type: 'star', starId: i, label: 'Bintang (E: Beri Nama)' };
            this.gameGroup.add(s); this.interactables.push(s);
        }
    }

    // ==========================================
    // BUG 4 FIX: Organic multi-sphere canopy trees
    // ==========================================
    buildVegetation() {
        const buildTree = (px, pz, size, isBirch) => {
            const py = this.getHeight(px, pz);
            if (py < 0.5) return;
            
            // EXCLUSION: No trees inside or too close to house
            const distFromHouse = Math.sqrt((px - 10)**2 + (pz + 5)**2);
            if (distFromHouse < 10) return;

            const tGroup = new THREE.Group();
            tGroup.position.set(px, py, pz);

            const trunkMat = new THREE.MeshStandardMaterial({ color: isBirch ? C.birchBark : C.oakBark, roughness: 0.85 });
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.2, size * 0.35, size * 5, 8), trunkMat);
            trunk.position.y = size * 2.5;
            trunk.castShadow = true;
            tGroup.add(trunk);
            
            // Interaction: Bersandar (Perbaikan 1)
            const distToCenter = Math.sqrt(px*px + pz*pz);
            const dialogs = distToCenter > 30 ? 
                ["angin lautnya sejuk...", "suara ombak...", "memandang horizon..."] : 
                ["teduh sekali...", "suara kicauan burung...", "tenang banget di sini"];
            trunk.userData = { type: 'tree', label: 'Bersandar (E)', dialogs };
            this.interactables.push(trunk);

            const leafMat = new THREE.MeshStandardMaterial({ color: isBirch ? C.birchLeaf : C.oakLeaf, roughness: 0.8 });
            const canopyCenters = [
                new THREE.Vector3(0, size * 5.5, 0),
                new THREE.Vector3(size * 0.8, size * 5.0, size * 0.5),
                new THREE.Vector3(-size * 0.7, size * 5.2, -size * 0.4),
                new THREE.Vector3(size * 0.4, size * 6.2, -size * 0.6),
                new THREE.Vector3(-size * 0.3, size * 4.8, size * 0.8),
            ];
            for (const c of canopyCenters) {
                const r = size * (1.0 + rand() * 0.8);
                const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leafMat);
                sphere.position.copy(c);
                sphere.castShadow = true;
                tGroup.add(sphere);
            }

            const treeBody = this.physicsWorld.createRigidBody(
                this.RAPIER.RigidBodyDesc.fixed().setTranslation(px, py + size * 2.5, pz)
            );
            this.physicsWorld.createCollider(
                this.RAPIER.ColliderDesc.capsule(size * 2.5, size * 0.35),
                treeBody
            );

            // Bird on tree (Perbaikan 8)
            const bird = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.25), new THREE.MeshStandardMaterial({ color: '#555' }));
            bird.position.set(0, size * 7.5, 0);
            bird.userData = { onFly: () => showSpeechBubble("Chirp! 🐦", 1000) };
            tGroup.add(bird);
            if (this.npcManager) this.npcManager.setupBird(bird);

            this.gameGroup.add(tGroup);
        };

        buildTree(-15, -8, 2.5, false);
        for (let i = 0; i < 3; i++) buildTree(randRange(-28, 28), randRange(-28, 28), randRange(1.5, 2.2), false);
        for (let i = 0; i < 6; i++) buildTree(randRange(-36, 36), randRange(-36, 36), randRange(0.8, 1.3), true);

        // Semak Bunga Petik (Perbaikan 2)
        const flowerTypes = [
            { id: 'lavender', color: C.lavenderBloom, label: 'Petik Lavender' },
            { id: 'daisy', color: C.daisyWhite, label: 'Petik Daisy' },
            { id: 'heather', color: C.heatherPink, label: 'Petik Heather' }
        ];
        
        for(let i=0; i<8; i++) {
            const f = flowerTypes[i % 3];
            const fx = randRange(-30, 30), fz = randRange(-30, 30);
            const fh = this.getHeight(fx, fz);
            if(fh < 1.0) continue;

            const distFromHouse = Math.sqrt((fx - 10)**2 + (fz + 5)**2);
            if (distFromHouse < 8) continue;
            
            const fMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshStandardMaterial({ color: f.color }));
            fMesh.position.set(fx, fh + 0.3, fz);
            fMesh.userData = { type: 'flower', flowerId: f.id, label: f.label + ' (E)' };
            this.gameGroup.add(fMesh);
            this.interactables.push(fMesh);
        }
    }

    buildRiverAndPond() {
        const pGroup = new THREE.Group();
        const ph = this.getHeight(-8, -12);
        const pondPos = new THREE.Vector3(-8, Math.max(ph, 0.1) + 0.05, -12);
        pGroup.position.copy(pondPos);

        const pMat = new THREE.MeshStandardMaterial({ color: C.pondWater, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85 });
        const pond = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.2, 16), pMat);
        pGroup.add(pond);
        
        // Interaction: Duduk di tepi (Perbaikan 3)
        pond.userData = { type: 'pond', label: 'Duduk di Tepi (E)' };
        this.interactables.push(pond);

        const sMat = new THREE.MeshStandardMaterial({ color: 0xB8A898, roughness: 0.9 });
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4), sMat);
            stone.position.set(3.2 * Math.cos(angle), -0.05, 2.1 * Math.sin(angle));
            stone.rotation.set(rand(), rand(), rand());
            pGroup.add(stone);
        }
        this.gameGroup.add(pGroup);

        // Area Sungai (Perbaikan 4)
        // Kita gunakan mesh transparan untuk mendeteksi river edge
        const riverTrigger = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 15), new THREE.MeshBasicMaterial({ visible: false }));
        riverTrigger.position.set(-30, 0.5, 10);
        riverTrigger.userData = { type: 'river', label: 'Tepi Sungai (F: Lempar Batu)' };
        this.gameGroup.add(riverTrigger);
        this.interactables.push(riverTrigger);
    }

    // ==========================================
    // BUG 2 FIX: Rocks snapped to terrain
    // ==========================================
    buildRocks() {
        const mat = new THREE.MeshStandardMaterial({ color: C.rockBase, roughness: 0.88 });
        const rGeom = new THREE.IcosahedronGeometry(1.0, 1);

        for (let i = 0; i < 12; i++) {
            const px = randRange(-40, 40);
            const pz = randRange(-40, 40);
            const py = this.getHeight(px, pz);

            // BUG 2 FIX: Skip if below water, snap Y to terrain surface
            if (py < 0.5) continue;
            
            // EXCLUSION: No rocks inside house
            const distFromHouse = Math.sqrt((px - 10)**2 + (pz + 5)**2);
            if (distFromHouse < 10) continue;

            const scale = randRange(1.0, 2.5);
            const rock = new THREE.Mesh(rGeom, mat);
            // Y = terrain surface + half of scaled height (so rock sits ON ground, not floating)
            rock.position.set(px, py + scale * 0.5, pz);
            rock.scale.set(scale, scale * 0.7, scale * 1.1);
            rock.rotation.set(rand() * 0.4, rand() * Math.PI, rand() * 0.4);
            rock.castShadow = true;
            rock.receiveShadow = true;
            this.gameGroup.add(rock);
            
            // Interaction: Ukir Nama buat batu pantai (Perbaikan 5)
            if (py < 1.0) {
              rock.userData = { type: 'beach_stone', label: 'Ukir Nama di Batu (E)' };
              this.interactables.push(rock);
            } else if (scale < 1.8) {
              rock.userData = { type: 'small_rock', label: 'Duduk di Batu (E)' };
              this.interactables.push(rock);
            }

            // Box collider (simpler + faster than convexHull)
            try {
                const rbody = this.physicsWorld.createRigidBody(this.RAPIER.RigidBodyDesc.fixed());
                this.physicsWorld.createCollider(
                    this.RAPIER.ColliderDesc.cuboid(scale * 0.8, scale * 0.55, scale * 0.85)
                        .setTranslation(px, py + scale * 0.5, pz),
                    rbody
                );
            } catch(e) { /* skip physics for this rock */ }
        }
    }

    buildFauna() {
        // Butterflies
        const bColors = [C.monarch, C.morpho, C.swallowtail];
        for (let i = 0; i < 6; i++) {
            const bGrp = new THREE.Group();
            const wMat = new THREE.MeshBasicMaterial({ color: bColors[i % 3], side: THREE.DoubleSide });
            const w1 = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.1), wMat); w1.position.x = 0.07;
            const w2 = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.1), wMat); w2.position.x = -0.07;
            bGrp.add(w1, w2);
            bGrp.position.set(randRange(-20, 20), 3, randRange(-20, 20));
            bGrp.userData = { w1, w2, phase: rand() * 10, speed: randRange(1, 2) };
            this.gameGroup.add(bGrp);
            this.butterflies.push(bGrp);
            if (this.npcManager) this.npcManager.setupButterfly(bGrp, bGrp.userData.speed);
        }

        // Rabbit
        const rab = new THREE.Group();
        const rh = this.getHeight(-10, -10);
        rab.position.set(-10, Math.max(rh, 0.3) + 0.2, -10);
        rab.add(new THREE.Mesh(new THREE.SphereGeometry(0.25), new THREE.MeshStandardMaterial({ color: C.rabbitWhite })));
        const rEar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25), new THREE.MeshStandardMaterial({ color: C.rabbitWhite }));
        rEar.position.set(0, 0.35, -0.05); rab.add(rEar);
        this.gameGroup.add(rab);
        if (this.npcManager) this.npcManager.setupRabbit(rab);

        // Cat
        const catGrp = new THREE.Group();
        const ch = this.getHeight(12, -2);
        catGrp.position.set(12, Math.max(ch, 0.3) + 0.2, -2);
        const catBody = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.7), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        catBody.position.y = 0.15; catGrp.add(catBody);
        const catHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        catHead.position.set(0, 0.28, 0.3); catGrp.add(catHead);
        catGrp.userData = { type: 'cat', label: 'Pet Kucing (E)' };
        this.gameGroup.add(catGrp);
        this.interactables.push(catGrp);
        if (this.npcManager) this.npcManager.setupCat(catGrp);
    }

    update(time, delta) {
        // Ocean gentle wave (Perbaikan 5)
        if (this.ocean) {
            // Wave lebih terasa: dua sine wave di-combine
            this.ocean.position.y = 
                Math.sin(time * 0.0008) * 0.15 + 
                Math.sin(time * 0.0013) * 0.08;
            
            // Animasikan UV untuk kesan air mengalir (jika pakai texture kelak)
            if (this.ocean.material.map) {
                this.ocean.material.map.offset.x += delta * 0.005;
                this.ocean.material.map.offset.y += delta * 0.003;
                this.ocean.material.needsUpdate = true;
            }
        }
        // Butterfly wing flap
        this.butterflies.forEach(b => {
            b.userData.phase += delta * 15 * b.userData.speed;
            b.userData.w1.rotation.z = Math.sin(b.userData.phase) * 0.7;
            b.userData.w2.rotation.z = -Math.sin(b.userData.phase) * 0.7;
        });
    }
}
