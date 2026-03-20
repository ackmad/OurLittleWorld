import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

/**
 * MultiplayerSystem — Socket.io client wrapper.
 * Handles room joining/creation, position sync, and interaction events.
 */
export class MultiplayerSystem {
    constructor() {
        this.socket = io(SERVER_URL, { autoConnect: false });
        this.roomCode = null;
        this.playerId = null;

        // Callbacks
        this.onPlayerJoined = null; // ({ player }) → void
        this.onPlayerLeft = null; // ({ id }) → void
        this.onPlayerMoved = null; // ({ id, x,y,z,ry,anim }) → void
        this.onInteraction = null; // ({ id, type, ...data }) → void
        this.onMemoryCreated = null; // (memory) → void
        this.onStarNamed = null; // (star) → void
        this.onNameplateUpdated = null; // (name) → void

        this._setupListeners();
    }

    connect() {
        this.socket.connect();
    }

    _setupListeners() {
        const s = this.socket;

        s.on('connect', () => {
            console.log('[MP] Connected to server:', s.id);
        });

        s.on('player_joined', ({ player }) => {
            console.log('[MP] Partner joined:', player.name);
            this.onPlayerJoined && this.onPlayerJoined({ player });
        });

        s.on('player_left', ({ id }) => {
            console.log('[MP] Player left:', id);
            this.onPlayerLeft && this.onPlayerLeft({ id });
        });

        s.on('player_moved', (data) => {
            this.onPlayerMoved && this.onPlayerMoved(data);
        });

        s.on('interaction', (data) => {
            this.onInteraction && this.onInteraction(data);
        });

        s.on('memory_created', (mem) => {
            this.onMemoryCreated && this.onMemoryCreated(mem);
        });

        s.on('star_named', (star) => {
            this.onStarNamed && this.onStarNamed(star);
        });

        s.on('nameplate_updated', (name) => {
            this.onNameplateUpdated && this.onNameplateUpdated(name);
        });

        s.on('disconnect', () => {
            console.log('[MP] Disconnected from server');
        });
    }

    createRoom(name, color) {
        return new Promise((resolve, reject) => {
            this.socket.emit('create_room', { name, color }, (res) => {
                if (res.success) {
                    this.roomCode = res.roomCode;
                    this.playerId = res.player.id;
                    resolve(res);
                } else {
                    reject(new Error(res.error));
                }
            });
        });
    }

    joinRoom(roomCode, name, color) {
        return new Promise((resolve, reject) => {
            this.socket.emit('join_room', { roomCode, name, color }, (res) => {
                if (res.success) {
                    this.roomCode = res.roomCode;
                    this.playerId = res.player.id;
                    resolve(res);
                } else {
                    reject(new Error(res.error));
                }
            });
        });
    }

    sendMove(state) {
        if (!this.roomCode) return;
        this.socket.emit('player_move', state);
    }

    sendInteraction(type, extra = {}) {
        if (!this.roomCode) return;
        this.socket.emit('interaction', { type, ...extra });
    }

    getMemories() {
        return new Promise((resolve) => {
            this.socket.emit('get_memories', null, resolve);
        });
    }

    nameStar(starId, name, x, y, z) {
        return new Promise((resolve) => {
            this.socket.emit('name_star', { starId, name, x, y, z }, resolve);
        });
    }

    getNamedStars() {
        return new Promise((resolve) => {
            this.socket.emit('get_stars', null, resolve);
        });
    }

    setNameplate(name) {
        return new Promise((resolve) => {
            this.socket.emit('set_nameplate', { name }, resolve);
        });
    }

    getNameplate() {
        return new Promise((resolve) => {
            this.socket.emit('get_nameplate', null, resolve);
        });
    }

    setSpecialDate(month, day, label) {
        return new Promise((resolve) => {
            this.socket.emit('set_special_date', { month, day, label }, resolve);
        });
    }
}
