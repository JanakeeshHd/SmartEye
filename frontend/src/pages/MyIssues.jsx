import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { connectSocket, issueAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiEye, HiThumbUp, HiFilter, HiLocationMarker, HiClock, HiPlus } from 'react-icons/hi';

const CATEGORY_EMOJIS = { 'pothole': '🕳️', 'garbage': '🗑️', 'water-leakage': '💧', 'broken-streetlight': '💡', 'drainage': '🌊', 'electricity': '⚡', 'road-damage': '🛣️', 'other': '📋' };

export default function MyIssues() {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const refreshTimerRef = useRef(null);

  const loadMine = (silent = false) => {
    if (!silent) setLoading(true);
    issueAPI.getMine()
      .then(r => setIssues(r.data))
      .finally(() => { if (!silent) setLoading(false); });
  };

  useEffect(() => { loadMine(false); }, []);

  useEffect(() => {
    if (!user?.id) return;
    const socket = connectSocket(user.id);

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) return;
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        loadMine(true);
      }, 350);
    };

    socket.on('issues:changed', scheduleRefresh);

    return () => {
      socket.off('issues:changed', scheduleRefresh);
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [user?.id]);

  const filtered = filter === 'all' ? issues : issues.filter(i => i.status === filter);
  const statusCounts = issues.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {});

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="section-title">My Issues</h1>
          <p className="text-dark-400 mt-1">{issues.length} total reports</p>
        </div>
        <Link to="/report" className="btn-primary flex items-center gap-2">
          <HiPlus className="w-5 h-5" /> Report New Issue
        </Link>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[{ key: 'all', label: 'All' }, { key: 'submitted', label: 'Submitted' }, { key: 'in-progress', label: 'In Progress' }, { key: 'resolved', label: 'Resolved' }, { key: 'escalated', label: 'Escalated' }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f.key ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' : 'glass-light text-dark-300 hover:text-white'}`}>
            {f.label} {f.key === 'all' ? `(${issues.length})` : statusCounts[f.key] ? `(${statusCounts[f.key]})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <p className="text-5xl mb-4">📋</p>
          <h3 className="text-xl font-semibold text-white mb-2">No issues found</h3>
          <p className="text-dark-400 mb-6">{filter === 'all' ? "You haven't reported any issues yet." : `No ${filter} issues.`}</p>
          <Link to="/report" className="btn-primary inline-flex items-center gap-2"><HiPlus /> Report Your First Issue</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(issue => (
            <Link key={issue._id} to={`/issue/${issue._id}`} className="glass-card p-5 flex flex-col md:flex-row md:items-center gap-4 group">
              {/* Category icon */}
              <div className="w-12 h-12 shrink-0 rounded-xl bg-primary-500/15 flex items-center justify-center text-2xl">
                {CATEGORY_EMOJIS[issue.category] || '📋'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white group-hover:text-primary-300 transition-colors truncate">{issue.title}</h3>
                <p className="text-dark-400 text-sm mt-1 truncate">{issue.description}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-dark-400">
                  <span className="flex items-center gap-1"><HiLocationMarker className="w-3.5 h-3.5" />{issue.location?.address?.slice(0, 40)}</span>
                  <span className="flex items-center gap-1"><HiClock className="w-3.5 h-3.5" />{new Date(issue.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 shrink-0">
                <span className={`badge-${issue.severity}`}>{issue.severity}</span>
                <span className={`badge-${issue.status}`}>{issue.status}</span>
                <span className="flex items-center gap-1 text-dark-400 text-sm">
                  <HiThumbUp className="w-4 h-4" /> {issue.upvotes?.length || 0}
                </span>
                <HiEye className="w-5 h-5 text-dark-500 group-hover:text-primary-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
