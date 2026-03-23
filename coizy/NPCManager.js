// NPCManager.js — Simplified & stable YUKA-based NPC AI
// Menghilangkan penggunaan API YUKA yang deprecated/berubah

import * as THREE from 'three';

const randRange = (min, max) => min + Math.random() * (max - min);

/**
 * Simple manual NPC (tanpa YUKA) untuk menghindari API incompatibility.
 * Menggunakan sistem steering behavior manual yg ringan.
 */
class SimpleVehicle {
    constructor(mesh, maxSpeed = 2.0) {
        this.mesh = mesh;
        this.position = mesh.position.clone();
        this.velocity = new THREE.Vector3();
        this.maxSpeed = maxSpeed;
        this.mass = 1;
    }

    applyForce(force) {
        this.velocity.addScaledVector(force, 1 / this.mass);
        if (this.velocity.length() > this.maxSpeed) {
            this.velocity.setLength(this.maxSpeed);
        }
    }

    wander(delta, radius = 2, jitter = 0.5) {
        const angle = (this.mesh.userData._wanderAngle || 0) + (Math.random() - 0.5) * jitter;
        this.mesh.userData._wanderAngle = angle;
        const force = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        force.setLength(0.5);
        this.applyForce(force);
    }

    flee(target, panicDist, delta) {
        const diff = new THREE.Vector3().subVectors(this.position, target);
        const dist = diff.length();
        if (dist < panicDist) {
            diff.setLength(this.maxSpeed);
            this.applyForce(diff);
        }
    }

    update(delta, environment = []) {
        this.velocity.multiplyScalar(1 - 3 * delta); // damping
        
        // --- Obstacle Avoidance (Horizontal) ---
        if (this.velocity.lengthSq() > 0.1) {
            const ray = new THREE.Ray(this.position.clone().add(new THREE.Vector3(0, 0.5, 0)), this.velocity.clone().normalize());
            for(let obj of environment) {
                if(obj.isMesh) {
                    const box = new THREE.Box3().setFromObject(obj);
                    if(ray.intersectsBox(box)) {
                        const dist = ray.origin.distanceTo(box.clampPoint(ray.origin, new THREE.Vector3()));
                        if(dist < 1.0) {
                            // Turn away
                            const avoidForce = new THREE.Vector3(-this.velocity.z, 0, this.velocity.x).setLength(2.0);
                            this.velocity.add(avoidForce.multiplyScalar(delta));
                        }
                    }
                }
            }
        }

        this.position.addScaledVector(this.velocity, delta);
        this.mesh.position.x = this.position.x;
        this.mesh.position.z = this.position.z;

        // Face direction of movement
        if (this.velocity.lengthSq() > 0.001) {
            const target = new THREE.Vector3().copy(this.position).add(this.velocity);
            this.mesh.lookAt(target.x, this.mesh.position.y, target.z);
        }
    }
}

export class NPCManager {
    constructor(worldBuilderRef, playerGroup) {
        this.playerGroup = playerGroup;
        this.world = worldBuilderRef; // Can be updated later via this.world = ...
        this.vehicles = [];
        this.raycaster = new THREE.Raycaster(); // For landing logic
        this._lastUpdate = 0;
        this._frameCounter = 0;
    }

    getGroundY(x, z) {
        if (!this.world || !this.world.gameGroup) return 0;

        // --- 1. PRECISE ENV RAYCAST (FOR STAIRS/HOUSE) ---
        this.raycaster.set(new THREE.Vector3(x, 20, z), new THREE.Vector3(0, -1, 0));
        const hits = this.raycaster.intersectObjects(this.world.gameGroup.children, true);
        const envHit = hits.find(h => h.object.name && h.object.name.startsWith('ENV_'));
        
        if (envHit) {
            return envHit.point.y;
        }

        // --- 2. FALLBACK TO TERRAIN HEIGHTMAP ---
        if (this.world.getHeight) {
            // Note: TerrainMesh is at position.y = 0.15, so we add it
            const h = this.world.getHeight(x, z);
            return (isFinite(h) ? h : 0) + 0.15;
        }
        return 0.15;
    }

    setupButterfly(mesh, speedMult = 1.0) {
        const v = new SimpleVehicle(mesh, 1.5 * speedMult);
        v.position.copy(mesh.position);
        v.type = 'butterfly';
        v.speedMult = speedMult;
        v._floatPhase = Math.random() * Math.PI * 2;
        v._landTimer = 0;
        v._cachedGroundY = this.getGroundY(mesh.position.x, mesh.position.z);
        this.vehicles.push(v);
    }
    
    setupBird(mesh) {
        const v = new SimpleVehicle(mesh, 4.0);
        v.position.copy(mesh.position);
        v.type = 'bird';
        v._home = mesh.position.clone();
        v._target = mesh.position.clone(); 
        v._state = 'PERCHED';
        v._perchTimer = 0;
        v._cachedGroundY = this.getGroundY(mesh.position.x, mesh.position.z);
        this.vehicles.push(v);
    }

    setupRabbit(mesh) {
        const v = new SimpleVehicle(mesh, 1.5);
        v.position.copy(mesh.position);
        v.type = 'rabbit';
        v._state = 'GRAZE';
        v._stateTimer = 3 + Math.random() * 5;
        v._cachedGroundY = this.getGroundY(mesh.position.x, mesh.position.z);
        this.vehicles.push(v);
    }

    setupCat(mesh) {
        const v = new SimpleVehicle(mesh, 0.8);
        v.position.copy(mesh.position);
        v.type = 'cat';
        v._state = 'IDLE';
        v._stateTimer = 5 + Math.random() * 10;
        v._wanderCount = 0;
        mesh.userData.state = 'IDLE'; 
        v._cachedGroundY = this.getGroundY(mesh.position.x, mesh.position.z);
        this.vehicles.push(v);
    }

    update(delta = 0.016) {
        if (!this.world || !this.world.gameGroup) return; // Safety check
        const playerPos = this.playerGroup.position;
        const t = performance.now();
        this._frameCounter++;

        this.vehicles.forEach(v => {
            const { mesh, type } = v;
            if (type === 'butterfly') {
                if (mesh.userData.updateButterfly) {
                    const ud = mesh.userData;
                    const camera = this.playerGroup.children.find(c => c.isCamera) || window._coizyCamera;
                    const playerSpeed = this.playerGroup.children[0]?.userData.playerSpeed || 0;
                    const t_sec = t * 0.001;
                    
                    mesh.userData.updateButterfly(delta, t_sec, playerPos, camera);
                    
                    // 1. STATE MACHINE & LOGIC
                    switch (ud.state) {
                        case 'FLYING':
                            if (!ud.curve) ud.curve = this._generateCatmullCurve(mesh.position);
                            ud.curveT += 0.12 * delta;
                            if (ud.curveT >= 1.0) {
                                ud.curve = this._generateCatmullCurve(mesh.position);
                                ud.curveT = 0;
                            }
                            this._followCurve(mesh, ud, delta);
                            
                            // Probabilities for state transitions
                            if (Math.random() < 0.005) { // ~0.3% per frame roughly
                                const r = Math.random();
                                if (r < 0.3) { ud.state = 'SEEKING_LAND'; this._findLandingSpot(v); }
                                else if (r < 0.45) { ud.state = 'HOVERING'; ud.hoverTimer = 1.5 + Math.random() * 1.5; }
                            }
                            break;

                        case 'HOVERING':
                            ud.hoverTimer -= delta;
                            if (ud.hoverTimer <= 0) ud.state = 'FLYING';
                            // Figure-eight micro movement (visuals handled in ButterflyModel, position stays static)
                            break;

                        case 'SEEKING_LAND':
                            if (ud.landingPos) {
                                mesh.position.lerp(ud.landingPos, 0.06);
                                mesh.lookAt(ud.landingPos);
                                // Damping flap
                                const dist = mesh.position.distanceTo(ud.landingPos);
                                ud.flapFreq = THREE.MathUtils.lerp(4.0, 16.0, dist / 2.0);
                                if (dist < 0.05) {
                                    ud.state = 'LANDED';
                                    ud.landTimer = 2.0 + Math.random() * 3.0;
                                    // Set landing orientation
                                    const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), ud.landingNormal);
                                    mesh.quaternion.slerp(targetQuat, 0.8);
                                }
                            } else { ud.state = 'FLYING'; }
                            break;

                        case 'LANDED':
                            ud.landTimer -= delta;
                            if (ud.landTimer <= 0) {
                                ud.state = 'TAKING_OFF';
                                ud.takeoffTimer = 0.4;
                            }
                            // Surface specific logic (can be expanded)
                            break;

                        case 'TAKING_OFF':
                            ud.takeoffTimer -= delta;
                            mesh.position.y += 1.2 * delta;
                            if (ud.takeoffTimer <= 0) {
                                ud.state = 'FLYING';
                                ud.curve = null;
                            }
                            break;

                        case 'LAND_ON_PLAYER':
                            ud.trustTimer -= delta;
                            const shoulderOffset = new THREE.Vector3(0.3, 1.2, 0.2).applyQuaternion(this.playerGroup.quaternion);
                            const target = playerPos.clone().add(shoulderOffset);
                            mesh.position.lerp(target, 0.1);
                            mesh.lookAt(playerPos.clone().add(new THREE.Vector3(0, 1.2, 0)));
                            if (ud.trustTimer <= 0 || playerSpeed > 1.0) {
                                ud.state = 'TAKING_OFF';
                                ud.takeoffTimer = 0.4;
                            }
                            break;
                    }

                    // 2. PLAYER PROXIMITY (Raycast/Checks)
                    const distToPlayer = mesh.position.distanceTo(playerPos);
                    if (distToPlayer < 1.2 && playerSpeed < 0.8 && ud.state === 'FLYING') {
                        if (Math.random() < 0.005) { // approximately 40% chance per second
                            ud.state = 'LAND_ON_PLAYER';
                            ud.trustTimer = 3.0;

                            // Emoji Effect
                            const div = document.createElement('div');
                            div.textContent = '🦋';
                            div.style.fontSize = '24px';
                            div.style.opacity = '0';
                            const emoji = new CSS2DObject(div);
                            emoji.position.set(0, 0.2, 0);
                            mesh.add(emoji);
                            gsap.to(div, { opacity: 1, duration: 0.5, yoyo: true, repeat: 1, onComplete: () => mesh.remove(emoji) });

                            // Socket Emit (if socket is globally available)
                            if (window._coizySocket) {
                                window._coizySocket.emit('butterfly_land', { playerId: window._coizyPlayerId });
                            }
                        }
                    } else if (distToPlayer < 1.0 && playerSpeed > 3.0) {
                        ud.state = 'FLYING'; ud.curve = null; // SCURRY!
                    }

                    // 3. BOUNDS & ALTITUDE
                    if ((this._frameCounter + this.vehicles.indexOf(v)) % 5 === 0) {
                        v._cachedGroundY = this.getGroundY(mesh.position.x, mesh.position.z);
                    }
                    const groundY = v._cachedGroundY;
                    if (ud.state === 'FLYING' && mesh.position.y < groundY + 1.2) {
                        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, groundY + 2.0, 0.1);
                    }
                    
                    // 4. BUTTERFLY COLLISION AVOIDANCE (IN FLIGHT)
                    if (ud.state === 'FLYING' && t % 500 < delta * 1000) { // Every 0.5s check
                        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(mesh.quaternion);
                        this.raycaster.set(mesh.position, forward);
                        const hits = this.raycaster.intersectObjects(this.world.gameGroup.children, true);
                        if (hits.length > 0 && hits[0].distance < 1.0 && hits[0].object.type === 'Mesh') {
                             ud.curve = null; // Force new random curve to dodge
                        }
                    }

                    // Clamp bounds
                    if (Math.abs(mesh.position.x) > 48 || Math.abs(mesh.position.z) > 48) {
                        mesh.position.set(0, 5, 0); ud.curve = null;
                    }
                }
            } else if (type === 'rabbit') {
                const sm = mesh.userData.stateMachine;
                const distToPlayer = v.position.distanceTo(playerPos);
                const playerSpeed = this.playerGroup.children[0]?.userData.playerSpeed || 0;

                // 1. External State Triggers
                if (playerSpeed > 5.0 && distToPlayer < 5.0) {
                    sm.currentState = 'FLEE';
                    sm.timer = 5.0;
                } else if (distToPlayer < 1.5 && playerSpeed < 1.0 && mesh.userData.isBeingPet) {
                    sm.currentState = 'TAME';
                    sm.timer = 8.0;
                } else if (distToPlayer < 2.5 && sm.currentState !== 'FLEE' && sm.currentState !== 'TAME') {
                    sm.currentState = 'ALERT';
                }

                // 2. State-Specific Movement Logic
                if (sm.currentState === 'WALK') {
                    v.maxSpeed = 1.5;
                    const diff = new THREE.Vector3().subVectors(sm.waypoint, v.position);
                    if (diff.length() > 0.5) {
                        diff.setLength(0.8);
                        v.applyForce(diff);
                    } else {
                        sm.currentState = 'IDLE'; // Reached waypoint
                    }
                } else if (sm.currentState === 'FLEE') {
                    v.maxSpeed = 5.0; v.flee(playerPos, 8.0, delta);
                    if (distToPlayer > 10.0) sm.currentState = 'IDLE';
                } else {
                    v.velocity.multiplyScalar(0.7); // Stop moving
                }

                v.update(delta, this.world.gameGroup.children);

                // 3. Sync with Model Animation
                if (mesh.userData.updateRabbit) {
                    mesh.userData.updateRabbit(delta, t * 0.001);
                }

                // Optimized ground check (every 5th frame per agent)
                if ((this._frameCounter + this.vehicles.indexOf(v)) % 5 === 0) {
                    v._cachedGroundY = this.getGroundY(v.position.x, v.position.z);
                }
                const groundY = v._cachedGroundY;
                mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, groundY + 0.44, 0.2);
                v.position.x = THREE.MathUtils.clamp(v.position.x, -45, 45);
                v.position.z = THREE.MathUtils.clamp(v.position.z, -45, 45);

            } else if (type === 'cat') {
                v._stateTimer -= delta;
                const distToPlayer = v.position.distanceTo(playerPos);
                const playerSpeed = this.playerGroup.children[0]?.userData.playerSpeed || 0;

                // 1. Interruptions/Triggers
                if (mesh.userData.isBeingPet) {
                    v._state = 'PET';
                    v._stateTimer = 5.0; // Pet duration
                    mesh.userData.isBeingPet = false;
                } else if (playerSpeed > 5.0 && distToPlayer < 4.0 && v._state !== 'PET') {
                    v._state = 'FLEE';
                    v._stateTimer = 3.0;
                }

                // 2. State Machine Transitions
                if (v._stateTimer <= 0) {
                    if (v._state === 'IDLE' || v._state === 'PET' || v._state === 'SIT') {
                        v._state = 'WALK';
                        v._stateTimer = 4 + Math.random() * 6;
                        v.maxSpeed = 0.8;
                        v._wanderCount++;
                    } else if (v._state === 'WALK') {
                        if (v._wanderCount >= 3) {
                            v._state = 'SIT';
                            v._stateTimer = 15 + Math.random() * 15;
                            v._wanderCount = 0;
                        } else {
                            v._state = 'IDLE';
                            v._stateTimer = 5 + Math.random() * 8;
                        }
                    } else if (v._state === 'FLEE') {
                        v._state = 'IDLE';
                        v._stateTimer = 5;
                    }
                }

                // 3. Movement Logic
                if (v._state === 'WALK') {
                    v.wander(delta, 2, 0.4);
                } else if (v._state === 'FLEE') {
                    v.maxSpeed = 3.5;
                    v.flee(playerPos, 8.0, delta);
                } else {
                    v.velocity.multiplyScalar(0.85); // Soft stop
                }

                v.update(delta, this.world.gameGroup.children);
                
                // Sync internal animation state
                mesh.userData.state = v._state;
                if (mesh.userData.updateCat) {
                    mesh.userData.updateCat(delta, t * 0.001);
                }

                // Optimized ground check (every 5th frame per agent)
                if ((this._frameCounter + this.vehicles.indexOf(v)) % 5 === 0) {
                    v._cachedGroundY = this.getGroundY(v.position.x, v.position.z);
                }
                const groundY = v._cachedGroundY;
                mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, groundY + 0.5, 0.2); // Smooth climbing
                v.position.x = THREE.MathUtils.clamp(v.position.x, -25, 25);
                v.position.z = THREE.MathUtils.clamp(v.position.z, -25, 25);
            } else if (type === 'bird') {
                const distToPlayer = v.position.distanceTo(playerPos);
                if (v._state === 'PERCHED') {
                    if (distToPlayer < 4.0) {
                        v._state = 'FLYING';
                        v._target = new THREE.Vector3(randRange(-40, 40), 15, randRange(-40, 40));
                        if (mesh.userData.onFly) mesh.userData.onFly(); // trigger sound
                    }
                } else if (v._state === 'FLYING') {
                    v.position.lerp(v._target, 0.02);
                    v.mesh.position.copy(v.position);
                    v.mesh.lookAt(v._target);
                    if (v.position.distanceTo(v._target) < 1.0) {
                        v._state = 'PERCHED';
                        v.position.y = this.getGroundY(v.position.x, v.position.z) + 3; // land on hypothetical tree
                    }
                }
            }
        });
    }

    _generateCatmullCurve(start) {
        const points = [start.clone()];
        for (let i = 0; i < 5; i++) {
            const groundY = this.getGroundY(start.x, start.z);
            points.push(new THREE.Vector3(
                start.x + (Math.random() - 0.5) * 12,
                groundY + 1.5 + Math.random() * 3.0,
                start.z + (Math.random() - 0.5) * 12
            ));
        }
        return new THREE.CatmullRomCurve3(points);
    }

    _followCurve(mesh, ud, delta) {
        if (!ud.curve) return;
        const nextPoint = ud.curve.getPoint(ud.curveT);
        const oldPos = mesh.position.clone();
        mesh.position.lerp(nextPoint, 0.1);
        
        // Banking & LookAt
        const moveDir = new THREE.Vector3().subVectors(mesh.position, oldPos);
        const lateralVel = moveDir.x * 50.0;
        mesh.lookAt(nextPoint);
        mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, -lateralVel * 0.8, 6 * delta);
    }

    _findLandingSpot(v) {
        const mesh = v.mesh;
        const dir = new THREE.Vector3(0, -1, 1).applyQuaternion(mesh.quaternion).normalize();
        this.raycaster.set(mesh.position, dir);
        
        const targets = [];
        this.world.gameGroup.traverse(o => {
            if (o.isMesh && (o.name.includes('Tree') || o.name.includes('Rock') || o.name.includes('Wall') || o.name.includes('Sill') || o.name.includes('Paling') || o.name.includes('Player'))) {
                targets.push(o);
            }
        });
        
        const hits = this.raycaster.intersectObjects(targets, true);
        if (hits.length > 0 && hits[0].distance < 3.0) {
            const hit = hits[0];
            v.mesh.userData.landingPos = hit.point.clone().add(hit.face.normal.clone().multiplyScalar(0.05));
            v.mesh.userData.landingNormal = hit.face.normal.clone();
        } else {
            v.mesh.userData.state = 'FLYING';
        }
    }
}
