import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smarteye_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('smarteye_token');
      localStorage.removeItem('smarteye_user');
      const authPath = `${import.meta.env.BASE_URL}auth`;
      if (window.location.pathname !== authPath) {
        window.location.href = authPath;
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  getUsers: (role) => api.get(`/auth/users${role ? `?role=${role}` : ''}`),
};

// Issues
export const issueAPI = {
  create: (formData) => api.post('/issues', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: (params) => api.get('/issues', { params }),
  getMine: () => api.get('/issues/mine'),
  getById: (id) => api.get(`/issues/${id}`),
  updateStatus: (id, status) => api.patch(`/issues/${id}/status`, { status }),
  upvote: (id) => api.post(`/issues/${id}/upvote`),
  addComment: (id, text) => api.post(`/issues/${id}/comments`, { text }),
  getComments: (id) => api.get(`/issues/${id}/comments`),
  addFeedback: (id, data) => api.post(`/issues/${id}/feedback`, data),
};

// Admin
export const adminAPI = {
  getAnalytics: () => api.get('/admin/analytics'),
  getIssues: (params) => api.get('/admin/issues', { params }),
  assignIssue: (id, data) => api.patch(`/admin/issues/${id}/assign`, data),
  escalateIssue: (id) => api.patch(`/admin/issues/${id}/escalate`),
  getReport: (period) => api.get(`/admin/reports?period=${period}`),
};

// Worker
export const workerAPI = {
  getTasks: () => api.get('/worker/tasks'),
  resolveTask: (id, formData) => api.patch(`/worker/tasks/${id}/resolve`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Notifications
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markRead: () => api.patch('/notifications/read'),
};

// Chatbot
export const chatbotAPI = {
  send: (message) => api.post('/chatbot', { message }),
};

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, { autoConnect: false });
  }
  return socketInstance;
};

export const connectSocket = (userId) => {
  const socket = getSocket();
  if (!socket.connected) socket.connect();
  if (userId) socket.emit('join', userId);
  return socket;
};

export default api;
