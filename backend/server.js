import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

import db from './src/config/database.js';
import authRoutes from './src/routes/authRoutes.js';
import issueRoutes from './src/routes/issueRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import workerRoutes from './src/routes/workerRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';
import chatbotRoutes from './src/routes/chatbotRoutes.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { setSocketIO } from './src/services/notificationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

setSocketIO(io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`👤 User ${userId} joined their room`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200
});
app.use('/api/', limiter);

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chatbot', chatbotRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Smarteye Backend' });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, async () => {
  console.log(`\n🚀 Smarteye Backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server active`);
  console.log(`📁 Uploads directory: ${path.join(__dirname, 'uploads')}`);

  try {
    const adminExists = await db.users.findOne({ email: 'admin@smarteye.gov' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('password123', salt);
      await db.users.insert({
        _id: uuidv4(),
        name: 'System Admin',
        email: 'admin@smarteye.gov',
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      console.log('✅ Default Admin account securely provisioned (admin@smarteye.gov)');
    }
  } catch (err) {
    console.error('Failed to provision default admin:', err.message);
  }
});
