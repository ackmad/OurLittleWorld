import * as THREE from 'three';
import { HouseBuilder } from './HouseBuilder.js';

// ===========================
//  COLOUR PALETTE — Brighter
// ===========================
const C = {
    // Coizy Primary Palette
    dirt: 0xFDDBB4,       // Peach
    grass: 0xC8F0D8,      // Mint
    sand: 0xFFF0A8,        // Butter
    grassVar1: 0x7CC8A0,  // Sage
    grassVar2: 0x60B8E8,  // Sky
    oceanNear: 0xC2E4FB,  // Baby Blue
    oceanFar: 0xA898E8,   // Lilac
    
    // House & Elements
    foundation: 0xDDD4F8, // Lavender
    woodWall: 0xFDDBB4,   // Peach
    wallPeel: 0xFFF0A8,    // Butter
    cornerBeam: 0xFF9E6C, // Tangerine
    thatchTop: 0xF8D4E4,  // Rose Mist
    thatchBot: 0xE878A8,  // Bubblegum
    ridgeBeam: 0xA898E8,  // Lilac
    doorFrame: 0x7CC8A0,  // Sage
    doorWood: 0xFDDBB4,   // Peach
    doorHinge: 0xA898E8,  // Lilac
    doorKnob: 0xF8C840,   // Sunshine
    windowGlass: 0xC2E4FB,// Baby Blue
    shutters: 0x7CC8A0,   // Sage
    
    // Flora & Misc
    lavenderBloom: 0xA898E8, // Lilac
    geranium: 0xEE78A8,   // Bubblegum
    chimneyBrick: 0xFF9E6C,  // Tangerine
    chimneyMortar: 0xFDDBB4, // Peach
    oakBark: 0xFDDBB4,    // Peach 
    oakLeaf: 0xC8F0D8,    // Mint
    oakLeafLight: 0x7CC8A0, // Sage
    birchBark: 0xFFF0A8,  // Butter
    birchLeaf: 0x7CC8A0,  // Sage
    daisyWhite: 0xFFF0A8, // Butter
    heatherPink: 0xF8D4E4,// Rose Mist
    fern: 0x7CC8A0,       // Sage
    riverWater: 0xC2E4FB, // Baby Blue
    pondWater: 0x60B8E8,  // Sky
    rockBase: 0xDDD4F8,   // Lavender
    rockMoss: 0xC8F0D8,   // Mint
    monarch: 0xFF9E6C,    // Tangerine
    morpho: 0x60B8E8,     // Sky
    swallowtail: 0xF8C840,// Sunshine
    rabbitWhite: 0xFFF0A8,// Butter
    rabbitPink: 0xF8D4E4, // Rose Mist
    floorWood: 0xFDDBB4,  // Peach
    plaster: 0xFFF0A8,    // Butter
    beamDark: 0xFF9E6C,   // Tangerine
    bookRed: 0xE878A8,    // Bubblegum
    bookGreen: 0x7CC8A0,  // Sage
    bookNavy: 0x60B8E8,   // Sky
    bookBrown: 0xFF9E6C,  // Tangerine
    bookPurple: 0xA898E8, // Lilac
    marble: 0xFFF0A8,     // Butter
    sofaPlum: 0xA898E8,   // Lilac
    rugRed: 0xE878A8,     // Bubblegum
    deskOak: 0xFDDBB4,    // Peach
    deckWood: 0xFDDBB4,   // Peach
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

        // Warna pastel cerah ala Ghibli/Animal Crossing (Coizy Palette)
        const cSand1 = new THREE.Color('#FFF0A8'), cSand2 = new THREE.Color('#FDDBB4'); // Butter & Peach
        const cRock1 = new THREE.Color('#DDD4F8'), cRock2 = new THREE.Color('#A898E8'); // Lavender & Lilac
        const cGrass1 = new THREE.Color('#C8F0D8'), cGrass2 = new THREE.Color('#7CC8A0'); // Mint & Sage
        const cGrass3 = new THREE.Color('#FFF0A8'); // Highlight Butter
        const cPeak1 = new THREE.Color('#F8D4E4'), cPeak2 = new THREE.Color('#E878A8'); // Rose Mist & Bubblegum
        const cSwamp = new THREE.Color('#C2E4FB'); // Baby Blue Rawa
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
                // Gelombang base lambat
                float wave = sin(pos.x * 0.04 + time * 1.5) * 0.2;
                wave += cos(pos.y * 0.03 + time * 0.8) * 0.15;
                pos.z += wave;
                
                vPos = pos;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;

        const fShader = `
            varying vec2 vUv;
            varying vec3 vPos;
            uniform float time;

            void main() {
                // Ocean Depth & Color Layering
                vec3 deepWater = vec3(0.28, 0.66, 0.77);   // #48A8C4 (Teal)
                vec3 shoreWater = vec3(0.66, 0.85, 0.91);  // #A8D8E8 (Cyan)
                vec3 foamColor = vec3(0.85, 0.93, 0.97);   // #DAEEF8 (Milky White)

                float dist = length(vPos.xy);
                
                // Color ramp base ocean
                float depthStr = smoothstep(53.0, 90.0, dist);
                vec3 baseColor = mix(shoreWater, deepWater, depthStr);

                // 3 Speed Parallax Sinusoidal Waves (Organik & Diagonal)
                float diagX = vPos.x * 0.8 + vPos.y * 0.6;
                float diagY = vPos.x * -0.6 + vPos.y * 0.8;

                // Distorsi organik (Wobble) agar tidak membentuk garis lurus yang kaku
                float wobble = sin(diagY * 0.2 + time * 0.8) * 2.0 + cos(diagX * 0.15 - time * 0.5) * 1.5;

                // 3 layer ombak yang bergerak menyapu dengan kecepatan dan ukuran beda
                float w1 = sin((diagX + wobble) * 0.25 - time * 1.2) * 0.5 + 0.5;
                float w2 = sin((diagX + wobble * 0.8 + diagY * 0.1) * 0.35 - time * 1.6) * 0.5 + 0.5;
                float w3 = sin((diagX + wobble * 1.2 - diagY * 0.15) * 0.45 - time * 2.0) * 0.5 + 0.5;
                
                // Menjadikan kurva tsb berbentuk garis tipis di puncaknya
                float line1 = smoothstep(0.90, 0.96, w1) * 0.45; // Garis tertebal, transparan
                float line2 = smoothstep(0.94, 0.98, w2) * 0.65; // Garis medium
                float line3 = smoothstep(0.96, 0.99, w3) * 0.90; // Garis tipis, solid
                
                float waveLines = max(line1, max(line2, line3));

                // Busa pantai bergelombang
                float foamSine = sin(dist * 2.0 - time * 1.2) * 0.5 + 0.5;
                float isBeach = 1.0 - smoothstep(52.0, 58.0, dist);
                float beachFoam = smoothstep(0.6, 0.9, foamSine) * isBeach;

                // Mix final foam / ombak
                float edgeBlend = max(waveLines * 0.6, beachFoam);
                vec3 finalColor = mix(baseColor, foamColor, edgeBlend);

                // Fade To Background
                float alpha = 1.0 - smoothstep(300.0, 800.0, dist);

                gl_FragColor = vec4(finalColor, alpha * 0.85);
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
        
        // Hindari outline aneh di laut lepas (karena terlalu banyak vertex bergelombang)
        mat.userData.outlineParameters = { visible: false };

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
        const locations = [[-15,10],[-22,-5],[20,12],[24,-10],[-10,20],[10,-20],[-25,8], [-12, -22], [8, 25], [26, 4]];
        
        const cTrunk = new THREE.Color("#8B5030"); // Muted brown
        const cDeep = new THREE.Color("#385020");  // Deep shade
        const cShadow = new THREE.Color("#4A6030"); // Shadow side
        const cBody = new THREE.Color("#607840");  // Main body
        const cHigh = new THREE.Color("#9AAA60");  // Highlight top
        
        const matTrunk = new THREE.MeshStandardMaterial({ color: cTrunk, roughness: 1.0 });
        const matDeep = new THREE.MeshStandardMaterial({ color: cDeep, roughness: 1.0, flatShading: true });
        const matShadow = new THREE.MeshStandardMaterial({ color: cShadow, roughness: 0.9, flatShading: true });
        const matBody = new THREE.MeshStandardMaterial({ color: cBody, roughness: 0.9, flatShading: true });
        const matHigh = new THREE.MeshStandardMaterial({ color: cHigh, roughness: 0.8, flatShading: true });
        
        // Ambient Occlusion drop shadow
        const aoMat = new THREE.MeshBasicMaterial({ color: 0x4A3010, transparent: true, opacity: 0.3, depthWrite: false });

        locations.forEach(([x,z]) => {
            const h = 3.5 + Math.random();
            const by = this.getHeight(x, z);
            
            // Batang utama
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, h, 6), matTrunk);
            trunk.position.set(x, by + h/2, z); 
            trunk.castShadow = true;
            this.gameGroup.add(trunk);
            
            // Layer 1: AO Base Shadow ditaruh di tanah
            const ao = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 4.5), aoMat);
            ao.rotation.x = -Math.PI / 2;
            ao.position.set(x, by + 0.05, z);
            this.gameGroup.add(ao);
            
            // Layer 2: Deep shade underneath
            const sDeep = new THREE.Mesh(new THREE.SphereGeometry(2.1, 7, 6), matDeep);
            sDeep.position.set(x, by + h + 0.2, z); sDeep.scale.set(1.1, 0.4, 1.1); sDeep.castShadow = true;
            this.gameGroup.add(sDeep);
            
            // Layer 3: Main shadow layer
            const sShadow = new THREE.Mesh(new THREE.SphereGeometry(2.4, 8, 7), matShadow);
            sShadow.position.set(x, by + h + 1.2, z); sShadow.scale.set(1.0, 0.7, 1.0); sShadow.castShadow = true;
            this.gameGroup.add(sShadow);
            
            // Layer 4: Main body
            const sBody = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 7), matBody);
            sBody.position.set(x + (Math.random()-0.5)*0.5, by + h + 2.5, z + (Math.random()-0.5)*0.5);
            sBody.scale.set(1.0, 0.8, 1.0); sBody.castShadow = true;
            this.gameGroup.add(sBody);
            
            // Layer 5: Highlight top
            const sHigh = new THREE.Mesh(new THREE.SphereGeometry(1.6, 7, 6), matHigh);
            sHigh.position.set(x + (Math.random()-0.5)*0.3, by + h + 3.8, z + (Math.random()-0.5)*0.3);
            sHigh.scale.set(0.9, 0.6, 0.9); sHigh.castShadow = true;
            this.gameGroup.add(sHigh);
        });
    }

    buildBirchTrees() {
        // Birch trees tapi pakai sistem layering warnanya
        const cDeep = new THREE.Color("#4A6030");
        const cShadow = new THREE.Color("#607840"); 
        const cBody = new THREE.Color("#9AAA60");
        const cHigh = new THREE.Color("#C8D880"); // Lighter birch leaves
        
        const matDeep = new THREE.MeshStandardMaterial({ color: cDeep, roughness: 1.0, flatShading: true });
        const matShadow = new THREE.MeshStandardMaterial({ color: cShadow, roughness: 0.9, flatShading: true });
        const matBody = new THREE.MeshStandardMaterial({ color: cBody, roughness: 0.9, flatShading: true });
        const matHigh = new THREE.MeshStandardMaterial({ color: cHigh, roughness: 0.8, flatShading: true });
        
        const birchTrunkMat = new THREE.MeshStandardMaterial({ color: 0xe0d6c8, roughness: 1.0 }); // Soft birch bark
        const aoMat = new THREE.MeshBasicMaterial({ color: 0x4A3010, transparent: true, opacity: 0.25, depthWrite: false });

        [[-8, 22], [8, -22], [-28, -15]].forEach(([x, z]) => {
            const h = 5.0 + Math.random(); const by = this.getHeight(x, z);
            
            // Trunk
            const t = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, h, 6), birchTrunkMat);
            t.position.set(x, by + h/2, z); t.castShadow = true; this.gameGroup.add(t);
            
            // AO Base Shadow
            const ao = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), aoMat);
            ao.rotation.x = -Math.PI / 2; ao.position.set(x, by + 0.05, z); this.gameGroup.add(ao);

            // Layering
            const sDeep = new THREE.Mesh(new THREE.SphereGeometry(1.6, 7, 5), matDeep);
            sDeep.position.set(x, by + h, z); sDeep.scale.set(1.1, 0.5, 1.1); sDeep.castShadow = true;
            this.gameGroup.add(sDeep);
            
            const sShadow = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 6), matShadow);
            sShadow.position.set(x, by + h + 0.8, z); sShadow.scale.set(1.0, 0.8, 1.0); sShadow.castShadow = true;
            this.gameGroup.add(sShadow);
            
            const sBody = new THREE.Mesh(new THREE.SphereGeometry(1.5, 7, 6), matBody);
            sBody.position.set(x + (Math.random()-0.5)*0.3, by + h + 1.8, z + (Math.random()-0.5)*0.3);
            sBody.scale.set(1.0, 0.9, 1.0); sBody.castShadow = true;
            this.gameGroup.add(sBody);
            
            const sHigh = new THREE.Mesh(new THREE.SphereGeometry(0.9, 6, 5), matHigh);
            sHigh.position.set(x + (Math.random()-0.5)*0.2, by + h + 2.8, z + (Math.random()-0.5)*0.2);
            sHigh.scale.set(0.9, 0.6, 0.9); sHigh.castShadow = true;
            this.gameGroup.add(sHigh);
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
