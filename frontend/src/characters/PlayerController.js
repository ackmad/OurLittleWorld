import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * PlayerController — handles local player character,
 * third-person camera, keyboard input, and interaction.
 */
export class PlayerController {
    constructor(scene, camera, canvas, name = '') {
        this.scene = scene;
        this.camera = camera;
        this.canvas = canvas;
        this.loader = new GLTFLoader();

        this.name = name;
        this.isSavira = name.toLowerCase().includes('savira');

        // Movement state
        this.keys = {};
        this.speed = 4;
        this.runMul = 1.8;
        this.velocity = new THREE.Vector3();
        this.onGround = true;
        this.jumpVel = 0;
        this.gravity = -18;

        // Camera orbit
        this.camTheta = 0;   // horizontal angle (radians)
        this.camPhi = 0.35; // vertical anglek8
        this.camDist = 6;
        this.camTarget = new THREE.Vector3();
        this._isPointerLocked = false;
        this._dragging = false;
        this._lastMouse = { x: 0, y: 0 };

        // Player data
        this.color = '#7a9e7e';
        this.sceneType = 'outdoor';
        this.playerState = { x: 0, y: 1, z: 4, ry: 0, anim: 'idle', scene: 'outdoor' };

        this.mixer = null;
        this.actions = {};
        this.currentAnim = 'idle';

        // Build character mesh
        this._buildCharacter();
        this._buildNameLabel();
        this._setupControls();

        // Callback hooks
        this.onMove = null;
        this.onInteract = null;
        this.onEnterBuilding = null;

        // Interaction system
        this.nearbyInteractable = null;
        this.idleTimer = 0;
        this.lastPos = new THREE.Vector3();
    }

    _buildCharacter() {
        const charFile = this.isSavira ? 'Savira_Game.glb' : 'Elfan_Game.glb';
        this.loader.load(`/src/models/characters/${charFile}`, (gltf) => {
            this.mesh = gltf.scene;
            this.mesh.position.set(0, 0, 3); // spawn on ground
            this.mesh.scale.set(0.65, 0.65, 0.65); // Scale down: character was too big
            this.mesh.rotation.y = Math.PI; // Look towards starting camera

            this.mesh.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            });
            this.scene.add(this.mesh);

            // Setup animations if present
            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.mesh);
                gltf.animations.forEach(clip => {
                    this.actions[clip.name.toLowerCase()] = this.mixer.clipAction(clip);
                });
                this.playAnimation('idle');
            }

            // Re-attach name sprite if it was created before mesh loaded
            if (this._nameSprite) this.mesh.add(this._nameSprite);
        });
    }

    playAnimation(name) {
        if (!this.mixer || this.currentAnim === name) return;
        const nextAction = this.actions[name] || this.actions[Object.keys(this.actions)[0]];
        if (!nextAction) return;

        const prevAction = this.actions[this.currentAnim];
        if (prevAction) prevAction.fadeOut(0.2);

        nextAction.reset().fadeIn(0.2).play();
        this.currentAnim = name;
    }

    setColor(hex) {
        this.color = hex;
        if (this._bodyMat) this._bodyMat.color.set(hex);
    }

    _buildNameLabel() {
        // Canvas texture for 2D name over head
        this._labelCanvas = document.createElement('canvas');
        this._labelCanvas.width = 256;
        this._labelCanvas.height = 64;
        this._labelCtx = this._labelCanvas.getContext('2d');
        this._labelTex = new THREE.CanvasTexture(this._labelCanvas);
        const labelMat = new THREE.SpriteMaterial({ map: this._labelTex, transparent: true, depthTest: false });
        this._nameSprite = new THREE.Sprite(labelMat);
        this._nameSprite.scale.set(1.4, 0.35, 1); // Subtle size
        this._nameSprite.position.y = 1.9; // Position properly over smaller head
        if (this.mesh) this.mesh.add(this._nameSprite);
        this._updateLabel();
    }

    _updateLabel() {
        const ctx = this._labelCtx;
        ctx.clearRect(0, 0, 256, 64);
        // Background pill
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.roundRect(16, 14, 224, 36, 18);
        ctx.fill();
        // Name text
        ctx.fillStyle = '#ffffff'; // White text for better contrast
        ctx.font = 'bold 28px Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.name || '...', 128, 32);
        this._labelTex.needsUpdate = true;
    }

    setName(name) {
        this.name = name;
        this._updateLabel();
    }

    _setupControls() {
        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (e.code === 'KeyE') this.onInteract && this.onInteract();
            if (e.code === 'KeyF') this.onEnterBuilding && this.onEnterBuilding();
            if (e.code === 'Escape') {
                const menu = document.getElementById('mini-menu');
                menu.classList.toggle('open');
            }
        });
        window.addEventListener('keyup', e => { this.keys[e.code] = false; });

        // Mouse drag for camera orbit
        this.canvas.addEventListener('mousedown', e => {
            if (e.button === 2 || e.button === 0) {
                this._dragging = true;
                this._lastMouse = { x: e.clientX, y: e.clientY };
            }
            // Star click (night) — handled in main.js via raycasting
        });
        window.addEventListener('mouseup', () => { this._dragging = false; });
        window.addEventListener('mousemove', e => {
            if (!this._dragging) return;
            const dx = e.clientX - this._lastMouse.x;
            const dy = e.clientY - this._lastMouse.y;
            this.camTheta -= dx * 0.006;
            this.camPhi = Math.max(0.05, Math.min(1.2, this.camPhi + dy * 0.005));
            this._lastMouse = { x: e.clientX, y: e.clientY };
        });
        // Scroll zoom
        window.addEventListener('wheel', e => {
            this.camDist = Math.max(3, Math.min(18, this.camDist + e.deltaY * 0.015));
        });
        // Right-click context menu suppress
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    update(delta, interactables) {
        // ── Movement ─────────────────────────────────────────────────────
        const isRunning = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
        const spd = this.speed * (isRunning ? this.runMul : 1.0) * delta;

        // Direction relative to camera azimuth
        let moveX = 0, moveZ = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

        const moving = moveX !== 0 || moveZ !== 0;

        if (moving) {
            const angle = Math.atan2(moveX, moveZ) + this.camTheta;
            const dx = Math.sin(angle) * spd;
            const dz = Math.cos(angle) * spd;

            if (this.mesh) {
                this.mesh.position.x += dx;
                this.mesh.position.z += dz;
                this.mesh.rotation.y = angle;
            }
            this.idleTimer = 0;
            this.playAnimation(isRunning ? 'run' : 'walk');
        } else {
            this.idleTimer += delta;
            this.playAnimation('idle');
        }

        if (this.mixer) this.mixer.update(delta);

        // ── Keep within island max bounds ────────────────────────────────
        const flatDist = Math.sqrt(this.mesh.position.x ** 2 + this.mesh.position.z ** 2);
        if (flatDist > 38) {
            this.mesh.position.x *= 38 / flatDist;
            this.mesh.position.z *= 38 / flatDist;
        }

        // ── Jump ─────────────────────────────────────────────────────────
        if (this.keys['Space'] && this.onGround) {
            this.jumpVel = 7;
            this.onGround = false;
        }
        if (!this.onGround) {
            this.jumpVel += this.gravity * delta;
            this.mesh.position.y += this.jumpVel * delta;
        }

        // ── Collision / Gravity ──────────────────────────────────────────
        // Gravity ray
        if (this.mesh) {
            const rayOrigin = this.mesh.position.clone();
            rayOrigin.y += 2;
            const downDir = new THREE.Vector3(0, -1, 0);
            const groundRay = new THREE.Raycaster(rayOrigin, downDir);
            const groundHits = groundRay.intersectObjects(interactables.collidableObjects || [], true);

            if (groundHits.length > 0) {
                const groundHeight = groundHits[0].point.y;
                if (!this.keys['Space'] && this.mesh.position.y <= groundHeight + 0.1) {
                    this.mesh.position.y = groundHeight;
                    this.onGround = true;
                    this.jumpVel = 0;
                } else if (!this.onGround && this.mesh.position.y < groundHeight) {
                    this.mesh.position.y = groundHeight;
                    this.onGround = true;
                    this.jumpVel = 0;
                }
            } else if (this.mesh.position.y <= 0) {
                this.mesh.position.y = 0; // fallback plane
                this.onGround = true;
                this.jumpVel = 0;
            }

            // Horizontal collision
            if (moving) {
                const charPos = this.mesh.position.clone();
                charPos.y += 0.5; // waist level
                const pDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y).normalize();

                // Front collision ray
                const colRay = new THREE.Raycaster(charPos, pDir, 0, 0.6);
                const colHits = colRay.intersectObjects(interactables.collidableObjects || [], true);
                if (colHits.length > 0) {
                    // Step back slightly
                    this.mesh.position.sub(pDir.multiplyScalar(spd));
                }
            }
        }

        // ── Camera ────────────────────────────────────────────────────────
        const tx = this.mesh.position.x;
        const ty = this.mesh.position.y + 1.2;
        const tz = this.mesh.position.z;
        this.camTarget.lerp(new THREE.Vector3(tx, ty, tz), 0.12);

        const cx = this.camTarget.x + this.camDist * Math.sin(this.camTheta) * Math.cos(this.camPhi);
        const cy = this.camTarget.y + this.camDist * Math.sin(this.camPhi);
        const cz = this.camTarget.z + this.camDist * Math.cos(this.camTheta) * Math.cos(this.camPhi);
        this.camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.1);
        this.camera.lookAt(this.camTarget);

        // ── Interactable detection ────────────────────────────────────────
        let closest = null, closestDist = Infinity;
        if (interactables) {
            interactables.forEach(obj => {
                const d = this.mesh.position.distanceTo(obj.position);
                if (d < obj.radius && d < closestDist) {
                    closest = obj;
                    closestDist = d;
                }
            });
        }
        const prompt = document.getElementById('interact-prompt');
        const promptText = document.getElementById('prompt-text');
        if (closest !== this.nearbyInteractable) {
            this.nearbyInteractable = closest;
            if (closest) {
                prompt.style.display = 'block';
                promptText.textContent = closest.label;
            } else {
                prompt.style.display = 'none';
            }
        }

        // ── Broadcast position ────────────────────────────────────────────
        const pos = this.mesh.position;
        const moved = pos.distanceTo(this.lastPos) > 0.02 || moving;
        if (moved) {
            this.lastPos.copy(pos);
            const state = {
                x: +pos.x.toFixed(2), y: +pos.y.toFixed(2), z: +pos.z.toFixed(2),
                ry: +this.mesh.rotation.y.toFixed(3),
                anim: moving ? (isRunning ? 'run' : 'walk') : 'idle',
                scene: this.sceneType || 'outdoor',
            };
            this.playerState = state;
            this.onMove && this.onMove(state);
        }

        // ── Easter egg: idle halo ─────────────────────────────────────────
        this._pulseHalo && (this._pulseHalo.material.opacity = 0.3 + Math.sin(performance.now() * 0.003) * 0.15);
    }

    getPosition() {
        return this.mesh ? this.mesh.position : new THREE.Vector3();
    }
    getState() { return this.playerState; }
}
