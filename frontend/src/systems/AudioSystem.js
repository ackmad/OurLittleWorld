import * as THREE from 'three';

/**
 * AudioSystem — zone-aware ambient audio + SFX.
 * Loads audio lazily; cross-fades when zone changes.
 */
export class AudioSystem {
    constructor() {
        this.muted = false;
        this.zone = null; // current zone key
        this.currentTrack = null;
        this.tracks = {}; // cache of Audio elements
        this.sfxCache = {};

        this._masterVol = 0.4;
        this._fadeInterval = null;

        // Zone → audio file mapping
        this.zoneAudio = {
            outdoor_morning: '/assets/audio/birds_morning.mp3',
            outdoor_noon: '/assets/audio/nature_noon.mp3',
            outdoor_afternoon: '/assets/audio/wind_afternoon.mp3',
            outdoor_night: '/assets/audio/crickets_night.mp3',
            outdoor_rain: '/assets/audio/rain.mp3',
            living_room: '/assets/audio/fireplace.mp3',
            library: '/assets/audio/taylor_ambient.mp3',
            kitchen: '/assets/audio/kitchen_ambient.mp3',
            bedroom: '/assets/audio/bedroom_night.mp3',
            balcony: '/assets/audio/wind_soft.mp3',
        };

        // SFX file paths
        this.sfxPaths = {
            cat: '/assets/audio/sfx_cat.mp3',
            fish: '/assets/audio/sfx_fish_splash.mp3',
            step_grass: '/assets/audio/sfx_step_grass.mp3',
            step_wood: '/assets/audio/sfx_step_wood.mp3',
            step_stone: '/assets/audio/sfx_step_stone.mp3',
            campfire: '/assets/audio/sfx_campfire.mp3',
            interact: '/assets/audio/sfx_interact.mp3',
            memory: '/assets/audio/sfx_memory.mp3',
        };
    }

    setMuted(muted) {
        this.muted = muted;
        if (this.currentTrack) {
            this.currentTrack.volume = muted ? 0 : this._masterVol;
        }
    }

    toggle() {
        this.setMuted(!this.muted);
        return !this.muted;
    }

    _getAudio(src) {
        if (!this.tracks[src]) {
            const a = new Audio(src);
            a.loop = true;
            a.volume = 0;
            this.tracks[src] = a;
        }
        return this.tracks[src];
    }

    setZone(zoneKey) {
        if (this.zone === zoneKey) return;
        this.zone = zoneKey;

        const src = this.zoneAudio[zoneKey];
        if (!src) return;

        // Fade out current
        if (this.currentTrack) {
            this._fade(this.currentTrack, this.currentTrack.volume, 0, 1200, () => {
                this.currentTrack.pause();
            });
        }

        // Fade in new
        const next = this._getAudio(src);
        next.currentTime = 0;
        next.play().catch(() => { }); // browsers block autoplay until user interaction
        this._fade(next, 0, this.muted ? 0 : this._masterVol, 1200);
        this.currentTrack = next;
    }

    _fade(audio, from, to, ms, cb) {
        const steps = 30;
        const step = (to - from) / steps;
        const delay = ms / steps;
        let current = 0;
        clearInterval(audio._fadeTimer);
        audio._fadeTimer = setInterval(() => {
            audio.volume = Math.max(0, Math.min(1, audio.volume + step));
            current++;
            if (current >= steps) {
                audio.volume = to;
                clearInterval(audio._fadeTimer);
                cb && cb();
            }
        }, delay);
    }

    playSFX(key) {
        if (this.muted) return;
        const path = this.sfxPaths[key];
        if (!path) return;
        const audio = new Audio(path);
        audio.volume = 0.6;
        audio.play().catch(() => { });
    }

    updateFromSky(skySystem) {
        const tod = skySystem.getTimeOfDay();
        if (this.zone?.startsWith('outdoor')) {
            const key = {
                dawn: 'outdoor_morning', morning: 'outdoor_morning',
                noon: 'outdoor_noon', afternoon: 'outdoor_afternoon',
                sunset: 'outdoor_afternoon', dusk: 'outdoor_night',
                night: 'outdoor_night', predawn: 'outdoor_night',
            }[tod] || 'outdoor_noon';
            this.setZone(key);
        }
    }
}
