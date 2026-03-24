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
import { WorldBuilder } from './world/WorldBuilder.js';
import { NPCManager } from './core/NPCManager.js';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { createRealtimeClient } from './network/realtimeClient.js';

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 5000);

// ========================
// GLOBAL STATE
// ========================
let inGame = false;
let worldBuilder, socket, localPlayerData;
let physicsWorld, Layers;
let playerBody;
const peers = {};
window._coizyPeers = peers;
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
const DEBUG_MODE = import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGS === 'true';
const MAX_RENDER_DPR = Number(import.meta.env.VITE_MAX_RENDER_DPR || 0.75);
const NETWORK_EMIT_INTERVAL_MS = Number(import.meta.env.VITE_NET_EMIT_MS || 66);
const NETWORK_HEARTBEAT_MS = Number(import.meta.env.VITE_NET_HEARTBEAT_MS || 400);
const SKY_FOLLOW_INTERVAL_MS = Number(import.meta.env.VITE_SKY_FOLLOW_MS || 120);
const SKY_FOLLOW_TMP = new THREE.Vector3();
const LOW_POWER_MODE = import.meta.env.VITE_LOW_POWER_MODE === 'true';
let lastSkyFollowT = 0;
const lastLogMessage = new Map();
function debugLog(kategori, pesan, data = null) {
  if (!DEBUG_MODE) return;
  
  // Hanya log jika pesan berubah (mencegah spam)
  const key = `${kategori}:${pesan}`;
  if (lastLogMessage.get(key) === JSON.stringify(data)) return;
  lastLogMessage.set(key, JSON.stringify(data));

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

// HMR Cleanup: Stop previous engine loops and clean up before starting new one
if (window._coizyStopEngine) {
  window._coizyStopEngine();
}

// ========================
// 1. THREE.JS CORE — Setup langsung (tidak tunggu RAPIER)
// ========================
const canvas = document.querySelector('#bg-canvas');
const scene = new THREE.Scene();

// Cleanup existing renderer on hot-reload to avoid context fighting
if (window._coizyRenderer) {
  window._coizyRenderer.dispose();
}
// Cleanup CSS2D labels to prevent "ghost" nameplates
if (window._coizyLabelRenderer) {
  if (window._coizyLabelRenderer.domElement.parentElement) {
    window._coizyLabelRenderer.domElement.parentElement.removeChild(window._coizyLabelRenderer.domElement);
  }
}

const enableAA = !LOW_POWER_MODE;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: enableAA, powerPreference: "high-performance" });
window._coizyRenderer = renderer;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_RENDER_DPR));
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
  scene.background = new THREE.Color(0xF8D4E4); // Rose Mist at horizon
  scene.fog = new THREE.Fog(0xF8D4E4, 45, 180); // Aerial perspective (Atmospheric Depth)

  const skyGeo = new THREE.SphereGeometry(2000, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      colorTop: { value: new THREE.Color(0xC2E4FB) }, // Zenith (Baby Blue)
      colorMid: { value: new THREE.Color(0xE0C8E8) }, // Mid (Lilac/Pinkish mix)
      colorBot: { value: new THREE.Color(0xF8D4E4) }  // Horizon (Rose Mist)
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vWorldPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 colorTop;
      uniform vec3 colorMid;
      uniform vec3 colorBot;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos).y;
        h = max(0.0, h);
        vec3 color;
        // Transisi warna langit menjadi 3 layer (Pink/Cream -> Mix -> Blue)
        if (h < 0.3) {
            color = mix(colorBot, colorMid, h / 0.3);
        } else {
            color = mix(colorMid, colorTop, (h - 0.3) / 0.7);
        }
        gl_FragColor = vec4(color, 1.0);
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

// Lighting — Single Directional Warm dengan Amber Shadow
const ambientLight = new THREE.AmbientLight(0x7B5830, 0.4); // Warm Amber baselight, mengontrol kegelapan bayangan
scene.add(ambientLight);

const sd = 120;
const sunLight = new THREE.DirectionalLight(0xFFF6D4, 2.5); // Warm cream daylight
sunLight.position.set(100, 160, -60); // Arahkan dari atas-kiri-belakang (single direction)
sunLight.castShadow = true;
sunLight.shadow.mapSize.setScalar(1024);
sunLight.shadow.camera.left = -sd;
sunLight.shadow.camera.right = sd;
sunLight.shadow.camera.top = sd;
sunLight.shadow.camera.bottom = -sd;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 250;
sunLight.shadow.bias = -0.0008;
// Trik bayangan hangat: campur AmbientLight Amber dengan Shadow berwarna
sunLight.shadow.radius = 8;
scene.add(sunLight);

// Hemisphere light untuk gradasi objek: Atas pinkist langit, bawah amber shadow
const hemiLight = new THREE.HemisphereLight(0xF8D4E4, 0x7B5830, 0.9); 
scene.add(hemiLight);

// ========================
// 1.5 WIND PARTICLES (LEAVES & PETALS)
// ========================
const particleGroup = new THREE.Group();
scene.add(particleGroup);
const pMatGreen = new THREE.MeshBasicMaterial({ color: 0x8AAA40, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
const pMatPink  = new THREE.MeshBasicMaterial({ color: 0xE8A8B8, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
const pGeo = new THREE.CircleGeometry(0.12, 6);
pGeo.scale(1.0, 0.5, 1.0); // Bikin lonjong kayak daun
const windParticles = [];

for (let i = 0; i < 20; i++) {
  const pMat = i < 12 ? pMatGreen : pMatPink;
  const pMesh = new THREE.Mesh(pGeo, pMat);
  pMesh.position.set((Math.random() - 0.5) * 60, Math.random() * 10 + 2, (Math.random() - 0.5) * 60);
  pMesh.userData = {
    speedX: Math.random() * 2 + 1.0,
    speedY: (Math.random() - 0.5) * 0.5,
    rotX: Math.random(), rotY: Math.random(), rotZ: Math.random()
  };
  pMesh.name = "ENV_WindParticle";
  particleGroup.add(pMesh);
  windParticles.push(pMesh);
}

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
window._coizyLabelRenderer = labelRenderer;

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
    // Diizinkan meminta lock jika di dalam game ATAU saat sedang melakukan transisi masuk (entering)
    // guna mendapatkan 'user gesture' seawal mungkin.
    if (!inGame && !isEntering) return;
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
        const isPauseEnabled = import.meta.env.VITE_ENABLE_PAUSE_MENU === 'true';
        if (isPauseEnabled) {
            const memBook = document.getElementById('memory-book');
            const emoteW = document.getElementById('emote-wheel');
            const setUI = document.getElementById('settings-panel');
            if ((!memBook || memBook.classList.contains('hidden')) && 
                (!emoteW || emoteW.classList.contains('hidden')) &&
                (!setUI || setUI.classList.contains('hidden'))) {
              document.getElementById('pause-menu')?.classList.remove('hidden');
            }
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
  const isPauseEnabled = import.meta.env.VITE_ENABLE_PAUSE_MENU === 'true';
  if (!isPauseEnabled) return; // Jika diset false, jangan tampilkan menu

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

// HMR Cleanup: Pastikan gameGroup yang lama dibuang jika script di-reload
if (window._oldGameGroup) {
  scene.remove(window._oldGameGroup);
}
window._oldGameGroup = gameGroup;

// ========================
// 4. ANIMATE LOOP — Berjalan dari awal
// ========================
let lastT = performance.now();
let lastEmitT = 0, lastRayT = 0;

// Physics & movement state
let currentVel = new THREE.Vector3();
let verticalVelocity = 0;
let isGrounded = false;
let isRespawnTransitioning = false;
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
  // Koordinat khusus sesuai permintaan User (Screenshot)
  let spawnX = 0, spawnZ = 0, spawnY = 8;
  
  if (localPlayerData) {
    if (localPlayerData.n === 'Elfan') {
      spawnX = 3.3; spawnY = 5.6; spawnZ = -4.3;
    } else if (localPlayerData.n === 'Savira') {
      spawnX = -4.1; spawnY = 5.6; spawnZ = -4.8;
    }
  }
  
  if (playerBody) {
    playerBody.setTranslation({ x: spawnX, y: spawnY, z: spawnZ }, true);
    playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    playerBody.wakeUp(); // Pastikan bodi tidak dalam mode tidur (sleeping) agar gravitasi bisa bekerja
  }
  
  currentVel.set(0, 0, 0);
  verticalVelocity = 0;
  isGrounded = false;
  
  cameraYaw = 0;
  cameraPitch = -0.1;
  playerGroup.rotation.y = 0;
  gsap.killTweensOf(camera.position);
  gsap.killTweensOf(camera);
  isRespawnTransitioning = true;
  camera.position.set(0, 1.9, 3.2);
  camera.fov = 82;
  camera.updateProjectionMatrix();
  gsap.to(camera.position, {
    x: 0,
    y: 0.75,
    z: 0,
    duration: 1.05,
    ease: 'power3.out',
    onComplete: () => {
      isRespawnTransitioning = false;
    }
  });
  gsap.to(camera, {
    fov: 75,
    duration: 1.0,
    ease: 'power2.out',
    onUpdate: () => camera.updateProjectionMatrix()
  });
  updateCameraRotation();
  
  debugLog('🌟 RESPAWN', `Player ${localPlayerData?.n} respawn di [${spawnX}, ${spawnY}, ${spawnZ}]`);
}

let debugFrameCounter = 0;

let isLoopRunning = true;
window._coizyStopEngine = () => { isLoopRunning = false; };

function animate() {
  if (!isLoopRunning) return;
  requestAnimationFrame(animate);
  const time = performance.now();
  const rawDelta = (time - lastT) / 1000;
  const delta = Math.min(rawDelta, 0.05);
  const isHiddenTab = document.hidden;

  if (!inGame) {
    lobbyGroup.position.y = -10 + Math.sin(time * 0.001) * 1;
    lobbyGroup.rotation.y = time * 0.0001;
  }

  // Saat tab tidak aktif, skip update/render berat untuk mengurangi beban CPU/GPU.
  if (isHiddenTab) {
    lastT = time;
    return;
  }

  if (inGame && playerBody && physicsWorld) {
    updatePhysics(delta, time);
    updateCameraRotation(); // PERBAIKAN 2
    
    // === PERBAIKAN 4: DEBUG PHYSICS BERKALA (Dinonaktifkan demi performa) ===
    /*
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
    */

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
  // Pastikan Sky Dome selalu mengikuti posisi camera (Global)
  if (window._skyMesh && (time - lastSkyFollowT > SKY_FOLLOW_INTERVAL_MS)) {
    lastSkyFollowT = time;
    camera.getWorldPosition(SKY_FOLLOW_TMP);
    window._skyMesh.position.copy(SKY_FOLLOW_TMP);
  }

  // ====== LEAF PARTICLES ANIMATION ======
  if (windParticles.length > 0) {
    const pTime = time * 0.001;
    windParticles.forEach(p => {
        const u = p.userData;
        p.position.x -= u.speedX * delta;
        p.position.y += Math.sin(pTime * 2.0 + p.position.x) * 0.01 + u.speedY * delta;
        p.rotation.x += u.rotX * delta * 2;
        p.rotation.y += u.rotY * delta * 2;
        p.rotation.z += u.rotZ * delta * 2;
        
        // Wrap around effect
        if (p.position.x < -40) {
            p.position.x = 40;
            p.position.y = Math.random() * 10 + 2;
            p.position.z = (Math.random() - 0.5) * 60;
        }
    });
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
    lockPointer(); // Trigger Pointer Lock seawal mungkin dari gesture klik/enter
    proceedToWorld({ n: 'Elfan', c: '#4da6ff' });
  } else if (c === '150108') {
    lockPointer();
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
  
  // HMR Guard: Jika sedang reload, pastikan animasi lama tidak bentrok
  gsap.killTweensOf(camera.position); 
  
  // Zoom camera ke pulau lalu masuk
  gsap.to(uiLayer, { opacity: 0, duration: 0.8 });
  
  // PARAREL: Mulai inisialisasi engine di background agar saat animasi selesai, game sudah siap.
  // Pemicu dimulainya dunia diatur di dalam initGameEngine
  initGameEngine(player);

  gsap.to(camera.position, { z: -25, y: 5, duration: 3, ease: 'power2.inOut', onComplete: () => {
    // Zoom selesai, tinggal menunggu initGameEngine menyelesaikan transisinya sendiri
  }});
}

// ========================
// 6. INIT GAME ENGINE — Async, dipanggil setelah login
// ========================
async function initGameEngine(player) {
  localPlayerData = player;
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

  setLoad(10, 'Membuka gerbang dunia...');
  // Menghilangkan warning deprecation secara paksa dengan unbinding call
  const rapierInit = RAPIER.init;
  await rapierInit(); 
  setLoad(30, 'Menyusun fisika pulau...');

  // Use RAPIER.Vector3 for gravity 
  physicsWorld = new RAPIER.World(new RAPIER.Vector3(0.0, -20.0, 0.0));
  Layers = { TERRAIN: 0x0001, STATIC: 0x0002, DYNAMIC: 0x0004, PLAYER: 0x0008, NPC: 0x0010, TRIGGER: 0x0020 };

  setLoad(50, 'Menanam pepohonan lucu...');
  // Player Physics — Menggunakan kordinat spawn khusus yang diminta
  let startX = 0, startY = 8, startZ = 0;
  if (player.n === 'Elfan') { startX = 3.3; startY = 5.6; startZ = -4.3; }
  else if (player.n === 'Savira') { startX = -4.1; startY = 5.6; startZ = -4.8; }

  const playerBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(startX, startY, startZ)
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
  const lArm = new THREE.Mesh(limbGeo, limbMat); lArm.position.set(-0.48, 0.2, 0.0); lArm.rotation.z = 0.4; lArm.name = 'lArm';
  const rArm = new THREE.Mesh(limbGeo, limbMat); rArm.position.set(0.48, 0.2, 0.0); rArm.rotation.z = -0.4; rArm.name = 'rArm';
  const lLeg = new THREE.Mesh(limbGeo, limbMat); lLeg.position.set(-0.2, -0.3, 0); lLeg.name = 'lLeg';
  const rLeg = new THREE.Mesh(limbGeo, limbMat); rLeg.position.set(0.2, -0.3, 0); rLeg.name = 'rLeg';
  playerVisGroup.add(lArm, rArm, lLeg, rLeg);
  
  // Simple dark shadow under character (no real shadow drop)
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x7F73B8, transparent: true, opacity: 0.2, depthWrite: false });
  const blobShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), shadowMat);
  blobShadow.rotation.x = -Math.PI / 2;
  blobShadow.position.y = -0.45;
  playerVisGroup.add(blobShadow);
  
  playerGroup.add(playerVisGroup);
  playerVisual = playerVisGroup;
  // Karakter lokal selalu visible (kelihatan dari kamera 3rd person)
  playerVisual.visible = true;

  // Setup NPC Manager
  npcManager = new NPCManager({ getHeight: (x, z) => worldBuilder ? worldBuilder.getHeight(x, z) : 0 }, playerGroup);

  setLoad(70, 'Membangun dunia kecil kalian...');
  worldBuilder = new WorldBuilder(scene, gameGroup, interactables, RAPIER, physicsWorld, Layers);
  worldBuilder.npcManager = npcManager;
  npcManager.world = worldBuilder;
  await worldBuilder.build((progress) => {
    setLoad(70 + progress * 0.2, `Menyusun detail dunia... ${Math.floor(progress)}%`);
  });

  setLoad(90, 'Menyalakan bintang-bintang...');
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
  setLoad(100, 'Selamat datang di OurLittleWorld! 🌸');
  await new Promise(r => setTimeout(r, 600)); // brief moment to show 100%

  // Hide loading, show game
  gsap.to(loadingScreen, {
    opacity: 0, duration: 0.8, onComplete: () => {
      loadingScreen.classList.add('hidden');
      loadingScreen.style.opacity = ''; // reset for next time
      gameGroup.visible = true;
      lobbyGroup.visible = false; // Pastikan pulau lobby hilang saat masuk game
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
      const fIdx = interactables.indexOf(currentInteractable);
      socket?.emit('interaction', { type: 'flower', index: fIdx });
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
        socket?.emit('interaction', { type: 'door', state: !isOpen }); // BASTKAN STATUS PINTU KE PEMAIN LAIN
      }
      break;

      break;

    case 'sign':
      showRoomNameUI(); 
      break;

    case 'crate':
      const cIdx = interactables.indexOf(currentInteractable);
      socket?.emit('interaction', { type: 'crate', index: cIdx });
      gsap.to(currentInteractable.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.1, yoyo: true, repeat: 1, ease: 'power2.out' });
      showSpeechBubble("Membuka peti... 📦");
      break;

    case 'drum':
      gsap.to(currentInteractable.scale, { x: 1.05, z: 1.05, duration: 0.15, yoyo: true, repeat: 1 });
      showNotificationToast("Mengambil air dari drum 💧");
      break;

    case 'generator':
      const gIdx = interactables.indexOf(currentInteractable);
      socket?.emit('interaction', { type: 'generator', index: gIdx });
      gsap.to(currentInteractable.position, { x: currentInteractable.position.x + 0.05, duration: 0.05, repeat: 10, yoyo: true });
      showSpeechBubble("Brum... brum... ⚙️", 1500);
      if (typeof togglePower === 'function') togglePower();
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

    case 'rabbit':
      showSpeechBubble("Kelinci terlihat senang! 🐰");
      currentInteractable.userData.isBeingPet = true;
      createSparkle(currentInteractable.position.clone().add(new THREE.Vector3(0, 0.3, 0)));
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
    // Perbaikan Trigger: Sesuaikan type agar sinkron dengan yang diharapkan backend (named_star)
    socket?.emit('interaction', { type: 'named_star', starId: id, starName: text });
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

  // Bug 1 Fix: Ground Snap Safety Net (Dipertajam agar tidak nyangkut terus-menerus)
  const gHeight = worldBuilder ? worldBuilder.getHeight(pTrans.x, pTrans.z) : -10;
  if (pTrans.y < gHeight - 3.0) { // Lebih toleran agar gravitasi punya waktu bekerja
    playerBody.setTranslation({ x: pTrans.x, y: gHeight + 1.2, z: pTrans.z }, true);
    playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  }

  // Sync player group XZ & Y — kurangi 0.5 agar visual karakter nempel ke tanah (bukan melayang)
  if (playerState === 'idle') {
    playerGroup.position.set(pTrans.x, pTrans.y - 0.5, pTrans.z);
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

  // Model Rotation — Arahkan karakter ke arah jalan
  if (playerVisual) {
    let targetAngle = playerVisual.rotation.y;
    if (moveDir.lengthSq() > 0.01) {
      // HADAP JALAN: Jika bergerak, hadap ke arah vector gerakan
      targetAngle = Math.atan2(moveDir.x, moveDir.z);
    } else {
      // HADAP KAMERA: Jika diam, hadap ke arah kamera (belakangi view)
      targetAngle = cameraYaw + Math.PI;
    }
    
    // Shortest path interpolation
    let diff = targetAngle - playerVisual.rotation.y;
    diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
    playerVisual.rotation.y += diff * 0.15;
  }

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
    // Hit TERRAIN (0x0001) atau STATIC (0x0002)
    const wallHit = physicsWorld.castRay(new RAPIER.Ray(rp, rd), 0.5, true, (Layers.TERRAIN | Layers.STATIC), undefined, undefined, playerBody);
    if (wallHit) {
      const rp2 = { x: pTrans.x, y: pTrans.y - 0.25, z: pTrans.z };
      const topHit = physicsWorld.castRay(new RAPIER.Ray(rp2, rd), 0.5, true, (Layers.TERRAIN | Layers.STATIC), undefined, undefined, playerBody);
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
  if (!isFreeCam && !isRespawnTransitioning) {
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

    // Orbit Camera: Position relative to player (First Person vs Third Person)
    const targetZ = isThirdPerson ? 4.5 : 0.0;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 8.0 * delta);
    
    // Sembunyikan model hanya jika kamera sangat dekat dengan mata (First Person)
    // Gunakan threshold 0.1 agar saat baru bergeser sedikit pun langsung hilang kepalanya
    if (playerVisual) {
      playerVisual.visible = (isThirdPerson || camera.position.z > 0.1);
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

  // ======= AKHIR DARI FUNGSI updatePhysics =======
  // Animasi karakter lokal — setiap frame
  if (playerVisual && inGame) {
    const isMoving = !!(moveState.w || moveState.a || moveState.s || moveState.d);
    animateLimbs(playerVisual, isMoving ? 1.0 : 0.0, time * 0.001);
  }

  // EMIT posisi — hanya kirim jika ada perubahan bermakna (untuk kurangi jitter)
  if (socket && socket.connected && inGame && playerBody && time - lastEmitT > NETWORK_EMIT_INTERVAL_MS) {
    const pos = playerGroup.position;
    const isMoving = !!(moveState.w || moveState.a || moveState.s || moveState.d);
    const normalizedRy = ((cameraYaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    // Cek perbedaan posisi/rotasi dari emit terakhir
    const lastP = socket._lastP || { x:0, y:0, z:0 };
    const lastR = socket._lastR || 0;
    const distSq = (pos.x - lastP.x)**2 + (pos.y - lastP.y)**2 + (pos.z - lastP.z)**2;
    const rotDiff = Math.abs(normalizedRy - lastR);
    const forceEmit = (time - lastEmitT) > NETWORK_HEARTBEAT_MS; // Heartbeat saat idle

    if (distSq > 0.0001 || rotDiff > 0.02 || isMoving || forceEmit) {
      // Quantize tipis untuk menekan ukuran payload dan jitter mikro.
      const qx = Math.round(pos.x * 1000) / 1000;
      const qy = Math.round(pos.y * 1000) / 1000;
      const qz = Math.round(pos.z * 1000) / 1000;
      const qry = Math.round(normalizedRy * 1000) / 1000;
      lastEmitT = time;
      socket._lastP = { x: qx, y: qy, z: qz };
      socket._lastR = qry;
      socket.emit('player_move', { x: qx, y: qy, z: qz, ry: qry, moving: isMoving });
    }
  }

  // SYNC PEERS — lerp sederhana, rotasi dari delta posisi
  Object.values(peers).forEach(peer => {
    if (!peer.targetPos) return;

    // Simpan posisi sebelumnya untuk hitung arah gerak
    const prevX = peer.position.x;
    const prevZ = peer.position.z;

    // Sinkronisasi posisi dengan Lerp + Snap untuk hilangkan micro-jitter
    const d = peer.position.distanceTo(peer.targetPos);
    if (d > 0.001) {
      // Lerp XYZ dengan faktor tetap agar smooth
      peer.position.lerp(peer.targetPos, 0.12);
      // Jika sudah sangat dekat (<1cm), langsung snap agar lerp tidak sisa jitter
      if (d < 0.01) peer.position.copy(peer.targetPos);
    }

    const body = peer.getObjectByName("Body");
    if (!body) return;

    // Logika Rotasi STABIL (Anti-Flicker & Smooth Transition)
    const moveDx = peer.targetPos.x - peer.position.x;
    const moveDz = peer.targetPos.z - peer.position.z;
    const moveDistToTargetSq = moveDx*moveDx + moveDz*moveDz;
    
    // Gunakan state sebelumnya untuk cegah perubahaan drastis (Hysteresis)
    const isMovingLocally = peer.isMoving || moveDistToTargetSq > 0.002;
    let targetAngle = body.rotation.y;

    if (isMovingLocally) {
      // HADAP JALAN
      targetAngle = Math.atan2(moveDx, moveDz);
    } else if (peer.targetRot !== undefined) {
      // HADAP KAMERA
      targetAngle = peer.targetRot + Math.PI;
    }

    // Shortest path logic
    let diff = targetAngle - body.rotation.y;
    diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;

    // Smoothing: Sangat halus saat diam, sedikit lebih cepat saat berganti arah jalan
    const smoothFactor = isMovingLocally ? 0.2 : 0.06;
    if (Math.abs(diff) > 0.01) {
      body.rotation.y += diff * smoothFactor;
    }

    animateLimbs(body, peer.isMoving ? 1.0 : 0.0, time * 0.001);
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
// Helper: Procedural Walk Animation (TANPA modifikasi position.y agar tidak konflik dengan network Y)
// ========================
function animateLimbs(visGroup, speed, t) {
  const lArm = visGroup.getObjectByName('lArm');
  const rArm = visGroup.getObjectByName('rArm');
  const lLeg = visGroup.getObjectByName('lLeg');
  const rLeg = visGroup.getObjectByName('rLeg');
  if (speed > 0.01) {
    const walkSpd = 8.0;
    const s = Math.sin(t * walkSpd) * 0.5;
    if (lArm) lArm.rotation.x = s;
    if (rArm) rArm.rotation.x = -s;
    if (lLeg) lLeg.rotation.x = -s;
    if (rLeg) rLeg.rotation.x = s;
  } else {
    // Kembali idle dengan halus
    if (lArm) lArm.rotation.x = THREE.MathUtils.lerp(lArm.rotation.x, 0, 0.1);
    if (rArm) rArm.rotation.x = THREE.MathUtils.lerp(rArm.rotation.x, 0, 0.1);
    if (lLeg) lLeg.rotation.x = THREE.MathUtils.lerp(lLeg.rotation.x, 0, 0.1);
    if (rLeg) rLeg.rotation.x = THREE.MathUtils.lerp(rLeg.rotation.x, 0, 0.1);
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
    case 'w': if(!moveState.w) debugLog('🟢 GERAK', 'Maju'); moveState.w = true; break;
    case 's': if(!moveState.s) debugLog('🔴 GERAK', 'Mundur'); moveState.s = true; break;
    case 'a': if(!moveState.a) debugLog('🟡 GERAK', 'Kiri'); moveState.a = true; break;
    case 'd': if(!moveState.d) debugLog('🟡 GERAK', 'Kanan'); moveState.d = true; break;
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
    // Putus koneksi lama jika ada (HMR/hot-reload)
    if (window._coizySocket) {
      window._coizySocket.disconnect();
    }
    if (window._coizyPeers) {
      Object.values(window._coizyPeers).forEach(g => gameGroup && gameGroup.remove(g));
    }
    Object.keys(peers).forEach(id => removePeer(id));

    // Koneksi realtime provider (Supabase) untuk deploy Vercel-only.
    socket = createRealtimeClient({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    });
    window._coizySocket = socket;
    window._coizyPeers = peers;

    // ── Event handlers didaftarkan SEKALI di luar connect ──

    socket.on('connect', () => {
      console.log('[NET] Connected:', socket.id);
      // Join room setelah koneksi berhasil
      socket.emit('join_room', { roomCode: 'COIZY', name: playerName, color: playerColor }, (res) => {
        if (!res || !res.success) { console.warn('[NET] Join failed:', res?.error); return; }
        // Tambahkan semua pemain yang sudah ada di room
        res.others.forEach(p => addPeer(p));
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('[NET] Disconnected:', reason);
      // Jangan hapus peers saat disconnect — cegah flicker
    });

    socket.on('player_joined', ({ player }) => {
      if (!peers[player.id]) addPeer(player);
    });

    socket.on('player_moved', (data) => {
      const peer = peers[data.id];
      if (!peer) return;

      const newPos = new THREE.Vector3(data.x, data.y, data.z);
      if (!peer.hasFirstPos) {
        // Snap langsung ke posisi pertama kali — tidak ada lerp
        peer.position.copy(newPos);
        peer.hasFirstPos = true;
      }
      peer.targetPos = newPos;
      peer.targetRot = data.ry; // Update arah pandang kamera peer
      peer.isMoving = data.moving || false;
    });

    socket.on('player_left', ({ id }) => removePeer(id));

    socket.on('interaction', (data) => {
      const peer = peers[data.id];
      if (data.type === 'emote') {
        if (peer) showEmoteUI(peer, data.message, false);
      } else if (data.type === 'vinyl') {
        showNotificationToast(data.state ? "Seseorang memutar musik... 🎶" : "Musik dimatikan.");
      } else if (data.type === 'notepad') {
        const area = document.getElementById('notepad-area');
        if (area) area.value = data.text;
      } else if (data.type === 'door') {
        const d = scene.getObjectByName('DOOR_MAIN');
        if (d && d.parent) {
          d.parent.userData.isOpen = data.state;
          gsap.to(d.parent.rotation, { y: data.state ? -Math.PI / 2 : 0, duration: 0.6, ease: 'power2.inOut' });
        }
      } else if (data.type === 'flower') {
        const fObject = interactables[data.index];
        if (fObject) {
          fObject.visible = false;
          setTimeout(() => {
            fObject.visible = true;
            fObject.scale.set(0, 0, 0);
            gsap.to(fObject.scale, { x: 1, y: 1, z: 1, duration: 1.5, ease: 'bounce.out' });
          }, 60000);
        }
      } else if (data.type === 'crate') {
        const cObj = interactables[data.index];
        if (cObj) gsap.to(cObj.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.1, yoyo: true, repeat: 1 });
      } else if (data.type === 'generator') {
        const gObj = interactables[data.index];
        if (gObj) gsap.to(gObj.position, { x: gObj.position.x + 0.05, duration: 0.05, repeat: 10, yoyo: true });
      }
    });

  } catch (e) {
    console.error("Network Init Error:", e);
  }
}

function addPeer(p) {
  if (peers[p.id]) removePeer(p.id); 
  
  // AGRESSIVE CLEANUP: Cek registry global agar tidak ada duplikat meski reload
  if (window._coizyPeers) {
    Object.keys(window._coizyPeers).forEach(id => {
      const oldPeer = window._coizyPeers[id];
      if (oldPeer && oldPeer.userData && oldPeer.userData.name === p.name) {
        if (gameGroup) gameGroup.remove(oldPeer);
        delete window._coizyPeers[id];
      }
    });
  }
  
  const group = new THREE.Group();
  group.userData = { id: p.id, name: p.name };
  const playerVisGroup = new THREE.Group();

  // Tubuh Chubby
  const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 16), new THREE.MeshStandardMaterial({ color: p.color, roughness: 1.0 }));
  bodyMesh.position.y = 0.1;
  playerVisGroup.add(bodyMesh);

  // Kepala
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), new THREE.MeshStandardMaterial({ color: p.color, roughness: 1.0 }));
  headMesh.position.y = 0.65;
  playerVisGroup.add(headMesh);

  // Mata
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x4a4a4a });
  const eyeGeo = new THREE.SphereGeometry(0.065, 8, 8);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat); leftEye.position.set(-0.16, 0.72, 0.37);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat); rightEye.position.set(0.16, 0.72, 0.37);

  // Highlight Mata
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
  const hlGeo = new THREE.SphereGeometry(0.025, 6, 6);
  const lHl = new THREE.Mesh(hlGeo, hlMat); lHl.position.set(-0.02, 0.025, 0.05); leftEye.add(lHl);
  const rHl = new THREE.Mesh(hlGeo, hlMat); rHl.position.set(-0.02, 0.025, 0.05); rightEye.add(rHl);
  playerVisGroup.add(leftEye, rightEye);

  // Pipi Blush
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xFF9E6C, transparent: true, opacity: 0.45 });
  const blushGeo = new THREE.CircleGeometry(0.07, 12);
  const lBlush = new THREE.Mesh(blushGeo, blushMat); lBlush.position.set(-0.28, 0.62, 0.33); lBlush.rotation.y = -0.4;
  const rBlush = new THREE.Mesh(blushGeo, blushMat); rBlush.position.set(0.28, 0.62, 0.33); rBlush.rotation.y = 0.4;
  playerVisGroup.add(lBlush, rBlush);

  // Kaki dan Tangan
  const limbMat = new THREE.MeshStandardMaterial({ color: p.color });
  const limbGeo = new THREE.CapsuleGeometry(0.08, 0.15, 4, 8);
  const lArm = new THREE.Mesh(limbGeo, limbMat); lArm.position.set(-0.48, 0.2, 0.0); lArm.rotation.z = 0.4; lArm.name = 'lArm';
  const rArm = new THREE.Mesh(limbGeo, limbMat); rArm.position.set(0.48, 0.2, 0.0); rArm.rotation.z = -0.4; rArm.name = 'rArm';
  const lLeg = new THREE.Mesh(limbGeo, limbMat); lLeg.position.set(-0.2, -0.3, 0); lLeg.name = 'lLeg';
  const rLeg = new THREE.Mesh(limbGeo, limbMat); rLeg.position.set(0.2, -0.3, 0); rLeg.name = 'rLeg';
  playerVisGroup.add(lArm, rArm, lLeg, rLeg);

  // Shadow sederhana
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x7B5830, transparent: true, opacity: 0.25, depthWrite: false });
  const blobShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), shadowMat);
  blobShadow.rotation.x = -Math.PI / 2;
  blobShadow.position.y = -0.45;
  playerVisGroup.add(blobShadow);

  group.add(playerVisGroup);

  // Nameplate
  const cnv = document.createElement('canvas');
  const ctx = cnv.getContext('2d'); cnv.width = 256; cnv.height = 64;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(0,0,256,64,20); ctx.fill();
  ctx.font = 'bold 36px Arial'; ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.fillText(p.name, 128, 45);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cnv) }));
  
  // Posisi nama diturunkan karena model karakter baru lebih pendek dan bulat
  sprite.position.set(0, 1.4, 0); 
  sprite.scale.set(1.5, 0.375, 1);
  group.add(sprite);

  group.position.set(p.x || 0, p.y || 1, p.z || 0);
  group.targetPos = group.position.clone();
  
  // Referensi rotasi untuk sync
  playerVisGroup.name = "Body";

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
