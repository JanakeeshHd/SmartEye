import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { issueAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiThumbUp, HiLocationMarker, HiClock, HiUser, HiChat, HiStar, HiArrowLeft, HiShieldCheck } from 'react-icons/hi';

const CATEGORY_EMOJIS = { 'pothole': '🕳️', 'garbage': '🗑️', 'water-leakage': '💧', 'broken-streetlight': '💡', 'drainage': '🌊', 'electricity': '⚡', 'road-damage': '🛣️', 'other': '📋' };
const STATUS_STEPS = ['submitted', 'in-progress', 'resolved'];

export default function IssueDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ rating: 5, text: '' });
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    Promise.all([
      issueAPI.getById(id).then(r => setIssue(r.data)),
      issueAPI.getComments(id).then(r => setComments(r.data))
    ]).finally(() => setLoading(false));
  }, [id]);

  const handleUpvote = async () => {
    if (!user) return;
    const res = await issueAPI.upvote(id);
    setIssue(i => ({ ...i, upvotes: res.data.hasUpvoted ? [...(i.upvotes || []), user.id] : (i.upvotes || []).filter(u => u !== user.id) }));
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const res = await issueAPI.addComment(id, comment);
    setComments(c => [res.data, ...c]);
    setComment('');
  };

  const handleFeedback = async () => {
    await issueAPI.addFeedback(id, { rating: feedback.rating, feedback: feedback.text });
    setIssue(i => ({ ...i, rating: feedback.rating, feedback: feedback.text }));
    setShowFeedback(false);
  };

  if (loading) return <div className="page-container flex justify-center pt-40"><div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!issue) return <div className="page-container text-center pt-40"><h2 className="text-2xl text-white">Issue not found</h2></div>;

  const currentStep = STATUS_STEPS.indexOf(issue.status === 'escalated' ? 'in-progress' : issue.status);
  const hasUpvoted = user && issue.upvotes?.includes(user.id);

  return (
    <div className="page-container">
      <Link to={user?.role === 'admin' ? '/admin/issues' : '/my-issues'} className="inline-flex items-center gap-2 text-dark-400 hover:text-primary-400 mb-6 text-sm transition-colors">
        <HiArrowLeft className="w-4 h-4" /> Back to issues
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 animate-slide-up">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-primary-500/15 flex items-center justify-center text-3xl shrink-0">
                {CATEGORY_EMOJIS[issue.category] || '📋'}
              </div>
              <div className="flex-1">
                <h1 className="text-xl md:text-2xl font-bold text-white">{issue.title}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`badge-${issue.severity}`}>{issue.severity}</span>
                  <span className={`badge-${issue.status}`}>{issue.status}</span>
                  {issue.status === 'escalated' && <span className="badge-escalated">⚠️ Escalated</span>}
                </div>
              </div>
            </div>

            <p className="text-dark-200 leading-relaxed mb-6">{issue.description}</p>

            {/* Images */}
            {issue.images?.length > 0 && (
              <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
                {issue.images.map((img, i) => (
                  <img key={i} src={`http://localhost:5000${img}`} alt="" className="w-40 h-40 object-cover rounded-xl shrink-0" />
                ))}
              </div>
            )}

            {/* Status timeline */}
            <div className="glass-light rounded-xl p-5">
              <h3 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2"><HiShieldCheck className="w-5 h-5 text-primary-400" /> Status Timeline</h3>
              <div className="flex items-center">
                {STATUS_STEPS.map((s, i) => (
                  <div key={s} className="flex items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all
                      ${i <= currentStep ? 'bg-emerald-500 text-white' : 'bg-dark-700 text-dark-400'}`}>
                      {i < currentStep ? '✓' : i + 1}
                    </div>
                    <span className={`ml-2 text-xs font-medium capitalize hidden sm:block ${i <= currentStep ? 'text-emerald-400' : 'text-dark-500'}`}>{s}</span>
                    {i < STATUS_STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 rounded ${i < currentStep ? 'bg-emerald-500' : 'bg-dark-700'}`}></div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Upvote & Actions */}
            <div className="flex items-center gap-4 mt-6">
              <button onClick={handleUpvote} disabled={!user}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${hasUpvoted ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'glass-light text-dark-300 hover:text-white'}`}>
                <HiThumbUp className="w-5 h-5" /> {issue.upvotes?.length || 0} Upvotes
              </button>
              {issue.status === 'resolved' && user && issue.reportedBy === user.id && !issue.rating && (
                <button onClick={() => setShowFeedback(true)} className="btn-secondary flex items-center gap-2">
                  <HiStar className="w-5 h-5" /> Give Feedback
                </button>
              )}
            </div>

            {/* Feedback form */}
            {showFeedback && (
              <div className="glass-light rounded-xl p-5 mt-4 animate-slide-up">
                <h4 className="text-sm font-semibold text-white mb-3">Rate Resolution</h4>
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onClick={() => setFeedback(f => ({ ...f, rating: s }))}
                      className={`text-2xl transition-transform hover:scale-125 ${s <= feedback.rating ? 'text-yellow-400' : 'text-dark-600'}`}>★</button>
                  ))}
                </div>
                <textarea value={feedback.text} onChange={e => setFeedback(f => ({ ...f, text: e.target.value }))}
                  placeholder="Share your experience..." className="input-field min-h-[80px] resize-none mb-3" />
                <button onClick={handleFeedback} className="btn-primary">Submit Feedback</button>
              </div>
            )}

            {/* Existing feedback */}
            {issue.rating && (
              <div className="glass-light rounded-xl p-5 mt-4">
                <h4 className="text-sm font-semibold text-white mb-2">Citizen Feedback</h4>
                <div className="flex gap-0.5 mb-2">{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${s <= issue.rating ? 'text-yellow-400' : 'text-dark-600'}`}>★</span>)}</div>
                {issue.feedback && <p className="text-sm text-dark-300">{issue.feedback}</p>}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><HiChat className="w-5 h-5 text-primary-400" /> Comments ({comments.length})</h3>
            
            {user && (
              <form onSubmit={handleComment} className="flex gap-2 mb-6">
                <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..."
                  className="input-field flex-1" />
                <button type="submit" disabled={!comment.trim()} className="btn-primary px-4">Post</button>
              </form>
            )}

            <div className="space-y-4">
              {comments.map(c => (
                <div key={c._id} className="flex gap-3">
                  <img src={c.userAvatar} alt="" className="w-8 h-8 rounded-full shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{c.userName}</span>
                      <span className="text-xs text-dark-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-dark-300 mt-0.5">{c.text}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && <p className="text-dark-500 text-sm text-center py-4">No comments yet</p>}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h3 className="text-sm font-semibold text-dark-200 mb-4">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-dark-400">Priority Score</span><span className="text-primary-400 font-bold text-lg">{issue.priorityScore}/100</span></div>
              <div className="w-full bg-dark-700 rounded-full h-2"><div className="bg-gradient-to-r from-primary-600 to-purple-500 h-2 rounded-full transition-all" style={{ width: `${issue.priorityScore}%` }}></div></div>
              <div className="flex justify-between"><span className="text-dark-400">Department</span><span className="text-dark-200">{issue.department}</span></div>
              <div className="flex justify-between"><span className="text-dark-400">AI Confidence</span><span className="text-dark-200">{Math.round((issue.aiAnalysis?.confidence || 0) * 100)}%</span></div>
              <div className="flex justify-between"><span className="text-dark-400">SLA Deadline</span><span className="text-dark-200">{issue.slaDeadline ? new Date(issue.slaDeadline).toLocaleDateString() : 'N/A'}</span></div>
              {issue.assignedToName && <div className="flex justify-between"><span className="text-dark-400">Assigned To</span><span className="text-dark-200">{issue.assignedToName}</span></div>}
            </div>
          </div>

          <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-sm font-semibold text-dark-200 mb-3 flex items-center gap-2"><HiLocationMarker className="w-4 h-4 text-primary-400" /> Location</h3>
            <p className="text-dark-300 text-sm">{issue.location?.address || 'Not specified'}</p>
            {issue.location?.lat !== 0 && (
              <p className="text-xs text-dark-500 mt-1">{issue.location.lat.toFixed(4)}, {issue.location.lng.toFixed(4)}</p>
            )}
          </div>

          <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <h3 className="text-sm font-semibold text-dark-200 mb-3 flex items-center gap-2"><HiUser className="w-4 h-4 text-primary-400" /> Reported By</h3>
            <p className="text-dark-200 text-sm">{issue.reportedByName}</p>
            <p className="text-xs text-dark-500 mt-1 flex items-center gap-1"><HiClock className="w-3.5 h-3.5" />{new Date(issue.createdAt).toLocaleString()}</p>
          </div>

          {/* Resolution proof */}
          {issue.resolutionProof?.length > 0 && (
            <div className="glass-card p-5 animate-slide-up">
              <h3 className="text-sm font-semibold text-dark-200 mb-3">Resolution Proof</h3>
              <div className="grid grid-cols-2 gap-2">
                {issue.resolutionProof.map((img, i) => (
                  <img key={i} src={`http://localhost:5000${img}`} alt="Proof" className="w-full aspect-square object-cover rounded-xl" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
