import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import gsap from 'gsap';
import { io } from 'socket.io-client';

// ========================
// 1. GLOBAL STATE & CORE
// ========================
const canvas = document.querySelector('#bg-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);

const colors = {
  sunset: '#ff8f66',
  night: '#0a0a1a',
  grass: '#5b8a5b',
  tree: '#2a5e2a'
};

// Properly initialize Three.js Colors
const sunsetColor = new THREE.Color(colors.sunset);
scene.background = sunsetColor;
scene.fog = new THREE.FogExp2(sunsetColor, 0.005);

const ambientLight = new THREE.AmbientLight('#ffccaa', 0.8);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight('#ffa552', 2);
sunLight.position.set(50, 20, -50);
scene.add(sunLight);

// ========================
// 2. LOBBY ASSETS
// ========================
const lobbyGroup = new THREE.Group();
scene.add(lobbyGroup);

const lobbyIsland = new THREE.Mesh(
  new THREE.CylinderGeometry(15, 8, 10, 32),
  new THREE.MeshStandardMaterial({ color: colors.grass, roughness: 0.8 })
);
lobbyGroup.add(lobbyIsland);

for (let i = 0; i < 8; i++) {
  const tree = new THREE.Mesh(new THREE.ConeGeometry(1.5, 5, 8), new THREE.MeshStandardMaterial({ color: colors.tree }));
  tree.position.set((Math.random()-0.5)*15, 7.5, (Math.random()-0.5)*15);
  lobbyGroup.add(tree);
}
lobbyGroup.position.set(0, -10, -30);
camera.position.set(0, 10, 40);

// ========================
// 3. GAME WORLD
// ========================
const gameGroup = new THREE.Group();
scene.add(gameGroup);
gameGroup.visible = false;
let interactables = [];

// Island
const islandBase = new THREE.Mesh(new THREE.CylinderGeometry(50, 30, 15, 64), new THREE.MeshStandardMaterial({ color: colors.grass }));
islandBase.position.y = -7.5;
gameGroup.add(islandBase);

// Trees
for(let i=0; i<30; i++) {
  const angle = (Math.random() * Math.PI * 2);
  const dist = 20 + Math.random() * 25;
  const tree = new THREE.Mesh(new THREE.ConeGeometry(2, 6, 8), new THREE.MeshStandardMaterial({color: colors.tree}));
  tree.position.set(Math.cos(angle)*dist, 3, Math.sin(angle)*dist);
  gameGroup.add(tree);
}

// House
const houseGroup = new THREE.Group();
gameGroup.add(houseGroup);
const floor = new THREE.Mesh(new THREE.BoxGeometry(20, 0.5, 20), new THREE.MeshStandardMaterial({ color: '#8b5a2b' }));
floor.position.y = 0.25;
houseGroup.add(floor);

const wallMat = new THREE.MeshStandardMaterial({ color: '#f5deb3' });
[
  { p: [0, 5, -10], s: [20, 10, 0.5] },
  { p: [0, 5, 10], s: [20, 10, 0.5] },
  { p: [10, 5, 0], s: [0.5, 10, 20] },
  { p: [-10, 5, 0], s: [0.5, 10, 20] }
].forEach(w => { 
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...w.s), wallMat);
  mesh.position.set(...w.p); houseGroup.add(mesh);
});

// Furniture
const shelf = new THREE.Mesh(new THREE.BoxGeometry(4, 8, 1), new THREE.MeshStandardMaterial({ color: '#4a3018' }));
shelf.position.set(-2, 4, -9);
shelf.userData = { type: 'bookshelf', label: 'Jelajahi Perpustakaan' };
houseGroup.add(shelf); interactables.push(shelf);

const book = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.6), new THREE.MeshStandardMaterial({ color: '#d32f2f' }));
book.position.set(6, 1, -6); // On a table (simplified)
book.userData = { type: 'memory_book', label: 'Buku Kenangan' };
houseGroup.add(book); interactables.push(book);

const fireLight = new THREE.PointLight('#ff6600', 2, 12);
fireLight.position.set(0, 1, -8);
houseGroup.add(fireLight);

// Rooftop
const ladder = new THREE.Mesh(new THREE.BoxGeometry(1.5, 12, 0.5), new THREE.MeshStandardMaterial({ color: '#8b5a2b' }));
ladder.position.set(-8, 5, 8); ladder.rotation.x = -Math.PI/8;
ladder.userData = { type: 'ladder', label: 'Naik ke Rooftop' };
houseGroup.add(ladder); interactables.push(ladder);

const starSpheres = new THREE.Group();
gameGroup.add(starSpheres);
starSpheres.position.y = 20;

// ========================
// 4. NETWORKING
// ========================
let socket;
const peers = {};

function initNetwork(playerName, playerColor) {
  try {
    socket = io('http://localhost:3001');
    socket.on('connect', () => {
      console.log("Socket connected!");
      socket.emit('join_room', { roomCode: 'COIZY', name: playerName, color: playerColor }, (res) => {
        if (res.success) res.others.forEach(p => addPeer(p));
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
        if(data.type === 'emote') {
          const peer = peers[data.id];
          if (peer) showPeerEmote(peer, data.message);
        }
      });
    });
  } catch (e) {
    console.error("Network Init Error:", e);
  }
}

function addPeer(p) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.2, 4, 8), new THREE.MeshStandardMaterial({ color: p.color }));
  body.position.y = 1; group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), new THREE.MeshStandardMaterial({ color: '#ffe0bd' }));
  head.position.y = 2.0; group.add(head);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d'); canvas.width = 256; canvas.height = 64;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(0, 0, 256, 64, 20); ctx.fill();
  ctx.font = 'bold 36px Arial'; ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.fillText(p.name, 128, 45);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
  sprite.position.y = 2.8; sprite.scale.set(2, 0.5, 1);
  group.add(sprite);

  group.position.set(p.x, p.y, p.z);
  group.targetPos = group.position.clone();
  gameGroup.add(group); peers[p.id] = group;
}

function removePeer(id) { if (peers[id]) { gameGroup.remove(peers[id]); delete peers[id]; } }

function sendEmote(id) {
  if (!socket) return;
  const msgs = ["👋 Hey!", "💃 Berjoget!", "🧘 Duduk santai", "✌️ Peace!", "🫂 Peluk"];
  const msg = msgs[id - 1];
  showEmoteUI(null, msg, true);
  socket.emit('interaction', { type: 'emote', emoteId: id, message: msg });
}

function showPeerEmote(peer, msg) { showEmoteUI(peer, msg, false); }

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
// 5. CONTROLS
// ========================
let controls = new PointerLockControls(camera, document.body);
let inGame = false;
let isRooftop = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const moveState = { w: false, a: false, s: false, d: false };

document.addEventListener('keydown', (e) => {
  if (!inGame || document.pointerLockElement !== document.body) return;
  if (/Digit[1-5]/.test(e.code)) { sendEmote(parseInt(e.code.replace('Digit',''))); return; }
  switch (e.code) {
    case 'KeyW': moveState.w = true; break;
    case 'KeyA': moveState.a = true; break;
    case 'KeyS': moveState.s = true; break;
    case 'KeyD': moveState.d = true; break;
    case 'KeyE': checkInteraction(); break;
  }
});
document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW': moveState.w = false; break;
    case 'KeyA': moveState.a = false; break;
    case 'KeyS': moveState.s = false; break;
    case 'KeyD': moveState.d = false; break;
  }
});

let currentInteractable = null;
const promptUI = document.getElementById('interaction-prompt');
const promptText = document.getElementById('prompt-text');

// ========================
// 6. UI & TRANSITION LOGIC
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
  if (c === '220108' || c === '150108') {
    proceedToWorld(c === '220108' ? { n: 'Elfan', c: '#4da6ff' } : { n: 'Savira', c: '#ff66b2' });
  } else {
    document.getElementById('login-box').classList.add('shake');
    setTimeout(() => document.getElementById('login-box').classList.remove('shake'), 400);
    errorMsg.textContent = "Kode salah..."; errorMsg.classList.add('visible');
  }
}

function proceedToWorld(player) {
  console.log("Proceeding...");
  gsap.to(uiLayer, { opacity: 0, duration: 1 });
  gsap.to(camera.position, { z: 5, y: 2, duration: 3, onComplete: () => {
    gsap.to("#transition-overlay", { opacity: 1, duration: 1, onComplete: () => {
      console.log("Start Game called via transition onComplete");
      startGame(player);
    }});
  }});
}

function startGame(player) {
  try {
    console.log("startGame() started");
    inGame = true;
    lobbyGroup.visible = false;
    gameGroup.visible = true;
    
    // Position - Use camera directly to avoid controls.getObject() error
    camera.position.set(0, 3, 30);
    if (controls) {
      // For PointerLockControls, moving camera effectively moves the "object"
      // because controls is attached to it.
    }
    
    // HUD
    document.getElementById('hud-player-name').textContent = player.n;
    document.getElementById('hud-player-color').style.background = player.c;
    document.getElementById('game-hud').classList.remove('hidden');
    
    // Clear Overlay
    gsap.to("#transition-overlay", { opacity: 0, duration: 2, delay: 0.2 });
    document.body.classList.add('in-game');
    
    // One-time listener for clicks
    document.addEventListener('mousedown', () => {
       if (inGame && document.getElementById('memory-book').classList.contains('hidden')) {
         controls.lock();
       }
    });

    initNetwork(player.n, player.c);
    console.log("startGame() finished normally");
  } catch (err) {
    console.error("FATAL in startGame:", err);
    // Safety reveal
    document.getElementById('transition-overlay').style.opacity = '0';
  }
}

function checkInteraction() {
  if (!currentInteractable) return;
  const t = currentInteractable.userData.type;
  if (t === 'ladder') {
    isRooftop = !isRooftop;
    if (isRooftop) {
      gsap.to(camera.position, { y: 23 });
      gsap.to(scene.background, { r: 0.04, g: 0.04, b: 0.1 });
    } else {
      gsap.to(camera.position, { y: 3 });
      gsap.to(scene.background, { r: 1, g: 0.56, b: 0.4 });
    }
  } else if (t === 'memory_book') {
    controls.unlock();
    document.getElementById('memory-book').classList.remove('hidden');
  }
}

// Close Book
document.getElementById('close-book-btn').onclick = () => {
  document.getElementById('memory-book').classList.add('hidden');
};

// ========================
// 7. ANIMATION
// ========================
let lastT = performance.now();
let lastEmitT = 0, lastRayT = 0;

function animate() {
  requestAnimationFrame(animate);
  const time = performance.now();
  const delta = (time - lastT) / 1000;
  
  if (!inGame) {
    lobbyGroup.position.y = -10 + Math.sin(time*0.001) * 1;
    lobbyGroup.rotation.y = time * 0.0001;
  } else {
    for (let id in peers) {
      if (peers[id].targetPos) {
        peers[id].position.lerp(peers[id].targetPos, 0.1);
      }
    }
    if (controls.isLocked) {
      velocity.x -= velocity.x * 10 * delta;
      velocity.z -= velocity.z * 10 * delta;
      direction.z = Number(moveState.w) - Number(moveState.s);
      direction.x = Number(moveState.d) - Number(moveState.a);
      direction.normalize();
      
      const speed = 60;
      if (moveState.w || moveState.s) velocity.z -= direction.z * speed * delta;
      if (moveState.a || moveState.d) velocity.x -= direction.x * speed * delta;
      
      controls.moveRight(-velocity.x * delta);
      controls.moveForward(-velocity.z * delta);

      const pos = camera.position;
      const d = Math.sqrt(pos.x*pos.x + pos.z*pos.z);
      if (d > 45) { pos.x *= 0.98; pos.z *= 0.98; }
      
      if (time - lastRayT > 100) {
        lastRayT = time;
        raycaster.setFromCamera(screenCenter, camera);
        const hits = raycaster.intersectObjects(interactables, true);
        if (hits.length > 0 && hits[0].distance < 6) {
          let o = hits[0].object; while(o.parent && !o.userData.type) o = o.parent;
          if (o.userData.type) { currentInteractable = o; promptText.textContent = o.userData.label; promptUI.classList.remove('hidden'); }
          else { currentInteractable = null; promptUI.classList.add('hidden'); }
        } else { currentInteractable = null; promptUI.classList.add('hidden'); }
      }
      if (socket && time - lastEmitT > 33) {
        if (Math.abs(velocity.x) + Math.abs(velocity.z) > 0.01) {
          lastEmitT = time;
          socket.emit('player_move', { x: pos.x, y: pos.y, z: pos.z, ry: camera.rotation.y });
        }
      }
    }
    fireLight.intensity = 2 + Math.sin(time * 0.01) * 0.5;
  }
  lastT = time;
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
