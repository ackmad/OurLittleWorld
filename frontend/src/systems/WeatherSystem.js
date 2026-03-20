import * as THREE from 'three';

/**
 * WeatherSystem — rain, morning fog, wind gusts, December snow.
 */
export class WeatherSystem {
    constructor(scene) {
        this.scene = scene;
        this.type = 'clear'; // clear | rain | fog | snow | wind
        this._rainSystem = null;
        this._snowSystem = null;
        this._windTimer = 0;
        this._windActive = false;
        this._windTarget = 0;
        this._windStrength = 0;
        this.onWindChange = null; // callback(strength)

        this._buildRain();
        this._buildSnow();
        this._buildFog();

        // Check auto-snow (Dec)
        const m = new Date().getMonth(); // 0-indexed
        if (m === 11) { // December
            const d = new Date().getDate();
            if (d >= 24 && d <= 26) this.setWeather('snow');
        }

        // Random weather scheduling
        this._scheduleNext();
    }

    _buildRain() {
        const count = 4000;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 200;
            pos[i * 3 + 1] = Math.random() * 120 - 10;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
            color: '#aad8f0', size: 0.08, transparent: true,
            opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
        });
        this._rainSystem = new THREE.Points(geo, mat);
        this._rainSystem.visible = false;
        this.scene.add(this._rainSystem);
        this._rainPos = pos;
    }

    _buildSnow() {
        const count = 2000;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 200;
            pos[i * 3 + 1] = Math.random() * 100;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
            color: '#ffffff', size: 0.25, transparent: true,
            opacity: 0.7, depthWrite: false,
        });
        this._snowSystem = new THREE.Points(geo, mat);
        this._snowSystem.visible = false;
        this.scene.add(this._snowSystem);
        this._snowPos = pos;
    }

    _buildFog() {
        // Fog is controlled via scene.fog in SkySystem.
        // We add optional dawn fog via a large semi-transparent plane
        const geo = new THREE.PlaneGeometry(500, 500);
        const mat = new THREE.MeshBasicMaterial({
            color: '#d0e8f0', transparent: true, opacity: 0,
            side: THREE.DoubleSide, depthWrite: false,
        });
        this._fogPlane = new THREE.Mesh(geo, mat);
        this._fogPlane.rotation.x = -Math.PI / 2;
        this._fogPlane.position.y = 1;
        this.scene.add(this._fogPlane);
    }

    _scheduleNext() {
        // Random weather event every 10–20 mins
        this._nextWeatherIn = (600 + Math.random() * 600);
        this._timer = 0;
    }

    setVisible(visible) {
        if (this._rainSystem) this._rainSystem.visible = visible && this.type === 'rain';
        if (this._snowSystem) this._snowSystem.visible = visible && this.type === 'snow';
        if (this._fogPlane) this._fogPlane.visible = visible;
    }

    setWeather(type) {
        this.type = type;
        const raining = type === 'rain';
        const snowing = type === 'snow';
        if (this._rainSystem) this._rainSystem.visible = raining;
        if (this._snowSystem) this._snowSystem.visible = snowing;
        this.onWeatherChange && this.onWeatherChange(type);
    }

    update(delta) {
        const h = new Date().getHours();

        // Dawn fog (05–07)
        const fogOpacity = (h >= 5 && h < 7) ? (h < 6 ? (h - 5) * 0.4 : (7 - h) * 0.4) : 0;
        this._fogPlane.material.opacity = fogOpacity * 0.25;

        // Rain particles fall
        if (this._rainSystem?.visible) {
            const pos = this._rainPos;
            for (let i = 0; i < pos.length; i += 3) {
                pos[i + 1] -= delta * 28; // fall speed
                if (pos[i + 1] < -10) pos[i + 1] = 110;
            }
            this._rainSystem.geometry.attributes.position.needsUpdate = true;
        }

        // Snow particles drift
        if (this._snowSystem?.visible) {
            const pos = this._snowPos;
            for (let i = 0; i < pos.length; i += 3) {
                pos[i] += Math.sin(Date.now() * 0.0005 + i) * 0.02;
                pos[i + 1] -= delta * 2.5;
                if (pos[i + 1] < -5) pos[i + 1] = 100;
            }
            this._snowSystem.geometry.attributes.position.needsUpdate = true;
        }

        // Wind gust timer
        this._windTimer += delta;
        if (!this._windActive && this._windTimer > 30 + Math.random() * 60) {
            this._windActive = true;
            this._windTarget = 0.5 + Math.random() * 0.5;
            this._windTimer = 0;
        }
        if (this._windActive) {
            this._windStrength = THREE.MathUtils.lerp(this._windStrength, this._windTarget, delta * 1.5);
            if (Math.abs(this._windStrength - this._windTarget) < 0.01 && this._windTarget > 0) {
                this._windTarget = 0; // start returning
            }
            if (this._windTarget === 0 && this._windStrength < 0.02) {
                this._windStrength = 0;
                this._windActive = false;
            }
            this.onWindChange && this.onWindChange(this._windStrength);
        }

        // Auto weather scheduling
        this._timer += delta;
        if (this._timer >= this._nextWeatherIn) {
            // Small chance of rain (unless December)
            const roll = Math.random();
            if (this.type !== 'snow') {
                if (roll < 0.18) this.setWeather('rain');
                else this.setWeather('clear');
            }
            this._scheduleNext();
        }
    }
}
