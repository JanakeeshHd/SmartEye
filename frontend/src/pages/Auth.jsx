import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiMail, HiLockClosed, HiUser, HiPhone, HiEye, HiEyeOff } from 'react-icons/hi';

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'citizen', phone: '', department: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        const data = await login(form.email, form.password);
        navigate(data.user.role === 'admin' ? '/admin' : data.user.role === 'worker' ? '/worker' : '/my-issues');
      } else {
        const data = await register(form);
        navigate(data.user.role === 'admin' ? '/admin' : data.user.role === 'worker' ? '/worker' : '/my-issues');
      }
    } catch (err) {
      setError(err.message);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16 bg-mesh">
      <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl"></div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="glass-card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl mb-4 overflow-hidden shadow-xl border-2 border-white/20">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Smarteye Logo" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-2xl font-bold text-white">{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="text-dark-400 text-sm mt-1">{mode === 'login' ? 'Sign in to your Smarteye account' : 'Join Smarteye to report and track issues'}</p>
          </div>



          {error && (
            <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="relative">
                  <HiUser className="absolute left-3 top-3.5 text-dark-400 w-5 h-5" />
                  <input type="text" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input-field pl-10" required />
                </div>
                <div className="relative">
                  <HiPhone className="absolute left-3 top-3.5 text-dark-400 w-5 h-5" />
                  <input type="tel" placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input-field pl-10" />
                </div>
                <div>
                  <label className="text-sm text-dark-400 mb-1 block">Account Type</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="input-field">
                    <option value="citizen">Citizen</option>
                    <option value="worker">Worker (Department Staff)</option>
                  </select>
                </div>
                {form.role === 'worker' && (
                  <input type="text" placeholder="Department Name" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="input-field" />
                )}
              </>
            )}

            <div className="relative">
              <HiMail className="absolute left-3 top-3.5 text-dark-400 w-5 h-5" />
              <input type="email" placeholder="Email Address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field pl-10" required />
            </div>

            <div className="relative">
              <HiLockClosed className="absolute left-3 top-3.5 text-dark-400 w-5 h-5" />
              <input type={showPass ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-field pl-10 pr-10" required />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3.5 text-dark-400 hover:text-dark-200">
                {showPass ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
              </button>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Processing...
                </span>
              ) : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-dark-400 text-sm mt-6">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-primary-400 hover:text-primary-300 font-medium ml-1">{mode === 'login' ? 'Sign Up' : 'Sign In'}</button>
          </p>
        </div>
      </div>
    </div>
  );
}
