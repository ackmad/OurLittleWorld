// ============================================================
//  Coizy — Our Little World  |  main.js
//  Struktur yang benar: UI Login langsung aktif,
//  RAPIER & 3D World diinisialisasi secara async.
// ============================================================

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import gsap from 'gsap';
import { io } from 'socket.io-client';
import { WorldBuilder } from './WorldBuilder.js';
import { NPCManager } from './NPCManager.js';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

// ========================
// GLOBAL STATE
// ========================
let inGame = false;
let worldBuilder, socket;
let physicsWorld, Layers;
let playerBody;
const peers = {};
let interactables = [];
let npcManager;
let composer, vignettePass, bloomPass;
let playerState = 'idle'; // idle, leaning, sitting_pond, sitting_rock
let inventory = { lavender: 0, daisy: 0, heather: 0 };
let interactionCooldown = new Map();
let sittingObj = null;
let rockCarvings = JSON.parse(localStorage.getItem('coizy_carvings') || '{}');
let starNames = JSON.parse(localStorage.getItem('coizy_stars') || '{}');
let cravingTarget = null;
let starTarget = null;
let isFreeCam = false;
let playerVisual = null;

// === PERBAIKAN 2: VARIABEL ROTASI KAMERA ===
let cameraYaw = 0;     // rotasi horizontal (radian)
let cameraPitch = 0;   // rotasi vertikal (radian)
let isPointerLocked = false;
const MOUSE_SENSITIVITY = 0.002;

// === PERBAIKAN 3: SISTEM DEBUG ===
const DEBUG_MODE = true;
function debugLog(kategori, pesan, data = null) {
  if (!DEBUG_MODE) return;
  const waktu = performance.now().toFixed(0);
  const prefix = `[${waktu}ms]`;
  if (data) console.log(`${prefix} ${kategori} ${pesan}`, data);
  else console.log(`${prefix} ${kategori} ${pesan}`);
}
const keysPressed = {};

// Pesan error login yang makin lucu
const errorMessages = [
  "Hmm... kode itu kayaknya bukan milikmu deh 👀",
  "Masih salah! Kamu yakin ini duniamu? 😅",
  "Bro... itu bukan kodenya. Minta lagi sama orangnya 😭",
  "Okay ini udah 4x... kamu nyasar ya? 💀",
  "5 kali salah. Aku mulai khawatir sama hidupmu 😂",
  "Udah deh pulang aja, ini bukan duniamu 🚪💨"
];
let loginAttempts = 0;

// ========================
// 1. THREE.JS CORE — Setup langsung (tidak tunggu RAPIER)
// ========================
const canvas = document.querySelector('#bg-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 5000);
camera.position.set(0, 10, 40);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
// Membatasi pixel ratio ke 0.8 untuk performa drastis ("Chunky Flat Pastel" makin terasa)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 0.8));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;

const effect = new OutlineEffect(renderer, {
  defaultThickness: 0.0035,
  defaultColor: [0.65, 0.55, 0.45], // Pastel warm gray outline instead of harsh black
  defaultAlpha: 1.0,
  defaultKeepAlive: true
});

// Sky & Fog globals
let sky, sun;
function setupSky() {
  scene.background = new THREE.Color(0xC2E4FB); // Baby Blue
  scene.fog = new THREE.Fog(0xC2E4FB, 35, 300);

  // Still use the sky dome for a beautiful gradient, but update colors to match spec
  const skyGeo = new THREE.SphereGeometry(2000, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor:    { value: new THREE.Color(0xC2E4FB) }, // Baby Blue
      bottomColor: { value: new THREE.Color(0xF8D4E4) } // Rose Mist horizon
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vWorldPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(0.0, h)), 1.0);
      }
    `
  });
  skyMat.userData.outlineParameters = { visible: false };

  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  skyMesh.name = "SkyDome";
  scene.add(skyMesh);
  window._skyMesh = skyMesh;
  
  console.log('✅ SKY: Sky dome berhasil dibuat dan ditambahkan ke scene');
  
  sun = new THREE.Vector3();
  // Set up the sun positional light
  const phi = THREE.MathUtils.degToRad(55); // 55° from zenith = 35° above horizon (cozy afternoon)
  const theta = THREE.MathUtils.degToRad(200); // slightly to the side
  sun.setFromSphericalCoords(1, phi, theta);
}
setupSky();

// Lighting — Phase 1 Specifications
const ambientLight = new THREE.AmbientLight(0xDDD4F8, 0.95); // Lavender ambient
scene.add(ambientLight);

const sd = 120; // Increased shadow area for larger island
const sunLight = new THREE.DirectionalLight(0xFFF0A8, 2.5); // Butter daylight
sunLight.position.set(120, 160, 100);
sunLight.castShadow = true;
sunLight.shadow.mapSize.setScalar(1024);
sunLight.shadow.camera.left = -sd;
sunLight.shadow.camera.right = sd;
sunLight.shadow.camera.top = sd;
sunLight.shadow.camera.bottom = -sd;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 250;
sunLight.shadow.bias = -0.0008;
sunLight.shadow.radius = 16;
scene.add(sunLight);

const hemiLight = new THREE.HemisphereLight(0xF8D4E4, 0xFDDBB4, 1.2); // Rose mist sky, Peach ground
scene.add(hemiLight);

// Post Processing — Vignette + Bloom (Bloom strength dinamis via settings)
composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 
  0.25,  // strength lembut (Perbaikan 6)
  0.5,   // radius
  0.75   // threshold
);
composer.addPass(bloomPass);
vignettePass = new ShaderPass(VignetteShader);
vignettePass.uniforms['offset'].value = 1.1;
vignettePass.uniforms['darkness'].value = 0.5;
composer.addPass(vignettePass);

// CSS2D Renderer
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);

// ========================
// 2. LOBBY ASSETS
// ========================
const lobbyGroup = new THREE.Group();
scene.add(lobbyGroup);

const lobbyIsland = new THREE.Mesh(
  new THREE.CylinderGeometry(15, 8, 10, 32),
  new THREE.MeshStandardMaterial({ color: '#5b8a5b', roughness: 0.8 })
);
lobbyIsland.receiveShadow = true;
lobbyGroup.add(lobbyIsland);

for (let i = 0; i < 8; i++) {
  const tree = new THREE.Mesh(
    new THREE.ConeGeometry(1.5, 5, 8),
    new THREE.MeshStandardMaterial({ color: '#2a5e2a' })
  );
  tree.position.set((Math.random()-0.5)*15, 7.5, (Math.random()-0.5)*15);
  tree.castShadow = true;
  lobbyGroup.add(tree);
}
lobbyGroup.position.set(0, -10, -30);

// ========================
// MANUAL POINTER LOCK SYSTEM (Bug 1 & 5 fix)
// ========================
let _userSens = 0.002; // Will be updated from settings

// === PERBAIKAN 2: SISTEM POINTER LOCK & MOUSE HANDLER ===
function setupPointerLock() {
  const canvas = renderer.domElement;

  canvas.addEventListener('click', () => {
    if (!inGame) return;
    canvas.requestPointerLock();
    debugLog('🖱️ POINTER LOCK', 'Meminta pointer lock ke browser...');
  });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      isPointerLocked = true;
      document.body.classList.add('pointer-locked');
      debugLog('✅ POINTER LOCK', 'Aktif! Mouse sekarang terkunci ke game');
      document.addEventListener('mousemove', onMouseMove);
    } else {
      isPointerLocked = false;
      document.body.classList.remove('pointer-locked');
      debugLog('❌ POINTER LOCK', 'Tidak aktif, mouse bebas (menu terbuka?)');
      document.removeEventListener('mousemove', onMouseMove);
      if (inGame) {
        const memBook = document.getElementById('memory-book');
        const emoteW = document.getElementById('emote-wheel');
        if ((!memBook || memBook.classList.contains('hidden')) && 
            (!emoteW || emoteW.classList.contains('hidden'))) {
          document.getElementById('pause-menu')?.classList.remove('hidden');
        }
      }
    }
  });

  document.addEventListener('pointerlockerror', () => {
    debugLog('⚠️ POINTER LOCK', 'Terjadi error saat mencoba mengunci pointer');
  });
}

function onMouseMove(event) {
  if (!isPointerLocked) return;
  
  // horizontal
  cameraYaw -= event.movementX * MOUSE_SENSITIVITY;
  
  // vertikal
  cameraPitch -= event.movementY * MOUSE_SENSITIVITY;
  
  // CLAMP pitch (Bug 1 Fix)
  const MAX_PITCH = Math.PI / 2 - 0.05; // ~85 derajat
  cameraPitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, cameraPitch));
  
  // TIDAK merotasi playerGroup di sini agar tidak double rotation
}

function updateCameraRotation() {
  // Buat quaternion dari yaw (rotasi Y dunia)
  const yawQuat = new THREE.Quaternion();
  yawQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
  
  // Buat quaternion dari pitch (rotasi X lokal)
  const pitchQuat = new THREE.Quaternion();
  pitchQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), cameraPitch);
  
  // Gabungkan: yaw dulu, baru pitch
  camera.quaternion.copy(yawQuat).multiply(pitchQuat);
}

function lockPointer() {
  renderer.domElement.requestPointerLock();
}

function unlockPointer() {
  if (document.pointerLockElement) document.exitPointerLock();
}

function togglePause() {
  if (!inGame) return;
  const pauseMenu = document.getElementById('pause-menu');
  const isHidden = pauseMenu.classList.contains('hidden');
  
  if (isHidden) {
    if (isPointerLocked) unlockPointer();
    else pauseMenu.classList.remove('hidden');
  } else {
    pauseMenu.classList.add('hidden');
    document.getElementById('settings-panel').classList.add('hidden');
    lockPointer();
  }
}

// ========================
// 3. PLAYER & GAME GROUP
// ========================
const playerGroup = new THREE.Group();
playerGroup.rotation.order = 'YXZ'; 
scene.add(playerGroup);

function toggleFreeCam() {
  if (!inGame) return;
  
  // Jika sedang bertransisi kembali, jangan izinkan toggle spam
  if (camera.userData.isTransitioning) return;
  
  isFreeCam = !isFreeCam;
  
  if (isFreeCam) {
    // Save current world transform
    const worldPos = new THREE.Vector3();
    camera.getWorldPosition(worldPos);
    const worldQuat = new THREE.Quaternion();
    camera.getWorldQuaternion(worldQuat);
    
    // Detach from player and add to scene root
    scene.add(camera);
    camera.position.copy(worldPos);
    camera.quaternion.copy(worldQuat);
    
    if (playerVisual) playerVisual.visible = true;
    showNotificationToast("👁️ MATA TUHAN AKTIF (Tombol V untuk kembali)");
    debugLog('📷 CAMERA', 'God Mode: ON');
  } else {
    showNotificationToast("✨ Kembali ke tubuh...");
    debugLog('📷 CAMERA', 'God Mode: OFF, transisi...');
    camera.userData.isTransitioning = true;
    
    // Simpan state awal kamera saat mode God OFF
    const startPos = camera.position.clone();
    const startQuat = camera.quaternion.clone();

    // Buat objek bantuan didalam playerGroup untuk lacak target 3D dinamis
    const tempTarget = new THREE.Object3D();
    tempTarget.position.set(0, 1.1, 0);
    playerGroup.add(tempTarget);
    
    // Terapkan rotasi pandangan yaw/pitch default
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), cameraPitch);
    tempTarget.quaternion.copy(yawQuat).multiply(pitchQuat);
    
    const proxy = { t: 0 };
    gsap.to(proxy, {
      t: 1,
      duration: 1.2,
      ease: "power2.inOut",
      onUpdate: () => {
        // Kalkulasi posisi target world dinamis di setiap frame
        const targetPos = new THREE.Vector3();
        tempTarget.getWorldPosition(targetPos);
        const targetQuat = new THREE.Quaternion();
        tempTarget.getWorldQuaternion(targetQuat);
        
        // Lerp dari posisi melayang ke posisi karakter
        camera.position.lerpVectors(startPos, targetPos, proxy.t);
        camera.quaternion.slerpQuaternions(startQuat, targetQuat, proxy.t);
      },
      onComplete: () => {
        playerGroup.remove(tempTarget);
        
        // Pasang kembali (attach) kamera ke kepala player
        playerGroup.add(camera);
        camera.position.set(0, 1.1, 0);
        camera.rotation.set(0, 0, 0);
        updateCameraRotation();
        
        if (playerVisual && !isThirdPerson) playerVisual.visible = false;
        camera.userData.isTransitioning = false;
      }
    });
  }
}

const gameGroup = new THREE.Group();
scene.add(gameGroup);
gameGroup.visible = false;

// ========================
// 4. ANIMATE LOOP — Berjalan dari awal
// ========================
let lastT = performance.now();
let lastEmitT = 0, lastRayT = 0;

// Physics & movement state
let currentVel = new THREE.Vector3();
let verticalVelocity = 0;
let isGrounded = false;
let coyoteTimer = 0;
let jumpBufferTimer = 0;
let isSprint = false, isCrouch = false, isThirdPerson = false;
let isClimbing = false, ladderObj = null;
let headBobTimer = 0;
const moveState = { w: false, a: false, s: false, d: false };
const gravityForce = -22;
const jumpForce = 16.5; // Loncat dipertinggi agar lebih terasa impact-nya

// Interaction
let currentInteractable = null;
let promptObj = null;

// === PERBAIKAN 1: SISTEM RESPAWN AMAN ===
function respawnPlayer() {
  // Spawn just above the island's highest point (~8-11 units)
  const spawnX = 0, spawnZ = 0, spawnY = 12;
  
  if (playerBody) {
    playerBody.setTranslation({ x: spawnX, y: spawnY, z: spawnZ }, true);
    playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  }
  
  currentVel.set(0, 0, 0);
  verticalVelocity = 0;
  isGrounded = false;
  
  cameraYaw = 0;
  cameraPitch = -0.1; // slight downward look at spawn
  playerGroup.rotation.y = 0;
  camera.position.set(0, 0.75, 0); // Local to playerGroup (eye height)
  updateCameraRotation();
  
  debugLog('🌟 RESPAWN', `Player dispawn di ketinggian Y:${spawnY} (jatuh ke pulau...)`);
}

let debugFrameCounter = 0;

function animate() {
  requestAnimationFrame(animate);
  const time = performance.now();
  const rawDelta = (time - lastT) / 1000;
  const delta = Math.min(rawDelta, 0.05);

  if (!inGame) {
    lobbyGroup.position.y = -10 + Math.sin(time * 0.001) * 1;
    lobbyGroup.rotation.y = time * 0.0001;
  }

  if (inGame && playerBody && physicsWorld) {
    updatePhysics(delta, time);
    updateCameraRotation(); // PERBAIKAN 2
    
    // === PERBAIKAN 4: DEBUG PHYSICS BERKALA ===
    debugFrameCounter++;
    if (debugFrameCounter % 120 === 0) {
      const pTrans = playerBody.translation();
      const degYaw = ((-cameraYaw * 180/Math.PI) % 360 + 360) % 360;
      const degPitch = (cameraPitch * 180/Math.PI).toFixed(1);
      console.log('─────────────────────────────────────');
      console.log(`📊 STATUS (120f): Pos[${pTrans.x.toFixed(1)}, ${pTrans.y.toFixed(1)}, ${pTrans.z.toFixed(1)}] | Ground: ${isGrounded?'✅':'❌'}`);
      console.log(`   Yaw: ${degYaw.toFixed(1)}° | Pitch: ${degPitch}°`);
      console.log('─────────────────────────────────────');
    }

    // Safety check falls
    const pTrans = playerBody.translation();
    if (pTrans.y < -30) {
      debugLog('💀 JATUH', 'Player keluar peta, me-respawn...');
      respawnPlayer();
    }
    // Coordinate UI Update (Perbaikan Permintaan User)
    const pTr = playerBody.translation();
    const coordX = document.getElementById('pos-x');
    const coordY = document.getElementById('pos-y');
    const coordZ = document.getElementById('pos-z');
    if (coordX) coordX.textContent = pTr.x.toFixed(1);
    if (coordY) coordY.textContent = pTr.y.toFixed(1);
    if (coordZ) coordZ.textContent = pTr.z.toFixed(1);
  }

  if (inGame && worldBuilder) worldBuilder.update(time, delta);
  if (inGame && npcManager) npcManager.update();

  // Pastikan Sky Dome selalu mengikuti posisi camera agar tidak pernah ter-clip
  if (window._skyMesh) {
    window._skyMesh.position.copy(camera.position);
  }

  lastT = time;
  // Membuang composer.render() karena effect.render(scene, camera) sudah me-render seluruh scene 
  // beserta outline-nya. Menjalankan keduanya melakukan rendering 2x dan menyebabkan drop FPS.
  // composer.render(); 
  effect.render(scene, camera); 
  labelRenderer.render(scene, camera);
}
animate();

// ========================
// 5. UI LOGIN — Langsung aktif, TIDAK tunggu RAPIER
// ========================
const passcodeIn = document.getElementById('passcode');
const cursorSpan = document.querySelector('.cursor');
const btnEnter = document.getElementById('btn-enter');
const errorMsg = document.getElementById('error-msg');
const uiLayer = document.getElementById('ui-layer');

passcodeIn.addEventListener('input', (e) => {
  cursorSpan.innerHTML = '*'.repeat(e.target.value.length) + '<span style="opacity:0">█</span>';
});

btnEnter.addEventListener('click', handleLogin);
passcodeIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });

function handleLogin() {
  const c = passcodeIn.value.trim();
  if (c === '220108') {
    proceedToWorld({ n: 'Elfan', c: '#4da6ff' });
  } else if (c === '150108') {
    proceedToWorld({ n: 'Savira', c: '#ff66b2' });
  } else {
    loginAttempts++;
    const loginBox = document.getElementById('login-box');
    loginBox.classList.add('shake');
    setTimeout(() => loginBox.classList.remove('shake'), 400);
    const msg = errorMessages[Math.min(loginAttempts - 1, errorMessages.length - 1)];
    errorMsg.textContent = msg;
    errorMsg.classList.add('visible');
  }
}

let isEntering = false;
function proceedToWorld(player) {
  if (isEntering) return;
  isEntering = true;
  
  // Zoom camera ke pulau lalu masuk
  gsap.to(uiLayer, { opacity: 0, duration: 1 });
  gsap.to(camera.position, { z: -25, y: 5, duration: 3, ease: 'power2.inOut', onComplete: () => {
    gsap.to('#transition-overlay', { opacity: 1, duration: 1, onComplete: () => {
      lobbyGroup.visible = false; // HILANGKAN PULAU LOBBY
      initGameEngine(player);
    }});
  }});
}

// ========================
// 6. INIT GAME ENGINE — Async, dipanggil setelah login
// ========================
async function initGameEngine(player) {
  // Loading Screen
  const loadingScreen = document.getElementById('loading-screen');
  const loadingLogo = loadingScreen.querySelector('.logo');
  const loadFill = document.getElementById('loading-fill');
  const loadText = document.getElementById('loading-text');
  loadingScreen.classList.remove('hidden');
  gsap.to('#transition-overlay', { opacity: 0, duration: 0.5 });

  const setLoad = (p, t) => {
    loadFill.style.width = p + '%';
    loadText.textContent = t;
  };

  setLoad(10, 'Menginisialisasi dunia...');
  // Passing the required object structure to satisfy the deprecation warning
  await RAPIER.init(); 
  setLoad(30, 'Mengatur fisika...');

  // Use RAPIER.Vector3 for gravity 
  physicsWorld = new RAPIER.World(new RAPIER.Vector3(0.0, -20.0, 0.0));
  Layers = { TERRAIN: 0x0001, STATIC: 0x0002, DYNAMIC: 0x0004, PLAYER: 0x0008, NPC: 0x0010, TRIGGER: 0x0020 };

  setLoad(50, 'Menanam pohon-pohon...');
  // Player Physics — Near island center
  const playerBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(3, 5, 3)
    .setLinearDamping(0.01)
    .setAngularDamping(1.0)
    .lockRotations();
  playerBody = physicsWorld.createRigidBody(playerBodyDesc);
  const playerColliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.4) 
    .setFriction(0.0)
    .setRestitution(0.0)
    .setCollisionGroups((Layers.PLAYER << 16) | (0xffff)); // Simple all collide for start
  physicsWorld.createCollider(playerColliderDesc, playerBody);

  // === PLAYER VISUAL (Coizy Chubby Aesthetic) ===
  const playerVisGroup = new THREE.Group();
  playerVisGroup.name = "PlayerVisual";
  
  // Chubby body
  const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 16), new THREE.MeshStandardMaterial({ color: player.c, roughness: 1.0, flatShading: false }));
  bodyMesh.position.y = 0.1; // Centered lower
  playerVisGroup.add(bodyMesh);
  
  // Head
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), new THREE.MeshStandardMaterial({ color: player.c, roughness: 1.0 }));
  headMesh.position.y = 0.65;
  playerVisGroup.add(headMesh);
  
  // Mata Besar
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x4a4a4a });
  const eyeGeo = new THREE.SphereGeometry(0.065, 8, 8);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat); leftEye.position.set(-0.16, 0.72, 0.37);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat); rightEye.position.set(0.16, 0.72, 0.37);
  
  // Titik Highlight Putih
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
  const hlGeo = new THREE.SphereGeometry(0.025, 6, 6);
  const lHl = new THREE.Mesh(hlGeo, hlMat); lHl.position.set(-0.02, 0.025, 0.05); leftEye.add(lHl);
  const rHl = new THREE.Mesh(hlGeo, hlMat); rHl.position.set(-0.02, 0.025, 0.05); rightEye.add(rHl);
  
  playerVisGroup.add(leftEye, rightEye);
  
  // Blush Cheeks (Ellipse oranye/pink)
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xFF9E6C, transparent: true, opacity: 0.45 });
  const blushGeo = new THREE.CircleGeometry(0.07, 12);
  const lBlush = new THREE.Mesh(blushGeo, blushMat); lBlush.position.set(-0.28, 0.62, 0.33); lBlush.rotation.y = -0.4;
  const rBlush = new THREE.Mesh(blushGeo, blushMat); rBlush.position.set(0.28, 0.62, 0.33); rBlush.rotation.y = 0.4;
  playerVisGroup.add(lBlush, rBlush);
  
  // Small limbs
  const limbMat = new THREE.MeshStandardMaterial({ color: player.c });
  const limbGeo = new THREE.CapsuleGeometry(0.08, 0.15, 4, 8);
  const lArm = new THREE.Mesh(limbGeo, limbMat); lArm.position.set(-0.48, 0.2, 0.0); lArm.rotation.z = 0.4;
  const rArm = new THREE.Mesh(limbGeo, limbMat); rArm.position.set(0.48, 0.2, 0.0); rArm.rotation.z = -0.4;
  const lLeg = new THREE.Mesh(limbGeo, limbMat); lLeg.position.set(-0.2, -0.3, 0);
  const rLeg = new THREE.Mesh(limbGeo, limbMat); rLeg.position.set(0.2, -0.3, 0);
  playerVisGroup.add(lArm, rArm, lLeg, rLeg);
  
  // Simple dark shadow under character (no real shadow drop)
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x7F73B8, transparent: true, opacity: 0.2, depthWrite: false });
  const blobShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), shadowMat);
  blobShadow.rotation.x = -Math.PI / 2;
  blobShadow.position.y = -0.45;
  playerVisGroup.add(blobShadow);
  
  playerGroup.add(playerVisGroup);
  playerVisual = playerVisGroup;
  playerVisual.visible = false; 

  // Setup NPC Manager
  npcManager = new NPCManager({ getHeight: (x, z) => worldBuilder ? worldBuilder.getHeight(x, z) : 0 }, playerGroup);

  setLoad(70, 'Membangun dunia...');
  worldBuilder = new WorldBuilder(scene, gameGroup, interactables, RAPIER, physicsWorld, Layers);
  worldBuilder.npcManager = npcManager;
  npcManager.worldBuilder = worldBuilder;
  await worldBuilder.build((progress) => {
    setLoad(70 + progress * 0.2, `Membangun dunia... ${Math.floor(progress)}%`);
  });

  setLoad(90, 'Menghitung bintang...');
  // Camera Setup — Eye level disesuaikan dengan tinggi badan baru
  camera.position.set(0, 0.7, 0); 
  camera.rotation.set(0, 0, 0);
  camera.fov = 75;
  camera.updateProjectionMatrix();
  playerGroup.add(camera);

  // Reset yaw/pitch
  cameraYaw = 0; cameraPitch = 0;
  playerGroup.rotation.set(0, 0, 0);
  updateCameraRotation();

  // Manual Pointer Lock Setup
  setupPointerLock();

  // Interaction prompt (CSS2D)
  const promptUI = document.getElementById('interaction-prompt');
  if (promptUI.parentElement) promptUI.parentElement.removeChild(promptUI);
  promptUI.classList.remove('hidden');
  promptUI.style.opacity = '0';
  promptObj = new CSS2DObject(promptUI);
  scene.add(promptObj);

  // Keyboard events
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Click to lock
  document.addEventListener('mousedown', () => {
    if (inGame &&
        document.getElementById('memory-book').classList.contains('hidden') &&
        document.getElementById('emote-wheel').classList.contains('hidden') &&
        document.getElementById('pause-menu').classList.contains('hidden')) {
      lockPointer();
    }
  });

  _userSens = 0.002;
  loadSettings();
  initNetwork(player.n, player.c);
  setupUI();
  updateHUD(); 
  applyCarvings(); 
  applyStarNames(); // Load star labels (Perbaikan 22)

  // Update HUD player info
  const hudColor = document.getElementById('hud-player-color');
  const hudName = document.getElementById('hud-player-name');
  if (hudColor) hudColor.style.background = player.c;
  if (hudName) hudName.textContent = player.n;

  // === AUDIT SCENE ===
  debugLog('🔍 AUDIT', 'Memulai audit objek yang melayang...');
  let auditCount = 0;
  gameGroup.traverse((obj) => {
    if (obj.isMesh || obj.isPoints) {
      const y = obj.getWorldPosition(new THREE.Vector3()).y;
      if (y > 100 || y < -100) {
        debugLog('⚠️ AUDIT', `Objek melayang: ${obj.name || obj.type} di Y:${y.toFixed(1)}. Menyembunyikan...`);
        obj.visible = false;
      }
      auditCount++;
    }
  });
  debugLog('🔍 AUDIT', `Audit selesai, diperiksa ${auditCount} objek.`);

  // ✅ Semua siap — selesaikan loading dan mulai game
  setLoad(100, 'Selamat datang di dunia kalian! 🌸');
  await new Promise(r => setTimeout(r, 600)); // brief moment to show 100%

  // Hide loading, show game
  gsap.to(loadingScreen, {
    opacity: 0, duration: 0.8, onComplete: () => {
      loadingScreen.classList.add('hidden');
      loadingScreen.style.opacity = ''; // reset for next time
      gameGroup.visible = true;
      document.getElementById('game-hud').classList.remove('hidden');
      document.body.classList.add('in-game');
      inGame = true;
      debugLog('🚀 INIT', 'Semua sistem siap! Memulai spawn player...');
      respawnPlayer();
    }
  });
}

function updateHUD() {
  for (const [key, val] of Object.entries(inventory)) {
    const el = document.getElementById(`slot-${key}`);
    if (el) {
      el.querySelector('.count').textContent = val;
      if (val > 0) el.style.opacity = '1';
      else el.style.opacity = '0.4';
    }
  }
}

function showSpeechBubble(text, duration = 3000) {
  const container = document.getElementById('speech-bubbles-container');
  const bubble = document.createElement('div');
  bubble.className = 'speech-bubble';
  bubble.textContent = text;
  container.appendChild(bubble);

  // Position it (main loop will update this, or we use CSS absolute)
  setTimeout(() => bubble.remove(), duration);
}

function handleInteraction() {
  if (!currentInteractable || !inGame) return;
  const data = currentInteractable.userData;
  const time = performance.now();

  // Cooldown check
  if (interactionCooldown.has(currentInteractable.uuid) && time < interactionCooldown.get(currentInteractable.uuid)) return;

  switch(data.type) {
    case 'tree':
      if (playerState === 'leaning') {
        playerState = 'idle';
      } else {
        playerState = 'leaning';
        sittingObj = currentInteractable;
        const msg = data.dialogs[Math.floor(Math.random() * data.dialogs.length)];
        showSpeechBubble(msg);
      }
      break;

    case 'flower':
      inventory[data.flowerId]++;
      updateHUD();
      const slot = document.getElementById(`slot-${data.flowerId}`);
      slot.classList.add('pop');
      setTimeout(() => slot.classList.remove('pop'), 300);
      
      // Hide flower & respawn logic
      currentInteractable.visible = false;
      const fObj = currentInteractable;
      interactionCooldown.set(fObj.uuid, time + 60000);
      setTimeout(() => {
        fObj.visible = true;
        fObj.scale.set(0, 0, 0);
        gsap.to(fObj.scale, { x: 1, y: 1, z: 1, duration: 1.5, ease: 'bounce.out' });
      }, 60000);
      break;

    case 'pond':
      if (playerState === 'sitting_pond') {
        playerState = 'idle';
      } else {
        playerState = 'sitting_pond';
        sittingObj = currentInteractable;
        // Ripple effect placeholder (visual is handled in physics update)
      }
      break;

    case 'memory_book':
      document.getElementById('memory-book').classList.remove('hidden');
      unlockPointer();
      break;

    case 'door': // INTERACT_DoorMain (pivot group support)
      const doorGroup = currentInteractable.parent;
      if (doorGroup && doorGroup.type === 'Group') {
        const isOpen = doorGroup.userData.isOpen || false;
        doorGroup.userData.isOpen = !isOpen;
        gsap.to(doorGroup.rotation, { 
          y: isOpen ? 0 : -Math.PI / 2, 
          duration: 0.6, 
          ease: 'power2.inOut' 
        });
        showSpeechBubble(isOpen ? 'Pintu ditutup' : 'Pintu dibuka', 1000);
      }
      break;

      break;

    case 'sign':
      showRoomNameUI(); 
      break;

    case 'crate':
      gsap.to(currentInteractable.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.1, yoyo: true, repeat: 1, ease: 'power2.out' });
      showSpeechBubble("Membuka peti... 📦");
      break;

    case 'drum':
      gsap.to(currentInteractable.scale, { x: 1.05, z: 1.05, duration: 0.15, yoyo: true, repeat: 1 });
      showNotificationToast("Mengambil air dari drum 💧");
      break;

    case 'generator':
      gsap.to(currentInteractable.position, { x: currentInteractable.position.x + 0.05, duration: 0.05, repeat: 10, yoyo: true });
      showSpeechBubble("Brum... brum... ⚙️", 1500);
      togglePower();
      break;

    case 'stump':
      const axe = scene.getObjectByName('DECO_AxeHandle');
      if (axe) {
        gsap.to(axe.rotation, { x: axe.rotation.x - 0.8, duration: 0.2, ease: 'power2.out', onComplete: () => {
          gsap.to(axe.rotation, { x: axe.rotation.x + 0.8, duration: 0.3, ease: 'bounce.out' });
        }});
        showSpeechBubble("Tok! +1 Log 🪵", 800);
      }
      break;

    case 'bench':
      if (playerState === 'sitting_bench') {
        playerState = 'idle';
        showSpeechBubble("Berdiri...");
      } else {
        playerState = 'sitting_bench';
        sittingObj = currentInteractable;
        showSpeechBubble("Beristirahat sebentar... 🧘", 2000);
        const pos = currentInteractable.getWorldPosition(new THREE.Vector3());
        playerBody.setTranslation({ x: pos.x, y: pos.y + 0.5, z: pos.z }, true);
      }
      break;

    case 'pond':
      showSpeechBubble("Mulai memancing... 🎣", 3000);
      break;

    case 'rooftop_chair':
      if (playerState === 'sitting_rooftop') playerState = 'idle';
      else {
        playerState = 'sitting_rooftop';
        sittingObj = currentInteractable;
        const pos = currentInteractable.getWorldPosition(new THREE.Vector3());
        playerBody.setTranslation({ x: pos.x, y: pos.y + 0.5, z: pos.z }, true);
        if (Object.keys(peers).length > 0) showSpeechBubble("Momen yang indah... ✨", 4000);
        else showSpeechBubble("Pemandangan yang indah... ✨");
      }
      break;

    case 'cat':
      showSpeechBubble("Purrr... 🐈");
      currentInteractable.userData.isBeingPet = true;
      createSparkle(currentInteractable.position.clone().add(new THREE.Vector3(0, 0.4, 0)));
      break;
      
    case 'beach_stone':
      cravingTarget = currentInteractable;
      document.getElementById('carve-dialog').classList.remove('hidden');
      unlockPointer();
      break;

    case 'ivy':
      gsap.to(currentInteractable.rotation, { z: 0.1, duration: 0.1, yoyo: true, repeat: 5 });
      showSpeechBubble("Sreet... sreet... 🌿", 1000);
      break;

    case 'bookshelf':
      showSpeechBubble("Banyak buku menarik... 📚");
      document.getElementById('memory-book').classList.remove('hidden'); // placeholder
      unlockPointer();
      break;

    case 'vinyl':
      const isPlaying = currentInteractable.userData.isPlaying;
      currentInteractable.userData.isPlaying = !isPlaying;
      socket?.emit('interaction', { type: 'vinyl', state: !isPlaying });
      showNotificationToast(!isPlaying ? "Memutar musik... 🎶" : "Musik berhenti.");
      break;

    case 'notepad':
      document.getElementById('shared-notepad-modal').classList.remove('hidden');
      unlockPointer();
      break;

    case 'sofa':
      if (playerState === 'sitting_sofa') playerState = 'idle';
      else {
        playerState = 'sitting_sofa';
        sittingObj = currentInteractable;
      }
      break;

    case 'fireplace':
      showSpeechBubble("Hangat sekali... 🔥");
      gsap.to(renderer, { toneMappingExposure: 2.2, duration: 2, yoyo: true, repeat: 1 });
      break;

    case 'telescope':
      if (camera.fov === 30) gsap.to(camera, { fov: 75, duration: 0.5, onUpdate: () => camera.updateProjectionMatrix() });
      else gsap.to(camera, { fov: 30, duration: 0.5, onUpdate: () => camera.updateProjectionMatrix() });
      break;

    case 'star':
      starTarget = currentInteractable;
      document.getElementById('star-dialog').classList.remove('hidden');
      unlockPointer();
      break;

    case 'ladder':
       const p = playerBody.translation();
       const targetY = p.y < 5 ? p.y + 4.5 : p.y - 4.5;
       playerBody.setTranslation({ x: p.x, y: targetY, z: p.z }, true);
       break;
  }
}

function togglePower() {
  const light = scene.getObjectByName('LIGHT_Interior');
  if (light) {
    const isOn = light.intensity > 0.1;
    gsap.to(light, { intensity: isOn ? 0.0 : 1.5, duration: 0.5 });
    showNotificationToast(isOn ? "Listrik mati... 🌑" : "Listrik menyala! 💡");
  }
}

function showRoomNameUI() {
  const dialog = document.getElementById('carve-dialog');
  if (dialog) {
    dialog.querySelector('h3').textContent = "Papan Nama Rumah 🏘️";
    dialog.querySelector('p').textContent = "Beri nama khusus untuk rumah kita...";
    dialog.classList.remove('hidden');
    unlockPointer();
  }
}

function applyStarNames() {
  Object.entries(starNames).forEach(([id, text]) => {
     const star = interactables.find(obj => obj.userData.type === 'star' && obj.userData.starId == id);
     if (star) addStarLabel(star, text);
  });
}

function addStarLabel(star, text) {
  const el = document.createElement('div');
  el.className = 'carver-text'; // use same style
  el.style.color = '#FFFED0';
  el.textContent = text;
  const label = new CSS2DObject(el);
  label.position.set(0, 0.5, 0);
  star.add(label);
}

function saveStarName() {
  const text = document.getElementById('star-input').value.trim();
  if (text && starTarget) {
    const id = starTarget.userData.starId;
    starNames[id] = text;
    localStorage.setItem('coizy_stars', JSON.stringify(starNames));
    addStarLabel(starTarget, text);
    showNotificationToast("Bintang telah diberi nama! 🌟");
    socket?.emit('interaction', { type: 'star_named', starId: id, name: text });
  }
  document.getElementById('star-dialog').classList.add('hidden');
  lockPointer();
}

function applyCarvings() {
  Object.entries(rockCarvings).forEach(([id, text]) => {
    // Find rock by ID or position (simplified: we use hash of pos as key)
    interactables.forEach(obj => {
      const pos = obj.getWorldPosition(new THREE.Vector3());
      const key = `rock_${pos.x.toFixed(1)}_${pos.z.toFixed(1)}`;
      if (key === id) {
        addCarvingLabel(obj, text);
      }
    });
  });
}

function addCarvingLabel(obj, text) {
  const el = document.createElement('div');
  el.className = 'carving-text';
  el.textContent = text;
  const label = new CSS2DObject(el);
  label.position.set(0, 0.5, 0); // Above rock
  obj.add(label);
}

function saveCarving() {
  const text = document.getElementById('carve-input').value.trim();
  if (text && cravingTarget) {
    const pos = cravingTarget.getWorldPosition(new THREE.Vector3());
    const key = `rock_${pos.x.toFixed(1)}_${pos.z.toFixed(1)}`;
    rockCarvings[key] = text;
    localStorage.setItem('coizy_carvings', JSON.stringify(rockCarvings));
    addCarvingLabel(cravingTarget, text);
    showNotificationToast("Nama terukir selamanya... ✨");
  }
  document.getElementById('carve-dialog').classList.add('hidden');
  lockPointer();
}

function createSparkle(pos) {
    const count = 10;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for(let i=0; i<count; i++) {
        positions[i*3] = pos.x; positions[i*3+1] = pos.y; positions[i*3+2] = pos.z;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xFFF8E7, size: 0.1, transparent: true, opacity: 1 });
    const points = new THREE.Points(geom, mat);
    scene.add(points);
    
    gsap.to(mat, { opacity: 0, duration: 1.5, onComplete: () => scene.remove(points) });
    const posAttr = geom.attributes.position;
    for(let i=0; i<count; i++) {
        gsap.to(posAttr.array, {
            [i*3]: pos.x + (Math.random()-0.5)*0.5,
            [i*3+1]: pos.y + (Math.random())*0.8,
            [i*3+2]: pos.z + (Math.random()-0.5)*0.5,
            duration: 1.5,
            onUpdate: () => posAttr.needsUpdate = true
        });
    }
}

function throwStone() {
  if (playerState !== 'idle' || !inGame) return;
  
  const stone = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.18, 0), 
    new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 })
  );
  
  const pPos = new THREE.Vector3();
  camera.getWorldPosition(pPos);
  const pDir = new THREE.Vector3();
  camera.getWorldDirection(pDir);
  
  stone.position.copy(pPos).add(pDir.clone().multiplyScalar(0.8));
  stone.castShadow = true;
  scene.add(stone);
  
  // Physics Logic (Simple Projectile with Ground/Water detection)
  let stoneVel = pDir.clone().multiplyScalar(24);
  stoneVel.y += 7; // arc upwards
  
  let currentPos = stone.position.clone();
  
  function updateStone() {
    const dt = 0.016;
    stoneVel.y -= 25 * dt; // gravity
    currentPos.add(stoneVel.clone().multiplyScalar(dt));
    stone.position.copy(currentPos);
    
    // Check collision
    const groundY = worldBuilder ? worldBuilder.getHeight(currentPos.x, currentPos.z) + 0.15 : -10;
    const oceanY = worldBuilder?.ocean ? worldBuilder.ocean.position.y : -6;
    
    // Water Hit
    if (currentPos.y < oceanY + 0.2) {
      createEffect(currentPos.clone(), 'water');
      scene.remove(stone);
      socket?.emit('interaction', { type: 'stone_splash', x: currentPos.x, z: currentPos.z });
      return;
    }
    
    // Ground Hit
    // Check if on land (island domain is roughly 64x52)
    if (currentPos.y < groundY && Math.abs(currentPos.x) < 32 && Math.abs(currentPos.z) < 26) {
      createEffect(currentPos.clone(), 'ground');
      scene.remove(stone);
      return;
    }
    
    // Fall out of bounds
    if (currentPos.y < -50) {
      scene.remove(stone);
      return;
    }
    
    requestAnimationFrame(updateStone);
  }
  
  updateStone();
}

function createEffect(pos, type) {
  const count = type === 'water' ? 12 : 8;
  const color = type === 'water' ? 0x80d8ff : 0x8D7B6D;
  const size = type === 'water' ? 0.2 : 0.15;
  
  const group = new THREE.Group();
  scene.add(group);
  
  for(let i=0; i<count; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(size * (0.5 + Math.random()), 6, 4),
      new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.8 })
    );
    p.position.copy(pos);
    group.add(p);
    
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    const vX = Math.cos(angle) * speed * 0.5;
    const vZ = Math.sin(angle) * speed * 0.5;
    const vY = 3 + Math.random() * 5;
    
    gsap.to(p.position, {
      x: pos.x + vX,
      y: pos.y + vY,
      z: pos.z + vZ,
      duration: 0.6 + Math.random() * 0.4,
      ease: 'power1.out'
    });
    
    gsap.to(p.position, {
      y: pos.y - 1, // fall back
      delay: 0.4,
      duration: 0.4,
      ease: 'power1.in'
    });
    
    gsap.to(p.material, {
      opacity: 0,
      duration: 0.8,
      onComplete: () => {
        if (i === count - 1) scene.remove(group);
      }
    });
  }
}

// ========================
// 7. PHYSICS UPDATE LOOP
// ========================
const boundaryPolygon = [
  {x:-45, z:-45}, {x:-55, z:0}, {x:-40, z:40}, {x:0, z:50},
  {x:45, z:45}, {x:55, z:0}, {x:40, z:-45}, {x:0, z:-55}
];

function isPointInPolygon(point, vs) {
  let x = point.x, y = point.z, inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    let xi = vs[i].x, yi = vs[i].z, xj = vs[j].x, yj = vs[j].z;
    let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function showNotificationToast(msg) {
  let toast = document.getElementById('toast-msg');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-msg';
    toast.className = 'toast-bubble';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('visible');
  if (toast._timeout) clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('visible'), 3000);
}

function updatePhysics(delta, time) {
  if (!physicsWorld || !playerBody) return;
  
  try {
    physicsWorld.step();
  } catch (err) {
    if (err.message.includes('unreachable') || err.message.includes('recursive')) {
        console.error("Physics engine crashed, attempting to recover...");
        return; // Skip this frame
    }
    throw err;
  }
  
  const pTrans = playerBody.translation();

  // Bug 1 Fix: Ground Snap Safety Net
  const gHeight = worldBuilder ? worldBuilder.getHeight(pTrans.x, pTrans.z) : -10;
  if (pTrans.y < gHeight - 0.5) {
    playerBody.setTranslation({ x: pTrans.x, y: gHeight + 1.5, z: pTrans.z }, true);
    playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  }

  // Sync player group XZ & Y (Langsung mengikuti titik pusat kapsul fisika)
  if (playerState === 'idle') {
    playerGroup.position.set(pTrans.x, pTrans.y, pTrans.z);
  } else if (playerState === 'leaning' && sittingObj) {
    // Stick to tree
    const targetPos = sittingObj.getWorldPosition(new THREE.Vector3());
    const dir = new THREE.Vector3().subVectors(playerGroup.position, targetPos).normalize();
    playerGroup.position.lerp(targetPos.clone().add(dir.multiplyScalar(0.8)), delta * 5);
  } else if (playerState === 'sitting_pond' && sittingObj) {
    const targetPos = sittingObj.getWorldPosition(new THREE.Vector3());
    playerGroup.position.lerp(targetPos.clone().setY(targetPos.y - 0.5), delta * 5);
  } else if (playerState === 'sitting_sofa' && sittingObj) {
    const targetPos = sittingObj.getWorldPosition(new THREE.Vector3());
    playerGroup.position.lerp(targetPos.clone().add(new THREE.Vector3(0, 0, 0.5)), delta * 5);
  } else if (playerState === 'sitting_rooftop' && sittingObj) {
    const targetPos = sittingObj.getWorldPosition(new THREE.Vector3());
    playerGroup.position.lerp(targetPos.clone().add(new THREE.Vector3(0, -0.2, 0)), delta * 5);
  }

  // Ground detection — Jarak disesuaikan dengan kapsul yang lebih pendek
  // Pindah ray collision mask agar tidak memantul ke collider badan pemain (0x0008)
  const rayDown = new RAPIER.Ray({ x: pTrans.x, y: pTrans.y, z: pTrans.z }, { x: 0, y: -1, z: 0 });
  const hit = physicsWorld.castRayAndGetNormal(rayDown, 1.25, true, undefined, undefined, undefined, playerBody);

  let slopeAngleDeg = 0;
  if (hit && hit.toi < 1.45) { // Toleransi hit lebih besar
    isGrounded = true;
    coyoteTimer = 0.12;
    const n = hit.normal1;
    slopeAngleDeg = Math.acos(Math.min(1, Math.abs(n.y))) * (180 / Math.PI);
    if (slopeAngleDeg > 70) { isGrounded = false; }
  } else {
    isGrounded = false;
    if (coyoteTimer > 0) coyoteTimer -= delta;
  }

  if (jumpBufferTimer > 0) jumpBufferTimer -= delta;

  // BUG 5 FIX: Movement relatif terhadap arah kamera (cameraYaw)
  const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
  const right   = new THREE.Vector3( Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));

  const moveDir = new THREE.Vector3();
  if (!isFreeCam) {
    if (playerState === 'idle') {
      if (moveState.w) moveDir.add(forward);
      if (moveState.s) moveDir.sub(forward);
      if (moveState.d) moveDir.add(right);
      if (moveState.a) moveDir.sub(right);
    } else {
      // If movement is pressed while sitting, stand up
      if (moveState.w || moveState.s || moveState.a || moveState.d) playerState = 'idle';
    }
    if (moveDir.lengthSq() > 0) moveDir.normalize();
  } else {
    // ---------------------------------
    // LOGIC MATA TUHAN (FREE FLY)
    // ---------------------------------
    const freeSpeed = (isSprint ? 40 : 20) * delta;
    const upVec = new THREE.Vector3(0, 1, 0);
    const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);

    if (moveState.w) camera.position.addScaledVector(forwardVec, freeSpeed);
    if (moveState.s) camera.position.addScaledVector(forwardVec, -freeSpeed);
    if (moveState.d) camera.position.addScaledVector(rightVec, freeSpeed);
    if (moveState.a) camera.position.addScaledVector(rightVec, -freeSpeed);

    if (keysPressed['Space']) camera.position.addScaledVector(upVec, freeSpeed);
    if (keysPressed['ControlLeft'] || keysPressed['ControlRight']) camera.position.addScaledVector(upVec, -freeSpeed);
  }

  // Kecepatan dinaikkan: lari jauh lebih cepat daripada jalan
  let speed = isSprint ? 12.0 : (isCrouch ? 2.0 : 6.0);

  // Slope slide
  if (isGrounded && slopeAngleDeg > 45 && slopeAngleDeg < 70 && hit) {
    const slidePush = new THREE.Vector3(hit.normal1.x, 0, hit.normal1.z).normalize().multiplyScalar(speed * 0.8);
    moveDir.add(slidePush);
  }

  const desiredVel = moveDir.multiplyScalar(isClimbing ? 0 : speed);
  const accel = (isGrounded && !isClimbing) ? 15.0 : 3.0;
  const friction = 12.0;

  if (moveDir.lengthSq() > 0.01) {
    currentVel.x = THREE.MathUtils.lerp(currentVel.x, desiredVel.x, accel * delta);
    currentVel.z = THREE.MathUtils.lerp(currentVel.z, desiredVel.z, accel * delta);
  } else {
    currentVel.x = THREE.MathUtils.lerp(currentVel.x, 0, friction * delta);
    currentVel.z = THREE.MathUtils.lerp(currentVel.z, 0, friction * delta);
  }

  const pLinvel = playerBody.linvel();
  verticalVelocity = pLinvel.y;

  if (!isClimbing) {
    if (isGrounded && pLinvel.y <= 0.01) {
      verticalVelocity = 0;
    } else {
      verticalVelocity += gravityForce * delta;
      if (verticalVelocity < -30) verticalVelocity = -30;
    }
    if (jumpBufferTimer > 0 && coyoteTimer > 0) {
      verticalVelocity = jumpForce;
      jumpBufferTimer = 0;
      coyoteTimer = 0;
      isGrounded = false;
    }
  } else {
    verticalVelocity = moveState.w ? 2.5 : (moveState.s ? -2.5 : 0);
    if (ladderObj) {
      const dy = playerGroup.position.y - ladderObj.position.y;
      if (dy > 3.0 || dy < -3.0) { isClimbing = false; ladderObj = null; }
    }
  }

  // Step climbing
  if (isGrounded && !isClimbing && moveDir.lengthSq() > 0.01) {
    const rp = { x: pTrans.x, y: pTrans.y - 0.5, z: pTrans.z };
    const rd = { x: moveDir.x, y: 0, z: moveDir.z };
    const wallHit = physicsWorld.castRay(new RAPIER.Ray(rp, rd), 0.5, true, Layers.PLAYER, Layers.TERRAIN | Layers.STATIC);
    if (wallHit) {
      const rp2 = { x: pTrans.x, y: pTrans.y - 0.25, z: pTrans.z };
      const topHit = physicsWorld.castRay(new RAPIER.Ray(rp2, rd), 0.5, true, Layers.PLAYER, Layers.TERRAIN | Layers.STATIC);
      if (!topHit) playerBody.setTranslation({ x: pTrans.x, y: pTrans.y + 0.15, z: pTrans.z }, true);
    }
  }

  // Boundary check
  if (!isClimbing && !isPointInPolygon({ x: pTrans.x, z: pTrans.z }, boundaryPolygon)) {
    const normal = new THREE.Vector3(-pTrans.x, 0, -pTrans.z).normalize();
    const vel = new THREE.Vector3(currentVel.x, 0, currentVel.z);
    const reflected = vel.reflect(normal).multiplyScalar(0.7);
    currentVel.x = reflected.x;
    currentVel.z = reflected.z;
    showNotificationToast("Hmm, di sini aja yuk ☁️");
    vignettePass.uniforms['darkness'].value = THREE.MathUtils.lerp(vignettePass.uniforms['darkness'].value, 1.5, 0.1);
  } else {
    vignettePass.uniforms['darkness'].value = THREE.MathUtils.lerp(vignettePass.uniforms['darkness'].value, 0.6, 0.1);
  }

  playerBody.setLinvel({ x: currentVel.x, y: verticalVelocity, z: currentVel.z }, true);

  // BUG 1 FIX: Camera Head Bob & FOV — tanpa cameraPivot
  if (!isFreeCam) {
    const isSwim = (pTrans.y - 0.6) < 0.2;
    let bobAmp = 0;
    if (isGrounded && !isSwim && !isClimbing && moveDir.lengthSq() > 0.01) {
      bobAmp = isSprint ? 0.08 : 0.04;
      headBobTimer += delta * (isSprint ? 3.5 : 2.2) * 10;
    } else {
      headBobTimer += delta * 10;
    }
    const targetBob = (isGrounded && moveDir.lengthSq() > 0.01) ? Math.sin(headBobTimer) * bobAmp : 0;
    
    let eyeHeight = (isCrouch ? 0.6 : 1.1) + targetBob;
    if (playerState === 'leaning') eyeHeight = 0.9;
    if (playerState === 'sitting_pond') eyeHeight = 0.4;
    if (playerState === 'sitting_sofa') eyeHeight = 0.7;
    
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, eyeHeight, 8.0 * delta);
    
    if (playerState === 'leaning') camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 0.1, 5 * delta);
    else camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 0, 5 * delta);

    // FOV
    let targetFOV = 75;
    if (isCrouch) targetFOV = 70;
    else if (isSprint && moveDir.lengthSq() > 0.01) targetFOV = 92;
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 8.0 * delta);
    camera.updateProjectionMatrix();

    // Third Person: move camera back along local Z axis
    if (isThirdPerson) {
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, 4.0, 8.0 * delta);
      if (playerVisual) playerVisual.visible = true;
    } else {
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, 0.0, 8.0 * delta);
      if (playerVisual) playerVisual.visible = false;
    }
  }

  // Interaction raycast (setiap 100ms)
  if (time - lastRayT > 100) {
    lastRayT = time;
    raycaster.setFromCamera(screenCenter, camera);
    const hits = raycaster.intersectObjects(interactables, true);
    const promptUI = document.getElementById('interaction-prompt');
    if (hits.length > 0 && hits[0].distance < 6) {
      let o = hits[0].object;
      while (o.parent && !o.userData.type) o = o.parent;
      if (o.userData.type) {
        currentInteractable = o;
        document.getElementById('prompt-text').textContent = o.userData.label;
        promptUI.style.opacity = '1';
        if (promptObj) promptObj.position.copy(hits[0].point);
        // Change cursor to pointer if not locked (or useful for mouse users)
        if (!isPointerLocked) document.body.style.cursor = 'pointer';
      } else {
        currentInteractable = null;
        promptUI.style.opacity = '0';
        if (!isPointerLocked) document.body.style.cursor = 'default';
      }
    } else {
      currentInteractable = null;
      if (promptUI) promptUI.style.opacity = '0';
      if (!isPointerLocked) document.body.style.cursor = 'default';
    }
  }

  // Ocean Bobbing (Visual Polish Fase 5)
  const ocean = scene.getObjectByName('ENV_Ocean');
  if (ocean) {
    ocean.position.y = -5.0 + Math.sin(performance.now() * 0.001) * 0.1;
  }

  // Compass — gunakan cameraYaw langsung
  {
    const deg = ((-cameraYaw * 180 / Math.PI) % 360 + 360) % 360;
    let dir = 'N';
    if (deg >= 45 && deg < 135) dir = 'E';
    else if (deg >= 135 && deg < 225) dir = 'S';
    else if (deg >= 225 && deg < 315) dir = 'W';
    const compassEl = document.getElementById('compass-text');
    if (compassEl) compassEl.textContent = `${dir} ${Math.floor(deg)}°`;
  }

  // Network emit
  if (socket && time - lastEmitT > 33) {
    const pos = playerGroup.position;
    if (moveState.w || moveState.a || moveState.s || moveState.d) {
      lastEmitT = time;
      socket.emit('player_move', { x: pos.x, y: pos.y, z: pos.z, ry: cameraYaw });
    }
  }

  // Sync peers
  Object.values(peers).forEach(peer => {
    if (peer.targetPos) peer.position.lerp(peer.targetPos, 0.1);
  });

  // Sync player speed to NPC Manager (Perbaikan 6 & 7)
  if (npcManager) {
    const vel = playerBody.linvel();
    const speed = Math.sqrt(vel.x**2 + vel.z**2);
    // Kita simpan di userData mesh agar NPCManager bisa baca
    playerGroup.children[0].userData.playerSpeed = speed; // children[0] biasanya mata/mesh visual
  }
}

// ========================
// 8. KEYBOARD EVENTS
// ========================
function onKeyDown(e) {
  if (!inGame || !isPointerLocked) return;
  
  const k = e.key.toLowerCase();
  keysPressed[e.code] = true; // Keep original e.code for keysPressed map

  if (/digit[1-5]/.test(e.code)) { 
    sendEmote(parseInt(e.code.replace('digit', ''))); 
    return; 
  }

  switch (k) {
    case 'w': moveState.w = true; debugLog('🟢 GERAK', 'Maju'); break;
    case 's': moveState.s = true; debugLog('🔴 GERAK', 'Mundur'); break;
    case 'a': moveState.a = true; debugLog('🟡 GERAK', 'Kiri'); break;
    case 'd': moveState.d = true; debugLog('🟡 GERAK', 'Kanan'); break;
    case ' ': 
      if (isGrounded) debugLog('⬆️ LONCAT', 'Melompat!');
      jumpBufferTimer = 0.2; 
      break;
    case 'shift': isSprint = true; debugLog('💨 LARI', 'Sprint AKTIF'); break;
    case 'control': 
      if (!isFreeCam) {
        isCrouch = !isCrouch; 
        debugLog('🦆 JONGKOK', 'Crouch TOGGLE');
      }
      break;
    case 'c': isThirdPerson = !isThirdPerson; break;
    case 'q':
      document.getElementById('emote-wheel').classList.remove('hidden');
      unlockPointer();
      break;
    case 'e': 
      debugLog('🤝 INTERAKSI', 'Tombol E ditekan');
      handleInteraction(); 
      break;
    case 'v':
      toggleFreeCam();
      break;
    case 'f':
      debugLog('🪨 LEMPAR', 'Melempar batu');
      throwStone();
      break;
    case 'escape': togglePause(); break;
  }
}

function onKeyUp(e) {
  keysPressed[e.code] = false;
  const k = e.key.toLowerCase();
  switch (k) {
    case 'w': moveState.w = false; debugLog('⬛ GERAK', 'Berhenti Maju'); break;
    case 'a': moveState.a = false; debugLog('⬛ GERAK', 'Berhenti Kiri'); break;
    case 's': moveState.s = false; debugLog('⬛ GERAK', 'Berhenti Mundur'); break;
    case 'd': moveState.d = false; debugLog('⬛ GERAK', 'Berhenti Kanan'); break;
    case 'shift': isSprint = false; debugLog('💨 LARI', 'Kembali Jalan'); break;
    // case 'control': isCrouch is a toggle, so no keyup action needed
    case 'q': document.getElementById('emote-wheel').classList.add('hidden'); break;
  }
}

// ========================
// 9. INTERACTION SYSTEM
// ========================
function checkInteraction() {
  if (!currentInteractable) return;
  const t = currentInteractable.userData.type;
  if (t === 'ladder') {
    const dist = playerGroup.position.distanceTo(currentInteractable.position);
    if (!isClimbing && dist <= 2.5) {
      isClimbing = true;
      ladderObj = currentInteractable;
    } else {
      isClimbing = false;
      ladderObj = null;
    }
  } else if (t === 'memory_book') {
    unlockPointer();
    document.getElementById('memory-book').classList.remove('hidden');
  } else if (t === 'cat') {
    currentInteractable.userData.isBeingPet = true;
    showNotificationToast("Kucing mempururrr... 🐱");
  }
}

// ========================
// 10. NETWORKING
// ========================
function initNetwork(playerName, playerColor) {
  try {
    socket = io('http://localhost:3001');
    socket.on('connect', () => {
      socket.emit('join_room', { roomCode: 'COIZY', name: playerName, color: playerColor }, (res) => {
        if (res && res.success) res.others.forEach(p => addPeer(p));
      });
      socket.on('player_joined', ({ player }) => addPeer(player));
      socket.on('player_moved', (data) => {
        if (peers[data.id]) {
          peers[data.id].targetPos = new THREE.Vector3(data.x, data.y, data.z);
          peers[data.id].targetRot = data.ry;
        }
      });
      socket.on('player_left', ({ id }) => removePeer(id));
      socket.on('interaction', (data) => {
        if (data.type === 'emote') {
          const peer = peers[data.id];
          if (peer) showEmoteUI(peer, data.message, false);
        } else if (data.type === 'vinyl') {
          showNotificationToast(data.state ? "Seseorang memutar musik... 🎶" : "Musik dimatikan.");
        } else if (data.type === 'notepad') {
           const area = document.getElementById('notepad-area');
           if (area) area.value = data.text;
        }
      });
    });
  } catch (e) {
    console.error("Network Init Error:", e);
  }
}

function addPeer(p) {
  const group = new THREE.Group();
  // Visual peer juga diperbesar agar serasi
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 1.7, 4, 8), new THREE.MeshStandardMaterial({ color: p.color }));
  body.position.y = 1.35;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), new THREE.MeshStandardMaterial({ color: '#ffe0bd' }));
  head.position.y = 2.8;
  group.add(head);
  const cnv = document.createElement('canvas');
  const ctx = cnv.getContext('2d'); cnv.width = 256; cnv.height = 64;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(0,0,256,64,20); ctx.fill();
  ctx.font = 'bold 36px Arial'; ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.fillText(p.name, 128, 45);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cnv) }));
  sprite.position.y = 3.8; sprite.scale.set(3, 0.75, 1);
  group.add(sprite);
  group.position.set(p.x || 0, p.y || 1, p.z || 0);
  group.targetPos = group.position.clone();
  gameGroup.add(group);
  peers[p.id] = group;
}

function removePeer(id) {
  if (peers[id]) { gameGroup.remove(peers[id]); delete peers[id]; }
}

function sendEmote(id) {
  if (!socket) return;
  const msgs = ["👋 Hey!", "💃 Berjoget!", "🧘 Duduk santai", "✌️ Peace!", "🫂 Peluk"];
  const msg = msgs[id - 1];
  showEmoteUI(null, msg, true);
  socket.emit('interaction', { type: 'emote', emoteId: id, message: msg });
}

function showEmoteUI(peer, msg, isLocal) {
  const div = document.createElement('div');
  div.className = 'emote-bubble';
  div.textContent = msg;
  div.style.left = '50%';
  div.style.bottom = isLocal ? '150px' : '20%';
  document.body.appendChild(div);
  gsap.to(div, { y: -60, opacity: 0, duration: 3, delay: 1, onComplete: () => div.remove() });
}

// ========================
// 11. SETTINGS & UI SETUP
// ========================
const defaultSet = { bright: 1.0, bloom: true, draw: 1000, volMaster: 80, sens: 0.002, invert: false };

function loadSettings() {
  let userSet = { ...defaultSet };
  try {
    const raw = localStorage.getItem('coizy_settings');
    if (raw) userSet = Object.assign({}, defaultSet, JSON.parse(raw));
  } catch (e) {
    localStorage.removeItem('coizy_settings');
  }
  applySettings(userSet);
  return userSet;
}

function applySettings(sets) {
  renderer.toneMappingExposure = parseFloat(sets.bright) || 1.4;
  bloomPass.strength = sets.bloom ? 0.45 : 0.0;
  
  // Jangan ubah camera.far dari settings draw distance
  // Draw distance hanya mempengaruhi fog density saja
  const drawDist = parseFloat(sets.draw) || 200;
  if (scene.fog) {
    scene.fog.far = drawDist + 200; 
  }
  
  // camera.far TETAP di nilai besar — jangan diubah agar sky tidak ter-clip
  camera.far = 6000;
  camera.updateProjectionMatrix();
}

function setupUI() {
  let userSet = loadSettings();

  // Pause menu
  const pauseMenu = document.getElementById('pause-menu');
  document.getElementById('btn-resume').onclick = () => {
    pauseMenu.classList.add('hidden');
    document.getElementById('settings-panel').classList.add('hidden');
    lockPointer();
  };
  document.getElementById('btn-settings').onclick = () => document.getElementById('settings-panel').classList.remove('hidden');
  document.getElementById('btn-quit').onclick = () => location.reload();
  document.getElementById('btn-membook').onclick = () => {
    pauseMenu.classList.add('hidden');
    document.getElementById('memory-book').classList.remove('hidden');
  };
  document.getElementById('btn-sharednote').onclick = document.getElementById('btn-membook').onclick;
  document.getElementById('btn-wishbook').onclick = document.getElementById('btn-membook').onclick;

  // Carving dialog
  document.getElementById('btn-save-carve').onclick = saveCarving;
  document.getElementById('btn-close-carve').onclick = () => {
    document.getElementById('carve-dialog').classList.add('hidden');
    lockPointer();
  };

  // Settings tabs
  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = (e) => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(x => x.classList.add('hidden'));
      e.target.classList.add('active');
      document.getElementById('tab-' + e.target.getAttribute('data-tab')).classList.remove('hidden');
    };
  });

  // Settings sliders/checkboxes
  document.getElementById('btn-save-star').onclick = saveStarName;
  document.getElementById('btn-close-star').onclick = () => {
    document.getElementById('star-dialog').classList.add('hidden');
    lockPointer();
  };

  ['bright', 'draw', 'vol-master', 'sens'].forEach(k => {
    const el = document.getElementById('set-' + k);
    if (el) {
      el.value = userSet[k.replace('-', '')];
      el.oninput = (e) => {
        userSet[k.replace('-', '')] = e.target.value;
        localStorage.setItem('coizy_settings', JSON.stringify(userSet));
        applySettings(userSet);
      };
    }
  });

  // Tutorial reset (Perbaikan Menu/Guide)
  const btnReset = document.getElementById('btn-reset-tutorial');
  if (btnReset) {
    btnReset.onclick = () => {
      showNotificationToast("Tutorial diulang... selamat datang kembali! ✨");
      togglePause();
    };
  }

  ['bloom', 'invert'].forEach(k => {
    const el = document.getElementById('set-' + k);
    if (el) {
      el.checked = userSet[k];
      el.onchange = (e) => {
        userSet[k] = e.target.checked;
        localStorage.setItem('coizy_settings', JSON.stringify(userSet));
        applySettings(userSet);
      };
    }
  });

  // Close book
  document.getElementById('close-book-btn').onclick = () => {
    document.getElementById('memory-book').classList.add('hidden');
    document.getElementById('star-dialog').classList.add('hidden');
    lockPointer();
  };
  document.getElementById('btn-close-star').onclick = document.getElementById('close-book-btn').onclick;

  // Emote wheel
  document.querySelectorAll('.wheel-item').forEach(el => {
    el.onclick = (e) => {
      let id = parseInt(e.target.getAttribute('data-id'));
      sendEmote(id);
      document.getElementById('emote-wheel').classList.add('hidden');
      lockPointer();
    };
  });
}

// ========================
// 12. RESIZE HANDLER
// ========================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});
