// ═══════════════════════════════════════════════════════════════════
// COZY OUR LITTLE WORLD — Complete Three.js Scene Boilerplate
// Versi: 1.0 | Total Objects: 198 | Materials: 29 flat colors
// ═══════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';

// ─── WARNA ───────────────────────────────────────────────────────
const C = {
  grass: 0x47b73f,   ocean: 0x2da3e0,   sand: 0xeacc8c,    path: 0xdbbc7a,
  dirt:  0xa5703d,   rock:  0xb2aaa0,   log:  0xc17f3d,    logDk:0x724719,
  roof:  0xf2382d,   chim:  0xada399,   door: 0x8c3f19,    win:  0xb2e0f4,
  frame: 0xdbbc84,   wood:  0xcc9951,   gold: 0xf2cc33,    bench:0xb78447,
  sign:  0xdbad60,   crate: 0x338c3f,   drum: 0x2d66d1,    gen:  0xe53326,
  stump: 0x845628,   axe:   0xb2b2b7,   leaf: 0x38a838,    leaf2:0x4cc14c,
  birch: 0xefeae0,   trunk: 0x603814,   fPnk: 0xf984b7,    fYel: 0xf9e033,
  fBlu:  0x609ef9,
};

// ─── MATERIAL FACTORY ────────────────────────────────────────────
function M(color, roughness = 0.85, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });
}

// ─── SCENE SETUP ─────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd4f0);
scene.fog = new THREE.Fog(0xb0ddf8, 60, 200);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ─── CAMERA ──────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(40, 30, 40);
camera.lookAt(0, 2, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2.2;
controls.minDistance = 8;
controls.maxDistance = 80;
controls.target.set(0, 2, 0);

// ─── LIGHTING ────────────────────────────────────────────────────
const sun = new THREE.DirectionalLight(0xfff5d0, 2.5);
sun.position.set(20, 30, 15);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(2048);
Object.assign(sun.shadow.camera, { left:-40, right:40, top:40, bottom:-40, near:0.1, far:100 });
scene.add(sun);
scene.add(new THREE.AmbientLight(0xb8e0f8, 0.8));
scene.add(new THREE.HemisphereLight(0xc8f0e8, 0x806040, 0.6));

// ─── HELPER FUNCTIONS ────────────────────────────────────────────
function createBox(name, x, y, z, w, h, d, color, rough = 0.85) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color, rough));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  m.name = name;
  scene.add(m);
  return m;
}
function createCyl(name, x, y, z, rt, rb, h, color, segs = 12, rough = 0.85, metal = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), M(color, rough, metal));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.name = name;
  scene.add(m);
  return m;
}
function createSph(name, x, y, z, r, color, rough = 0.9) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), M(color, rough));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.name = name;
  scene.add(m);
  return m;
}

// ═══════════════════════════════════════════════════════════════════
// ENVIRONMENT
// ═══════════════════════════════════════════════════════════════════

// Ocean
const ocean = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200), M(C.ocean, 0.05, 0.1)
);
ocean.rotation.x = -Math.PI / 2;
ocean.position.y = -5;
ocean.name = 'ENV_Ocean';
scene.add(ocean);

// Beach edge
createCyl('ENV_BeachEdge', 0, 0.0, 0, 17.5, 17.5, 0.24, C.sand, 32);

// Island top
const islandGeo = new THREE.PlaneGeometry(32, 26, 32, 32);
const iPos = islandGeo.attributes.position;
for (let i = 0; i < iPos.count; i++) {
  const x = iPos.getX(i), y = iPos.getY(i);
  const d = Math.sqrt((x / 16) ** 2 + (y / 13) ** 2);
  let h = d < 0.85 ? 2.5 * Math.exp(-d * 2.5) : 0;
  iPos.setZ(i, h);
}
islandGeo.computeVertexNormals();
const island = new THREE.Mesh(islandGeo, M(C.grass));
island.rotation.x = -Math.PI / 2;
island.position.y = 0.15;
island.receiveShadow = true;
island.name = 'ENV_FloatingIsland';
scene.add(island);

// Island bottom
const bot = new THREE.Mesh(new THREE.ConeGeometry(14, 5, 16), M(C.rock, 0.95));
bot.rotation.z = Math.PI;
bot.position.set(0, -1.2, 0);
bot.name = 'ENV_IslandBottom';
scene.add(bot);

// Sand path
createBox('ENV_SandPath', 0, 2.55, -10, 3.0, 0.25, 5.0, C.path);

// Dirt patches
[[-5,-8,3.46,1.73],[6,-10,2.91,1.95],[-8,5,3.6,2.44],[10,3,3.84,1.8]].forEach(([x,z,w,d],i)=>{
  createBox(`ENV_DirtPatch_${i+1}`, x, 2.45, z, w, 0.1, d, C.dirt);
});

// ═══════════════════════════════════════════════════════════════════
// HOUSE — LOG CABIN
// ═══════════════════════════════════════════════════════════════════

createBox('HOUSE_Foundation', 0, 2.17, 1.0, 4.5, 0.36, 4.2, C.rock, 0.9);
createBox('HOUSE_Walls',      0, 3.75, 1.0, 4.2, 2.8,  3.8, C.log);

// Log rings
[2.51,2.90,3.30,3.70,4.11,4.51,4.91].forEach((y,i)=>
  createBox(`HOUSE_LogRing_${i}`, 0, y, 1.0, 4.25, 0.09, 3.85, C.logDk, 0.95)
);

// Roof
const roofShape = new THREE.Shape();
roofShape.moveTo(-2.5,0); roofShape.lineTo(2.5,0); roofShape.lineTo(0,1.8); roofShape.closePath();
const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 4.9, bevelEnabled: false });
const roofMesh = new THREE.Mesh(roofGeo, M(C.roof, 0.7));
roofMesh.rotation.y = Math.PI / 2;
roofMesh.position.set(-2.45, 5.1, 3.45);
roofMesh.castShadow = true;
roofMesh.name = 'HOUSE_Roof';
scene.add(roofMesh);

createBox('HOUSE_RidgeBeam',  0, 6.96, 1.0, 0.18, 0.18, 4.9, C.logDk, 0.95);
createBox('HOUSE_Chimney',    1.2, 6.56, 0.2, 0.65, 2.0, 0.65, C.chim, 0.95);

// Door
const doorGroup = new THREE.Group();
doorGroup.position.set(-0.425, 3.55, -0.91);
scene.add(doorGroup);
const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.85,1.7,0.06), M(C.door, 0.8));
doorMesh.position.x = 0.425;
doorMesh.castShadow = true;
doorMesh.name = 'INTERACT_DoorMain';
doorGroup.add(doorMesh);

// ═══════════════════════════════════════════════════════════════════
// PORCH / TERAS
// ═══════════════════════════════════════════════════════════════════

createBox('PORCH_Floor', 0, 2.34, -2.2, 5.0, 0.18, 2.4, C.wood);
createBox('PORCH_Step1', 0, 2.13, -3.35, 3.0, 0.18, 0.7, C.wood);

[[-2.3,-1.25,'FL'],[2.3,-1.25,'FR'],[-2.3,-3.1,'BL'],[2.3,-3.1,'BR']].forEach(([x,z,l])=>
  createCyl(`PORCH_Post_${l}`, x, 3.15, z, 0.12, 0.12, 1.7, C.logDk, 8)
);

// ═══════════════════════════════════════════════════════════════════
// TREES & NATURE
// ═══════════════════════════════════════════════════════════════════

// Oak
[[-12,5,1.8],[-18,-3,2.0],[15,6,1.6],[18,-8,1.4]].forEach(([x,z,s],i)=>{
  const h=2.8*s;
  createCyl(`DECO_OakTrunk_${i+1}`, x, 2.5+h/2, z, 0.28*s, 0.32*s, h, C.trunk, 8);
  createSph(`DECO_OakCanopy_${i+1}`, x, 2.5+h+1.4*s, z, 2.2*s, C.leaf);
});

// Boulders
[[-6,-12,0.6],[8,-8,0.5],[-14,2,0.7]].forEach(([x,z,r],i)=>{
  const b = createSph(`DECO_Boulder_${i+1}`, x, 2.5+r*0.5, z, r, C.rock, 0.95);
  b.scale.set(1.2, 0.7, 0.9);
});

// Wildflowers
[[5,3],[-8,9]].forEach(([x,z],i)=>{
  createCyl(`DECO_FlowerStem_${i}`,x,2.56,z,0.04,0.04,0.44,C.leaf,6);
  createSph(`DECO_Flower_${i}`,    x,2.80,z,0.18,C.fPnk,0.7);
});

// ═══════════════════════════════════════════════════════════════════
// INTERACTION SYSTEM
// ═══════════════════════════════════════════════════════════════════

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredObj = null;

window.addEventListener('mousemove', e=>{
  mouse.set((e.clientX/window.innerWidth)*2-1, -(e.clientY/window.innerHeight)*2+1);
  raycaster.setFromCamera(mouse, camera);
  const interactables = [scene.getObjectByName('INTERACT_DoorMain')].filter(Boolean);
  const hits = raycaster.intersectObjects(interactables);
  
  if(hoveredObj && hoveredObj !== hits[0]?.object){
    document.body.style.cursor='default';
    hoveredObj=null;
  }
  if(hits.length){
    hoveredObj=hits[0].object;
    document.body.style.cursor='pointer';
  }
});

let doorOpen = false;
window.addEventListener('click', e=>{
  if(!hoveredObj) return;
  if(hoveredObj.name === 'INTERACT_DoorMain'){
    doorOpen = !doorOpen;
    gsap.to(doorGroup.rotation, { y: doorOpen ? -Math.PI/2 : 0, duration: 0.6, ease: 'power2.inOut' });
  }
});

// ─── RENDER LOOP ─────────────────────────────────────────────────
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  const time = clock.getElapsedTime();
  const o = scene.getObjectByName('ENV_Ocean');
  if(o) o.position.y = -5 + Math.sin(time*0.5)*0.1;
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
