import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import ReportIssue from './pages/ReportIssue';
import MyIssues from './pages/MyIssues';
import IssueDetail from './pages/IssueDetail';
import MapView from './pages/MapView';
import AdminDashboard from './pages/AdminDashboard';
import AdminIssues from './pages/AdminIssues';
import WorkerPanel from './pages/WorkerPanel';
import ChatbotWidget from './components/ChatbotWidget';
import './index.css';

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-dark-950 bg-mesh">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'worker' ? '/worker' : '/my-issues'} /> : <Auth />} />
        <Route path="/report" element={<ProtectedRoute roles={['citizen']}><ReportIssue /></ProtectedRoute>} />
        <Route path="/my-issues" element={<ProtectedRoute roles={['citizen']}><MyIssues /></ProtectedRoute>} />
        <Route path="/issue/:id" element={<IssueDetail />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/issues" element={<ProtectedRoute roles={['admin']}><AdminIssues /></ProtectedRoute>} />
        <Route path="/worker" element={<ProtectedRoute roles={['worker']}><WorkerPanel /></ProtectedRoute>} />
      </Routes>
      {user && <ChatbotWidget />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
