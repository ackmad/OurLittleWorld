import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * World — builds the floating island and all exterior environment.
 * Uses GLB assets for the final version.
 */
export class World {
    constructor(scene) {
        this.scene = scene;
        this.loader = new GLTFLoader();
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.interactables = [];
        this.mixers = [];
        this.campfireActive = false;

        // FIX 4: expose collidableObjects array
        this.collidableObjects = [];

        this._build();
    }

    _build() {
        this._loadIsland();
        this._loadCottage();
        this._loadEnvironment();
        this._loadFurniture();
    }

    // FIX 7: Helper Function Setup Shadows
    _setupShadows(object) {
        object.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                if (node.material) {
                    node.material.shadowSide = THREE.FrontSide;
                }
            }
        });
    }

    _loadIsland() {
        this.loader.load('/src/models/environment/island_terrain.glb', (gltf) => {
            const island = gltf.scene;
            island.position.y = 0;
            island.traverse(node => {
                if (node.isMesh) {
                    node.receiveShadow = true;
                    node.castShadow = true;
                    if (node.material) {
                        node.material.shadowSide = THREE.FrontSide;

                        // FIX 6 & 7: Cozier colors and darker bottom
                        const name = node.name.toLowerCase();
                        if (name.includes('grass') || name.includes('terrain')) {
                            node.material.color.set(0x8bc34a); // Brighter, warmer green
                        } else if (name.includes('path') || name.includes('soil')) {
                            node.material.color.set(0x8d6e63); // Warmer brown
                        } else if (name.includes('rock') || name.includes('stalactite') || name.includes('bottom')) {
                            node.material.color.set(0x546e7a); // Darker blue-grey for stone
                        }
                    }
                }
            });
            this.group.add(island);
            this.collidableObjects.push(island);
        });

        this.loader.load('/src/models/environment/pond_water.glb', (gltf) => {
            const water = gltf.scene;
            water.position.y = 0.08;
            water.scale.set(0.7, 1, 0.7); // FIX 8: Smaller pond
            this.group.add(water);
        });
    }

    _loadCottage() {
        this.loader.load('/src/models/environment/cottage_exterior.glb', (gltf) => {
            const cottage = gltf.scene;
            cottage.position.set(0, 0, -5);
            cottage.scale.set(1.15, 1.15, 1.15); // Scale up environment slightly

            this._setupShadows(cottage);

            // FIX 2: Hide potential scaffolding/helpers in the GLB
            cottage.traverse(node => {
                const name = node.name.toLowerCase();
                if (name.includes('helper') || name.includes('scaffold') || name.includes('guide') || name.includes('skeleton')) {
                    node.visible = false;
                }
                // Ensure materials are not wireframe
                if (node.isMesh && node.material) {
                    node.material.wireframe = false;
                }
            });

            this.group.add(cottage);
            this.collidableObjects.push(cottage);

            // Door interactable based on asset guide
            this.interactables.push({
                position: new THREE.Vector3(0, 1.5, -4),
                radius: 2,
                type: 'door',
                label: 'Masuk ke dalam [F]',
            });
        });
    }

    _loadEnvironment() {
        const envFiles = [
            { path: 'tree_large.glb', pos: [-15, 0, 10], scale: 1.8, anim: 'tree_wind_sway' }, // FIX 9: Larger trees
            { path: 'tree_large.glb', pos: [15, 0, 12], scale: 1.5, anim: 'tree_wind_sway' },
            { path: 'tree_small.glb', pos: [-10, 0, -15], scale: 1.6, anim: 'tree_small_wind' },
            { path: 'flower_round.glb', pos: [3, 0, 8], anim: 'flower_round_sway' },
            { path: 'flower_daisy.glb', pos: [-3, 0, 7], anim: 'flower_daisy_sway' },
            { path: 'flower_tulip.glb', pos: [5, 0, 5], anim: 'flower_tulip_sway' },
            { path: 'flower_round.glb', pos: [-8, 0, 12], anim: 'flower_round_sway' },
            { path: 'flower_daisy.glb', pos: [12, 0, -5], anim: 'flower_daisy_sway' },
            { path: 'flower_tulip.glb', pos: [-12, 0, -8], anim: 'flower_tulip_sway' },
            { path: 'dock.glb', pos: [22, 0, 14] },
            { path: 'boat.glb', pos: [26, 0.4, 9], anim: 'boat_bob' },
            { path: 'campfire.glb', pos: [-15, 0, -14], anim: 'campfire_flicker' },
            { path: 'pond.glb', pos: [-18, 0, 5], scale: 0.7 } // FIX 8: Smaller pond
        ];

        envFiles.forEach(env => {
            this.loader.load(`/src/models/environment/${env.path}`, (gltf) => {
                const mesh = gltf.scene;
                mesh.position.set(...env.pos);
                if (env.scale) mesh.scale.set(env.scale, env.scale, env.scale);

                this._setupShadows(mesh);
                this.group.add(mesh);

                if (env.path !== 'flower_round.glb' && env.path !== 'flower_daisy.glb' && env.path !== 'flower_tulip.glb' && env.path !== 'pond.glb') {
                    this.collidableObjects.push(mesh);
                }

                if (gltf.animations && gltf.animations.length > 0) {
                    const mixer = new THREE.AnimationMixer(mesh);
                    // Find the action by name if specified, otherwise play the first one
                    const clip = env.anim ? gltf.animations.find(a => a.name === env.anim) || gltf.animations[0] : gltf.animations[0];
                    const action = mixer.clipAction(clip);
                    action.play();
                    this.mixers.push(mixer);
                }

                if (env.path === 'campfire.glb') {
                    this.campfire = mesh;
                    this.campfireLight = new THREE.PointLight(0xff6020, 0, 10);
                    this.campfireLight.position.set(0, 1.5, 0);
                    this.campfire.add(this.campfireLight);

                    this.interactables.push({
                        position: new THREE.Vector3(...env.pos),
                        radius: 3,
                        type: 'campfire',
                        label: 'Nyalakan api unggun [E]'
                    });
                }

                if (env.path === 'pond.glb') {
                    this.interactables.push({
                        position: new THREE.Vector3(...env.pos),
                        radius: 4,
                        type: 'pond',
                        label: 'Beri makan ikan [E]'
                    });
                }

                if (env.path === 'dock.glb') {
                    this.interactables.push({
                        position: new THREE.Vector3(...env.pos),
                        radius: 5,
                        type: 'sit_together',
                        label: 'Duduk di dermaga berdua [E]',
                    });
                }
            });
        });
    }

    _loadFurniture() {
        // Balcony furniture (exterior accessible)
        this.loader.load('/src/models/furniture/balcony_chair.glb', (gltf) => {
            const chair = gltf.scene;
            chair.position.set(0, 6, 1.5); // Adjust based on cottage exterior pos
            this.group.add(chair);
        });
    }

    toggleCampfire() {
        this.campfireActive = !this.campfireActive;
        if (this.campfireLight) {
            this.campfireLight.intensity = this.campfireActive ? 2.5 : 0;
        }
        return this.campfireActive;
    }

    update(delta) {
        this.mixers.forEach(m => m.update(delta));
        if (this.campfireActive && this.campfireLight) {
            this.campfireLight.intensity = 2.0 + Math.sin(performance.now() * 0.008) * 0.5;
        }
    }
}
