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

    update(delta) {
        this.velocity.multiplyScalar(1 - 3 * delta); // damping
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
        this.worldRef = worldBuilderRef; // { getHeight: fn }
        this.vehicles = [];
        this._lastUpdate = 0;
    }

    getGroundY(x, z) {
        if (this.worldRef && this.worldRef.getHeight) {
            const h = this.worldRef.getHeight(x, z);
            return isFinite(h) ? h : 0;
        }
        return 0;
    }

    setupButterfly(mesh, speedMult = 1.0) {
        const v = new SimpleVehicle(mesh, 1.5 * speedMult);
        v.position.copy(mesh.position);
        v.type = 'butterfly';
        v.speedMult = speedMult;
        v._floatPhase = Math.random() * Math.PI * 2;
        v._landTimer = 0;
        this.vehicles.push(v);
    }
    
    setupBird(mesh) {
        const v = new SimpleVehicle(mesh, 4.0);
        v.position.copy(mesh.position);
        v.type = 'bird';
        v._home = mesh.position.clone();
        v._target = mesh.position.clone(); // Initialize target
        v._state = 'PERCHED';
        v._perchTimer = 0;
        this.vehicles.push(v);
    }

    setupRabbit(mesh) {
        const v = new SimpleVehicle(mesh, 1.5);
        v.position.copy(mesh.position);
        v.type = 'rabbit';
        v._state = 'GRAZE';
        v._stateTimer = 3 + Math.random() * 5;
        this.vehicles.push(v);
    }

    setupCat(mesh) {
        const v = new SimpleVehicle(mesh, 0.8);
        v.position.copy(mesh.position);
        v.type = 'cat';
        v._state = 'IDLE';
        v._stateTimer = 5 + Math.random() * 10;
        v._wanderCount = 0;
        this.vehicles.push(v);
    }

    update(delta = 0.016) {
        const playerPos = this.playerGroup.position;
        const t = performance.now();

        this.vehicles.forEach(v => {
            const { mesh, type } = v;

            if (type === 'butterfly') {
                const isPlayerSlow = mesh.userData.playerSpeed < 2.0;
                const distToPlayer = v.position.distanceTo(playerPos);

                if (isPlayerSlow && distToPlayer < 1.0 && v._landTimer <= 0) {
                    v._state = 'LANDED';
                    v._landTimer = 4.0;
                }

                if (v._state === 'LANDED') {
                    v._landTimer -= delta;
                    // Land on player's "hand" (camera offset)
                    const handPos = playerPos.clone().add(new THREE.Vector3(0, 0.4, 0));
                    v.position.lerp(handPos, 0.1);
                    if (v._landTimer <= 0 || !isPlayerSlow) {
                        v._state = 'WANDER';
                    }
                } else {
                    v.wander(delta, 2.5, 0.7);
                    v.flee(playerPos, 1.5, delta);
                }
                v.update(delta);

                // Snap Y: terbang di atas tanah
                const groundY = this.getGroundY(v.position.x, v.position.z);
                const floatY = groundY + 1.5 + Math.sin(t * 0.002 * v.speedMult + v._floatPhase) * 0.5;
                mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, floatY, 0.1);

                // Clamp ke batas pulau
                v.position.x = THREE.MathUtils.clamp(v.position.x, -45, 45);
                v.position.z = THREE.MathUtils.clamp(v.position.z, -45, 45);

            } else if (type === 'rabbit') {
                v._stateTimer -= delta;
                const distToPlayer = v.position.distanceTo(playerPos);
                const playerSpeed = mesh.userData.playerSpeed || 0;

                if (playerSpeed > 5 && distToPlayer < 5) {
                    v._state = 'FLEE';
                    v._stateTimer = 5;
                } else if (distToPlayer < 1.5 && playerSpeed < 2) {
                    v._state = 'TAME';
                } else if (distToPlayer < 3.0) {
                    v._state = 'ALERT';
                } else if (v._stateTimer <= 0) {
                    v._state = 'IDLE';
                    v._stateTimer = 3 + Math.random() * 5;
                }

                if (v._state === 'FLEE') {
                    v.maxSpeed = 5.0; v.flee(playerPos, 8.0, delta);
                } else if (v._state === 'TAME' || v._state === 'ALERT') {
                    v.velocity.multiplyScalar(0.7);
                    mesh.lookAt(playerPos.x, mesh.position.y, playerPos.z);
                } else {
                    v.maxSpeed = 1.5; v.wander(delta, 2.0, 0.5);
                }

                v.update(delta);
                const groundY = this.getGroundY(v.position.x, v.position.z);
                const bounce = (v._state === 'FLEE' || v.velocity.length() > 0.5) ? Math.abs(Math.sin(t * 0.01)) * 0.4 : 0;
                mesh.position.y = groundY + 0.2 + bounce;
                
                // Animasi telinga/kepala via scale untuk kesan "Alert"
                if (v._state === 'ALERT') mesh.scale.y = 1.1 + Math.sin(t*0.01)*0.05;
                else mesh.scale.y = 1.0;                v.position.x = THREE.MathUtils.clamp(v.position.x, -45, 45);
                v.position.z = THREE.MathUtils.clamp(v.position.z, -45, 45);

            } else if (type === 'cat') {
                v._stateTimer -= delta;
                const distToPlayer = v.position.distanceTo(playerPos);

                if (mesh.userData.isBeingPet) {
                    v._state = 'PURR';
                    v._stateTimer = 3.0;
                    mesh.userData.isBeingPet = false;
                }

                if (distToPlayer < 1.5 && v._state !== 'SLEEP' && v._state !== 'PURR') {
                    v._state = 'ATTENTION';
                    v.velocity.multiplyScalar(0.9);
                    // Look at player
                    mesh.lookAt(playerPos.x, mesh.position.y, playerPos.z);
                } else if (v._stateTimer <= 0) {
                    if (v._state === 'IDLE' || v._state === 'PURR') {
                        v._state = 'WANDER';
                        v._stateTimer = 4 + Math.random() * 4;
                        v.maxSpeed = 0.8;
                        v._wanderCount++;
                    } else if (v._state === 'WANDER') {
                        if (v._wanderCount >= 3) {
                            v._state = 'SLEEP';
                            v._stateTimer = 15 + Math.random() * 15;
                            v._wanderCount = 0;
                        } else {
                            v._state = 'IDLE';
                            v._stateTimer = 5 + Math.random() * 8;
                        }
                    } else if (v._state === 'SLEEP' || v._state === 'ATTENTION') {
                        v._state = 'IDLE';
                        v._stateTimer = 5;
                    }
                }

                if (v._state === 'WANDER') v.wander(delta, 2, 0.4);
                else v.velocity.multiplyScalar(0.85);

                v.update(delta);
                const groundY = this.getGroundY(v.position.x, v.position.z);
                mesh.position.y = groundY + 0.15;
                v.position.x = THREE.MathUtils.clamp(v.position.x, -20, 20);
                v.position.z = THREE.MathUtils.clamp(v.position.z, -20, 20);
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
}
