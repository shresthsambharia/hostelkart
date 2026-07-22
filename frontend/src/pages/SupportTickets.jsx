import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import { 
  MessageSquare, PlusCircle, ShieldAlert, CheckCircle2, 
  Send, AlertTriangle, Star, Search, Filter, RefreshCw 
} from 'lucide-react';
import { ticketAPI } from '../api';

const faqs = [
  {
    category: 'Payment Issue',
    question: 'My payment got deducted but order is pending?',
    answer: 'HostelKart uses manual UPI validation. Submit your UTR verification code on the order page. Admins approve it within 10-15 minutes.'
  },
  {
    category: 'Refund',
    question: 'How long do refunds take?',
    answer: 'Refunds sent to your HostelKart Wallet are instant. Direct bank accounts transfers take up to 2-3 working days.'
  },
  {
    category: 'Delivery',
    question: 'What if my delivery is delayed?',
    answer: 'Deliveries occur in selected slots. If a rider is delayed by university checkposts, you will receive an in-app SMS notification.'
  }
];

const SupportTickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [activeTicketDetails, setActiveTicketDetails] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  
  // Create ticket form
  const [creating, setCreating] = useState(false);
  const [category, setCategory] = useState('Order Issue');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Feedback rating
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [rated, setRated] = useState(false);

  // Search/Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Typing indicator
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState('');

  const socketRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const apiURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://hostelkart-backend.onrender.com');
    const socketBase = apiURL.replace(/\/api\/?$/, '');
    
    socketRef.current = io(socketBase);

    socketRef.current.on('new_ticket_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    socketRef.current.on('ticket_typing_updated', ({ username, isTyping }) => {
      setPartnerTyping(isTyping ? username : '');
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const fetchTickets = async () => {
    try {
      const { data } = await ticketAPI.getAll();
      setTickets(data);
    } catch (err) {
      console.error('Failed to fetch support tickets:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const selectTicket = async (ticket) => {
    setActiveTicket(ticket);
    setCreating(false);
    setRated(false);
    setError('');
    setSuccessMsg('');
    
    try {
      const { data } = await ticketAPI.getById(ticket._id);
      setActiveTicketDetails(data);
      setMessages(data.messages);

      socketRef.current.emit('join_ticket', { ticketId: ticket._id });
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    } catch (err) {
      console.error('Failed to fetch ticket details:', err);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !activeTicket) return;

    try {
      await ticketAPI.addMessage(activeTicket._id, newMsg);
      setNewMsg('');
      socketRef.current.emit('ticket_typing', { ticketId: activeTicket._id, username: user.name, isTyping: false });
    } catch (err) {
      console.error('Failed to send reply message:', err);
    }
  };

  const handleTyping = (e) => {
    setNewMsg(e.target.value);
    if (!isTyping && activeTicket) {
      setIsTyping(true);
      socketRef.current.emit('ticket_typing', { ticketId: activeTicket._id, username: user.name, isTyping: true });
      setTimeout(() => {
        setIsTyping(false);
        socketRef.current.emit('ticket_typing', { ticketId: activeTicket._id, username: user.name, isTyping: false });
      }, 3000);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!subject.trim() || !description.trim()) {
      setError('Please fill out all required fields');
      return;
    }

    try {
      const { data } = await ticketAPI.create({
        category,
        subject: subject.trim(),
        description: description.trim()
      });

      setSubject('');
      setDescription('');
      setCategory('Order Issue');
      setCreating(false);
      setSuccessMsg(`Support Ticket ${data.ticketId || ''} created!`);
      await fetchTickets();
      selectTicket(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit support ticket.');
    }
  };

  const handleCloseTicket = async () => {
    if (!activeTicket) return;
    try {
      await ticketAPI.close(activeTicket._id);
      await fetchTickets();
      const updated = { ...activeTicket, status: 'Closed' };
      setActiveTicket(updated);
      setSuccessMsg('Support ticket closed.');
    } catch (err) {
      console.error('Failed to close ticket:', err);
    }
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (!activeTicket) return;
    try {
      await ticketAPI.rate(activeTicket._id, rating, feedback);
      setRated(true);
      setFeedback('');
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.ticketId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? t.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3 select-none">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-primary-600 rounded-full block"></span>
            Helpdesk & Support
          </h1>
          <p className="text-[10px] text-slate-455 font-bold uppercase mt-1">Get instant assistance from university operators</p>
        </div>
        <button
          onClick={() => {
            setCreating(true);
            setActiveTicket(null);
          }}
          className="bg-primary-600 hover:bg-primary-750 text-white font-black py-2 px-4 rounded-xl text-xs uppercase tracking-wider shadow-sm flex items-center gap-1"
        >
          <PlusCircle size={14} />
          <span>New Ticket</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
        {/* Sidebar */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-100 shadow-premium flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-50 space-y-3 bg-slate-50/20 select-none">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-9 py-1.5 text-xs bg-white font-bold"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-450 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field py-1.5 px-2.5 text-[10px] bg-white w-full border-slate-200 font-bold uppercase"
              >
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending Customer">Pending Customer</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {filteredTickets.length > 0 ? (
              filteredTickets.map((t) => (
                <button
                  key={t._id}
                  onClick={() => selectTicket(t)}
                  className={`w-full p-4 text-left hover:bg-slate-50 transition-all flex flex-col gap-1.5 ${
                    activeTicket?._id === t._id ? 'bg-primary-50/30 border-l-4 border-primary-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-center gap-2 select-none">
                    <span className="text-[9px] font-black text-slate-400 uppercase font-mono">{t.ticketId}</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${
                      t.status === 'Closed' ? 'bg-slate-50 text-slate-500 border-slate-200' :
                      t.status === 'Pending Customer' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-xs truncate">{t.subject}</h4>
                  <div className="flex justify-between text-[9px] font-bold text-slate-450 mt-1 select-none">
                    <span>Category: {t.category}</span>
                    <span>Priority: {t.priority}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 font-bold italic select-none">No support tickets.</div>
            )}
          </div>
        </div>

        {/* Chat Threads */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-premium flex flex-col overflow-hidden relative">
          {creating ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <h2 className="text-base font-black text-slate-900 border-b border-slate-50 pb-3 flex items-center gap-2 select-none">
                <PlusCircle className="text-primary-650 w-4.5 h-4.5" />
                <span>Create New Ticket</span>
              </h2>

              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-750 p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between select-none animate-slide-down">
                  <span>{successMsg}</span>
                  <button onClick={() => setSuccessMsg('')} className="font-black text-[9px] underline">Dismiss</button>
                </div>
              )}

              {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3.5 rounded-2xl text-xs font-bold select-none animate-slide-down">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="input-field text-xs py-2 font-bold uppercase"
                    >
                      <option value="Order Issue">Order Issue</option>
                      <option value="Payment Issue">Payment Issue</option>
                      <option value="Refund">Refund Logs</option>
                      <option value="Delivery">Delivery Delays</option>
                      <option value="Product Quality">Product Quality</option>
                      <option value="Wrong Product">Wrong Product</option>
                      <option value="Missing Item">Missing Item</option>
                      <option value="Technical Problem">Technical issue</option>
                      <option value="Account Issue">Account issue</option>
                      <option value="Suggestion">Suggestion</option>
                      <option value="Complaint">Complaint</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. UPI verification delay"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="input-field text-xs py-2 font-bold"
                    />
                  </div>
                </div>

                {category && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2 select-none">
                    <span className="text-[10px] font-black text-amber-800 uppercase flex items-center gap-1.5">
                      <AlertTriangle size={13} />
                      <span>Troubleshooting FAQs</span>
                    </span>
                    <div className="space-y-2 divide-y divide-amber-100">
                      {faqs.filter(f => f.category === category).map((faq, index) => (
                        <div key={index} className="pt-2 text-xs space-y-1">
                          <h5 className="font-bold text-slate-800">Q: {faq.question}</h5>
                          <p className="text-slate-600 font-semibold leading-relaxed">A: {faq.answer}</p>
                        </div>
                      ))}
                      {faqs.filter(f => f.category === category).length === 0 && (
                        <p className="text-[10px] text-slate-500 font-bold italic">No solutions logged for this category.</p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Describe the problem</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Enter details like Order ID or transaction reference..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-field text-xs py-2"
                  />
                </div>

                <button type="submit" className="w-full bg-primary-600 hover:bg-primary-750 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-sm active:scale-95">
                  Submit Support Ticket
                </button>
              </form>
            </div>
          ) : activeTicket ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/20 select-none">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                    <span>{activeTicket.subject}</span>
                    <span className="text-[9px] font-black text-slate-400 font-mono">({activeTicket.ticketId})</span>
                  </h3>
                  <div className="flex gap-2 items-center text-[9px] text-slate-450 font-bold uppercase mt-1">
                    <span>Category: {activeTicket.category}</span>
                    <span>•</span>
                    <span>Priority: {activeTicket.priority}</span>
                  </div>
                </div>
                {activeTicket.status !== 'Closed' && (
                  <button
                    onClick={handleCloseTicket}
                    className="px-3.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-[10px] font-black uppercase rounded-xl"
                  >
                    Close Ticket
                  </button>
                )}
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/10">
                {messages.map((m, idx) => {
                  const isSenderAdmin = m.sender?.role === 'admin';
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col max-w-[80%] ${
                        isSenderAdmin ? 'self-start items-start' : 'self-end items-end ml-auto'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1 select-none">
                        <span className="text-[9px] font-black text-slate-400 uppercase">{m.sender?.name || 'User'}</span>
                        <span className="text-[8px] text-slate-350">{new Date(m.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed font-semibold shadow-sm ${
                        isSenderAdmin 
                          ? 'bg-white border border-slate-100 text-slate-800 rounded-tl-none' 
                          : 'bg-primary-600 text-white rounded-tr-none'
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  );
                })}
                {partnerTyping && (
                  <div className="text-[9px] text-slate-400 font-bold italic flex items-center gap-1 select-none animate-pulse">
                    <span>{partnerTyping} is typing...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Feedback */}
              {activeTicket.status === 'Closed' && (
                <div className="p-4 bg-amber-50/50 border-t border-slate-150 space-y-3">
                  <h4 className="font-extrabold text-slate-800 text-xs">Rate your Support Experience</h4>
                  {rated ? (
                    <div className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      <span>Thank you for your rating feedback!</span>
                    </div>
                  ) : (
                    <form onSubmit={submitFeedback} className="space-y-3">
                      <div className="flex space-x-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className="focus:outline-none hover:scale-105 active:scale-95 transition-transform"
                          >
                            <Star 
                              size={18} 
                              className={star <= rating ? 'fill-amber-400 text-amber-450' : 'text-slate-300'} 
                            />
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Optional comments..."
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          className="input-field py-2 text-xs flex-1 font-bold"
                        />
                        <button type="submit" className="bg-primary-600 hover:bg-primary-750 text-white font-black px-4 rounded-xl text-xs uppercase shadow-sm">Submit</button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Reply Input */}
              {activeTicket.status !== 'Closed' && (
                <form onSubmit={handleSendReply} className="p-3 border-t border-slate-100 flex gap-2 bg-white">
                  <input
                    type="text"
                    placeholder="Type reply message..."
                    value={newMsg}
                    onChange={handleTyping}
                    className="input-field flex-1 text-xs py-2 font-bold"
                  />
                  <button type="submit" className="bg-primary-600 hover:bg-primary-750 text-white p-2 rounded-xl flex items-center justify-center w-9 h-9 shadow-sm shrink-0">
                    <Send size={14} />
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 select-none">
              <MessageSquare className="w-12 h-12 text-slate-300" />
              <h3 className="font-extrabold text-slate-800 text-sm">No Ticket Selected</h3>
              <p className="text-slate-400 text-xs max-w-xs leading-normal font-semibold">
                Select an existing ticket from the sidebar or click "New Ticket" to begin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportTickets;
