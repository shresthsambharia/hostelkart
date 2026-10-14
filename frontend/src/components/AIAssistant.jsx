import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, X, Trash2, Send, Mic, MicOff, Sparkles,
  ClipboardList, MapPin, HelpCircle, Gift, Package, Clock
} from 'lucide-react';

const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const hasVoiceSupport = !!SpeechRecognition;
import { useCart } from '../context/CartContext';

const MarkdownMessage = ({ text }) => {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-xs sm:text-sm text-slate-100 leading-relaxed font-sans break-words">
      {lines.map((line, idx) => {
        let content = line;
        const isBullet = content.trim().startsWith('- ') || content.trim().startsWith('* ');
        const isNumbered = /^\d+\.\s/.test(content.trim());

        if (isBullet) {
          content = content.replace(/^[-*]\s+/, '');
        } else if (isNumbered) {
          content = content.replace(/^\d+\.\s+/, '');
        }

        // Bold formatting
        const parts = [];
        const boldRegex = /\*\*(.*?)\*\*/g;
        let match;
        let lastIndex = 0;

        while ((match = boldRegex.exec(content)) !== null) {
          const textBefore = content.substring(lastIndex, match.index);
          const boldText = match[1];
          if (textBefore) parts.push(textBefore);
          parts.push(<strong key={match.index} className="font-extrabold text-emerald-400">{boldText}</strong>);
          lastIndex = boldRegex.lastIndex;
        }
        if (lastIndex < content.length) {
          parts.push(content.substring(lastIndex));
        }

        const renderedContent = parts.length > 0 ? parts : content;

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start space-x-2 pl-1.5">
              <span className="text-emerald-400 mt-1 select-none shrink-0">•</span>
              <span className="flex-1">{renderedContent}</span>
            </div>
          );
        }

        if (isNumbered) {
          const numMatch = line.match(/^\d+/);
          return (
            <div key={idx} className="flex items-start space-x-2 pl-1.5">
              <span className="text-emerald-400 font-bold mt-0.5 select-none shrink-0">{numMatch ? `${numMatch[0]}.` : ''}</span>
              <span className="flex-1">{renderedContent}</span>
            </div>
          );
        }

        return <p key={idx} className="min-h-[1rem]">{renderedContent}</p>;
      })}
    </div>
  );
};

export const AIAssistant = () => {
  const { fetchCart } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem('hostelkart_ai_chat');
    return saved ? JSON.parse(saved) : [
      {
        role: 'assistant',
        content: "Hi! I'm your HostelKart AI Assistant. Ask me about live products, categories, active coupons, delivery slots, or your orders (in English, हिंदी, or Hinglish)!"
      }
    ];
  });
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [healthStatus, setHealthStatus] = useState('unknown');

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  // Persist history
  useEffect(() => {
    localStorage.setItem('hostelkart_ai_chat', JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Check backend health status
  useEffect(() => {
    let isMounted = true;
    const checkAIHealth = async () => {
      try {
        const res = await fetch('/api/ai/health');
        const data = await res.json();
        if (isMounted) {
          setHealthStatus(data.configured ? 'ready' : 'limited');
        }
      } catch (err) {
        if (isMounted) {
          setHealthStatus('error');
        }
      }
    };
    checkAIHealth();
    return () => { isMounted = false; };
  }, []);

  // Voice recording configuration
  useEffect(() => {
    if (hasVoiceSupport && SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN';

      rec.onstart = () => setIsListening(true);
      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(prev => prev ? `${prev} ${transcript}` : transcript);
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const clearChatHistory = () => {
    const defaultMsg = [
      {
        role: 'assistant',
        content: "Hi! I'm your HostelKart AI Assistant. Ask me about live products, categories, active coupons, delivery slots, or your orders (in English, हिंदी, or Hinglish)!"
      }
    ];
    setChatHistory(defaultMsg);
  };

  const handleSendMessage = async (textToSend) => {
    const msg = textToSend || inputMessage;
    if (!msg.trim()) return;

    if (!textToSend) {
      setInputMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }

    const userMsg = { role: 'user', content: msg };
    const newChatHistory = [...chatHistory, userMsg];
    setChatHistory(newChatHistory);
    setIsTyping(true);

    const assistantMsgId = Date.now();
    setChatHistory(prev => [...prev, { role: 'assistant', content: '', id: assistantMsgId }]);

    try {
      const token = localStorage.getItem('token');
      const validMessages = newChatHistory.filter(h => h.content && typeof h.content === 'string' && h.content.trim() !== '');
      const firstUserIdx = validMessages.findIndex(h => h.role === 'user');
      const backendHistory = firstUserIdx !== -1
        ? validMessages.slice(firstUserIdx, -1).map(h => ({
            role: h.role === 'assistant' ? 'assistant' : 'user',
            parts: [{ text: h.content.trim() }]
          }))
        : [];

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'X-CSRF-Token': localStorage.getItem('csrfToken') || ''
        },
        body: JSON.stringify({
          message: msg,
          history: backendHistory
        })
      });

      if (!res.ok) {
        throw new Error('AI server response issue');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let assistantText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') {
              setIsTyping(false);
              break;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.chunk) {
                assistantText += parsed.chunk;
                setChatHistory(prev =>
                  prev.map(m => m.id === assistantMsgId ? { ...m, content: assistantText } : m)
                );
              }
              if (parsed.cartUpdated) {
                fetchCart();
              } else if (parsed.error) {
                assistantText = parsed.error;
                setChatHistory(prev =>
                  prev.map(m => m.id === assistantMsgId ? { ...m, content: assistantText } : m)
                );
                setIsTyping(false);
              }
            } catch (err) {
              // Fragment handling
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setChatHistory(prev =>
        prev.map(m => m.id === assistantMsgId ? { ...m, content: 'AI Assistant was temporarily unable to reach the server. Please check your connectivity and retry.' } : m)
      );
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 96)}px`;
    }
  };

  // Quick Action triggers connected to verified data
  const quickActions = [
    { label: 'Categories', icon: <Package size={13} />, prompt: 'Show all available categories and product counts' },
    { label: 'Coupons', icon: <Gift size={13} />, prompt: 'What discount coupons are currently active?' },
    { label: 'My Orders', icon: <ClipboardList size={13} />, prompt: 'Show my recent orders' },
    { label: 'Track Order', icon: <MapPin size={13} />, prompt: 'Where is my active order?' },
    { label: 'Delivery Slots', icon: <Clock size={13} />, prompt: 'What are the delivery slots and timings?' },
    { label: 'Support Help', icon: <HelpCircle size={13} />, prompt: 'How do I raise a support ticket or get help?' }
  ];

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
      {/* Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-[calc(100vw-2rem)] sm:w-[410px] max-w-[420px] h-[min(600px,82vh)] bg-slate-900/95 backdrop-blur-xl border border-emerald-500/20 shadow-2xl rounded-2xl flex flex-col mb-3 overflow-hidden select-text"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-slate-950/80 border-b border-emerald-500/10 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Sparkles size={18} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">HostelKart AI</h3>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${
                      healthStatus === 'ready' ? 'bg-emerald-400 animate-pulse' :
                      healthStatus === 'limited' ? 'bg-yellow-400' : 'bg-red-400'
                    }`} />
                    <span className="text-[10px] text-slate-400 font-medium">
                      {healthStatus === 'ready' ? 'Live Assistant Online' : healthStatus === 'limited' ? 'Standby Mode' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={clearChatHistory}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors"
                  title="Clear conversation history"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  title="Close Assistant"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages body */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 custom-scrollbar overscroll-contain">
              {chatHistory.map((msg, index) => (
                <div
                  key={msg.id || index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[88%] p-3 rounded-2xl shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-800/80 text-slate-100 rounded-bl-none border border-slate-700/50'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <MarkdownMessage text={msg.content} />
                    ) : (
                      <p className="text-xs sm:text-sm break-words">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/80 text-slate-400 px-3.5 py-2.5 rounded-2xl rounded-bl-none border border-slate-700/50 flex space-x-1.5 items-center">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions Carousel */}
            <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-950/40 flex space-x-1.5 overflow-x-auto whitespace-nowrap scrollbar-none scroll-smooth shrink-0">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(action.prompt)}
                  className="inline-flex items-center space-x-1.5 bg-slate-800/90 hover:bg-emerald-500/10 border border-slate-700 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400 text-[11px] px-2.5 py-1 rounded-full transition-all shrink-0 active:scale-95"
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>

            {/* Chat Input form */}
            <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-end space-x-2 shrink-0">
              <div className="flex-grow flex items-center bg-slate-800/90 border border-slate-700/60 rounded-xl px-3 py-1.5 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask in English, हिंदी, or Hinglish..."
                  className="flex-grow bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 outline-none resize-none min-h-[24px] max-h-24 overflow-y-auto py-1 leading-5 custom-scrollbar"
                  rows={1}
                />
                {hasVoiceSupport && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`ml-1.5 p-1.5 rounded-lg transition-colors shrink-0 ${
                      isListening
                        ? 'text-emerald-400 bg-emerald-500/10 animate-pulse'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                    title={isListening ? 'Stop listening' : 'Start voice input'}
                  >
                    {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim()}
                className="p-2.5 bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-900/30 active:scale-95 disabled:scale-100 transition-all shrink-0"
                title="Send Message"
              >
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Badge Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-13 h-13 sm:w-14 sm:h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-2xl border border-emerald-400/20 flex items-center justify-center transition-all duration-200"
        title="Open AI Assistant"
      >
        {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
      </motion.button>
    </div>
  );
};

export default AIAssistant;
