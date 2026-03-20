import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * HouseInterior — manages the indoor scene of the cottage.
 */
export class HouseInterior {
    constructor(scene) {
        this.scene = scene;
        this.loader = new GLTFLoader();
        this.group = new THREE.Group();
        this.group.visible = false;
        this.scene.add(this.group);

        this.interactables = [];
        this.mixers = [];
        this.furniture = {};
        this.collidableObjects = []; // FIX: collidable array for indoor

        // Indoor floor/bounds for collision
        const floorGeo = new THREE.PlaneGeometry(20, 20);
        const floorMat = new THREE.MeshBasicMaterial({ visible: false });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.group.add(floor);
        this.collidableObjects.push(floor);

        this._loadInterior();
    }

    _loadInterior() {
        const furnitureFiles = [
            { path: 'sofa.glb', pos: [-3, 0, -2], rot: [0, Math.PI / 2, 0] },
            { path: 'fireplace.glb', pos: [0, 0, -4.5] },
            { path: 'bookshelf.glb', pos: [4, 0, -3.5], rot: [0, -Math.PI / 2, 0] },
            { path: 'bed.glb', pos: [3, 0, 4] },
            { path: 'memory_jar.glb', pos: [4, 1.2, -3.5], anim: 'memoryjar_pulse' },
            { path: 'record_player.glb', pos: [4, 0.9, -2.5], anim: 'recordplayer_spin' },
            { path: 'mirror.glb', pos: [-4.5, 0, 0], rot: [0, Math.PI / 2, 0] },
            { path: 'kitchen_table.glb', pos: [-3.5, 0, 3] },
            { path: 'kitchen_chair.glb', pos: [-4.2, 0, 3], rot: [0, Math.PI / 2, 0] },
            { path: 'carpet.glb', pos: [0, 0.01, 0] },
            { path: 'plant_succulent.glb', pos: [-3.5, 0.8, 3] }
        ];

        furnitureFiles.forEach(item => {
            this.loader.load(`/src/models/furniture/${item.path}`, (gltf) => {
                const mesh = gltf.scene;
                mesh.position.set(...item.pos);
                if (item.rot) mesh.rotation.set(...item.rot);
                this.group.add(mesh);

                mesh.traverse(node => {
                    if (node.isMesh) {
                        node.receiveShadow = true;
                        node.castShadow = true;
                        if (node.material) {
                            node.material.shadowSide = THREE.FrontSide;
                        }
                    }
                });

                if (item.path !== 'carpet.glb' && item.path !== 'memory_jar.glb' && item.path !== 'plant_succulent.glb') {
                    this.collidableObjects.push(mesh);
                }

                if (gltf.animations.length > 0) {
                    const mixer = new THREE.AnimationMixer(mesh);
                    const action = mixer.clipAction(gltf.animations[0]);
                    action.play();
                    this.mixers.push(mixer);
                }

                // Add to interactables based on path
                if (item.path === 'memory_jar.glb') {
                    this.interactables.push({
                        position: new THREE.Vector3(...item.pos),
                        radius: 1.5,
                        type: 'memory_jar',
                        label: 'Buka Memory Jar [E] 📖'
                    });
                } else if (item.path === 'record_player.glb') {
                    this.interactables.push({
                        position: new THREE.Vector3(...item.pos),
                        radius: 1.5,
                        type: 'record_player',
                        label: 'Putar Musik [E] 🎵'
                    });
                } else if (item.path === 'fireplace.glb') {
                    this.interactables.push({
                        position: new THREE.Vector3(...item.pos),
                        radius: 2,
                        type: 'fireplace',
                        label: 'Nyalakan Perapian [E] 🔥'
                    });
                }
            });
        });

        // Add exit door trigger
        this.interactables.push({
            position: new THREE.Vector3(0, 0, 5),
            radius: 2,
            type: 'exit_door',
            label: 'Keluar rumah [F]'
        });
    }

    setVisible(visible) {
        this.group.visible = visible;
    }

    update(delta) {
        if (!this.group.visible) return;
        this.mixers.forEach(m => m.update(delta));
    }
}
