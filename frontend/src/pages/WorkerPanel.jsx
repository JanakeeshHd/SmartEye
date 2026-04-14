import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { workerAPI, connectSocket } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiClock, HiCheck, HiCamera, HiLocationMarker, HiEye, HiRefresh } from 'react-icons/hi';

const CATEGORY_EMOJIS = { 'pothole': '🕳️', 'garbage': '🗑️', 'water-leakage': '💧', 'broken-streetlight': '💡', 'drainage': '🌊', 'electricity': '⚡', 'road-damage': '🛣️', 'other': '📋' };

export default function WorkerPanel() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [resolveModal, setResolveModal] = useState(null);
  const [proofFiles, setProofFiles] = useState([]);
  const [proofPreviews, setProofPreviews] = useState([]);
  const [resolving, setResolving] = useState(false);
  const fileRef = useRef();
  const refreshTimerRef = useRef(null);

  const loadTasks = (silent = false) => {
    if (!silent) setLoading(true);
    workerAPI.getTasks()
      .then(r => setTasks(r.data))
      .finally(() => { if (!silent) setLoading(false); });
  };

  useEffect(() => { loadTasks(); }, []);

  useEffect(() => {
    if (!user?.id) return;
    const socket = connectSocket(user.id);

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) return;
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        loadTasks(true);
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

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const counts = tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});

  const handleProofFiles = (e) => {
    const files = Array.from(e.target.files).slice(0, 3);
    setProofFiles(files);
    setProofPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const handleResolve = async () => {
    if (!resolveModal) return;
    setResolving(true);
    try {
      const formData = new FormData();
      formData.append('status', 'resolved');
      proofFiles.forEach(f => formData.append('proof', f));
      await workerAPI.resolveTask(resolveModal, formData);
      setResolveModal(null);
      setProofFiles([]);
      setProofPreviews([]);
      loadTasks();
    } catch (err) {
      alert('Failed to resolve task');
    }
    setResolving(false);
  };

  return (
    <div className="page-container">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="section-title flex items-center gap-2">👷 Worker Panel</h1>
          <p className="text-dark-400 mt-1">{tasks.length} assigned tasks</p>
        </div>
        <button onClick={() => loadTasks(false)} className="btn-secondary flex items-center gap-2"><HiRefresh /> Refresh</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{counts['in-progress'] || 0}</p>
          <p className="text-xs text-dark-400">In Progress</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{counts['resolved'] || 0}</p>
          <p className="text-xs text-dark-400">Resolved</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{counts['escalated'] || 0}</p>
          <p className="text-xs text-dark-400">Escalated</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {[{ key: 'all', label: 'All' }, { key: 'in-progress', label: 'In Progress' }, { key: 'resolved', label: 'Resolved' }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f.key ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' : 'glass-light text-dark-300 hover:text-white'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <p className="text-5xl mb-4">✅</p>
          <h3 className="text-xl font-semibold text-white mb-2">No tasks</h3>
          <p className="text-dark-400">{filter === 'all' ? 'No tasks assigned to you yet.' : `No ${filter} tasks.`}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(task => (
            <div key={task._id} className="glass-card p-5 animate-slide-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/15 flex items-center justify-center text-2xl shrink-0">
                    {CATEGORY_EMOJIS[task.category]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white">{task.title}</h3>
                    <p className="text-dark-400 text-sm mt-1 truncate">{task.description}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-dark-400">
                      <span className="flex items-center gap-1"><HiLocationMarker className="w-3.5 h-3.5" />{task.location?.address?.slice(0, 40)}</span>
                      <span className="flex items-center gap-1"><HiClock className="w-3.5 h-3.5" />{new Date(task.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <span className={`badge-${task.severity}`}>{task.severity}</span>
                      <span className={`badge-${task.status}`}>{task.status}</span>
                      <span className="badge bg-primary-500/15 text-primary-400 border-primary-500/30 border">Score: {task.priorityScore}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link to={`/issue/${task._id}`} className="btn-secondary px-4 py-2 flex items-center gap-1 text-sm">
                    <HiEye className="w-4 h-4" /> View
                  </Link>
                  {task.status !== 'resolved' && (
                    <button onClick={() => setResolveModal(task._id)} className="btn-success px-4 py-2 flex items-center gap-1 text-sm">
                      <HiCheck className="w-4 h-4" /> Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setResolveModal(null)}>
          <div className="glass-card p-6 w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Mark as Resolved</h3>
            <p className="text-dark-400 text-sm mb-4">Upload proof images to confirm resolution</p>

            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-dark-600 hover:border-primary-500 rounded-xl p-6 text-center cursor-pointer transition-all mb-4">
              <HiCamera className="w-8 h-8 mx-auto text-dark-400 mb-2" />
              <p className="text-dark-300 text-sm">Upload proof images</p>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleProofFiles} />
            </div>

            {proofPreviews.length > 0 && (
              <div className="flex gap-2 mb-4">
                {proofPreviews.map((url, i) => <img key={i} src={url} alt="" className="w-20 h-20 rounded-xl object-cover" />)}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setResolveModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleResolve} disabled={resolving} className="btn-success flex-1">
                {resolving ? 'Resolving...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
