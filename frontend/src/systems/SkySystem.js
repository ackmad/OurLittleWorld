import * as THREE from 'three';

/**
 * SkySystem — drives sky color, sun/moon, stars, shooting stars, 
 * lighting, and fog based on real time.
 */
export class SkySystem {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;

        this._buildSky();
        this._buildLights();
        this._buildFog();
        this._buildStars();
        this._buildMoon();
        this._buildSun();

        this.shootingStarTimer = 0;
        this.nextShootingStarIn = this._randomShootingStarDelay();
        this.activeStar = null;
    }

    _buildSky() {
        // FIX 2: Skybox / Background Langit with ShaderMaterial
        const skyGeo = new THREE.SphereGeometry(900, 32, 32);
        this.skyMat = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            uniforms: {
                topColor: { value: new THREE.Color() },
                bottomColor: { value: new THREE.Color() },
                offset: { value: 33 },
                exponent: { value: 0.6 },
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            depthWrite: false,
        });
        const sky = new THREE.Mesh(skyGeo, this.skyMat);
        sky.renderOrder = -1;
        this.scene.add(sky);
        this.updateSkyColor(new Date().getHours());
    }

    updateSkyColor(hour) {
        if (hour >= 5 && hour < 9) {
            // Morning: Soft blue to light golden/cream (instead of bright orange)
            this.skyMat.uniforms.topColor.value.set(0x76b6e4);
            this.skyMat.uniforms.bottomColor.value.set(0xfdf7d5);
            this.skyMat.uniforms.exponent.value = 0.5;
        } else if (hour >= 9 && hour < 17) {
            // Day: Bright blue
            this.skyMat.uniforms.topColor.value.set(0x5ba3e0);
            this.skyMat.uniforms.bottomColor.value.set(0xc9e8f5);
            this.skyMat.uniforms.exponent.value = 0.6;
        } else if (hour >= 17 && hour < 19) {
            // Sunset: Purple/Orange
            this.skyMat.uniforms.topColor.value.set(0x9b59b6);
            this.skyMat.uniforms.bottomColor.value.set(0xff6b35);
            this.skyMat.uniforms.exponent.value = 0.4;
        } else {
            // Night: Deep blue
            this.skyMat.uniforms.topColor.value.set(0x0a0a2e);
            this.skyMat.uniforms.bottomColor.value.set(0x1a1a4e);
            this.skyMat.uniforms.exponent.value = 0.5;
        }
    }

    _buildLights() {
        // FIX 1: Lighting yang Benar
        this.ambientLight = new THREE.AmbientLight(0xfff4e0, 0.6);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xffe8a0, 1.2);
        this.sunLight.position.set(10, 20, 10);
        this.sunLight.target.position.set(0, 0, 0);
        this.sunLight.castShadow = true;

        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 100;
        this.sunLight.shadow.camera.left = -30;
        this.sunLight.shadow.camera.right = 30;
        this.sunLight.shadow.camera.top = 30;
        this.sunLight.shadow.camera.bottom = -30;
        this.sunLight.shadow.bias = -0.001;

        this.scene.add(this.sunLight);
        this.scene.add(this.sunLight.target);

        this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x7cb87a, 0.3);
        this.scene.add(this.hemiLight);
    }

    _buildFog() {
        // FIX 5: Fog untuk Atmosphere Cozy
        this.scene.fog = new THREE.FogExp2(0xc9e8f5, 0.02);
        this.updateFogColor(new Date().getHours());
    }

    updateFogColor(hour) {
        if (hour >= 17 && hour < 19) {
            this.scene.fog.color.set(0xffb89a);
        } else if (hour >= 19 || hour < 6) {
            this.scene.fog.color.set(0x1a1a4e);
            this.scene.fog.density = 0.01;
        } else {
            this.scene.fog.color.set(0xc9e8f5);
            this.scene.fog.density = 0.02;
        }
    }

    _buildStars() {
        const starCount = 800;
        const positions = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);
        const phases = new Float32Array(starCount);

        for (let i = 0; i < starCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 0.95);
            const r = 850;
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.cos(phi);
            positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
            sizes[i] = 1.0 + Math.random() * 2.5;
            phases[i] = Math.random() * Math.PI * 2;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

        this.starMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uOpacity: { value: 0 },
            },
            vertexShader: `
                attribute float aSize;
                attribute float aPhase;
                uniform float uTime;
                varying float vOpacity;
                void main() {
                    float twinkle = 0.6 + 0.4 * sin(uTime * 2.0 + aPhase);
                    vOpacity = twinkle;
                    vec4 mvPos = modelViewMatrix * vec4(position,1.0);
                    gl_PointSize = aSize * twinkle * (300.0 / -mvPos.z);
                    gl_Position  = projectionMatrix * mvPos;
                }
            `,
            fragmentShader: `
                uniform float uOpacity;
                varying float vOpacity;
                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if (d > 0.5) discard;
                    float alpha = smoothstep(0.5, 0.1, d) * vOpacity * uOpacity;
                    gl_FragColor = vec4(1.0, 0.98, 0.92, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        this.stars = new THREE.Points(geo, this.starMat);
        this.scene.add(this.stars);
    }

    _buildMoon() {
        const geo = new THREE.SphereGeometry(8, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: '#fffff0' });
        this.moon = new THREE.Mesh(geo, mat);
        const gCanvas = document.createElement('canvas');
        gCanvas.width = gCanvas.height = 128;
        const ctx = gCanvas.getContext('2d');
        const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, 'rgba(255,255,220,0.6)');
        grad.addColorStop(1, 'rgba(255,255,220,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);
        const glowTex = new THREE.CanvasTexture(gCanvas);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        glow.scale.set(60, 60, 1);
        this.moon.add(glow);
        this.scene.add(this.moon);
    }

    _buildSun() {
        const geo = new THREE.SphereGeometry(12, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: '#fff5a0' });
        this.sun = new THREE.Mesh(geo, mat);
        this.scene.add(this.sun);
    }

    _randomShootingStarDelay() {
        return 60 + Math.random() * 60;
    }

    _spawnShootingStar() {
        if (this.activeStar) return;
        const geo = new THREE.BufferGeometry();
        const startX = (Math.random() - 0.5) * 600;
        const startY = 300 + Math.random() * 200;
        const startZ = (Math.random() - 0.5) * 400;
        const endX = startX + (Math.random() - 0.5) * 400;
        const endY = startY - 150 - Math.random() * 100;
        const endZ = startZ + (Math.random() - 0.5) * 200;

        const verts = new Float32Array(6);
        verts[0] = startX; verts[1] = startY; verts[2] = startZ;
        verts[3] = endX; verts[4] = endY; verts[5] = endZ;
        geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));

        const mat = new THREE.LineBasicMaterial({
            color: '#ffffff', transparent: true, opacity: 0.9,
            linewidth: 2, blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const line = new THREE.Line(geo, mat);
        this.scene.add(line);

        this.activeStar = {
            line, mat, t: 0, duration: 2.5,
            sx: startX, sy: startY, sz: startZ,
            ex: endX, ey: endY, ez: endZ
        };

        this._onShootingStar && this._onShootingStar();
    }

    onShootingStar(cb) { this._onShootingStar = cb; }
    onMidnight(cb) { this._onMidnight = cb; }

    update(delta) {
        const now = new Date();
        const hour = now.getHours();
        const fh = hour + now.getMinutes() / 60 + now.getSeconds() / 3600;
        const isNight = fh >= 19 || fh < 5;

        this.updateSkyColor(hour);
        this.updateFogColor(hour);

        if (isNight) {
            this.sunLight.intensity = 0.1;
            this.ambientLight.intensity = 0.2;
        } else {
            this.sunLight.intensity = 1.2;
            this.ambientLight.intensity = 0.6;
        }

        const sunAngle = ((fh - 6) / 12) * Math.PI;
        this.sun.position.set(
            Math.cos(sunAngle - Math.PI / 2) * 500,
            Math.sin(sunAngle) * 350 + 50,
            -300
        );
        this.sun.visible = fh >= 5.5 && fh <= 18.5;
        if (this.sun.visible) {
            this.sunLight.position.copy(this.sun.position);
        } else {
            // Moon light substitute if needed
            this.sunLight.position.set(10, 20, 10);
        }

        const moonH = fh < 6 ? fh + 24 : fh;
        const moonAngle = ((moonH - 19) / 11) * Math.PI;
        this.moon.position.set(
            Math.cos(moonAngle - Math.PI / 2) * 500,
            Math.sin(moonAngle) * 300 + 40,
            -280
        );
        this.moon.visible = fh >= 19 || fh < 6;

        const starOpacity = fh >= 20 ? 1.0 : fh < 5 ? 1.0
            : fh >= 19 ? (fh - 19) : fh >= 5 && fh < 6 ? (6 - fh) : 0;
        this.starMat.uniforms.uOpacity.value = Math.max(0, Math.min(1, starOpacity));
        this.starMat.uniforms.uTime.value += delta;

        if (isNight) {
            this.shootingStarTimer += delta;
            if (this.shootingStarTimer >= this.nextShootingStarIn) {
                this._spawnShootingStar();
                this.shootingStarTimer = 0;
                this.nextShootingStarIn = this._randomShootingStarDelay();
            }
        }

        if (this.activeStar) {
            const s = this.activeStar;
            s.t += delta / s.duration;
            if (s.t >= 1) {
                this.scene.remove(s.line);
                s.line.geometry.dispose();
                s.line.material.dispose();
                this.activeStar = null;
            } else {
                const fade = s.t < 0.3 ? s.t / 0.3 : s.t > 0.7 ? (1 - s.t) / 0.3 : 1;
                s.mat.opacity = 0.9 * fade;
                const off = s.t * 0.6;
                const verts = s.line.geometry.attributes.position.array;
                verts[0] = s.sx + (s.ex - s.sx) * off;
                verts[1] = s.sy + (s.ey - s.sy) * off;
                verts[2] = s.sz + (s.ez - s.sz) * off;
                verts[3] = verts[0] + (s.ex - s.sx) * 0.15;
                verts[4] = verts[1] + (s.ey - s.sy) * 0.15;
                verts[5] = verts[2] + (s.ez - s.sz) * 0.15;
                s.line.geometry.attributes.position.needsUpdate = true;
            }
        }

        if (hour === 0 && now.getMinutes() === 0 && now.getSeconds() < 3) {
            this._onMidnight && this._onMidnight();
        }
    }

    getTimeOfDay() {
        const h = new Date().getHours();
        if (h >= 5 && h < 6) return 'dawn';
        if (h >= 6 && h < 9) return 'morning';
        if (h >= 9 && h < 15) return 'noon';
        if (h >= 15 && h < 17.5) return 'afternoon';
        if (h >= 17.5 && h < 19) return 'sunset';
        if (h >= 19 && h < 21) return 'dusk';
        if (h >= 21 || h < 4) return 'night';
        return 'predawn';
    }
}
