import { createClient } from '@supabase/supabase-js';

function createEmitter() {
  const handlers = new Map();
  return {
    on(event, fn) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(fn);
    },
    off(event, fn) {
      handlers.get(event)?.delete(fn);
    },
    emit(event, payload) {
      const set = handlers.get(event);
      if (!set) return;
      for (const fn of set) fn(payload);
    },
  };
}

function normalizePresence(state) {
  return Object.entries(state || {}).map(([id, metas]) => {
    const meta = Array.isArray(metas) ? metas[0] : metas;
    return { id, ...(meta || {}) };
  });
}

export function createRealtimeClient({ supabaseUrl, supabaseAnonKey }) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const emitter = createEmitter();
  const selfId = crypto.randomUUID();
  const knownRemoteIds = new Set();
  let connected = false;
  let joinedRoomCode = null;
  let playerProfile = null;
  let channel = null;
  let heartbeatTimer = null;

  function getPresenceState() {
    return channel ? normalizePresence(channel.presenceState()) : [];
  }

  function emitPresenceDiff() {
    if (!channel || !playerProfile) return;
    const all = getPresenceState();
    const now = Date.now();
    const remotes = all.filter((p) => {
      if (p.id === selfId) return false;
      const hb = Number(p.heartbeatAt || 0);
      // Soft ghost-cleanup di sisi client jika peer tidak update heartbeat.
      return hb === 0 || now - hb <= 20000;
    });
    const remoteIds = new Set(remotes.map((p) => p.id));

    for (const remote of remotes) {
      if (!knownRemoteIds.has(remote.id)) {
        knownRemoteIds.add(remote.id);
        emitter.emit('player_joined', {
          player: {
            id: remote.id,
            name: remote.name || 'Player',
            color: remote.color || '#cccccc',
            x: 0,
            y: 2,
            z: 4,
            ry: 0,
            anim: 'idle',
          },
        });
      }
    }

    for (const id of [...knownRemoteIds]) {
      if (!remoteIds.has(id)) {
        knownRemoteIds.delete(id);
        emitter.emit('player_left', { id });
      }
    }
  }

  async function initChannel(roomCode = 'COIZY') {
    joinedRoomCode = roomCode.toUpperCase().trim();
    channel = supabase.channel(`room:${joinedRoomCode}`, {
      config: { presence: { key: selfId } },
    });

    channel
      .on('broadcast', { event: 'player_moved' }, ({ payload }) => {
        emitter.emit('player_moved', payload);
      })
      .on('broadcast', { event: 'interaction' }, ({ payload }) => {
        emitter.emit('interaction', payload);
      })
      .on('presence', { event: 'sync' }, () => {
        emitPresenceDiff();
      });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Realtime subscribe timeout')), 10000);
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          connected = true;
          if (playerProfile) {
            await channel.track({
              ...playerProfile,
              heartbeatAt: Date.now(),
            });
          }
          emitter.emit('connect', { id: selfId });
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          clearTimeout(timeout);
          connected = false;
          emitter.emit('disconnect', status);
        }
      });
    });
  }

  async function joinRoom({ roomCode, name, color }, callback) {
    const targetCode = (roomCode || joinedRoomCode || 'COIZY').toUpperCase().trim();
    if (!channel || targetCode !== joinedRoomCode) {
      await initChannel(targetCode);
    }

    const currentlyPresent = getPresenceState();
    if (currentlyPresent.length >= 2) {
      callback?.({ success: false, error: 'Room sudah penuh (max 2 pemain).' });
      return;
    }

    playerProfile = {
      name,
      color,
      joinedAt: new Date().toISOString(),
      heartbeatAt: Date.now(),
    };
    const trackRes = await channel.track(playerProfile);
    if (trackRes !== 'ok') {
      callback?.({ success: false, error: 'Gagal join room realtime.' });
      return;
    }

    const afterTrack = getPresenceState();
    if (afterTrack.length > 2) {
      await channel.untrack();
      playerProfile = null;
      callback?.({ success: false, error: 'Room sudah penuh (max 2 pemain).' });
      return;
    }

    const others = afterTrack
      .filter((p) => p.id !== selfId)
      .map((p) => ({
        id: p.id,
        name: p.name || 'Player',
        color: p.color || '#cccccc',
        x: 0,
        y: 2,
        z: 4,
        ry: 0,
        anim: 'idle',
      }));

    callback?.({
      success: true,
      roomCode: joinedRoomCode,
      player: { id: selfId, name, color, x: 0, y: 2, z: 4, ry: 0, anim: 'idle' },
      others,
    });

    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (!channel || !connected || !playerProfile) return;
      channel.track({
        ...playerProfile,
        heartbeatAt: Date.now(),
      });
    }, 5000);
  }

  const socketLike = {
    get id() {
      return selfId;
    },
    get connected() {
      return connected;
    },
    on(event, fn) {
      emitter.on(event, fn);
    },
    off(event, fn) {
      emitter.off(event, fn);
    },
    async emit(event, payload, callback) {
      if (event === 'join_room') {
        await joinRoom(payload || {}, callback);
        return;
      }
      if (!channel || !connected) return;
      if (event === 'player_move') {
        await channel.send({ type: 'broadcast', event: 'player_moved', payload: { id: selfId, ...payload } });
        return;
      }
      if (event === 'interaction') {
        await channel.send({ type: 'broadcast', event: 'interaction', payload: { id: selfId, ...payload } });
      }
    },
    async disconnect() {
      connected = false;
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (channel) {
        try {
          await channel.untrack();
        } catch (_) {
          // no-op
        }
        await supabase.removeChannel(channel);
      }
      emitter.emit('disconnect', 'manual_disconnect');
    },
  };

  // Auto-init default room channel; app still explicitly sends `join_room`.
  initChannel('COIZY').catch((err) => {
    console.error('[NET] Realtime init error:', err);
    emitter.emit('disconnect', 'init_error');
  });

  return socketLike;
}
