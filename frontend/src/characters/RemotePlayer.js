import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * RemotePlayer — renders the partner player received from Socket.io.
 * Smoothly interpolates to latest network position.
 */
export class RemotePlayer {
    constructor(scene, id, name, color) {
        this.scene = scene;
        this.id = id;
        this.name = name;
        this.color = color;
        this.loader = new GLTFLoader();
        this.target = new THREE.Vector3(0, 0, 10);
        this.targetRy = 0;
        this.currentAnim = 'idle';

        this.mixer = null;
        this.actions = {};

        this._buildMesh();
        this._buildLabel();
    }

    _buildMesh() {
        const charFile = this.name.toLowerCase().includes('savira') ? 'Savira_Game.glb' : 'Elfan_Game.glb';
        this.loader.load(`/src/models/characters/${charFile}`, (gltf) => {
            this.mesh = gltf.scene;
            this.scene.add(this.mesh);
            this.mesh.traverse(c => {
                if (c.isMesh) c.castShadow = true;
            });

            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.mesh);
                gltf.animations.forEach(clip => {
                    this.actions[clip.name.toLowerCase()] = this.mixer.clipAction(clip);
                });
                this.playAnimation('idle');
            }
            if (this._sprite) this.mesh.add(this._sprite);
        });
    }

    playAnimation(name) {
        if (!this.mixer || this.currentAnim === name) return;
        const action = this.actions[name.toLowerCase()];
        if (!action) return;

        const prev = this.actions[this.currentAnim.toLowerCase()];
        if (prev) prev.fadeOut(0.2);
        action.reset().fadeIn(0.2).play();
        this.currentAnim = name;
    }

    _buildLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.roundRect(16, 14, 224, 36, 18); ctx.fill();
        ctx.fillStyle = this.color;
        ctx.font = 'bold 24px Nunito,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.name, 128, 32);
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(2.5, 0.6, 1);
        sprite.position.y = 2.6;
        this.mesh.add(sprite);
    }

    updateTarget(data, localScene = 'outdoor') {
        this.target.set(data.x, data.y, data.z);
        this.targetRy = data.ry ?? this.targetRy;
        this.remoteScene = data.scene || 'outdoor';

        if (data.anim) this.playAnimation(data.anim);

        // Hide partner if they are in a different scene
        if (this.mesh) {
            this.mesh.visible = (this.remoteScene === localScene);
        }
    }

    update(delta) {
        if (!this.mesh || !this.mesh.visible) return;
        // Smooth interpolation toward target (compensates for network lag)
        this.mesh.position.lerp(this.target, Math.min(1, 10 * delta));
        this.mesh.rotation.y = THREE.MathUtils.lerp(
            this.mesh.rotation.y, this.targetRy, Math.min(1, 12 * delta)
        );

        if (this.mixer) this.mixer.update(delta);
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
    }
}
