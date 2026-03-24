// ============================================================
//  RabbitModel.js — Chibi Fluffy Low-Poly Rabbit
//  Pure Three.js Geometry Assembly & State Machine
// ============================================================

import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// ─────────────────────────────────────────────
//  MATERIALS
// ─────────────────────────────────────────────
const MAT_FUR      = new THREE.MeshStandardMaterial({ color: 0xF8F4F0, roughness: 0.95, flatShading: false });
const MAT_PINK     = new THREE.MeshStandardMaterial({ color: 0xFFB8C8, roughness: 0.8 });
const MAT_RUBY     = new THREE.MeshStandardMaterial({ color: 0xD44A7A, roughness: 0.4, metalness: 0.2 });
const MAT_WHITEHL  = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
const MAT_WHITE_POM= new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.98 });
const MAT_SOFT_PNK = new THREE.MeshStandardMaterial({ color: 0xFFF0F0, roughness: 0.9 });
const MAT_MOUTH    = new THREE.MeshStandardMaterial({ color: 0xE8A0B0, roughness: 1.0 });
const MAT_SHADOW   = new THREE.MeshBasicMaterial({ color: 0x5A3820, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });

export function createRabbitModel(scene) {
    const RABBIT_Root = new THREE.Group();
    RABBIT_Root.name = 'RABBIT_Root';
    RABBIT_Root.scale.set(0.4, 0.4, 0.4);

    // Visual container for everything that hops
    const RABBIT_Visuals = new THREE.Group();
    RABBIT_Visuals.name = 'RABBIT_Visuals';
    RABBIT_Root.add(RABBIT_Visuals);

    // Parts groups (adding to RABBIT_Visuals)
    const RABBIT_Body = new THREE.Group(); RABBIT_Body.name = 'RABBIT_Body';
    const RABBIT_Head = new THREE.Group(); RABBIT_Head.name = 'RABBIT_Head';
    const RABBIT_EarL = new THREE.Group(); RABBIT_EarL.name = 'RABBIT_EarL';
    const RABBIT_EarR = new THREE.Group(); RABBIT_EarR.name = 'RABBIT_EarR';
    const RABBIT_Tail = new THREE.Group(); RABBIT_Tail.name = 'RABBIT_Tail';

    RABBIT_Visuals.add(RABBIT_Body, RABBIT_Head, RABBIT_Tail);
    RABBIT_Head.add(RABBIT_EarL, RABBIT_EarR);

    // ─── BODY ───
    const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), MAT_FUR.clone());
    bodyMesh.name = 'NPC_Part';
    bodyMesh.scale.set(1.0, 1.15, 0.95);
    bodyMesh.castShadow = bodyMesh.receiveShadow = true;
    RABBIT_Body.add(bodyMesh);

    // ─── HEAD ───
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), MAT_FUR.clone());
    headMesh.name = 'NPC_Part';
    headMesh.scale.set(1.0, 0.98, 0.96);
    headMesh.castShadow = headMesh.receiveShadow = true;
    RABBIT_Head.add(headMesh);
    RABBIT_Head.position.y = 0.48;

    // Cheeks
    const cheekGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const lCheek = new THREE.Mesh(cheekGeo, MAT_SOFT_PNK);
    lCheek.name = 'NPC_Part';
    lCheek.scale.set(1.2, 0.8, 0.6);
    lCheek.position.set(-0.18, -0.03, 0.22);
    const rCheek = lCheek.clone();
    rCheek.position.x = 0.18;
    RABBIT_Head.add(lCheek, rCheek);

    // ─── EARS ───
    function makeEar(side) {
        const group = side === -1 ? RABBIT_EarL : RABBIT_EarR;
        const outer = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.52, 4, 8), MAT_FUR.clone());
        outer.name = 'NPC_Part';
        outer.position.y = 0.26; // Pivot bottom
        const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.44, 4, 8), MAT_PINK);
        inner.name = 'NPC_Part';
        inner.position.set(0, 0.26, 0.02);
        group.add(outer, inner);
        group.position.set(side * 0.12, 0.28, 0);
        group.rotation.set(-0.08, 0, side * 0.12);
    }
    makeEar(-1); makeEar(1);

    // ─── FACE ───
    function makeEye(side) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), MAT_RUBY);
        eye.name = 'NPC_Part';
        eye.position.set(side * 0.11, 0.04, 0.24);
        const hl1 = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), MAT_WHITEHL);
        hl1.name = 'NPC_Part';
        hl1.position.z = 0.05;
        const hl2 = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 4), new THREE.MeshBasicMaterial({ color: 0xFFE0F0 }));
        hl2.name = 'NPC_Part';
        hl2.position.set(side * 0.02, -0.02, 0.04);
        eye.add(hl1, hl2);
        RABBIT_Head.add(eye);
        return eye;
    }
    const eyeL = makeEye(-1); const eyeR = makeEye(1);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), MAT_PINK);
    nose.name = 'NPC_Part';
    nose.scale.set(1.0, 0.7, 0.8);
    nose.position.set(0, -0.06, 0.26);
    RABBIT_Head.add(nose);

    function makeMouth(side) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.06), MAT_MOUTH);
        m.name = 'NPC_Part';
        m.rotation.z = side * Math.PI / 4;
        m.position.set(side * 0.02, -0.1, 0.26);
        RABBIT_Head.add(m);
    }
    makeMouth(-1); makeMouth(1);

    // ─── LEGS ───
    const fLegGeo = new THREE.CapsuleGeometry(0.065, 0.18, 4, 8);
    const bLegGeo = new THREE.CapsuleGeometry(0.08, 0.24, 4, 8);
    
    function makeLeg(name, x, y, z, geo) {
        const leg = new THREE.Mesh(geo, MAT_FUR.clone());
        leg.name = 'NPC_Part';
        leg.position.set(x, y, z);
        leg.castShadow = true;
        RABBIT_Visuals.add(leg);
        return leg;
    }
    const lFront = makeLeg('lFront', -0.16, -0.28, 0.08, fLegGeo);
    const rFront = makeLeg('rFront',  0.16, -0.28, 0.08, fLegGeo);
    const lBack  = makeLeg('lBack',  -0.14, -0.22, -0.1, bLegGeo);
    const rBack  = makeLeg('rBack',   0.14, -0.22, -0.1, bLegGeo);
    
    // Hind paws
    const pawGeo = new THREE.SphereGeometry(0.09, 8, 6);
    const lPaw = new THREE.Mesh(pawGeo, MAT_SOFT_PNK);
    lPaw.name = 'NPC_Part';
    lPaw.scale.set(0.8, 0.5, 1.4); lPaw.position.set(0, -0.1, 0.05); lBack.add(lPaw);
    const rPaw = lPaw.clone(); rBack.add(rPaw);

    // ─── TAIL ───
    const tailMain = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), MAT_WHITE_POM);
    tailMain.name = 'NPC_Part';
    RABBIT_Tail.add(tailMain);
    for(let i=0; i<4; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), MAT_WHITE_POM);
        s.name = 'NPC_Part';
        s.position.set((Math.random()-0.5)*0.08, (Math.random()-0.5)*0.08, (Math.random()-0.5)*0.08);
        RABBIT_Tail.add(s);
    }
    RABBIT_Tail.position.set(0, -0.05, -0.32);

    // ─── SHADOW ───
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), MAT_SHADOW);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.44;
    RABBIT_Root.add(shadow);

    // ─────────────────────────────────────────────────────
    //  STATE MACHINE & ANIMATION
    // ─────────────────────────────────────────────────────
    const STATES = ['IDLE', 'WALK', 'SNIFF', 'EAT', 'DRINK', 'GROOM', 'ALERT', 'FLEE', 'TAME'];
    const WEIGHTS = { IDLE: 0.3, WALK: 0.25, SNIFF: 0.2, EAT: 0.1, DRINK: 0.05, GROOM: 0.08, ALERT: 0.02 };

    const stateMachine = {
        currentState: 'IDLE',
        timer: 2 + Math.random() * 6,
        homePos: new THREE.Vector3(),
        waypoint: new THREE.Vector3(),
        isMoving: false,
        isTame: false
    };

    RABBIT_Root.userData = {
        type: 'rabbit',
        label: '[E] Dekati Kelinci',
        stateMachine: stateMachine,
        isAlerted: false
    };

    let nextBlink = 0;
    let earTwitchTimer = 0;
    let transitionFactor = 0;

    function pickNextState() {
        const r = Math.random();
        let acc = 0;
        for (const [s, w] of Object.entries(WEIGHTS)) {
            acc += w;
            if (r < acc) return s;
        }
        return 'IDLE';
    }

    const hearts = [];
    const rippleGeo = new THREE.RingGeometry(0, 0.3, 16);
    const rippleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide });

    function updateRabbit(delta, time) {
        const sm = RABBIT_Root.userData.stateMachine;
        const cur = sm.currentState;
        const lf = 6.0 * delta;

        // Sync with external state if needed (FLEE/TAME)
        if (RABBIT_Root.userData.state === 'FLEE') sm.currentState = 'FLEE';
        if (RABBIT_Root.userData.state === 'TAME') sm.currentState = 'TAME';

        sm.timer -= delta;
        if (sm.timer <= 0 && cur !== 'FLEE' && cur !== 'TAME') {
            sm.currentState = pickNextState();
            sm.timer = 2 + Math.random() * 6;
            if (sm.currentState === 'WALK') {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 8;
                sm.waypoint.set(sm.homePos.x + Math.cos(angle)*dist, sm.homePos.y, sm.homePos.z + Math.sin(angle)*dist);
            }
        }

        // ─── INDEPENDENT ANIMATIONS ───
        // Blink
        if (time > nextBlink) {
            const sc = Math.abs(Math.sin(time * 50)) > 0.8 ? 0.08 : 1.0;
            eyeL.scale.y = eyeR.scale.y = sc;
            if (sc === 1.0) nextBlink = time + 4 + Math.random() * 3;
        }

        // ─── STATE ANIMATIONS ───
        if (cur === 'IDLE') {
            RABBIT_Visuals.position.y = Math.sin(time * 1.4) * 0.018;
            RABBIT_EarL.rotation.z = 0.12 + Math.sin(time * 0.8) * 0.05;
            RABBIT_EarR.rotation.z = -0.12 + Math.sin(time * 0.8 + 0.5) * 0.05;
            RABBIT_Head.rotation.x = THREE.MathUtils.lerp(RABBIT_Head.rotation.x, 0, lf);
            RABBIT_Body.position.y = 0; // Reset old pos
            
            earTwitchTimer -= delta;
            if (earTwitchTimer <= 0) {
                const ear = Math.random() > 0.5 ? RABBIT_EarL : RABBIT_EarR;
                ear.rotation.z += 0.3;
                earTwitchTimer = 8 + Math.random() * 4;
            }
            [lFront, rFront, lBack, rBack].forEach(l => l.rotation.x = THREE.MathUtils.lerp(l.rotation.x, 0, lf));

        } else if (cur === 'WALK') {
            const walkSpd = 7.0;
            const hop = Math.abs(Math.sin(time * walkSpd));
            
            // WHOLE CHARACTER HOPS (loncat-loncat)
            RABBIT_Visuals.position.y = hop * 0.18;
            
            // Coordinated legs for jump
            lFront.rotation.x = rFront.rotation.x = -hop * 0.4;
            lBack.rotation.x = rBack.rotation.x = hop * 0.5;
            
            // Ear flop on landing
            RABBIT_EarL.rotation.x = RABBIT_EarR.rotation.x = 0.15 + (1.0 - hop) * 0.15;
            RABBIT_Body.position.y = 0; // reset old anim if any

        } else if (cur === 'SNIFF') {
            RABBIT_Head.rotation.x = Math.sin(time * 6.0) * 0.06;
            nose.position.z = 0.26 + Math.sin(time * 12.0) * 0.008;
            if (Math.floor(time) % 3 === 0 && !sm._sniffTag) {
                spawnText(Math.random() > 0.5 ? "...🌸?" : "...❓");
                sm._sniffTag = true;
            } else if (Math.floor(time) % 3 !== 0) sm._sniffTag = false;

        } else if (cur === 'GROOM') {
            RABBIT_Head.rotation.x = THREE.MathUtils.lerp(RABBIT_Head.rotation.x, 0.35, lf);
            lFront.position.y = THREE.MathUtils.lerp(lFront.position.y, -0.13 + Math.sin(time * 4.0)*0.05, lf);
            RABBIT_EarL.rotation.x = RABBIT_EarR.rotation.x = THREE.MathUtils.lerp(RABBIT_EarL.rotation.x, 0.2, lf);

        } else if (cur === 'DRINK') {
            RABBIT_Head.rotation.x = THREE.MathUtils.lerp(RABBIT_Head.rotation.x, 0.55, lf);
            RABBIT_Body.position.y = THREE.MathUtils.lerp(RABBIT_Body.position.y, -0.04, lf);
            if (time % 2 < 0.05) spawnRipple();

        } else if (cur === 'ALERT') {
            RABBIT_EarL.rotation.z = RABBIT_EarR.rotation.z = THREE.MathUtils.lerp(RABBIT_EarL.rotation.z, 0, lf);
            RABBIT_EarL.rotation.x = RABBIT_EarR.rotation.x = THREE.MathUtils.lerp(RABBIT_EarL.rotation.x, -0.12, lf);
            RABBIT_Head.rotation.y = Math.sin(time * 1.5) * 0.25;
            if (!sm._alerted) { spawnText("!", "#FFE566"); sm._alerted = true; }

        } else if (cur === 'FLEE') {
            const fleeSpd = 14.0;
            const hop = Math.abs(Math.sin(time * fleeSpd));
            
            // Fast hopping movement
            RABBIT_Visuals.position.y = hop * 0.28;
            RABBIT_Body.rotation.x = -hop * 0.15;
            
            lFront.rotation.x = rFront.rotation.x = -hop * 0.6;
            lBack.rotation.x = rBack.rotation.x = hop * 0.7;
            
            RABBIT_EarL.rotation.x = RABBIT_EarR.rotation.x = 0.35 + (1.0 - hop) * 0.25;
            RABBIT_Tail.position.y = hop * 0.05;
            RABBIT_Body.position.y = 0; // reset old anim

        } else if (cur === 'TAME') {
            RABBIT_Body.position.y = THREE.MathUtils.lerp(RABBIT_Body.position.y, -0.1, lf);
            RABBIT_EarL.rotation.x = RABBIT_EarR.rotation.x = 0.2;
            eyeL.scale.y = eyeR.scale.y = 0.6;
            if (time % 0.8 < 0.05) spawnHeart();
        }

        // Update hearts/labels
        updateCSSObjects(delta);
    }

    function spawnText(txt, color = "#ffffff") {
        const el = document.createElement('div');
        el.style.cssText = `color:${color}; font-weight:bold; font-size:1.2rem; filter:drop-shadow(0 2px 2px rgba(0,0,0,0.3))`;
        el.textContent = txt;
        const obj = new CSS2DObject(el);
        obj.position.set(0, 0.8, 0);
        RABBIT_Root.add(obj);
        hearts.push({ obj, life: 1.5, type: 'text' });
    }

    function spawnHeart() {
        const el = document.createElement('div');
        el.textContent = '❤️';
        el.style.fontSize = '1.2rem';
        const obj = new CSS2DObject(el);
        obj.position.set((Math.random()-0.5)*0.2, 0.6, (Math.random()-0.5)*0.2);
        RABBIT_Root.add(obj);
        hearts.push({ obj, life: 1.0, type: 'heart', vy: 0.6 });
    }

    function spawnRipple() {
        const m = new THREE.Mesh(rippleGeo, rippleMat.clone());
        m.rotation.x = -Math.PI/2;
        m.position.set(0, -0.4, 0.4);
        RABBIT_Root.add(m);
        hearts.push({ obj: m, life: 1.0, type: 'ripple' });
    }

    function updateCSSObjects(delta) {
        for(let i=hearts.length-1; i>=0; i--) {
            const h = hearts[i];
            h.life -= delta;
            if (h.type === 'heart') {
                h.obj.position.y += h.vy * delta;
            } else if (h.type === 'ripple') {
                h.obj.scale.addScalar(delta * 0.8);
                h.obj.material.opacity = h.life;
            }
            if (h.obj.element) h.obj.element.style.opacity = h.life;
            if (h.life <= 0) {
                RABBIT_Root.remove(h.obj);
                if (h.obj.geometry) h.obj.geometry.dispose();
                if (h.obj.material) h.obj.material.dispose();
                hearts.splice(i, 1);
            }
        }
    }

    return {
        root: RABBIT_Root,
        update: updateRabbit,
        refs: { body: RABBIT_Body, head: RABBIT_Head, ears: [RABBIT_EarL, RABBIT_EarR], eyes: [eyeL, eyeR] }
    };
}
