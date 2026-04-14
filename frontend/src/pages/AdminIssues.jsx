import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI, authAPI, connectSocket } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiEye, HiUserAdd, HiExclamation, HiFilter, HiArrowLeft, HiRefresh } from 'react-icons/hi';

const CATEGORY_EMOJIS = { 'pothole': '🕳️', 'garbage': '🗑️', 'water-leakage': '💧', 'broken-streetlight': '💡', 'drainage': '🌊', 'electricity': '⚡', 'road-damage': '🛣️', 'other': '📋' };

export default function AdminIssues() {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', category: '', severity: '' });
  const [assignModal, setAssignModal] = useState(null); // issue ID
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    authAPI.getUsers('worker').then(r => setWorkers(r.data)).catch(() => {});
  }, []);
  
  useEffect(() => { loadData(false); }, [filter]);

  const loadData = (silent = false) => {
    if (!silent) setLoading(true);
    adminAPI.getIssues(filter)
      .then(r => setIssues(r.data.issues || []))
      .finally(() => { if (!silent) setLoading(false); });
  };

  const handleAssign = async (issueId, worker) => {
    await adminAPI.assignIssue(issueId, { workerId: worker.id, workerName: worker.name });
    setAssignModal(null);
    loadData(false);
  };

  const handleEscalate = async (issueId) => {
    if (!confirm('Escalate this issue?')) return;
    await adminAPI.escalateIssue(issueId);
    loadData(false);
  };

  useEffect(() => {
    if (!user?.id) return;
    const socket = connectSocket(user.id);

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) return;
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        loadData(true);
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
  }, [user?.id, filter]);

  return (
    <div className="page-container">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-1 text-dark-400 hover:text-primary-400 text-sm mb-2 transition-colors">
            <HiArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <h1 className="section-title">Issue Management</h1>
        </div>
        <button onClick={() => loadData(false)} className="btn-secondary flex items-center gap-2"><HiRefresh className="w-4 h-4" /> Refresh</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))} className="input-field py-2 text-sm w-auto">
          <option value="">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
        </select>
        <select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))} className="input-field py-2 text-sm w-auto">
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_EMOJIS).map(([k, v]) => <option key={k} value={k}>{v} {k.replace(/-/g, ' ')}</option>)}
        </select>
        <select value={filter.severity} onChange={e => setFilter(f => ({ ...f, severity: e.target.value }))} className="input-field py-2 text-sm w-auto">
          <option value="">All Severity</option>
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left p-4 text-dark-400 font-medium">Issue</th>
                  <th className="text-left p-4 text-dark-400 font-medium hidden md:table-cell">Category</th>
                  <th className="text-left p-4 text-dark-400 font-medium">Severity</th>
                  <th className="text-left p-4 text-dark-400 font-medium hidden lg:table-cell">Priority</th>
                  <th className="text-left p-4 text-dark-400 font-medium">Status</th>
                  <th className="text-left p-4 text-dark-400 font-medium hidden lg:table-cell">Assigned</th>
                  <th className="text-left p-4 text-dark-400 font-medium hidden md:table-cell">Date</th>
                  <th className="text-right p-4 text-dark-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.map(issue => (
                  <tr key={issue._id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{CATEGORY_EMOJIS[issue.category]}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-dark-200 truncate max-w-[200px]">{issue.title}</p>
                          <p className="text-xs text-dark-500 truncate max-w-[200px]">{issue.location?.address}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell"><span className="text-dark-300 capitalize">{issue.category?.replace(/-/g, ' ')}</span></td>
                    <td className="p-4"><span className={`badge-${issue.severity}`}>{issue.severity}</span></td>
                    <td className="p-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-dark-700 rounded-full h-1.5">
                          <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${issue.priorityScore}%` }}></div>
                        </div>
                        <span className="text-xs text-primary-400 font-medium">{issue.priorityScore}</span>
                      </div>
                    </td>
                    <td className="p-4"><span className={`badge-${issue.status}`}>{issue.status}</span></td>
                    <td className="p-4 hidden lg:table-cell">
                      <span className="text-dark-300 text-xs">{issue.assignedToName || 'Unassigned'}</span>
                    </td>
                    <td className="p-4 hidden md:table-cell"><span className="text-dark-500 text-xs">{new Date(issue.createdAt).toLocaleDateString()}</span></td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 justify-end">
                        <Link to={`/issue/${issue._id}`} className="p-2 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-all" title="View">
                          <HiEye className="w-4 h-4" />
                        </Link>
                        {!issue.assignedTo && (
                          <button onClick={() => setAssignModal(issue._id)} className="p-2 rounded-lg text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Assign">
                            <HiUserAdd className="w-4 h-4" />
                          </button>
                        )}
                        {issue.status !== 'resolved' && issue.status !== 'escalated' && (
                          <button onClick={() => handleEscalate(issue._id)} className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Escalate">
                            <HiExclamation className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {issues.length === 0 && <p className="text-center text-dark-500 py-10">No issues found</p>}
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setAssignModal(null)}>
          <div className="glass-card p-6 w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Assign to Worker</h3>
            {workers.length === 0 ? (
              <p className="text-dark-400 text-sm">No workers available. Create a worker account first.</p>
            ) : (
              <div className="space-y-2">
                {workers.map(w => (
                  <button key={w.id} onClick={() => handleAssign(assignModal, w)}
                    className="w-full flex items-center gap-3 p-3 glass-light rounded-xl hover:bg-primary-500/10 transition-all text-left">
                    <img src={w.avatar} alt="" className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="text-sm font-medium text-white">{w.name}</p>
                      <p className="text-xs text-dark-400">{w.department || 'General'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setAssignModal(null)} className="btn-secondary w-full mt-4">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
