import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { issueAPI } from '../services/api';
import { HiCamera, HiPhotograph, HiMicrophone, HiLocationMarker, HiPaperAirplane, HiX, HiCheck, HiArrowLeft, HiArrowRight } from 'react-icons/hi';

const CATEGORIES = [
  { id: 'pothole', emoji: '🕳️', label: 'Pothole' },
  { id: 'garbage', emoji: '🗑️', label: 'Garbage' },
  { id: 'water-leakage', emoji: '💧', label: 'Water Leak' },
  { id: 'broken-streetlight', emoji: '💡', label: 'Streetlight' },
  { id: 'drainage', emoji: '🌊', label: 'Drainage' },
  { id: 'electricity', emoji: '⚡', label: 'Electricity' },
  { id: 'road-damage', emoji: '🛣️', label: 'Road Damage' },
  { id: 'other', emoji: '📋', label: 'Other' },
];

export default function ReportIssue() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ title: '', description: '', category: '', images: [], latitude: '', longitude: '', address: '' });
  const [previews, setPreviews] = useState([]);
  const [recording, setRecording] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  
  const fileRef = useRef();
  const videoRef = useRef();
  const canvasRef = useRef();
  const navigate = useNavigate();

  const getLocation = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      setLocating(false);
      setForm(f => ({ ...f, latitude: '', longitude: '', address: 'Geolocation not supported by browser. Enter manually.' }));
      return;
    }

    if (!window.isSecureContext) {
      setLocating(false);
      setForm(f => ({ ...f, latitude: '', longitude: '', address: 'Location requires HTTPS (or localhost). Enter address manually.' }));
      return;
    }

    const getDeniedMessage = async () => {
      if (!navigator.permissions?.query) return null;
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        if (status.state === 'denied') return 'Location permission denied. Enable location access in browser settings, then try again.';
        return null;
      } catch {
        return null;
      }
    };

    getDeniedMessage().then((deniedMessage) => {
      if (deniedMessage) {
        setLocating(false);
        setForm(f => ({ ...f, latitude: '', longitude: '', address: deniedMessage }));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setForm(f => ({ ...f, latitude: latitude.toString(), longitude: longitude.toString() }));
          try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=en`,
              { signal: controller.signal }
            );
            clearTimeout(id);
            if (!res.ok) throw new Error('Reverse geocoding failed');
            const data = await res.json();
            setForm(f => ({ ...f, address: data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
          } catch {
            setForm(f => ({ ...f, address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
          }
          setLocating(false);
        },
        (err) => {
          const msg =
            err?.code === 1 ? 'Location permission denied. Enable it and retry.' :
            err?.code === 2 ? 'Location unavailable. Check GPS/network and retry.' :
            err?.code === 3 ? 'Location request timed out. Retry or enter address manually.' :
            `Location failed (${err?.message || 'Unknown error'})`;

          setLocating(false);
          setForm(f => ({ ...f, latitude: '', longitude: '', address: msg }));
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    });
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (step === 3 && !form.latitude && !locating) getLocation();
  }, [step, form.latitude, locating]);

  const handleFiles = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    if (files.length === 0) return;
    
    setForm(f => ({ ...f, images: [...f.images, ...files] }));
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(p => [...p, ...urls]);
    
    // Auto-fetch location to simulate Geotagging
    if (!form.latitude) getLocation();
  };

  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert('Camera access denied or unavailable.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setForm(f => ({ ...f, images: [...f.images, file] }));
        setPreviews(p => [...p, URL.createObjectURL(file)]);
        stopCamera();
        
        // Auto-fetch location (simulate geotag)
        if (!form.latitude) getLocation();
      }, 'image/jpeg', 0.8);
    }
  };

  const removeImage = (idx) => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
    setPreviews(p => p.filter((_, i) => i !== idx));
  };

  const startVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setForm(f => ({ ...f, description: f.description + transcript }));
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);
    recognition.start();
    setRecording(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title || `${form.category} issue report`);
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('latitude', form.latitude);
      formData.append('longitude', form.longitude);
      formData.append('address', form.address);
      form.images.forEach(img => formData.append('images', img));

      const res = await issueAPI.create(formData);
      setSubmitted(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit issue');
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="glass-card p-10 max-w-lg w-full text-center animate-slide-up">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
            <HiCheck className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Issue Reported Successfully!</h2>
          <p className="text-dark-400 mb-6">Your issue has been submitted and will be reviewed by our team.</p>
          
          <div className="glass-light rounded-xl p-4 mb-6 text-left space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-dark-400">Category:</span><span className={`badge-${submitted.severity}`}>{submitted.category}</span></div>
            <div className="flex justify-between"><span className="text-dark-400">Severity:</span><span className={`badge-${submitted.severity}`}>{submitted.severity}</span></div>
            <div className="flex justify-between"><span className="text-dark-400">Priority Score:</span><span className="text-primary-400 font-bold">{submitted.priorityScore}/100</span></div>
            <div className="flex justify-between"><span className="text-dark-400">Department:</span><span className="text-dark-200">{submitted.department}</span></div>
            <div className="flex justify-between"><span className="text-dark-400">AI Confidence:</span><span className="text-dark-200">{Math.round((submitted.aiAnalysis?.confidence || 0) * 100)}%</span></div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('/my-issues')} className="btn-primary flex-1">View My Issues</button>
            <button onClick={() => { setSubmitted(null); setStep(1); setForm(f => ({ title: '', description: '', category: '', images: [], latitude: f.latitude, longitude: f.longitude, address: f.address })); setPreviews([]); }} className="btn-secondary flex-1">Report Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="max-w-2xl mx-auto">
        <h1 className="section-title mb-2">Report an Issue</h1>
        <p className="text-dark-400 mb-8">Help improve your city by reporting civic issues. Our AI will automatically classify and prioritize it.</p>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-8">
          {['Describe', 'Media', 'Location', 'Review'].map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${step > i + 1 ? 'bg-emerald-500 text-white' : step === i + 1 ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-400'}`}>
                {step > i + 1 ? <HiCheck className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`ml-2 text-sm hidden sm:block ${step === i + 1 ? 'text-white font-medium' : 'text-dark-400'}`}>{s}</span>
              {i < 3 && <div className={`flex-1 h-0.5 mx-2 rounded ${step > i + 1 ? 'bg-emerald-500' : 'bg-dark-700'}`}></div>}
            </div>
          ))}
        </div>

        <div className="glass-card p-8 animate-fade-in" key={step}>
          {/* Step 1: Description */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-dark-200 mb-1.5 block">Issue Title (optional)</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Brief title for the issue..." className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium text-dark-200 mb-1.5 block">Description *</label>
                <div className="relative">
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe the issue in detail... What's wrong? How severe is it? Is it dangerous?"
                    className="input-field min-h-[140px] resize-none pr-12" required />
                  <button onClick={recording ? () => setRecording(false) : startVoice}
                    className={`absolute bottom-3 right-3 p-2 rounded-lg transition-all ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-dark-700 text-dark-300 hover:text-white'}`}
                    title="Voice input">
                    <HiMicrophone className="w-5 h-5" />
                  </button>
                </div>
                {recording && <p className="text-red-400 text-xs mt-1 animate-pulse">🎤 Listening... Speak now</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-dark-200 mb-2 block">Category (AI will auto-detect if not selected)</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setForm(f => ({ ...f, category: f.category === cat.id ? '' : cat.id }))}
                      className={`p-3 rounded-xl text-center transition-all text-xs font-medium
                        ${form.category === cat.id ? 'bg-primary-500/20 border-primary-500 border text-primary-300' : 'glass-light text-dark-300 hover:bg-dark-700/50'}`}>
                      <span className="text-lg block mb-1">{cat.emoji}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Media */}
          {step === 2 && (
            <div className="space-y-4">
              <label className="text-sm font-medium text-dark-200 mb-1 block">Upload Images (up to 5)</label>
              
              {cameraActive ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  <div className="absolute bottom-4 w-full flex justify-center items-center gap-6">
                    <button onClick={stopCamera} className="bg-dark-800/80 p-3 rounded-full text-white hover:bg-red-500/80 backdrop-blur-md transition-all">
                      <HiX className="w-6 h-6" />
                    </button>
                    <button onClick={capturePhoto} className="bg-emerald-500/90 p-4 rounded-full text-white hover:bg-emerald-400 border-2 border-white backdrop-blur-md transition-all animate-pulse">
                      <HiCamera className="w-8 h-8" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div onClick={startCamera}
                    className="border-2 border-dashed border-dark-600 hover:border-emerald-500 hover:bg-emerald-500/5 rounded-2xl p-6 text-center cursor-pointer transition-all group">
                    <HiCamera className="w-8 h-8 mx-auto text-dark-400 group-hover:text-emerald-400 transition-colors mb-2" />
                    <p className="text-dark-200 font-medium text-sm transition-colors group-hover:text-emerald-400">Take Photo</p>
                    <p className="text-dark-500 text-xs mt-1">Open web camera</p>
                  </div>
                  
                  <div onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-dark-600 hover:border-primary-500 hover:bg-primary-500/5 rounded-2xl p-6 text-center cursor-pointer transition-all group">
                    <HiPhotograph className="w-8 h-8 mx-auto text-dark-400 group-hover:text-primary-400 transition-colors mb-2" />
                    <p className="text-dark-200 font-medium text-sm transition-colors group-hover:text-primary-400">Upload File</p>
                    <p className="text-dark-500 text-xs mt-1">Choose from gallery</p>
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
                  </div>
                </div>
              )}

              {form.latitude && previews.length > 0 && (
                <div className="flex items-center gap-2 mt-2 bg-primary-500/10 text-primary-300 p-2.5 rounded-lg text-xs font-medium animate-fade-in">
                  <HiLocationMarker className="w-4 h-4 shrink-0" />
                  <span className="truncate">Geotag Attached: {form.address}</span>
                </div>
              )}

              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {previews.map((url, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden aspect-square">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(i)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500/90 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
                        <HiX className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-4">
                <button onClick={getLocation} className="btn-secondary flex items-center gap-2" disabled={locating}>
                  <HiLocationMarker className={`w-5 h-5 ${locating ? 'animate-pulse' : ''}`} />
                  {locating ? 'Detecting...' : 'Auto-Detect Location'}
                </button>
              </div>
              {form.latitude && (
                <div className="glass-light rounded-xl p-4 mb-4">
                  <p className="text-sm text-dark-300"><span className="font-medium text-dark-200">Coordinates:</span> {parseFloat(form.latitude).toFixed(6)}, {parseFloat(form.longitude).toFixed(6)}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-dark-200 mb-1.5 block">Address</label>
                <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Enter address or landmark..." className="input-field" />
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Review Your Report</h3>
              <div className="space-y-3 text-sm">
                {form.title && <div className="flex gap-2"><span className="text-dark-400 w-24 shrink-0">Title:</span><span className="text-dark-200">{form.title}</span></div>}
                <div className="flex gap-2"><span className="text-dark-400 w-24 shrink-0">Description:</span><span className="text-dark-200">{form.description.slice(0, 200)}{form.description.length > 200 ? '...' : ''}</span></div>
                <div className="flex gap-2"><span className="text-dark-400 w-24 shrink-0">Category:</span><span className="text-dark-200">{form.category ? CATEGORIES.find(c => c.id === form.category)?.label : 'AI will auto-detect'}</span></div>
                <div className="flex gap-2"><span className="text-dark-400 w-24 shrink-0">Images:</span><span className="text-dark-200">{form.images.length} uploaded</span></div>
                <div className="flex gap-2"><span className="text-dark-400 w-24 shrink-0">Location:</span><span className="text-dark-200">{form.address || 'Not specified'}</span></div>
              </div>
              {previews.length > 0 && (
                <div className="flex gap-2 mt-4">{previews.slice(0, 3).map((url, i) => <img key={i} src={url} alt="" className="w-20 h-20 rounded-xl object-cover" />)}</div>
              )}
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex justify-between mt-8">
            <button onClick={() => setStep(s => s - 1)} disabled={step === 1}
              className="btn-secondary flex items-center gap-2 disabled:opacity-30">
              <HiArrowLeft className="w-4 h-4" /> Back
            </button>
            {step < 4 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={step === 1 && !form.description}
                className="btn-primary flex items-center gap-2 disabled:opacity-30">
                Next <HiArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting || !form.description}
                className="btn-success flex items-center gap-2 disabled:opacity-30">
                {submitting ? 'Submitting...' : 'Submit Report'} <HiPaperAirplane className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
