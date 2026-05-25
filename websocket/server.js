import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();

// Configure CORS to allow socket connection and webhook trigger from Next.js server/client
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));

app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'websocket-server' });
});

// Socket connection and room assignment
io.on('connection', (socket) => {
  const { userId, role, branchId } = socket.handshake.query;

  console.log(`[Socket.io] Connected: socketId=${socket.id}, userId=${userId}, role=${role}, branchId=${branchId}`);

  // 1. Join direct user room
  if (userId) {
    const userRoom = `user:${userId}`;
    socket.join(userRoom);
    console.log(`[Socket.io] Socket ${socket.id} joined user room: ${userRoom}`);
  }

  // 2. Join role-specific branch room (e.g. role:chef:branch:branch123)
  if (role && branchId) {
    const roleRoom = `role:${role.toLowerCase()}:branch:${branchId}`;
    socket.join(roleRoom);
    console.log(`[Socket.io] Socket ${socket.id} joined role-branch room: ${roleRoom}`);
  }

  // 3. Join general branch room (useful if we want branch-wide alerts in future)
  if (branchId) {
    const branchRoom = `branch:${branchId}`;
    socket.join(branchRoom);
    console.log(`[Socket.io] Socket ${socket.id} joined branch room: ${branchRoom}`);
  }

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Disconnected: socketId=${socket.id}`);
  });
});

// POST endpoint for trigger webhook from Next.js server
app.post('/api/notify', (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid payload, expected array of "items"' });
  }

  console.log(`[Webhook] Received ${items.length} notifications to broadcast.`);

  for (const item of items) {
    const { recipient_user_id, recipient_role, branch_id } = item;

    // Direct user broadcast
    if (recipient_user_id) {
      const userRoom = `user:${recipient_user_id}`;
      io.to(userRoom).emit('notification', item);
      console.log(`[Broadcast] Dispatched notification to user room: ${userRoom}`);
    }

    // Role-specific branch broadcast
    if (recipient_role && branch_id) {
      const roleRoom = `role:${recipient_role.toLowerCase()}:branch:${branch_id}`;
      io.to(roleRoom).emit('notification', item);
      console.log(`[Broadcast] Dispatched notification to role room: ${roleRoom}`);
    }
  }

  return res.status(200).json({ success: true, processed: items.length });
});

// Start the server
const PORT = process.env.WEBSOCKET_PORT || 3002;
server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 WebSocket Notification Server is running on:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});
