import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationAPI } from '../services/api';
import { HiMenu, HiX, HiBell, HiLogout, HiUser, HiMap, HiDocumentReport, HiHome, HiClipboardList, HiCog } from 'react-icons/hi';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState({ unreadCount: 0, notifications: [] });
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user) {
      notificationAPI.getAll().then(r => setNotifications(r.data)).catch(() => {});
      const interval = setInterval(() => {
        notificationAPI.getAll().then(r => setNotifications(r.data)).catch(() => {});
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = () => { logout(); navigate('/'); };
  const markRead = () => { notificationAPI.markRead().then(() => setNotifications(n => ({ ...n, unreadCount: 0 }))); };

  const navLinks = user ? (
    user.role === 'admin' ? [
      { to: '/admin', label: 'Dashboard', icon: <HiHome /> },
      { to: '/admin/issues', label: 'Manage Issues', icon: <HiClipboardList /> },
      { to: '/map', label: 'Map', icon: <HiMap /> },
    ] : user.role === 'worker' ? [
      { to: '/worker', label: 'My Tasks', icon: <HiClipboardList /> },
      { to: '/map', label: 'Map', icon: <HiMap /> },
    ] : [
      { to: '/report', label: 'Report Issue', icon: <HiDocumentReport /> },
      { to: '/my-issues', label: 'My Issues', icon: <HiClipboardList /> },
      { to: '/map', label: 'Map', icon: <HiMap /> },
    ]
  ) : [
    { to: '/map', label: 'Map', icon: <HiMap /> },
    { to: '/auth', label: 'Login', icon: <HiUser /> },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass shadow-2xl' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform overflow-hidden shadow-lg border border-white/10">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Smarteye Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-bold gradient-text hidden sm:block">Smarteye</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 
                ${location.pathname === link.to ? 'bg-primary-500/20 text-primary-300' : 'text-dark-300 hover:text-white hover:bg-dark-700/50'}`}>
                {link.icon} {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user && (
              <>
                {/* Notifications */}
                <div className="relative">
                  <button onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markRead(); }}
                    className="relative p-2 rounded-lg text-dark-300 hover:text-white hover:bg-dark-700/50 transition-all">
                    <HiBell className="w-5 h-5" />
                    {notifications.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white animate-pulse">
                        {notifications.unreadCount}
                      </span>
                    )}
                  </button>
                  {showNotifs && (
                    <div className="absolute right-0 mt-2 w-80 glass-card p-0 overflow-hidden animate-slide-up">
                      <div className="p-3 border-b border-dark-700">
                        <h4 className="font-semibold text-sm">Notifications</h4>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.notifications?.length > 0 ? notifications.notifications.slice(0, 8).map(n => (
                          <div key={n._id} className={`p-3 border-b border-dark-800/50 text-xs hover:bg-dark-700/30 cursor-pointer ${!n.read ? 'bg-primary-500/5' : ''}`}
                            onClick={() => { if (n.issueId) navigate(`/issue/${n.issueId}`); setShowNotifs(false); }}>
                            <p className="text-dark-200">{n.message}</p>
                            <p className="text-dark-500 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                          </div>
                        )) : (
                          <p className="p-4 text-sm text-dark-400 text-center">No notifications yet</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User menu */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg glass-light">
                  <img src={user.avatar} alt="" className="w-7 h-7 rounded-full" />
                  <div className="text-xs">
                    <p className="font-medium text-dark-200">{user.name}</p>
                    <p className="text-dark-400 capitalize">{user.role}</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Logout">
                  <HiLogout className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Mobile toggle */}
            <button className="md:hidden p-2 rounded-lg text-dark-300 hover:bg-dark-700/50" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <HiX className="w-6 h-6" /> : <HiMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass border-t border-dark-700 animate-slide-up">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                ${location.pathname === link.to ? 'bg-primary-500/20 text-primary-300' : 'text-dark-300 hover:text-white hover:bg-dark-700/50'}`}>
                {link.icon} {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
