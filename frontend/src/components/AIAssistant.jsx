import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, X, Trash2, Send, Mic, MicOff, Sparkles,
  ClipboardList, MapPin, HelpCircle, Heart, Gift
} from 'lucide-react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const hasVoiceSupport = !!SpeechRecognition;
import { cartAPI, productAPI } from '../api';
import { useCart } from '../context/CartContext';

const MarkdownMessage = ({ text }) => {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-sm text-slate-100 leading-relaxed font-sans">
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
            <div key={idx} className="flex items-start space-x-2 pl-2">
              <span className="text-emerald-400 mt-1 select-none">•</span>
              <span className="flex-1">{renderedContent}</span>
            </div>
          );
        }

        if (isNumbered) {
          return (
            <div key={idx} className="flex items-start space-x-2 pl-2">
              <span className="text-emerald-400 font-bold mt-0.5 select-none">{line.match(/^\d+/)[0]}.</span>
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
        content: "Hi! I'm your HostelKart AI Assistant. Ask me anything about our products, categories, coupons, delivery times, or your orders!"
      }
    ];
  });
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [healthStatus, setHealthStatus] = useState('unknown');

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

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
    const checkAIHealth = async () => {
      try {
        const res = await fetch('/api/ai/health');
        const data = await res.json();
        setHealthStatus(data.configured ? 'ready' : 'limited');
      } catch (err) {
        setHealthStatus('error');
      }
    };
    checkAIHealth();
  }, []);

  // Voice recording configuration
  useEffect(() => {
    if (hasVoiceSupport) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

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
        content: "Hi! I'm your HostelKart AI Assistant. Ask me anything about our products, categories, coupons, delivery times, or your orders!"
      }
    ];
    setChatHistory(defaultMsg);
  };

  const handleSendMessage = async (textToSend) => {
    const msg = textToSend || inputMessage;
    if (!msg.trim()) return;

    if (!textToSend) {
      setInputMessage('');
    }

    const userMsg = { role: 'user', content: msg };
    const newChatHistory = [...chatHistory, userMsg];
    setChatHistory(newChatHistory);
    setIsTyping(true);

    const assistantMsgId = Date.now();
    // Add empty message placeholder for typing effect / streaming response
    setChatHistory(prev => [...prev, { role: 'assistant', content: '', id: assistantMsgId }]);

    try {
      const token = localStorage.getItem('token');
      // Format context history for Gemini
      const backendHistory = chatHistory.map(h => ({
        role: h.role,
        parts: [{ text: h.content }]
      }));

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
        prev.map(m => m.id === assistantMsgId ? { ...m, content: 'AI Assistant was disconnected. Please check your connectivity or retry.' } : m)
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

  // Quick Action triggers
  const quickActions = [
    { label: 'My Orders', icon: <ClipboardList size={14} />, prompt: 'Show my recent orders' },
    { label: 'Track Order', icon: <MapPin size={14} />, prompt: 'Where is my active order status?' },
    { label: 'Support Help', icon: <HelpCircle size={14} />, prompt: 'How do I file a support ticket?' },
    { label: 'Medicine Help', icon: <Heart size={14} />, prompt: 'Can you recommend medicines for cold/fever?' },
    { label: 'Coupons', icon: <Gift size={14} />, prompt: 'What discount coupons are currently active?' }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="w-[92vw] sm:w-[400px] h-[550px] bg-slate-900/90 backdrop-blur-xl border border-emerald-500/20 shadow-2xl rounded-2xl flex flex-col mb-4 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-slate-950/70 border-b border-emerald-500/10 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
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
                      {healthStatus === 'ready' ? 'Online' : healthStatus === 'limited' ? 'Standby Mode' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={clearChatHistory}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                  title="Clear conversation history"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
              {chatHistory.map((msg, index) => (
                <div
                  key={msg.id || index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-800/80 text-slate-100 rounded-bl-none border border-slate-700/50'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <MarkdownMessage text={msg.content} />
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/80 text-slate-400 px-4 py-3 rounded-2xl rounded-bl-none border border-slate-700/50 flex space-x-1 items-center">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions Carousel */}
            <div className="px-4 py-2 border-t border-slate-800 flex space-x-2 overflow-x-auto whitespace-nowrap scrollbar-none scroll-smooth">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(action.prompt)}
                  className="inline-flex items-center space-x-1 bg-slate-800 hover:bg-emerald-500/10 border border-slate-700 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-400 text-xs px-2.5 py-1.5 rounded-full transition-all duration-200"
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>

            {/* Chat Input form */}
            <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex items-center space-x-2">
              <div className="flex-grow flex items-center bg-slate-800/90 border border-slate-700/50 rounded-xl px-3 py-2 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask standard questions..."
                  className="flex-grow bg-transparent text-sm text-white placeholder-slate-500 outline-none resize-none h-6 max-h-16 overflow-y-auto py-0.5 leading-5 custom-scrollbar"
                  rows={1}
                />
                {hasVoiceSupport && (
                  <button
                    onClick={toggleListening}
                    className={`ml-2 p-1.5 rounded-lg transition-colors ${
                      isListening
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                    title={isListening ? 'Stop listening' : 'Start voice input'}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                )}
              </div>
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim()}
                className="p-3 bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-900/30 active:scale-95 disabled:scale-100 transition-all shrink-0"
              >
                <Send size={16} />
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
        className="w-14 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-2xl border border-emerald-500/20 flex items-center justify-center transition-all duration-200"
        title="Open AI Assistant"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </motion.button>
    </div>
  );
};

export default AIAssistant;
