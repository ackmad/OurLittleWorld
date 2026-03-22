import * as THREE from 'three';
import { HouseBuilder } from './HouseBuilder.js';

// ===========================
//  COLOUR PALETTE — Brighter
// ===========================
const C = {
    dirt: 0xA08060,
    grass: 0x8FBF6A,
    sand: 0xE8D4A0,
    grassVar1: 0x9AC870,
    grassVar2: 0xB0D880,
    oceanNear: 0x3AB4D8, oceanFar: 0x1880B0,
    foundation: 0x9AB090, woodWall: 0xAD8464, wallPeel: 0xF0E8DC, cornerBeam: 0x7A5C45,
    thatchTop: 0xE0BD7A, thatchBot: 0xB09858, ridgeBeam: 0x6A5040,
    doorFrame: 0x5A3828, doorWood: 0x8B6448, doorHinge: 0x2A2A2A, doorKnob: 0xE8C860,
    windowGlass: 0xD8F4FF, shutters: 0x7AAC64,
    lavenderBloom: 0xB890E8, geranium: 0xE84848,
    chimneyBrick: 0xC06040, chimneyMortar: 0xD0B8A8,
    oakBark: 0x7A5530, 
    oakLeaf: 0x7ABB4A,
    oakLeafLight: 0x9ADB66,
    birchBark: 0xF0EAE0, 
    birchLeaf: 0xB0E870,
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
//  SIMPLE DETERMINISTIC RAND
// ===========================
let _seed = 42;
export const rand = () => { const x = Math.sin(_seed++) * 10000; return x - Math.floor(x); };
export const randRange = (min, max) => min + rand() * (max - min);

const noise2D = (x, y) => {
    const X = Math.floor(x), Y = Math.floor(y);
    const fx = x - X, fy = y - Y;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
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
        this.terrainMesh = null;
        this.houseBuilder = new HouseBuilder(gameGroup, interactables, physicsWorld, RAPIER);
        _seed = 42;
    }

    async build(onProgress) {
        if (onProgress) onProgress(0);
        this.buildIsland();
        this.buildOcean();
        
        if (onProgress) onProgress(20);
        this.buildOakTrees();
        this.buildBirchTrees();
        this.buildBushes();
        
        if (onProgress) onProgress(40);
        this.buildBoulders();
        this.buildScatteredRocks();
        this.buildCliffRocks();
        
        if (onProgress) onProgress(60);
        this.buildHouse();
        
        if (onProgress) onProgress(80);
        this.buildFlowers();
        this.buildLogPile();
        this.buildDock();
        this.buildFauna();
        
        if (onProgress) onProgress(100);
    }

    getHeight(x, z) {
        // Lingkaran Dasar Mantap
        const d = Math.sqrt((x * x) / (52 * 52) + (z * z) / (48 * 48));
        
        // Deformasi pinggiran lembut
        const edgeNoise = noise2D(x * 0.08, z * 0.08) * 0.12;
        const dist = d + edgeNoise;

        // --- LAYER 1: BASE LANDMASS ---
        // Radius 0.0 - 0.65: Dataran tinggi (Plateau)
        // Radius 0.65 - 0.82: Lereng landai ke pantai
        // Radius 0.82 - 0.95: Pantai & Bibir air (Stabil di ~0.18)
        let h = 2.8; 
        if (dist > 0.2) h = THREE.MathUtils.lerp(2.8, 1.2, THREE.MathUtils.smoothstep(dist, 0.2, 0.65));
        if (dist > 0.65) h = THREE.MathUtils.lerp(h, 0.18, THREE.MathUtils.smoothstep(dist, 0.65, 0.82));

        // --- LAYER 2: UNDERWATER GRADIENT ---
        // Pesisir yang semakin menjauh semakin mendalam (sedikit demi sedikit)
        if (dist > 0.84) {
            const depth = (dist - 0.84) * 2.5; 
            h -= depth;
        }
        
        // --- LAYER 3: VARIATION (Hills & Swamps) ---
        // Variasi hanya ada di daratan tengah (dist < 0.68)
        const mask = 1.0 - THREE.MathUtils.smoothstep(dist, 0.6, 0.7);
        
        const nHills = noise2D(x * 0.18 + 50, z * 0.18 + 50);
        let hillH = 0;
        if (nHills > 0.4) hillH = Math.pow(nHills - 0.4, 1.8) * 5.0;

        const nSwamp = noise2D(x * 0.2 - 50, z * 0.2 - 50);
        let swampH = 0;
        if (nSwamp > 0.5) swampH = Math.pow(nSwamp - 0.5, 2.0) * 3.0;

        const finalH = h + (hillH - swampH) * mask;

        // Potong sudut geometry (Abyss) jauh di luar radius
        if (dist > 1.2) {
            return Math.max(-10.0, finalH - Math.pow((dist - 1.2) * 12.0, 3));
        }

        return Math.max(-5.0, finalH);
    }

    buildIsland() {
        // Geometry dengan kepadatan tinggi (Vast & HD)
        const geo = new THREE.PlaneGeometry(120, 100, 220, 180);
        const pos = geo.attributes.position;
        const colors = [];

        // Warna pastel cerah ala Ghibli/Animal Crossing
        const cSand1 = new THREE.Color('#fcf2c5'), cSand2 = new THREE.Color('#ebd988');
        const cRock1 = new THREE.Color('#a1ada5'), cRock2 = new THREE.Color('#818e86');
        const cGrass1 = new THREE.Color('#a5d85a'), cGrass2 = new THREE.Color('#8ac443');
        const cGrass3 = new THREE.Color('#bce667'); // Highlight rumput
        const cPeak1 = new THREE.Color('#d1ab82'), cPeak2 = new THREE.Color('#b38b60');
        const cSwamp = new THREE.Color('#5c7041'); // Warna keruh/rawa
        const finalColor = new THREE.Color();
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getY(i);
            const h = this.getHeight(x, z);
            pos.setZ(i, h);
            
            // Recalculate dist (Sync dengan rumus di getHeight)
            const d = Math.sqrt((x * x) / (52 * 52) + (z * z) / (48 * 48));
            const dist = d + (noise2D(x * 0.08, z * 0.08) * 0.12);

            // Noise untuk variasi warna lokal
            const nLarge = (noise2D(x * 0.06, z * 0.06) + 1) * 0.5;
            const nMed   = (noise2D(x * 0.2, z * 0.2) + 1) * 0.5;
            const nSwamp = noise2D(x * 0.2 - 50, z * 0.2 - 50);
            
            // Slope detection (Cliff effect)
            const hN = this.getHeight(x, z + 0.4);
            const hE = this.getHeight(x + 0.4, z);
            const slope = Math.abs(h - hN) + Math.abs(h - hE);

            // --- PERHITUNGAN BIOME ---
            // 1. Pantai Pasir Mengelilingi Seluruh Pulau (Wider & Full)
            const wSand = THREE.MathUtils.smoothstep(dist, 0.68, 0.85); 
            
            // 2. Puncak (Peak)
            const wPeak = THREE.MathUtils.smoothstep(h, 2.5, 3.5);
            
            // 3. Tebing (Cliff) - Hanya di area yang benar-benar terjal dan bukan pantai
            let wCliff = THREE.MathUtils.smoothstep(slope, 0.45, 0.8);
            if (dist > 0.65) wCliff *= (1.0 - THREE.MathUtils.smoothstep(dist, 0.65, 0.80));
            
            // 4. Rawa (Swamp)
            let wSwamp = 0;
            if (nSwamp > 0.52 && dist < 0.65) {
                wSwamp = THREE.MathUtils.smoothstep(nSwamp, 0.52, 0.75);
            }
            
            // Pewarnaan yang lembut (menggunakan lerp halus)
            const grassCol = cGrass1.clone().lerp(cGrass2, nLarge).lerp(cGrass3, nMed * 0.35);
            const sandCol  = cSand1.clone().lerp(cSand2, nLarge * 0.5);
            const cliffCol = cRock1.clone().lerp(cRock2, nLarge);
            const peakCol  = cPeak1.clone().lerp(cPeak2, nLarge);
            
            // APPLY BLENDING
            finalColor.copy(grassCol);
            finalColor.lerp(cSwamp, wSwamp);
            finalColor.lerp(peakCol, wPeak);
            finalColor.lerp(cliffCol, wCliff);
            finalColor.lerp(sandCol, wSand);
            
            colors.push(finalColor.r, finalColor.g, finalColor.b);
        }

        geo.computeVertexNormals();
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        // Smooth Shading + Material Lembut (HD tapi clean)
        const mat = new THREE.MeshStandardMaterial({ 
            vertexColors: true, 
            roughness: 0.95, // Tanah tidak mengkilap dan lembut
            flatShading: false
        });
        
        this.terrainMesh = new THREE.Mesh(geo, mat);
        this.terrainMesh.rotation.x = -Math.PI / 2;
        this.terrainMesh.position.y = 0.15;
        this.terrainMesh.receiveShadow = true;
        this.terrainMesh.name = 'ENV_FloatingIsland';
        this.gameGroup.add(this.terrainMesh);

        const vertices = new Float32Array(pos.count * 3);
        const indices = geo.index.array;
        for (let i = 0; i < pos.count; i++) {
            vertices[i*3] = pos.getX(i); vertices[i*3+1] = pos.getZ(i) + 0.15; vertices[i*3+2] = -pos.getY(i);
        }
        this.physicsWorld.createCollider(this.RAPIER.ColliderDesc.trimesh(vertices, indices));

        this.buildIslandBottom();
    }

    buildIslandBottom() {
        const botGeo = new THREE.ConeGeometry(18, 8, 16);
        const islandBot = new THREE.Mesh(botGeo, new THREE.MeshStandardMaterial({ color: 0xAAA8B0, roughness: 0.9, flatShading: true }));
        islandBot.rotation.x = Math.PI; islandBot.position.set(0, -2.5, 0); 
        this.gameGroup.add(islandBot);
    }

    buildOcean() {
        const oceanGeo = new THREE.PlaneGeometry(1600, 1600, 100, 100);

        const vShader = `
            varying vec2 vUv;
            varying vec3 vPos;
            uniform float time;
            void main() {
                vUv = uv;
                vec3 pos = position;
                
                // Deteksi jarak dari pusat pulau
                float distFromCenter = length(pos.xy);
                
                // Masker Pasang Surut: 0 di dalam pulau, 1 di laut lepas (setelah radius 60)
                float tideMask = smoothstep(55.0, 78.0, distFromCenter);
                
                // Animasi pasang surut (hanya untuk laut luar)
                float tide = sin(time * 0.9) * 0.28;
                pos.z += tide * tideMask;
                
                // Gelombang mikro/riak halus (tetap ada di mana-mana agar air hidup)
                float wave = sin(pos.x * 0.03 + time * 1.2) * 0.32;
                wave += cos(pos.y * 0.03 + time * 0.9) * 0.25;
                pos.z += wave;
                
                vPos = pos;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;

        const fShader = `
            varying vec2 vUv;
            varying vec3 vPos;
            uniform float time;

            // Simple 2D Noise function untuk riak air
            float random(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
            float noise(vec2 p) {
                vec2 i = floor(p); vec2 f = fract(p);
                float a = random(i); float b = random(i + vec2(1.0, 0.0));
                float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0));
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }

            void main() {
                // Palet warna laut tropis
                vec3 deepOcean = vec3(0.12, 0.58, 0.88);
                vec3 shallowOcean = vec3(0.28, 0.85, 0.95);
                vec3 highlight = vec3(0.9, 0.98, 1.0);

                // Tekstur koordinat
                vec2 uvScale = vPos.xy * 0.18;

                // 3 Lapisan Noise saling overlap untuk ilusi caustics / ombak
                float n1 = noise(uvScale + vec2(time * 0.6, time * 0.4));
                float n2 = noise(uvScale * 1.8 - vec2(time * 0.5, -time * 0.3));
                float n3 = noise(uvScale * 0.9 + vec2(-time * 0.3, time * 0.6));

                float ripple = (n1 + n2 + n3) / 3.0;
                ripple = smoothstep(0.45, 0.65, ripple); // Tingkatkan kontras batas riak

                // Campuran base
                vec3 finalColor = mix(deepOcean, shallowOcean, ripple);
                
                // Tambahan highlight buih ombak tipis
                float foam = smoothstep(0.85, 1.0, ripple);
                finalColor = mix(finalColor, highlight, foam);

                // Fade out horizon alpha agar tidak pecah
                float dist = length(vPos.xy);
                float alpha = 1.0 - smoothstep(300.0, 800.0, dist);

                gl_FragColor = vec4(finalColor, alpha * 0.85); // 85% solid
            }
        `;

        this.oceanUniforms = { time: { value: 0 } };
        
        const mat = new THREE.ShaderMaterial({
            vertexShader: vShader,
            fragmentShader: fShader,
            uniforms: this.oceanUniforms,
            transparent: true,
            depthWrite: true, // Kembali diaktifkan untuk sorting kedalaman yang lebih baik
            side: THREE.DoubleSide
        });

        this.ocean = new THREE.Mesh(oceanGeo, mat);
        this.ocean.rotation.x = -Math.PI / 2;
        this.ocean.position.y = 0.15; // Setara ujung pantai pulau yang flat
        this.ocean.name = 'ENV_Ocean';
        this.gameGroup.add(this.ocean);
    }

    buildHouse() {
        // High Point of the island
        this.houseBuilder.build(0, 2.4, 1.0);
    }

    buildScatteredRocks() {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0xAAA8B0, roughness: 0.94, flatShading: true });
        for(let i=0; i<45; i++){
            const rx = (Math.random()-0.5)*58, rz = (Math.random()-0.5)*48;
            // Exclusion zone for House AND Stairs path extending to Z = -16
            if (Math.abs(rx) < 8 && rz > -16 && rz < 8) continue; 
            const ry = this.getHeight(rx, rz);
            if (ry < 0.2) continue;
            
            const radius = 0.5 + Math.random()*1.8;
            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 0), rockMat);
            rock.position.set(rx, ry + 0.2, rz); rock.rotation.set(Math.random(), Math.random(), 0);
            rock.scale.set(1.2, 0.6, 1); rock.castShadow = true;
            this.gameGroup.add(rock);

            // Physics for big rocks - Sesuaikan ukuran dinamis
            const rockRB = this.physicsWorld.createRigidBody(this.RAPIER.RigidBodyDesc.fixed().setTranslation(rx, ry + 0.2, rz));
            this.physicsWorld.createCollider(this.RAPIER.ColliderDesc.ball(radius * 1.0), rockRB);
        }
    }

    buildOakTrees() {
        const locations = [[-15,10],[-22,-5],[20,12],[24,-10],[-10,20],[10,-20],[-25,8]];
        locations.forEach(([x,z], i) => {
            const h = 4 + Math.random()*2;
            const by = this.getHeight(x, z);
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, h, 8), new THREE.MeshStandardMaterial({ color: 0x603814 }));
            trunk.position.set(x, by + h/2, z); this.gameGroup.add(trunk);
            
            const leafMat = new THREE.MeshStandardMaterial({ color: 0x38a838, roughness: 0.9, flatShading: true });
            for(let j=0; j<5; j++){
                const c = new THREE.Mesh(new THREE.SphereGeometry(2.0 + Math.random(), 8, 6), leafMat);
                c.position.set(x + (Math.random()-0.5)*2, by + h + Math.random()*1.5, z + (Math.random()-0.5)*2);
                this.gameGroup.add(c);
            }
        });
    }

    buildBirchTrees() {
        const birchTrunkMat = new THREE.MeshStandardMaterial({ color: 0xefeae0 });
        const birchLeafMat  = new THREE.MeshStandardMaterial({ color: 0x4cc14c });
        [[-8, 22], [8, -22], [-28, -15]].forEach(([x, z], i) => {
            const h = 5.5; const by = this.getHeight(x, z);
            const t = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, h, 8), birchTrunkMat);
            t.position.set(x, by + h/2, z); this.gameGroup.add(t);
            const c = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 6), birchLeafMat);
            c.position.set(x, by + h + 1, z); this.gameGroup.add(c);
        });
    }

    buildBushes() {
        const colors = [0x38a838, 0x47b73f];
        for(let i=0; i<15; i++){
            const x = (Math.random()-0.5)*50, z = (Math.random()-0.5)*40;
            if (Math.abs(x) < 8 && Math.abs(z) < 8) continue;
            const y = this.getHeight(x, z);
            const b = new THREE.Mesh(new THREE.SphereGeometry(0.6 + Math.random()*0.5, 6, 5), new THREE.MeshStandardMaterial({ color: colors[i%2] }));
            b.position.set(x, y + 0.3, z); this.gameGroup.add(b);
        }
    }

    buildBoulders() {
        // Simple boulders
    }

    buildCliffRocks() {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0xAAA8B0, roughness: 0.95, flatShading: true });
        for(let i=0; i<40; i++){
            const a = Math.random()*Math.PI*2; const r = 26 + Math.random()*5;
            const x = Math.cos(a)*r, z = Math.sin(a)*r*0.8;
            const y = this.getHeight(x, z);
            
            const radius = 0.8 + Math.random();
            const rock = new THREE.Mesh(new THREE.SphereGeometry(radius, 5, 4), rockMat);
            rock.position.set(x, y - 0.5, z); rock.scale.set(1.5, 0.7, 1.2);
            this.gameGroup.add(rock);
            
            // Physics untuk tebing batu
            const cliffRB = this.physicsWorld.createRigidBody(this.RAPIER.RigidBodyDesc.fixed().setTranslation(x, y - 0.5, z));
            this.physicsWorld.createCollider(this.RAPIER.ColliderDesc.ball(radius * 1.2), cliffRB);
        }
    }

    buildFlowers() {
        // Pink, Yellow, Blue flowers config
        const colors = [0xf984b7, 0xf9e033, 0x609ef9];
        for(let i=0; i<30; i++){
            const x = (Math.random()-0.5)*45, z = (Math.random()-0.5)*35;
            if (Math.abs(x) < 7 && Math.abs(z) < 7) continue;
            const y = this.getHeight(x, z);
            const f = new THREE.Mesh(new THREE.SphereGeometry(0.18, 5, 4), new THREE.MeshStandardMaterial({ color: colors[i%3] }));
            f.position.set(x, y + 0.4, z); this.gameGroup.add(f);
        }
    }

    buildLogPile() {
        // Logs near house
    }

    buildDock() {
        const dockMat = new THREE.MeshStandardMaterial({ color: 0x9A7040 });
        for(let i=0; i<6; i++){
            const p = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 0.8), dockMat);
            p.position.set(0, -1.8, -20 - i*1.2); this.gameGroup.add(p);
        }
    }

    buildFauna() {
        // Butterflies
    }

    buildRooftop(hGroup) {
        // Future expansion
    }

    update(time, delta) {
        if (this.ocean) {
            // Update time seragam ke shader
            this.oceanUniforms.time.value = time * 0.001; 
            
            // Ocean sekarang statik secara global (Tide/Pasang surut dikontrol di shader per-vertex)
            this.ocean.position.y = 0.18; 
            this.ocean.rotation.z = 0; // Matikan rotasi global agar kolam tenang
        }
        if (this.houseBuilder) {
            this.houseBuilder.update(delta, time);
        }
    }
}
