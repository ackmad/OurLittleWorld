// ============================================================
//  ButterflyModel.js — Cinematic Chibi Butterfly v2
//  High-Fidelity Animations & State-Driven Flight
// ============================================================

import * as THREE from 'three';
import gsap from 'gsap';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

const VARIANTS = {
    monarch:    { base: '#E8711A', border: '#1A1A1A' },
    morpho:     { base: '#3B82F6', border: '#1D4ED8', metallic: 0.8, roughness: 0.1 },
    swallowtail:{ base: '#FDE047', border: '#1A1A1A' },
    rose:       { base: '#F472B6', border: '#831843' },
    emerald:    { base: '#10B981', border: '#065F46', metallic: 0.5 }
};

function createButterflyTexture(variant) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = variant.base; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = variant.border; ctx.lineWidth = 10;
    ctx.beginPath();
    for(let i=0; i<6; i++) {
        ctx.moveTo(20, 128);
        ctx.quadraticCurveTo(128, 128 + (i-3)*40, 240, 60 + i*30);
    }
    ctx.stroke();
    ctx.fillStyle = variant.border; ctx.fillRect(0,0,256,15); ctx.fillRect(0,241,256,15); ctx.fillRect(241,0,15,256);
    ctx.fillStyle = '#FFFFFF';
    for(let i=0; i<12; i++) {
        ctx.beginPath(); ctx.arc(Math.random()*256, Math.random()*256, 2, 0, Math.PI*2); ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
}

export function createButterflyModel(scene, variantKey = 'monarch') {
    const variant = VARIANTS[variantKey] || VARIANTS.monarch;
    const BUTTERFLY_Root = new THREE.Group();
    BUTTERFLY_Root.name = 'BUTTERFLY_Root';

    const BUTTERFLY_Visuals = new THREE.Group();
    BUTTERFLY_Root.add(BUTTERFLY_Visuals);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1A1A2E, roughness: 0.6, metalness: 0.3 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), bodyMat); head.position.z = 0.12;
    const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), bodyMat);
    const abdomen = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.048, 0.18, 8), bodyMat);
    abdomen.position.z = -0.1; abdomen.rotation.x = Math.PI/2;
    BUTTERFLY_Visuals.add(head, thorax, abdomen);

    function makeAntenna(side) {
        const a = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.14), bodyMat);
        a.position.set(side * 0.03, 0.04, 0.15); a.rotation.set(-0.6, 0, side * 0.25);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), new THREE.MeshStandardMaterial({ color: 0xFFE566, emissive: 0xFFD700 }));
        knob.position.y = 0.07; a.add(knob); BUTTERFLY_Visuals.add(a);
        return a;
    }
    const antL = makeAntenna(-1); const antR = makeAntenna(1);

    const wingTex = createButterflyTexture(variant);
    const wingMat = new THREE.MeshStandardMaterial({ map: wingTex, side: THREE.DoubleSide, transparent: true, alphaTest: 0.1 });

    function createWingGeo(isTop) {
        const s = new THREE.Shape();
        if(isTop) { s.moveTo(0,0); s.bezierCurveTo(0.1, 0.3, 0.35, 0.35, 0.38, 0.1); s.quadraticCurveTo(0.35, -0.1, 0.2, -0.15); s.quadraticCurveTo(0.05, -0.05, 0, 0); }
        else { s.moveTo(0,0); s.bezierCurveTo(0.1, -0.2, 0.25, -0.25, 0.28, -0.1); s.quadraticCurveTo(0.25, 0.1, 0.1, 0.1); s.quadraticCurveTo(0.05, 0.05, 0, 0); }
        return new THREE.ShapeGeometry(s);
    }

    const WING_TopL = new THREE.Group(); const WING_TopR = new THREE.Group();
    const WING_BotL = new THREE.Group(); const WING_BotR = new THREE.Group();
    const tG = createWingGeo(true); const bG = createWingGeo(false);

    const mTL = new THREE.Mesh(tG, wingMat); mTL.scale.x = -1; mTL.rotation.x = -Math.PI/2; WING_TopL.add(mTL);
    const mTR = new THREE.Mesh(tG, wingMat); mTR.rotation.x = -Math.PI/2; WING_TopR.add(mTR);
    const mBL = new THREE.Mesh(bG, wingMat); mBL.scale.x = -1; mBL.rotation.x = -Math.PI/2; WING_BotL.add(mBL);
    const mBR = new THREE.Mesh(bG, wingMat); mBR.rotation.x = -Math.PI/2; WING_BotR.add(mBR);

    WING_TopL.position.set(-0.02, 0, 0.04); WING_TopR.position.set(0.02, 0, 0.04);
    WING_BotL.position.set(-0.02, 0, -0.02); WING_BotR.position.set(0.02, 0, -0.02);
    BUTTERFLY_Visuals.add(WING_TopL, WING_TopR, WING_BotL, WING_BotR);

    BUTTERFLY_Root.scale.setScalar(0.4);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.12, depthWrite: false }));
    shadow.rotation.x = -Math.PI/2; shadow.position.y = -0.5; BUTTERFLY_Root.add(shadow);

    // Initial state
    BUTTERFLY_Root.userData = {
        type: 'butterfly', variant: variantKey, state: 'FLYING',
        curve: null, curveT: 0, speed: 0.12, 
        flapFreq: 16.0, flapAmp: 0.78, 
        homePos: new THREE.Vector3(),
        landingPos: new THREE.Vector3(), landingNormal: new THREE.Vector3(0,1,0),
        landTimer: 0, trustTimer: 0,
        seedX: Math.random()*10, seedZ: Math.random()*10
    };

    function updateButterfly(delta, time, playerPos, camera) {
        const ud = BUTTERFLY_Root.userData;
        const lf = 5.0 * delta;

        // State Machine Animation Parameter Handling
        if(ud.state === 'FLYING') { ud.flapFreq = 16.0; ud.flapAmp = 0.78; }
        else if(ud.state === 'HOVERING') { ud.flapFreq = 9.0; ud.flapAmp = 0.65; }
        else if(ud.state === 'LANDED') { ud.flapFreq = 2.5; ud.flapAmp = 0.18; }
        else if(ud.state === 'TAKING_OFF') { ud.flapFreq = 22.0; ud.flapAmp = 0.95; }
        else if(ud.state === 'SEEKING_LAND') { /* managed in NPCManager */ }

        // Wing Animation with Phase Offsets
        const f = ud.flapFreq;
        const amp = ud.flapAmp;
        const t = time;
        
        // Asymmetry mikro + top/bot offset
        const flapL = Math.sin(t * f + 0.08) * amp;
        const flapR = Math.sin(t * f) * amp;
        const flapBotL = Math.sin(t * f + 0.33) * (amp * 0.8);
        const flapBotR = Math.sin(t * f + 0.25) * (amp * 0.8);

        WING_TopL.rotation.z = -flapL; WING_TopR.rotation.z = flapR;
        WING_BotL.rotation.z = -flapBotL; WING_BotR.rotation.z = flapBotR;

        // Turbulence & Noise
        if(ud.state === 'FLYING' || ud.state === 'HOVERING' || ud.state === 'SEEKING_LAND') {
            const noiseX = Math.sin(t * 4.2 + ud.seedX) * 0.03;
            const noiseZ = Math.sin(t * 3.1 + ud.seedZ) * 0.025;
            const noiseY = Math.sin(t * 2.8) * 0.04;
            BUTTERFLY_Visuals.position.set(noiseX, noiseY, noiseZ);
        } else {
            BUTTERFLY_Visuals.position.set(0,0,0);
        }

        // Antenna movement on LANDED (warm rocks etc)
        if(ud.state === 'LANDED') {
            antL.rotation.x = -0.6 + Math.sin(t * 2.0) * 0.06;
            antR.rotation.x = -0.6 + Math.sin(t * 2.0 + 1.0) * 0.06;
        }

        // Shadow handling
        shadow.position.y = -BUTTERFLY_Root.position.y;
        shadow.scale.setScalar(Math.max(0.1, 1.0 - (BUTTERFLY_Root.position.y * 0.2)));
        shadow.material.opacity = 0.12 / Math.max(1, BUTTERFLY_Root.position.y * 0.5);
    }

    return { root: BUTTERFLY_Root, update: updateButterfly };
}
