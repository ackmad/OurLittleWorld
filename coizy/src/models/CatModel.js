// ============================================================
//  CatModel.js — Chibi Low-Poly Cat  |  Pure Three.js Geometry
//  Dibangun dari SphereGeometry, BoxGeometry, CylinderGeometry,
//  ConeGeometry, CapsuleGeometry — tanpa model eksternal.
// ============================================================

import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// ─────────────────────────────────────────────
//  MATERIAL PALETTE
// ─────────────────────────────────────────────
const MAT_BODY   = new THREE.MeshStandardMaterial({ color: 0xF4A460, roughness: 0.9, flatShading: false });
const MAT_EAR_IN = new THREE.MeshStandardMaterial({ color: 0xFFB6C1, roughness: 0.9 });
const MAT_EYE    = new THREE.MeshStandardMaterial({ color: 0x1A1A1A, roughness: 0.4, metalness: 0.1 });
const MAT_EYE_HL = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
const MAT_NOSE   = new THREE.MeshStandardMaterial({ color: 0xFFB6C1, roughness: 0.8 });
const MAT_WHISKER= new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.95 });
const MAT_TAIL_TIP = new THREE.MeshStandardMaterial({ color: 0xC8855A, roughness: 0.9, flatShading: false });
const MAT_SHADOW = new THREE.MeshBasicMaterial({
  color: 0x5A3820,
  transparent: true,
  opacity: 0.2,
  depthWrite: false,
  side: THREE.DoubleSide
});

// ─────────────────────────────────────────────
//  HELPER: clone body material (to allow unique color tweaks)
// ─────────────────────────────────────────────
const bodyMat = () => MAT_BODY.clone();

// ─────────────────────────────────────────────
//  createCatModel()
//  Returns: { root: THREE.Group, update: fn(delta, time), refs: {} }
// ─────────────────────────────────────────────
export function createCatModel(scene) {
  const CAT_Root = new THREE.Group();
  CAT_Root.name = 'CAT_Root';
  CAT_Root.userData = {
    type: 'cat',
    label: '[E] Elus Kucing',
    state: 'IDLE',
    isBeingPet: false,
  };

  const CAT_Visuals = new THREE.Group();
  CAT_Visuals.name = 'CAT_Visuals';
  CAT_Root.add(CAT_Visuals);

  // ─── BODY ───
  const bodyGeo = new THREE.SphereGeometry(0.35, 16, 12);
  const body = new THREE.Mesh(bodyGeo, bodyMat());
  body.scale.set(1.0, 0.85, 1.1);
  body.castShadow = true;
  body.receiveShadow = true;
  body.name = 'NPC_Part';
  CAT_Visuals.add(body);

  // ─── HEAD ───
  const headGeo = new THREE.SphereGeometry(0.28, 16, 12);
  const head = new THREE.Mesh(headGeo, bodyMat());
  head.scale.set(1.0, 0.95, 0.95);
  head.position.set(0, 0.52, 0);
  head.castShadow = true;
  head.receiveShadow = true;
  head.name = 'NPC_Part';
  CAT_Visuals.add(head);

  // ─── EARS ───
  function makeEar(side) {
    const earGroup = new THREE.Group();

    // Outer ear (cone, 4 segments → triangular)
    const outerGeo = new THREE.ConeGeometry(0.08, 0.18, 4);
    const outerMesh = new THREE.Mesh(outerGeo, bodyMat());
    outerMesh.castShadow = true;
    outerMesh.receiveShadow = true;
    earGroup.add(outerMesh);

    // Inner ear (smaller pink cone)
    const innerGeo = new THREE.ConeGeometry(0.045, 0.11, 4);
    const innerMesh = new THREE.Mesh(innerGeo, MAT_EAR_IN);
    innerMesh.position.y = 0.01;
    innerMesh.position.z = 0.01;
    earGroup.add(innerMesh);

    // Position relative to head
    earGroup.position.set(side * 0.16, 0.26, 0);
    earGroup.rotation.z = side * -0.25; // slight inward tilt
    return earGroup;
  }

  const earL = makeEar(-1);
  const earR = makeEar(1);
  earL.name = 'earL';
  earR.name = 'earR';
  head.add(earL, earR);

  // ─── EYES ───
  function makeEye(side) {
    const eyeGeo = new THREE.SphereGeometry(0.055, 10, 8);
    const eye = new THREE.Mesh(eyeGeo, MAT_EYE.clone());
    eye.position.set(side * 0.12, 0.05, 0.25);
    eye.castShadow = false;

    // Sparkle highlight
    const hlGeo = new THREE.SphereGeometry(0.02, 6, 6);
    const hl = new THREE.Mesh(hlGeo, MAT_EYE_HL);
    hl.position.set(side * 0.012, 0.018, 0.04);
    eye.add(hl);

    return eye;
  }

  const eyeL = makeEye(-1);
  const eyeR = makeEye(1);
  eyeL.name = 'eyeL';
  eyeR.name = 'eyeR';
  head.add(eyeL, eyeR);

  // ─── NOSE ───
  const noseGeo = new THREE.SphereGeometry(0.025, 8, 6);
  const nose = new THREE.Mesh(noseGeo, MAT_NOSE);
  nose.position.set(0, -0.04, 0.27);
  head.add(nose);

  // ─── WHISKERS ───
  function makeWhisker(side) {
    const geo = new THREE.CylinderGeometry(0.008, 0.004, 0.22, 4);
    const mesh = new THREE.Mesh(geo, MAT_WHISKER);
    // Rotate 90° on Z so cylinder lies horizontally
    mesh.rotation.z = Math.PI / 2;
    // Slight downward tilt
    mesh.rotation.x = side * 0.1;
    mesh.position.set(side * 0.14, -0.04, 0.25);
    return mesh;
  }

  head.add(makeWhisker(-1), makeWhisker(1));

  // ─── LEGS (CapsuleGeometry) ───
  const LEG_MAT = bodyMat();
  const LEG_GEO = new THREE.CapsuleGeometry(0.07, 0.14, 4, 8);

  function makeLeg(name, x, z) {
    const leg = new THREE.Mesh(LEG_GEO, LEG_MAT);
    leg.position.set(x, -0.32, z);
    leg.castShadow = true;
    leg.receiveShadow = true;
    leg.name = 'NPC_Part';
    return leg;
  }

  const lFrontLeg = makeLeg('lFrontLeg', -0.18, 0.10);
  const rFrontLeg = makeLeg('rFrontLeg',  0.18, 0.10);
  const lBackLeg  = makeLeg('lBackLeg',  -0.15, -0.12);
  const rBackLeg  = makeLeg('rBackLeg',   0.15, -0.12);
  CAT_Visuals.add(lFrontLeg, rFrontLeg, lBackLeg, rBackLeg);

  // ─── TAIL (5 sphere chain) ───
  const tailGroup = new THREE.Group();
  tailGroup.position.set(-0.02, -0.10, -0.35);
  tailGroup.name = 'tailRoot';
  CAT_Visuals.add(tailGroup);

  const tailRadii  = [0.07, 0.063, 0.054, 0.044, 0.03];
  const tailSpheres = [];

  // Tail curves up in S-shape: each segment offsets Y+/Z+ incrementally
  const tailOffsets = [
    { x: 0,    y: 0,    z: 0    },
    { x: 0,    y: 0.08, z: -0.12 },
    { x: 0,    y: 0.20, z: -0.20 },
    { x: 0.02, y: 0.30, z: -0.14 },
    { x: 0.03, y: 0.38, z: -0.05 },
  ];

  tailOffsets.forEach((offset, i) => {
    const isTip = i === tailOffsets.length - 1;
    const mat   = isTip ? MAT_TAIL_TIP.clone() : bodyMat();
    const geo   = new THREE.SphereGeometry(tailRadii[i], 10, 8);
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.set(offset.x, offset.y, offset.z);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    sphere.name = `tailSeg${i}`;
    tailGroup.add(sphere);
    tailSpheres.push(sphere);
  });

  // ─── SHADOW BLOB ───
  const shadowGeo = new THREE.PlaneGeometry(0.9, 0.9);
  const shadowBlob = new THREE.Mesh(shadowGeo, MAT_SHADOW.clone());
  shadowBlob.rotation.x = -Math.PI / 2;
  shadowBlob.position.y = -0.42;
  shadowBlob.name = 'shadowBlob';
  shadowBlob.castShadow  = false;
  shadowBlob.receiveShadow = false;
  CAT_Visuals.add(shadowBlob);

  // ─────────────────────────────────────────────────────
  //  ANIMATION STATE MACHINE
  // ─────────────────────────────────────────────────────
  const STATE = { IDLE: 'IDLE', WALK: 'WALK', SIT: 'SIT', PET: 'PET', FLEE: 'FLEE' };
  let currentState = STATE.IDLE;

  // Blink system
  let blinkTimer    = 3 + Math.random() * 2; // seconds until next blink
  let blinkProgress = -1; // -1 = not blinking

  // PET heart emitter
  let petHeartTimer  = 0;
  const activeHearts = [];  // { css2d, vy, opacity }

  // Body Y base for breath animation
  const bodyBaseY = 0;

  // Transition refs (for lerp smoothing)
  const _targetBodyRotX  = { v: 0 };
  const _targetHeadRotXMin = { v: 0 };
  const _targetHeadRotXMax = { v: 0 };
  let headOscillating = false;

  // ─── MAIN UPDATE FUNCTION ───
  function updateCat(delta, time) {
    // Snap state from userData (set by NPCManager / interaction system)
    currentState = CAT_Root.userData.state || STATE.IDLE;

    const lf = 6.0 * delta; // lerp factor

    // ─── Per-state target transforms ───────────────────────────────
    if (currentState === STATE.IDLE) {
      // Breathing: visuals bob gently
      CAT_Visuals.position.y = THREE.MathUtils.lerp(
        CAT_Visuals.position.y,
        Math.sin(time * 1.8) * 0.025,
        lf
      );
      // Body upright
      body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0, lf);
      head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, 0, lf);

      // Idle leg rest
      [lFrontLeg, rFrontLeg, lBackLeg, rBackLeg].forEach(leg => {
        leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, lf);
        leg.position.y = THREE.MathUtils.lerp(leg.position.y, -0.32, lf);
      });

      // Tail sway
      tailGroup.rotation.z = Math.sin(time * 2.2) * 0.4;
      headOscillating = false;

    } else if (currentState === STATE.WALK) {
      const walkSpeed = 8.0;
      const s = Math.sin(time * walkSpeed);
      const amplitude = 0.35;

      // Diagonal legs (FL + BR together, FR + BL together)
      lFrontLeg.rotation.x = s * amplitude;
      rFrontLeg.rotation.x = -s * amplitude;
      lBackLeg.rotation.x  = -s * amplitude;
      rBackLeg.rotation.x  = s * amplitude;

      // Body slight bob
      CAT_Visuals.position.y = Math.sin(time * walkSpeed * 2) * 0.015;
      body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0, lf);
      tailGroup.rotation.z = Math.sin(time * 3.0) * 0.25;
      headOscillating = false;

    } else if (currentState === STATE.SIT) {
      // Lean body forward slightly
      body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0.2, lf);
      CAT_Visuals.position.y = THREE.MathUtils.lerp(CAT_Visuals.position.y, -0.06, lf);

      // Front legs tucked under
      lFrontLeg.rotation.x = THREE.MathUtils.lerp(lFrontLeg.rotation.x, 0.55, lf);
      rFrontLeg.rotation.x = THREE.MathUtils.lerp(rFrontLeg.rotation.x, 0.55, lf);
      lFrontLeg.position.y = THREE.MathUtils.lerp(lFrontLeg.position.y, -0.22, lf);
      rFrontLeg.position.y = THREE.MathUtils.lerp(rFrontLeg.position.y, -0.22, lf);
      lBackLeg.rotation.x  = THREE.MathUtils.lerp(lBackLeg.rotation.x, 0, lf);
      rBackLeg.rotation.x  = THREE.MathUtils.lerp(rBackLeg.rotation.x, 0, lf);

      // Tail curls to side
      tailGroup.rotation.z = THREE.MathUtils.lerp(tailGroup.rotation.z, 1.2, lf);
      head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, 0, lf);
      headOscillating = false;

    } else if (currentState === STATE.PET) {
      // Head nods up-down
      head.rotation.x = Math.sin(time * 4.0) * 0.2;
      tailGroup.rotation.z = Math.sin(time * 6.0) * 0.6;

      CAT_Visuals.position.y = THREE.MathUtils.lerp(CAT_Visuals.position.y, 0.02, lf);
      body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0, lf);
      [lFrontLeg, rFrontLeg, lBackLeg, rBackLeg].forEach(leg => {
        leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, lf);
        leg.position.y = THREE.MathUtils.lerp(leg.position.y, -0.32, lf);
      });

      // Spawn heart emojis every 0.5s
      petHeartTimer -= delta;
      if (petHeartTimer <= 0) {
        petHeartTimer = 0.5;
        spawnHeart();
      }
      headOscillating = true;

    } else if (currentState === STATE.FLEE) {
      const fleeSpeed = 12.0;
      const s = Math.sin(time * fleeSpeed);
      lFrontLeg.rotation.x = s * 0.45;
      rFrontLeg.rotation.x = -s * 0.45;
      lBackLeg.rotation.x  = -s * 0.45;
      rBackLeg.rotation.x  = s * 0.45;
      CAT_Visuals.position.y = Math.sin(time * fleeSpeed * 2) * 0.012;
      tailGroup.rotation.z = Math.sin(time * 4.0) * 0.5;
      body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, -0.15, lf);
      headOscillating = false;
    }

    // ─── BLINK SYSTEM ───────────────────────────────────────────────
    blinkTimer -= delta;
    if (blinkTimer <= 0 && blinkProgress < 0) {
      blinkProgress = 0;   // start blink
      blinkTimer = 3 + Math.random() * 2; // schedule next blink
    }

    if (blinkProgress >= 0) {
      blinkProgress += delta;
      const BLINK_HALF = 0.08; // 80ms total = BLINK_HALF seconds close, then open

      if (blinkProgress < BLINK_HALF) {
        // Closing (scaleY: 1 → 0.05)
        const t = blinkProgress / BLINK_HALF;
        const sc = THREE.MathUtils.lerp(1.0, 0.05, t);
        eyeL.scale.y = sc;
        eyeR.scale.y = sc;
      } else if (blinkProgress < BLINK_HALF * 2) {
        // Opening (scaleY: 0.05 → 1)
        const t = (blinkProgress - BLINK_HALF) / BLINK_HALF;
        const sc = THREE.MathUtils.lerp(0.05, 1.0, t);
        eyeL.scale.y = sc;
        eyeR.scale.y = sc;
      } else {
        // Done
        eyeL.scale.y = 1.0;
        eyeR.scale.y = 1.0;
        blinkProgress = -1;
      }
    }

    // ─── SHADOW SCALE by Y height ───────────────────────────────────
    const groundOffset = CAT_Root.position.y; // relative ground offset
    const shadowScale  = Math.max(0.3, 1.0 - groundOffset * 0.5);
    shadowBlob.scale.setScalar(shadowScale);

    // ─── HEART PARTICLES UPDATE ──────────────────────────────────────
    for (let i = activeHearts.length - 1; i >= 0; i--) {
      const h = activeHearts[i];
      h.vy += 0.8 * delta;
      h.css2d.position.y += h.vy * delta;
      h.opacity -= delta * 0.6;
      if (h.css2d.element) {
        h.css2d.element.style.opacity = Math.max(0, h.opacity).toFixed(2);
      }
      if (h.opacity <= 0) {
        if (h.css2d.parent) h.css2d.parent.remove(h.css2d);
        activeHearts.splice(i, 1);
      }
    }
  }

  // ─── SPAWN HEART EMOJI ─────────────────────────────────────────────
  function spawnHeart() {
    const el = document.createElement('div');
    el.style.cssText = `
      font-size: 1.4rem;
      pointer-events: none;
      user-select: none;
      opacity: 1;
      transition: none;
    `;
    el.textContent = '❤️';

    const heartLabel = new CSS2DObject(el);
    heartLabel.position.set(
      (Math.random() - 0.5) * 0.3,
      0.6,
      (Math.random() - 0.5) * 0.3
    );
    CAT_Root.add(heartLabel);

    activeHearts.push({ css2d: heartLabel, vy: 0.4, opacity: 1.0 });
  }

  // ─── INTERACTION CHECK (call from main.js raycasting) ──────────────
  function pet() {
    CAT_Root.userData.state = 'PET';
    CAT_Root.userData.isBeingPet = true;
  }

  return {
    root: CAT_Root,
    update: updateCat,
    pet,
    head,
    body,
    tailGroup,
    lFrontLeg, rFrontLeg, lBackLeg, rBackLeg,
    tailSpheres,
    shadowBlob,
    eyeL, eyeR,
    refs: {
      head, body, tailGroup,
      lFrontLeg, rFrontLeg, lBackLeg, rBackLeg,
      tailSpheres, shadowBlob, eyeL, eyeR,
    }
  };
}
