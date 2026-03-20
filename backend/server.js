const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// ─── App Setup ──────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 3001;

// ─── Data Paths ─────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const MEMORIES_FILE   = path.join(DATA_DIR, 'memories.json');
const STARS_FILE      = path.join(DATA_DIR, 'named_stars.json');
const DATES_FILE      = path.join(DATA_DIR, 'special_dates.json');

function readJSON(file, fallback = []) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch (_) { return fallback; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ─── In-memory State ────────────────────────────────────────────────────────
// rooms: { roomCode: { players: { socketId: { id, name, x, y, z, ry, anim, color } } } }
const rooms = {};

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getRoomPlayers(roomCode) {
  return rooms[roomCode] ? Object.values(rooms[roomCode].players) : [];
}

// ─── Memory Jar ─────────────────────────────────────────────────────────────
function saveMemory(roomCode, type, description) {
  const memories = readJSON(MEMORIES_FILE, []);
  const players = getRoomPlayers(roomCode).map(p => p.name);
  const mem = {
    id: Date.now(),
    room: roomCode,
    players,
    type,
    description,
    timestamp: new Date().toISOString(),
    displayTime: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
  };
  memories.unshift(mem);
  // keep last 200 memories
  if (memories.length > 200) memories.splice(200);
  writeJSON(MEMORIES_FILE, memories);
  return mem;
}

// ─── Socket.io ──────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // ── Create Room ──
  socket.on('create_room', ({ name, color }, callback) => {
    let code = generateRoomCode();
    while (rooms[code]) code = generateRoomCode(); // avoid collision

    rooms[code] = { players: {} };
    socket.join(code);
    socket.roomCode = code;

    const player = { id: socket.id, name, color, x: 0, y: 0, z: 0, ry: 0, anim: 'idle' };
    rooms[code].players[socket.id] = player;

    console.log(`[ROOM] Created ${code} by ${name}`);
    callback({ success: true, roomCode: code, player });
  });

  // ── Join Room ──
  socket.on('join_room', ({ roomCode, name, color }, callback) => {
    const code = roomCode.toUpperCase().trim();
    if (!rooms[code]) {
      callback({ success: false, error: 'Room not found.' });
      return;
    }
    if (Object.keys(rooms[code].players).length >= 2) {
      callback({ success: false, error: 'Room sudah penuh (max 2 pemain).' });
      return;
    }

    socket.join(code);
    socket.roomCode = code;

    const player = { id: socket.id, name, color, x: 0, y: 2, z: 4, ry: 0, anim: 'idle' };
    rooms[code].players[socket.id] = player;

    // Notify existing players
    socket.to(code).emit('player_joined', { player });

    // Send current players to new joiner
    const others = Object.values(rooms[code].players).filter(p => p.id !== socket.id);

    console.log(`[ROOM] ${name} joined ${code}`);
    callback({ success: true, roomCode: code, player, others });

    // Auto memory: both online together
    if (Object.keys(rooms[code].players).length === 2) {
      const mem = saveMemory(code, 'together', `${Object.values(rooms[code].players).map(p=>p.name).join(' & ')} online bersama`);
      io.to(code).emit('memory_created', mem);
    }
  });

  // ── Player Move ──
  socket.on('player_move', (data) => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;
    rooms[code].players[socket.id] = { ...rooms[code].players[socket.id], ...data };
    socket.to(code).emit('player_moved', { id: socket.id, ...data });
  });

  // ── Shared Interaction ──
  socket.on('interaction', (data) => {
    const code = socket.roomCode;
    if (!code) return;
    // Broadcast to partner
    socket.to(code).emit('interaction', { id: socket.id, ...data });

    // Save special moments as memories
    const memoryTypes = ['shoot_star', 'dance', 'campfire', 'sit_together', 'piknik', 'midnight_fireworks', 'named_star'];
    if (memoryTypes.includes(data.type)) {
      const players = getRoomPlayers(code).map(p => p.name);
      let desc = '';
      switch (data.type) {
        case 'shoot_star':    desc = `${players.join(' & ')} melihat shooting star bersama`; break;
        case 'dance':         desc = `${players.join(' & ')} berdansa bersama di depan perapian`; break;
        case 'campfire':      desc = `${players.join(' & ')} duduk di api unggun bersama`; break;
        case 'sit_together':  desc = `${players.join(' & ')} duduk berdampingan`; break;
        case 'piknik':        desc = `${players.join(' & ')} piknik di taman`; break;
        case 'midnight_fireworks': desc = `${players.join(' & ')} merayakan tengah malam bersama 🎆`; break;
        case 'named_star':    desc = `${players.join(' & ')} memberi nama bintang: "${data.starName}"`; break;
        default: desc = `${players.join(' & ')} -- ${data.type}`;
      }
      if (Object.keys(rooms[code].players).length === 2) {
        const mem = saveMemory(code, data.type, desc);
        io.to(code).emit('memory_created', mem);
      }
    }
  });

  // ── Named Stars ──
  socket.on('get_stars', (_, callback) => {
    callback(readJSON(STARS_FILE, []));
  });
  socket.on('name_star', ({ starId, name, x, y, z }, callback) => {
    const stars = readJSON(STARS_FILE, []);
    const existing = stars.find(s => s.id === starId);
    if (existing) { callback({ success: false, error: 'Bintang ini sudah punya nama.' }); return; }
    const star = { id: starId || Date.now(), name, x, y, z, namedAt: new Date().toISOString() };
    stars.push(star);
    writeJSON(STARS_FILE, stars);
    const code = socket.roomCode;
    if (code) io.to(code).emit('star_named', star);
    callback({ success: true, star });
  });

  // ── Memories ──
  socket.on('get_memories', (_, callback) => {
    callback(readJSON(MEMORIES_FILE, []));
  });

  // ── Special Dates ──
  socket.on('get_special_dates', (_, callback) => {
    callback(readJSON(DATES_FILE, []));
  });
  socket.on('set_special_date', ({ month, day, label }, callback) => {
    const dates = readJSON(DATES_FILE, []);
    dates.push({ month, day, label, createdAt: new Date().toISOString() });
    writeJSON(DATES_FILE, dates);
    callback({ success: true });
  });

  // ── House Nameplate ──
  // Store in a simple in-memory variable (persists until restart)
  // For production, save to a JSON file
  socket.on('get_nameplate', (_, callback) => {
    callback(global.houseName || 'Our Little World');
  });
  socket.on('set_nameplate', ({ name }, callback) => {
    global.houseName = name;
    const code = socket.roomCode;
    if (code) io.to(code).emit('nameplate_updated', name);
    callback({ success: true });
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (code && rooms[code]) {
      delete rooms[code].players[socket.id];
      socket.to(code).emit('player_left', { id: socket.id });
      if (Object.keys(rooms[code].players).length === 0) {
        delete rooms[code];
        console.log(`[ROOM] ${code} closed (empty)`);
      }
    }
    console.log(`[-] Disconnected: ${socket.id}`);
  });
});

// ─── REST API ────────────────────────────────────────────────────────────────
app.get('/', (_, res) => res.json({ status: 'ok', game: 'Our Little World 🌸' }));
app.get('/api/memories', (_, res) => res.json(readJSON(MEMORIES_FILE, [])));
app.get('/api/stars',    (_, res) => res.json(readJSON(STARS_FILE, [])));

// ─── Start ───────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🌸 Our Little World server running on port ${PORT}`);
});
