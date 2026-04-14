# Smarteye – Smart Civic Issue Reporting & Management System

> AI-powered platform for citizens to report civic issues and for government authorities to manage, prioritize, and resolve them.

## 🏗️ Architecture

```
Frontend (React + Vite)  →  Backend (Node.js + Express)  →  AI Service (Python FastAPI)
                                      ↕                              ↕
                              Database (NeDB/MongoDB)         AI Classification
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ 
- **Python** 3.10+
- **npm** v9+

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```
Server runs on `http://localhost:5000`

### 2. AI Service Setup (Optional)
```bash
cd ai-service
pip install -r requirements.txt
python main.py
```
AI service runs on `http://localhost:8000`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
App runs on `http://localhost:5173`

## 🔑 Demo Accounts

| Role    | Email              | Password     |
|---------|-------------------|-------------|
| Citizen | citizen@test.com  | password123 |
| Admin   | admin@smarteye.gov | password123 |
| Worker  | worker@smarteye.gov| password123 |

## 🧩 Features

### Citizen
- 📝 Report issues with image upload, voice input, GPS
- 🤖 AI auto-detection of issue category & severity
- 📊 Track complaint status (Submitted → In Progress → Resolved)
- 🗺️ Interactive map with heatmap view
- 👍 Upvote and comment on issues
- 🔔 Real-time notifications via WebSocket
- ⭐ Feedback & rating after resolution
- 🏆 Gamification points for valid reports

### Admin
- 📈 AI-powered analytics dashboard
- 📊 Charts: trends, severity, category, department performance
- 🏢 Auto-assign issues to departments
- ⏱️ SLA tracking with escalation
- 📋 Issue management with filters

### Worker
- 📋 View assigned tasks
- 📸 Update status with proof images
- ✅ Mark issues as resolved

### AI Features
- 🧠 NLP text classification
- 🎯 Priority scoring (0-100)
- 🔍 Duplicate detection (location + text similarity)
- 📍 Geo-spatial clustering
- 💬 AI chatbot assistant

## 📁 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS 3 |
| State | React Context + useReducer |
| Charts | Chart.js + react-chartjs-2 |
| Maps | Leaflet + react-leaflet |
| Backend | Node.js, Express.js |
| Auth | JWT + bcrypt |
| Database | NeDB (MongoDB-compatible) |
| Real-time | Socket.io |
| AI | Python, FastAPI, scikit-learn |
| Upload | Multer |

## 📡 API Endpoints

### Auth
- `POST /api/auth/register` – Register user
- `POST /api/auth/login` – Login
- `GET /api/auth/me` – Current user

### Issues
- `POST /api/issues` – Create issue (multipart)
- `GET /api/issues` – List issues
- `GET /api/issues/mine` – My issues
- `GET /api/issues/:id` – Single issue
- `PATCH /api/issues/:id/status` – Update status
- `POST /api/issues/:id/upvote` – Toggle upvote
- `POST /api/issues/:id/comments` – Add comment

### Admin
- `GET /api/admin/analytics` – Dashboard data
- `GET /api/admin/issues` – All issues
- `PATCH /api/admin/issues/:id/assign` – Assign worker
- `PATCH /api/admin/issues/:id/escalate` – Escalate

### Worker
- `GET /api/worker/tasks` – Assigned tasks
- `PATCH /api/worker/tasks/:id/resolve` – Resolve with proof

### AI Service
- `POST /api/analyze-text` – Classify text
- `POST /api/priority-score` – Calculate priority
- `POST /api/check-duplicate` – Duplicate detection
- `POST /api/cluster-issues` – Geo clustering
- `POST /api/chatbot` – Chatbot response

## 🔐 Security
- JWT authentication on all protected routes
- Role-based access control (citizen/admin/worker)
- Password hashing with bcrypt (12 rounds)
- Rate limiting (200 req/15min)
- Input validation
- CORS configured

## 📄 License
MIT
