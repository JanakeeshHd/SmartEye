import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

let io = null;

export const setSocketIO = (socketIOInstance) => {
  io = socketIOInstance;
};

export const emitRealtimeEvent = (event, payload) => {
  if (!io) return;
  io.emit(event, payload);
};

export const emitUserEvent = (userId, event, payload) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
};

export const notifyUser = async (userId, type, message, issueId = null) => {
  try {
    const notification = await db.notifications.insert({
      _id: uuidv4(),
      userId,
      type,
      message,
      issueId,
      read: false,
      createdAt: new Date().toISOString()
    });

    // Send real-time notification via WebSocket
    if (io) {
      io.to(`user:${userId}`).emit('notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('Notification error:', error);
  }
};

export const getNotifications = async (req, res) => {
  try {
    const notifications = await db.notifications
      .find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    const unreadCount = await db.notifications.count({ userId: req.user.id, read: false });
    
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
};

export const markNotificationsRead = async (req, res) => {
  try {
    await db.notifications.update(
      { userId: req.user.id, read: false },
      { $set: { read: true } },
      { multi: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notifications as read.' });
  }
};
