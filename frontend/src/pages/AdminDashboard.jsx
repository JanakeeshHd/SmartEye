import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI, connectSocket } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiTrendingUp, HiClock, HiExclamation, HiCheckCircle, HiClipboardList, HiChartBar, HiDocumentReport } from 'react-icons/hi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const chartColors = {
  primary: 'rgba(99, 102, 241, 0.8)', primaryBg: 'rgba(99, 102, 241, 0.15)',
  purple: 'rgba(168, 85, 247, 0.8)', green: 'rgba(16, 185, 129, 0.8)',
  amber: 'rgba(245, 158, 11, 0.8)', red: 'rgba(239, 68, 68, 0.8)',
  blue: 'rgba(59, 130, 246, 0.8)', cyan: 'rgba(6, 182, 212, 0.8)',
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(51, 65, 85, 0.5)' } },
    y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(51, 65, 85, 0.3)' } },
  }
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);

  const loadAnalytics = (silent = false) => {
    if (!silent) setLoading(true);
    adminAPI.getAnalytics()
      .then(r => setAnalytics(r.data))
      .finally(() => { if (!silent) setLoading(false); });
  };

  useEffect(() => { loadAnalytics(false); }, []);

  useEffect(() => {
    if (!user?.id) return;
    const socket = connectSocket(user.id);

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) return;
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        loadAnalytics(true);
      }, 400);
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

  if (loading) return <div className="page-container flex justify-center pt-40"><div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!analytics) return <div className="page-container"><p className="text-red-400">Failed to load analytics</p></div>;

  const { overview, categoryCounts, severityCounts, weeklyTrend, departmentPerformance, topAreas } = analytics;

  return (
    <div className="page-container">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="section-title flex items-center gap-2"><HiChartBar /> Admin Dashboard</h1>
          <p className="text-dark-400 mt-1">AI-powered analytics & issue management</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/issues" className="btn-primary flex items-center gap-2"><HiClipboardList /> Manage Issues</Link>
          <Link to="/map" className="btn-secondary flex items-center gap-2">🗺️ Map View</Link>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        {[
          { label: 'Total Issues', value: overview.total, icon: <HiClipboardList />, color: 'text-primary-400', bg: 'bg-primary-500/15' },
          { label: 'Submitted', value: overview.submitted, icon: <HiDocumentReport />, color: 'text-blue-400', bg: 'bg-blue-500/15' },
          { label: 'In Progress', value: overview.inProgress, icon: <HiClock />, color: 'text-amber-400', bg: 'bg-amber-500/15' },
          { label: 'Resolved', value: overview.resolved, icon: <HiCheckCircle />, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
          { label: 'Escalated', value: overview.escalated, icon: <HiExclamation />, color: 'text-red-400', bg: 'bg-red-500/15' },
          { label: 'Overdue', value: overview.overdue, icon: <HiExclamation />, color: 'text-orange-400', bg: 'bg-orange-500/15' },
          { label: 'Avg Resolution', value: `${overview.avgResolutionTime}h`, icon: <HiTrendingUp />, color: 'text-purple-400', bg: 'bg-purple-500/15' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-4 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center text-xl mb-3`}>{stat.icon}</div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-dark-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Weekly Trend */}
        <div className="glass-card p-6 lg:col-span-2 animate-slide-up">
          <h3 className="text-sm font-semibold text-dark-200 mb-4">📈 Weekly Issue Trend</h3>
          <div style={{ height: '250px' }}>
            <Line data={{
              labels: weeklyTrend?.map(d => d.date?.slice(5)) || [],
              datasets: [{
                label: 'Issues', data: weeklyTrend?.map(d => d.count) || [],
                borderColor: chartColors.primary, backgroundColor: chartColors.primaryBg,
                tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: chartColors.primary,
              }]
            }} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }} />
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-sm font-semibold text-dark-200 mb-4">🎯 Severity Distribution</h3>
          <div style={{ height: '250px' }} className="flex items-center justify-center">
            <Doughnut data={{
              labels: ['High', 'Medium', 'Low'],
              datasets: [{ data: [severityCounts?.high || 0, severityCounts?.medium || 0, severityCounts?.low || 0],
                backgroundColor: [chartColors.red, chartColors.amber, chartColors.green],
                borderWidth: 0,
              }]
            }} options={{ ...chartOptions, scales: {}, cutout: '65%' }} />
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Category Distribution */}
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-sm font-semibold text-dark-200 mb-4">📊 Issues by Category</h3>
          <div style={{ height: '280px' }}>
            <Bar data={{
              labels: Object.keys(categoryCounts || {}).map(k => k.replace(/-/g, ' ')),
              datasets: [{
                label: 'Count', data: Object.values(categoryCounts || {}),
                backgroundColor: [chartColors.red, chartColors.green, chartColors.blue, chartColors.amber, chartColors.cyan, chartColors.purple, chartColors.primary],
                borderRadius: 8,
              }]
            }} options={{ ...chartOptions, indexAxis: 'y', plugins: { ...chartOptions.plugins, legend: { display: false } } }} />
          </div>
        </div>

        {/* Department Performance */}
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <h3 className="text-sm font-semibold text-dark-200 mb-4">🏢 Department Performance</h3>
          <div className="space-y-3">
            {(departmentPerformance || []).map((dept, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-dark-300 truncate mr-2">{dept.name}</span>
                  <span className="text-dark-400 shrink-0">{dept.resolved}/{dept.total} ({dept.rate}%)</span>
                </div>
                <div className="w-full bg-dark-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-primary-600 to-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${dept.rate}%` }}></div>
                </div>
              </div>
            ))}
            {(departmentPerformance || []).length === 0 && <p className="text-sm text-dark-500 text-center py-4">No department data</p>}
          </div>
        </div>
      </div>

      {/* Top Areas */}
      <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <h3 className="text-sm font-semibold text-dark-200 mb-4">📍 Top Problem Areas</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
          {(topAreas || []).map((area, i) => (
            <div key={i} className="glass-light rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-primary-400">{area.count}</p>
              <p className="text-xs text-dark-400 mt-1 truncate">{area.area}</p>
            </div>
          ))}
          {(topAreas || []).length === 0 && <p className="col-span-5 text-sm text-dark-500 text-center py-4">No area data yet</p>}
        </div>
      </div>
    </div>
  );
}
