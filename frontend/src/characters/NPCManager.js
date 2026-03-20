import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * NPCManager — manages all living creatures:
 * Cat, Butterflies, Bees, Birds, Rabbits, Fireflies.
 */
export class NPCManager {
    constructor(scene) {
        this.scene = scene;
        this.loader = new GLTFLoader();
        this.group = new THREE.Group();
        this.scene.add(this.group);
        this.npcs = [];
        this.mixers = [];
        this._t = 0;

        this._loadNPCs();
    }

    setVisible(visible) {
        this.group.visible = visible;
    }

    _loadNPCs() {
        // Cat
        this.loader.load('/src/models/npc/cat.glb', (gltf) => {
            this.cat = gltf.scene;
            this.cat.position.set(-2, 0, 2);
            this.group.add(this.cat);

            if (gltf.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(this.cat);
                mixer.clipAction(gltf.animations[0]).play();
                this.mixers.push(mixer);
            }

            this.catInteractable = {
                position: this.cat.position,
                radius: 1.5,
                type: 'cat',
                label: 'Elus kucing [E] 🐱',
            };
        });

        // Butterflies
        const bfColors = ['a', 'b', 'c', 'd'];
        bfColors.forEach((color, i) => {
            this.loader.load(`/src/models/npc/butterfly_${color}.glb`, (gltf) => {
                const bf = gltf.scene;
                bf.position.set(5 + i * 2, 1, 8);
                this.group.add(bf);

                if (gltf.animations.length > 0) {
                    const mixer = new THREE.AnimationMixer(bf);
                    mixer.clipAction(gltf.animations[0]).play();
                    this.mixers.push(mixer);
                }

                this.npcs.push({ mesh: bf, type: 'butterfly', phase: Math.random() * Math.PI * 2 });
            });
        });

        // Bee
        this.loader.load('/src/models/npc/bee.glb', (gltf) => {
            const bee = gltf.scene;
            bee.position.set(10, 1.2, -11);
            this.group.add(bee);
            if (gltf.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(bee);
                mixer.clipAction(gltf.animations[0]).play();
                this.mixers.push(mixer);
            }
        });

        // Rabbit
        this.loader.load('/src/models/npc/rabbit.glb', (gltf) => {
            const rabbit = gltf.scene;
            rabbit.position.set(-15, 0, -10);
            this.group.add(rabbit);
            if (gltf.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(rabbit);
                mixer.clipAction(gltf.animations[0]).play();
                this.mixers.push(mixer);
            }
        });

        // Fireflies
        this.loader.load('/src/models/npc/firefly.glb', (gltf) => {
            this.fireflies = gltf.scene;
            this.fireflies.position.set(0, 2, 0);
            this.fireflies.visible = false;
            this.group.add(this.fireflies);
            if (gltf.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(this.fireflies);
                gltf.animations.forEach(anim => mixer.clipAction(anim).play());
                this.mixers.push(mixer);
            }
        });
    }

    update(delta, playerPos) {
        this._t += delta;
        this.mixers.forEach(m => m.update(delta));

        // Show fireflies at night
        const h = new Date().getHours();
        if (this.fireflies) {
            this.fireflies.visible = (h >= 19 || h < 6);
        }

        // Gentle movement for butterflies
        this.npcs.forEach(npc => {
            if (npc.type === 'butterfly') {
                npc.mesh.position.y = 1 + Math.sin(this._t + npc.phase) * 0.5;
                npc.mesh.position.x += Math.sin(this._t * 0.5 + npc.phase) * 0.02;
            }
        });
    }

    getCatInteractable() {
        return this.catInteractable || {
            position: new THREE.Vector3(-2, 0, 2),
            radius: 1.5,
            type: 'cat',
            label: 'Elus kucing [E] 🐱',
        };
    }
}
