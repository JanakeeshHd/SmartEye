import { useState, useRef, useEffect } from 'react';
import { chatbotAPI } from '../services/api';
import { HiChat, HiX, HiPaperAirplane } from 'react-icons/hi';

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: "👋 Hi! I'm Smarteye Assistant. How can I help you today?", suggestions: ['Report an issue', 'Track my complaint', 'What categories?'] }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    setMessages(prev => [...prev, { from: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await chatbotAPI.send(msg);
      setMessages(prev => [...prev, { from: 'bot', text: res.data.text, suggestions: res.data.suggestions }]);
    } catch {
      setMessages(prev => [...prev, { from: 'bot', text: "Sorry, I'm having trouble. Please try again!" }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* FAB */}
      <button onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-2xl shadow-primary-500/40 flex items-center justify-center hover:scale-110 transition-all duration-300 ${open ? 'rotate-90' : ''}`}>
        {open ? <HiX className="w-6 h-6" /> : <HiChat className="w-6 h-6" />}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] glass-card overflow-hidden animate-slide-up flex flex-col" style={{ height: '480px' }}>
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-primary-600 to-purple-600 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">🤖</div>
            <div>
              <h4 className="font-semibold text-white text-sm">Smarteye Assistant</h4>
              <p className="text-xs text-primary-100">Always here to help</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.from === 'user' 
                  ? 'bg-primary-600 text-white rounded-2xl rounded-br-md px-4 py-2.5' 
                  : 'bg-dark-700/80 text-dark-100 rounded-2xl rounded-bl-md px-4 py-2.5'}`}>
                  <p className="text-sm whitespace-pre-line" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  {msg.suggestions && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {msg.suggestions.map((s, j) => (
                        <button key={j} onClick={() => sendMessage(s)}
                          className="px-2.5 py-1 bg-primary-500/20 hover:bg-primary-500/40 text-primary-300 rounded-full text-[11px] font-medium transition-all">
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-dark-700/80 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-dark-700">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything..."
                className="flex-1 px-4 py-2.5 bg-dark-800 border border-dark-600 rounded-xl text-sm text-dark-100 placeholder-dark-400 focus:outline-none focus:border-primary-500 transition-all" />
              <button type="submit" disabled={!input.trim() || loading}
                className="p-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl transition-all disabled:opacity-40">
                <HiPaperAirplane className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
