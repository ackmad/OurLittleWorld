import * as THREE from 'three';
import { SkySystem } from './systems/SkySystem.js';
import { WeatherSystem } from './systems/WeatherSystem.js';
import { AudioSystem } from './systems/AudioSystem.js';
import { MultiplayerSystem } from './systems/MultiplayerSystem.js';
import { World } from './scenes/World.js';
import { HouseInterior } from './scenes/HouseInterior.js';
import { PlayerController } from './characters/PlayerController.js';
import { RemotePlayer } from './characters/RemotePlayer.js';
import { NPCManager } from './characters/NPCManager.js';

// ─── Scene Setup ──────────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 10, 18);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Star Cursor ─────────────────────────────────────────────────────────────
const starCursor = document.getElementById('star-cursor');
window.addEventListener('mousemove', e => {
    starCursor.style.left = e.clientX + 'px';
    starCursor.style.top = e.clientY + 'px';
});

// ─── Systems ─────────────────────────────────────────────────────────────────
const sky = new SkySystem(scene, renderer);
const weather = new WeatherSystem(scene);
const audio = new AudioSystem();
const mp = new MultiplayerSystem();

// ─── World & Interior ────────────────────────────────────────────────────────
const world = new World(scene);
const interior = new HouseInterior(scene);
let currentScene = 'outdoor'; // 'outdoor' | 'indoor'

let npcManager = null;
let player = null;
let remotePlayers = {}; // { socketId: RemotePlayer }

// ─── Loading Progress ────────────────────────────────────────────────────────
let loadPct = 0;
const loadBar = document.getElementById('loading-bar');
function setLoad(pct) {
    loadPct = pct;
    loadBar.style.width = pct + '%';
}

function finishLoading() {
    const loadScreen = document.getElementById('loading-screen');
    loadScreen.classList.add('fade-out');
    setTimeout(() => {
        loadScreen.style.display = 'none';
        document.getElementById('join-screen').style.display = 'flex';
    }, 800);
}

// Simulate loading steps
setLoad(20);
setTimeout(() => setLoad(55), 300);
setTimeout(() => setLoad(80), 700);
setTimeout(() => { setLoad(100); setTimeout(finishLoading, 400); }, 1200);

// ─── Join Screen Logic ────────────────────────────────────────────────────────
let selectedColor = '#7a9e7e';

document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        selectedColor = dot.dataset.color;
    });
});

async function enterGame(name, color, roomCode, roomData) {
    document.getElementById('join-screen').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    document.getElementById('room-code-display').textContent = roomCode;

    // Init player
    player = new PlayerController(scene, camera, canvas, name);
    player.setName(name);
    player.setColor(color);

    // Init NPCs
    npcManager = new NPCManager(scene);

    // Existing partners
    if (roomData.others) {
        roomData.others.forEach(p => {
            remotePlayers[p.id] = new RemotePlayer(scene, p.id, p.name, p.color);
        });
    }

    // Player move → broadcast
    player.onMove = (state) => mp.sendMove(state);

    // Interaction
    player.onInteract = () => {
        if (!player.nearbyInteractable) return;
        handleInteract(player.nearbyInteractable);
    };

    // Enter/exit building
    player.onEnterBuilding = () => {
        if (currentScene === 'outdoor' && player.nearbyInteractable?.type === 'door') {
            transitionToScene('indoor');
        } else if (currentScene === 'indoor' && player.nearbyInteractable?.type === 'exit_door') {
            transitionToScene('outdoor');
        }
    };

    // Multiplayer events
    mp.onPlayerJoined = ({ player: p }) => {
        remotePlayers[p.id] = new RemotePlayer(scene, p.id, p.name, p.color);
        showNotif(`🌸 ${p.name} bergabung ke dunia!`);
    };
    mp.onPlayerLeft = ({ id }) => {
        if (remotePlayers[id]) {
            remotePlayers[id].dispose();
            delete remotePlayers[id];
        }
        showNotif('💔 Pasanganmu pergi sebentar...');
    };
    mp.onPlayerMoved = ({ id, ...state }) => {
        if (remotePlayers[id]) remotePlayers[id].updateTarget(state, currentScene);
    };
    mp.onInteraction = ({ id, type, ...data }) => {
        handleRemoteInteraction(type, data);
    };
    mp.onMemoryCreated = (mem) => {
        showNotif(`📖 Memory tersimpan: "${mem.description}"`);
        audio.playSFX('memory');
    };
    mp.onStarNamed = (star) => {
        showNotif(`✨ Bintang "${star.name}" sekarang ada di langit!`);
    };
    mp.onNameplateUpdated = (name) => {
        showNotif(`🪧 Nama rumah diubah: "${name}"`);
    };

    // Audio
    audio.setZone('outdoor_morning');

    // Sky shooting star → memory
    sky.onShootingStar(() => {
        mp.sendInteraction('shoot_star');
    });

    // Midnight fireworks
    sky.onMidnight(() => {
        mp.sendInteraction('midnight_fireworks');
        spawnFireworks();
    });

    // Load named stars
    mp.getNamedStars().then(stars => stars.forEach(addNamedStarMesh));

    // Nameplate
    mp.getNameplate().then(name => {
        showNotif(`🌸 Selamat datang di "${name}"!`);
    });

    // Weather events
    weather.onWeatherChange = (type) => {
        const msgs = { rain: '🌧️ Hujan ringan turun...', clear: '☀️ Cuaca cerah kembali', snow: '❄️ Salju tipis turun ✨' };
        if (msgs[type]) showNotif(msgs[type]);
    };

    startGameLoop();
}

// ─── Interaction Handler ──────────────────────────────────────────────────────
function handleInteract(interactable) {
    switch (interactable.type) {
        case 'campfire':
            const active = world.toggleCampfire();
            mp.sendInteraction('campfire', { active });
            audio.setZone(active ? 'living_room' : 'outdoor_night');
            showNotif(active ? '🔥 Api unggun menyala!' : '🌑 Api padam.');
            break;
        case 'pond':
            mp.sendInteraction('feed_fish');
            showNotif('🐟 Ikan-ikan berebut makanan!');
            audio.playSFX('fish');
            break;
        case 'cat':
            mp.sendInteraction('pet_cat');
            showNotif('🐱 Kucing senang dielus~');
            audio.playSFX('cat');
            break;
        case 'sit_together':
            mp.sendInteraction('sit_together');
            showNotif('💕 Duduk berdampingan bersama...');
            break;
        case 'piknik':
            mp.sendInteraction('piknik');
            showNotif('🧺 Piknik bareng di bawah langit biru!');
            break;
        case 'butterfly_zone':
            showNotif('🦋 Berdiam diri... kupu-kupu akan datang.');
            break;
        case 'memory_jar':
            openMemoryJar();
            break;
        case 'record_player':
            showNotif('🎵 Memutar lagu favorit kalian...');
            audio.playSFX('music');
            break;
        case 'fireplace':
            showNotif('🔥 Perapian sekarang hangat dan nyaman.');
            break;
    }
}

function transitionToScene(target) {
    const loadScreen = document.getElementById('loading-screen');
    loadScreen.style.display = 'flex';
    loadScreen.classList.remove('fade-out');

    setTimeout(() => {
        currentScene = target;
        player.sceneType = target;

        if (target === 'indoor') {
            world.group.visible = false;
            interior.setVisible(true);
            if (npcManager) npcManager.setVisible(false);
            if (weather) weather.setVisible(false);

            player.mesh.position.set(0, 0, 4); // inside door
            audio.setZone('living_room');
        } else {
            world.group.visible = true;
            interior.setVisible(false);
            if (npcManager) npcManager.setVisible(true);
            if (weather) weather.setVisible(true);

            player.mesh.position.set(0, 0, 0); // outside door
            audio.setZone('outdoor_morning');
        }

        loadScreen.classList.add('fade-out');
        setTimeout(() => {
            loadScreen.style.display = 'none';
        }, 800);
    }, 500);
}

function handleRemoteInteraction(type, data) {
    switch (type) {
        case 'campfire':
            if (data.active !== undefined) {
                if (data.active !== world.campfireActive) world.toggleCampfire();
            }
            break;
        case 'feed_fish':
            audio.playSFX('fish');
            break;
        case 'pet_cat':
            audio.playSFX('cat');
            break;
        case 'midnight_fireworks':
            spawnFireworks();
            break;
    }
}

// ─── Notifications ────────────────────────────────────────────────────────────
function showNotif(text, duration = 4000) {
    const container = document.getElementById('notifications');
    const el = document.createElement('div');
    el.className = 'notif';
    el.textContent = text;
    container.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.5s';
        setTimeout(() => el.remove(), 500);
    }, duration);
}

// ─── Midnight Fireworks ────────────────────────────────────────────────────────
const fireworkParticles = [];
function spawnFireworks() {
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const count = 80;
            const pos = new Float32Array(count * 3);
            const vel = [];
            const cx = (Math.random() - 0.5) * 30;
            const cy = 60 + Math.random() * 20;
            const cz = (Math.random() - 0.5) * 20;
            for (let j = 0; j < count; j++) {
                pos[j * 3] = cx; pos[j * 3 + 1] = cy; pos[j * 3 + 2] = cz;
                vel.push(new THREE.Vector3(
                    (Math.random() - 0.5) * 20, Math.random() * 8, (Math.random() - 0.5) * 20
                ));
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            const col = new THREE.Color().setHSL(Math.random(), 0.9, 0.65);
            const mat = new THREE.PointsMaterial({ color: col, size: 0.4, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
            const pts = new THREE.Points(geo, mat);
            scene.add(pts);
            fireworkParticles.push({ pts, vel, pos, t: 0 });
        }, i * 400 + Math.random() * 300);
    }
}

function updateFireworks(delta) {
    for (let i = fireworkParticles.length - 1; i >= 0; i--) {
        const fw = fireworkParticles[i];
        fw.t += delta;
        const positions = fw.pos;
        fw.vel.forEach((v, j) => {
            positions[j * 3] += v.x * delta;
            positions[j * 3 + 1] += v.y * delta - 4 * fw.t * delta;
            positions[j * 3 + 2] += v.z * delta;
        });
        fw.pts.material.opacity = Math.max(0, 1 - fw.t * 0.7);
        fw.pts.geometry.attributes.position.needsUpdate = true;
        if (fw.t > 3) {
            scene.remove(fw.pts);
            fw.pts.geometry.dispose(); fw.pts.material.dispose();
            fireworkParticles.splice(i, 1);
        }
    }
}

// ─── Named Stars ──────────────────────────────────────────────────────────────
function addNamedStarMesh(star) {
    // Visual marker for named stars - make them look like small twinkles
    const geo = new THREE.SphereGeometry(0.6, 8, 8); // Smaller and smoother
    const mat = new THREE.MeshBasicMaterial({
        color: 0xfff9ad,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geo, mat);

    // Position them much higher in the sky so they don't look like floating props
    const x = star.x ?? (Math.random() - 0.5) * 400;
    const y = Math.max(250, star.y ?? 300 + Math.random() * 200);
    const z = star.z ?? (Math.random() - 0.5) * 400;

    mesh.position.set(x, y, z);
    scene.add(mesh);
}

// Star click raycasting (night only)
let pendingStarClick = null;

canvas.addEventListener('click', (e) => {
    const h = new Date().getHours();
    if (h < 19 && h >= 5) return; // only night
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    // Position the star far away in the direction clicked
    const dir = raycaster.ray.direction.clone().normalize();
    pendingStarClick = {
        x: dir.x * 850,
        y: Math.max(dir.y * 850, 150), // ensure it's in the sky
        z: dir.z * 850
    };
    document.getElementById('star-name-ui').classList.add('open');
    document.getElementById('star-name-input').focus();
});

document.getElementById('star-name-confirm').addEventListener('click', () => {
    const name = document.getElementById('star-name-input').value.trim();
    if (!name || !pendingStarClick) return;
    mp.nameStar(Date.now(), name, pendingStarClick.x, pendingStarClick.y, pendingStarClick.z).then(res => {
        if (res.success) { addNamedStarMesh(res.star); showNotif(`✨ Bintang "${name}" tersimpan!`); }
        else showNotif('⚠️ ' + res.error);
    });
    document.getElementById('star-name-ui').classList.remove('open');
    document.getElementById('star-name-input').value = '';
    pendingStarClick = null;
});
document.getElementById('star-name-cancel').addEventListener('click', () => {
    document.getElementById('star-name-ui').classList.remove('open');
    pendingStarClick = null;
});

// ─── UI Controls ─────────────────────────────────────────────────────────────
let isMuted = false;

document.getElementById('mute-btn').addEventListener('click', () => {
    isMuted = audio.toggle();
    document.getElementById('mute-btn').textContent = isMuted ? '🔇' : '🔊';
});
document.getElementById('menu-mute').addEventListener('click', () => {
    isMuted = audio.toggle();
    document.getElementById('menu-mute').textContent = isMuted ? '🔇 Unmute' : '🔊 Toggle Suara';
});
document.getElementById('menu-close').addEventListener('click', () => {
    document.getElementById('mini-menu').classList.remove('open');
});
document.getElementById('menu-memories').addEventListener('click', () => {
    document.getElementById('mini-menu').classList.remove('open');
    openMemoryJar();
});
document.getElementById('menu-nameplate').addEventListener('click', () => {
    document.getElementById('mini-menu').classList.remove('open');
    const name = prompt('Masukkan nama baru untuk rumah:');
    if (name) mp.setNameplate(name).then(() => showNotif(`🪧 Nama rumah diubah: "${name}"`));
});

// Memory Jar
document.getElementById('memory-close').addEventListener('click', () => {
    document.getElementById('memory-jar-ui').classList.remove('open');
});

async function openMemoryJar() {
    document.getElementById('memory-jar-ui').classList.add('open');
    const memories = await mp.getMemories();
    const list = document.getElementById('memory-list');
    if (!memories.length) {
        list.innerHTML = '<p class="memory-empty">Belum ada memory. Main bareng dulu yuk! 🌸</p>';
        return;
    }
    list.innerHTML = memories.map(m => `
    <div class="memory-item">
      <div>${m.description}</div>
      <div class="mem-time">${m.displayTime}</div>
    </div>
  `).join('');
}

// ─── Join Screen Button Handlers ──────────────────────────────────────────────
document.getElementById('create-room-btn').addEventListener('click', async () => {
    const name = document.getElementById('join-name').value.trim();
    const error = document.getElementById('join-error');
    if (!name) { error.textContent = 'Isi nama dulu ya~ 🌸'; return; }
    error.textContent = '';

    mp.connect();
    try {
        const res = await mp.createRoom(name, selectedColor);
        await navigator.clipboard.writeText(res.roomCode).catch(() => { });
        showNotif(`✅ Room dibuat! Kode: ${res.roomCode} (disalin)`);
        await enterGame(name, selectedColor, res.roomCode, res);
    } catch (e) {
        error.textContent = '❌ ' + e.message;
    }
});

document.getElementById('join-room-btn').addEventListener('click', async () => {
    const name = document.getElementById('join-name').value.trim();
    const code = document.getElementById('join-code').value.trim().toUpperCase();
    const error = document.getElementById('join-error');
    if (!name) { error.textContent = 'Isi nama dulu ya~ 🌸'; return; }
    if (!code) { error.textContent = 'Isi kode room dulu!'; return; }
    error.textContent = '';

    mp.connect();
    try {
        const res = await mp.joinRoom(code, name, selectedColor);
        await enterGame(name, selectedColor, res.roomCode, res);
    } catch (e) {
        error.textContent = '❌ ' + e.message;
    }
});

// ─── Easter Eggs ──────────────────────────────────────────────────────────────
let idleHeartTimer = 0;
let heartsShown = false;
let midnightFired = false;

function checkEasterEggs(delta) {
    if (!player) return;
    // Hearts when both players idle near each other
    if (Object.keys(remotePlayers).length > 0) {
        const rp = Object.values(remotePlayers)[0];
        const d = player.getPosition().distanceTo(rp.mesh.position);
        if (d < 3 && player.idleTimer > 10) {
            if (!heartsShown) {
                spawnHearts();
                heartsShown = true;
            }
        } else {
            heartsShown = false;
        }
    }

    // Midnight
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0 && !midnightFired) {
        midnightFired = true;
        showNotif('🎆 Tengah malam tiba! Selamat malam~ 🌙');
        setTimeout(() => { midnightFired = false; }, 10000);
    }
}

function spawnHearts() {
    showNotif('💕');
    // Simple DOM hearts animation
    for (let i = 0; i < 5; i++) {
        const h = document.createElement('div');
        h.textContent = '💕';
        h.style.cssText = `
      position:fixed; font-size:1.8rem; pointer-events:none; z-index:200;
      left:${45 + Math.random() * 10}%; top:${40 + Math.random() * 10}%;
      animation:floatHeart 2s ease forwards;
    `;
        document.body.appendChild(h);
        setTimeout(() => h.remove(), 2000 + i * 200);
    }
}

// Inject heart animation
const heartStyle = document.createElement('style');
heartStyle.textContent = `
  @keyframes floatHeart {
    from { opacity:1; transform:translateY(0) scale(1); }
    to   { opacity:0; transform:translateY(-60px) scale(1.4); }
  }
`;
document.head.appendChild(heartStyle);

// ─── Game Loop ────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let started = false;

function startGameLoop() {
    if (started) return;
    started = true;

    function animate() {
        requestAnimationFrame(animate);
        const delta = Math.min(clock.getDelta(), 0.1);

        // Update all systems
        sky.update(delta);
        weather.update(delta);

        if (player) {
            const allInteractables = [
                ...(currentScene === 'outdoor' ? world.interactables : interior.interactables) || [],
                ...(npcManager && currentScene === 'outdoor' ? [npcManager.getCatInteractable()] : []),
            ];
            allInteractables.collidableObjects = currentScene === 'outdoor' ? world.collidableObjects : interior.collidableObjects;

            player.update(delta, allInteractables);
            audio.updateFromSky(sky);
        }

        Object.values(remotePlayers).forEach(rp => rp.update(delta));

        if (currentScene === 'outdoor') {
            world.update(delta, weather._windStrength);
            if (npcManager && player) {
                npcManager.update(delta, player.getPosition());
            }
        } else {
            interior.update(delta);
        }

        updateFireworks(delta);
        checkEasterEggs(delta);

        renderer.render(scene, camera);
    }
    animate();
}
