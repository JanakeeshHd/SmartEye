import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiLightningBolt, HiLocationMarker, HiChatAlt2, HiChartBar, HiShieldCheck, HiClock } from 'react-icons/hi';

const features = [
  { icon: <HiLightningBolt />, title: 'AI-Powered Detection', desc: 'Automatically classifies issues from images and text using advanced AI' },
  { icon: <HiLocationMarker />, title: 'GPS Auto-Location', desc: 'Pinpoint issue locations with automatic GPS detection and interactive maps' },
  { icon: <HiChatAlt2 />, title: 'Smart Chatbot', desc: 'AI assistant helps you report and track issues with natural conversation' },
  { icon: <HiChartBar />, title: 'Real-Time Analytics', desc: 'Live dashboards with trends, heatmaps, and department performance tracking' },
  { icon: <HiShieldCheck />, title: 'Auto-Assignment', desc: 'Issues automatically routed to the right department using AI classification' },
  { icon: <HiClock />, title: 'SLA Tracking', desc: 'Monitor resolution times with automated escalation for delayed issues' },
];

const stats = [
  { value: '10K+', label: 'Issues Resolved' },
  { value: '95%', label: 'Resolution Rate' },
  { value: '<48h', label: 'Avg Response' },
  { value: '50+', label: 'Departments' },
];

const categories = [
  { emoji: '🕳️', name: 'Potholes', color: 'from-orange-500 to-red-500' },
  { emoji: '🗑️', name: 'Garbage', color: 'from-green-500 to-emerald-600' },
  { emoji: '💧', name: 'Water Leaks', color: 'from-blue-500 to-cyan-500' },
  { emoji: '💡', name: 'Streetlights', color: 'from-yellow-500 to-amber-500' },
  { emoji: '🌊', name: 'Drainage', color: 'from-teal-500 to-blue-600' },
  { emoji: '⚡', name: 'Electricity', color: 'from-purple-500 to-pink-500' },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 md:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-mesh"></div>
        
        {/* Floating orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
        
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="flex justify-center mb-6 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center p-0.5 overflow-hidden shadow-2xl border-2 border-white/20">
              <img src="/logo.png" alt="Smarteye Logo" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 glass-light rounded-full text-sm text-primary-300 mb-8 animate-fade-in">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            AI-Powered Civic Management Platform
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 animate-slide-up">
            <span className="text-white">Smart City</span>
            <br />
            <span className="gradient-text">Issue Reporting</span>
          </h1>
          
          <p className="text-lg md:text-xl text-dark-300 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Report civic issues instantly with AI-powered detection. Track resolution in real-time. 
            Make your city better, one report at a time.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <Link to={user ? '/report' : '/auth'} className="btn-primary text-lg px-8 py-4 flex items-center justify-center gap-2">
              <HiLightningBolt className="w-5 h-5" /> Report an Issue
            </Link>
            <Link to="/map" className="btn-secondary text-lg px-8 py-4 flex items-center justify-center gap-2">
              <HiLocationMarker className="w-5 h-5" /> View Map
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 px-4 md:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="glass-card p-6 text-center animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <h3 className="text-3xl md:text-4xl font-black gradient-text">{stat.value}</h3>
              <p className="text-dark-400 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Report <span className="gradient-text">Any Issue</span>
          </h2>
          <p className="text-dark-400 text-center mb-12 max-w-xl mx-auto">Our AI automatically detects and categorizes civic issues from your photos and descriptions</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat, i) => (
              <div key={i} className="glass-card p-6 text-center group cursor-pointer animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform`}>
                  {cat.emoji}
                </div>
                <p className="text-sm font-medium text-dark-200">{cat.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Powered by <span className="gradient-text">Advanced AI</span>
          </h2>
          <p className="text-dark-400 text-center mb-12 max-w-xl mx-auto">Cutting-edge technology for smarter city management</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, i) => (
              <div key={i} className="glass-card p-8 group animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="w-12 h-12 rounded-xl bg-primary-500/20 text-primary-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feat.title}</h3>
                <p className="text-dark-400 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How It <span className="gradient-text">Works</span>
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Report', desc: 'Upload photo, describe issue, or use voice input', icon: '📸' },
              { step: '02', title: 'AI Detects', desc: 'Our AI classifies the issue type & priority', icon: '🤖' },
              { step: '03', title: 'Auto-Assign', desc: 'Routed to the right department automatically', icon: '🏢' },
              { step: '04', title: 'Resolved', desc: 'Track progress and get real-time updates', icon: '✅' },
            ].map((item, i) => (
              <div key={i} className="text-center animate-slide-up" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="w-16 h-16 mx-auto rounded-2xl glass-card flex items-center justify-center text-3xl mb-4 hover:scale-110 transition-transform">{item.icon}</div>
                <span className="text-xs font-bold text-primary-400">STEP {item.step}</span>
                <h3 className="text-lg font-bold text-white mt-1 mb-2">{item.title}</h3>
                <p className="text-dark-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto text-center glass-card p-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to make your city better?</h2>
          <p className="text-dark-400 mb-8">Join thousands of citizens using AI to improve civic infrastructure</p>
          <Link to={user ? '/report' : '/auth'} className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-2">
            <HiLightningBolt /> Get Started — It's Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-dark-800 text-center text-dark-500 text-sm">
        <p>© 2024 Smarteye — Smart Civic Issue Reporting & Management System</p>
      </footer>
    </div>
  );
}
