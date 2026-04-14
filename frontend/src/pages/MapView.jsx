import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { connectSocket, issueAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiFilter, HiLocationMarker } from 'react-icons/hi';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const SEVERITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
const CATEGORY_EMOJIS = { 'pothole': '🕳️', 'garbage': '🗑️', 'water-leakage': '💧', 'broken-streetlight': '💡', 'drainage': '🌊', 'electricity': '⚡', 'road-damage': '🛣️', 'other': '📋' };

const createIcon = (severity) => {
  const color = SEVERITY_COLORS[severity] || '#6366f1';
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

function HeatmapLayer({ issues }) {
  const map = useMap();
  
  useEffect(() => {
    if (!issues.length) return;
    
    // Simple circle heatmap approach (works without leaflet.heat plugin)
    const circles = issues
      .filter(i => i.location?.lat && i.location?.lng && i.location.lat !== 0)
      .map(issue => {
        const intensity = issue.severity === 'high' ? 0.8 : issue.severity === 'medium' ? 0.5 : 0.3;
        return L.circle([issue.location.lat, issue.location.lng], {
          radius: 300,
          color: 'transparent',
          fillColor: SEVERITY_COLORS[issue.severity] || '#6366f1',
          fillOpacity: intensity * 0.25,
        });
      });
    
    const group = L.layerGroup(circles);
    group.addTo(map);
    return () => { map.removeLayer(group); };
  }, [map, issues]);

  return null;
}

export default function MapView() {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: '', severity: '', status: '' });
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [center, setCenter] = useState([12.9716, 77.5946]); // Default: Bengaluru
  const refreshTimerRef = useRef(null);
  const hasSetInitialCenterRef = useRef(false);

  const loadIssues = (silent = false) => {
    if (!silent) setLoading(true);
    issueAPI.getAll({ limit: 200 })
      .then(r => {
        const list = r.data.issues || [];
        setIssues(list);
        if (!hasSetInitialCenterRef.current && list.length > 0) {
          const first = list.find(i => i.location?.lat && i.location.lat !== 0);
          if (first) {
            setCenter([first.location.lat, first.location.lng]);
            hasSetInitialCenterRef.current = true;
          }
        }
      })
      .finally(() => { if (!silent) setLoading(false); });
  };

  useEffect(() => {
    loadIssues(false);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
        hasSetInitialCenterRef.current = true;
      }, () => {});
    }
  }, []);

  useEffect(() => {
    const socket = connectSocket(user?.id);

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) return;
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        loadIssues(true);
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

  const filtered = issues.filter(i => {
    if (filter.category && i.category !== filter.category) return false;
    if (filter.severity && i.severity !== filter.severity) return false;
    if (filter.status && i.status !== filter.status) return false;
    return i.location?.lat && i.location.lat !== 0;
  });

  return (
    <div className="page-container">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="section-title flex items-center gap-2"><HiLocationMarker />Map View</h1>
          <p className="text-dark-400 mt-1">{filtered.length} issues on map</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
            className="input-field py-2 text-sm w-auto">
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_EMOJIS).map(([k, v]) => <option key={k} value={k}>{v} {k}</option>)}
          </select>
          <select value={filter.severity} onChange={e => setFilter(f => ({ ...f, severity: e.target.value }))}
            className="input-field py-2 text-sm w-auto">
            <option value="">All Severity</option>
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
          <button onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${showHeatmap ? 'bg-primary-500/20 text-primary-300' : 'glass-light text-dark-300'}`}>
            🔥 Heatmap
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <MapContainer center={center} zoom={13} className="w-full h-full" style={{ background: '#1e293b' }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
            />
            {showHeatmap && <HeatmapLayer issues={filtered} />}
            {filtered.map(issue => (
              <Marker key={issue._id} position={[issue.location.lat, issue.location.lng]} icon={createIcon(issue.severity)}>
                <Popup>
                  <div className="min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{CATEGORY_EMOJIS[issue.category]}</span>
                      <strong className="text-sm">{issue.title}</strong>
                    </div>
                    <p className="text-xs opacity-80 mb-2">{issue.description?.slice(0, 100)}...</p>
                    <div className="flex gap-1 mb-2">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${SEVERITY_COLORS[issue.severity]}33`, color: SEVERITY_COLORS[issue.severity] }}>{issue.severity}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">{issue.status}</span>
                    </div>
                    <Link to={`/issue/${issue._id}`} className="text-xs text-blue-400 hover:underline">View Details →</Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
