import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { 
  MessageSquare, UserCheck, ShieldAlert, CheckCircle2, 
  Send, AlertTriangle, Star, Search, Filter, RefreshCcw, 
  Clock, CheckSquare, Award 
} from 'lucide-react';
import axios from 'axios';

const AdminSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [activeTicketDetails, setActiveTicketDetails] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  const [adminsList, setAdminsList] = useState([]);

  const [analytics, setAnalytics] = useState({
    openCount: 0,
    closedCount: 0,
    categories: [],
    priorities: []
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');

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
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      };
      const apiURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hostelkart-backend.onrender.com/api');
      
      const { data } = await axios.get(`${apiURL}/tickets/admin`, config);
      setTickets(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdmins = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      };
      const apiURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hostelkart-backend.onrender.com/api');
      
      const { data } = await axios.get(`${apiURL}/admin/users`, config);
      setAdminsList(data.filter(u => u.role === 'admin'));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      };
      const apiURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hostelkart-backend.onrender.com/api');
      
      const { data } = await axios.get(`${apiURL}/tickets/admin/analytics`, config);
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchAdmins();
    fetchAnalytics();
  }, []);

  const selectTicket = async (ticket) => {
    setActiveTicket(ticket);
    
    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      };
      const apiURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hostelkart-backend.onrender.com/api');
      
      const { data } = await axios.get(`${apiURL}/tickets/${ticket._id}`, config);
      setActiveTicketDetails(data);
      setMessages(data.messages);

      socketRef.current.emit('join_ticket', { ticketId: ticket._id });
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;

    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      };
      const apiURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hostelkart-backend.onrender.com/api');
      
      await axios.post(`${apiURL}/tickets/${activeTicket._id}/messages`, {
        content: newMsg,
        isInternalNote
      }, config);

      setNewMsg('');
      setIsInternalNote(false);
      socketRef.current.emit('ticket_typing', { ticketId: activeTicket._id, username: 'Admin', isTyping: false });
    } catch (err) {
      console.error(err);
    }
  };

  const handleTyping = (e) => {
    setNewMsg(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('ticket_typing', { ticketId: activeTicket._id, username: 'Admin', isTyping: true });
      setTimeout(() => {
        setIsTyping(false);
        socketRef.current.emit('ticket_typing', { ticketId: activeTicket._id, username: 'Admin', isTyping: false });
      }, 3000);
    }
  };

  const updateTicketMetadata = async (field, value) => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      };
      const apiURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hostelkart-backend.onrender.com/api');
      
      const payload = {};
      payload[field] = value;

      const { data } = await axios.put(`${apiURL}/tickets/admin/${activeTicket._id}`, payload, config);
      
      const updated = { ...activeTicket, ...payload };
      setActiveTicket(updated);
      fetchTickets();
      fetchAnalytics();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseTicket = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      };
      const apiURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hostelkart-backend.onrender.com/api');
      
      await axios.put(`${apiURL}/tickets/${activeTicket._id}/close`, {}, config);
      fetchTickets();
      fetchAnalytics();
      setActiveTicket(null);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.ticketId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? t.status === statusFilter : true;
    const matchesPriority = priorityFilter ? t.priority === priorityFilter : true;
    const matchesCategory = categoryFilter ? t.category === categoryFilter : true;
    const matchesAssigned = assignedFilter ? t.assignedAdmin?._id === assignedFilter : true;
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesAssigned;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Support Ticketing Desk</h1>
        <p className="text-slate-500 text-xs font-bold mt-1">Manage and resolve campus customer queries.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase text-slate-450">Open Tickets</h4>
            <p className="text-xl font-black text-slate-800 mt-0.5">{analytics.openCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
            <CheckSquare size={20} />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase text-slate-450">Closed Tickets</h4>
            <p className="text-xl font-black text-slate-800 mt-0.5">{analytics.closedCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase text-slate-450">Top Issue Category</h4>
            <p className="text-xs font-black text-slate-800 mt-1 truncate max-w-[120px]">
              {analytics.categories[0]?._id || 'N/A'}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-primary-50 text-primary-600 rounded-lg shrink-0">
            <Award size={20} />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase text-slate-450">SLA Response Status</h4>
            <p className="text-xs font-black text-slate-800 mt-1">98.5% Compliant</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[75vh]">
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search HK number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-9 py-2 text-xs bg-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field py-1 px-2 text-[9px] bg-white border-slate-200"
              >
                <option value="">Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending Customer">Pending Customer</option>
                <option value="Closed">Closed</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="input-field py-1 px-2 text-[9px] bg-white border-slate-200"
              >
                <option value="">Priority</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredTickets.length > 0 ? (
              filteredTickets.map((t) => (
                <button
                  key={t._id}
                  onClick={() => selectTicket(t)}
                  className={`w-full p-4 text-left hover:bg-slate-50 transition-colors flex flex-col gap-1.5 ${
                    activeTicket?._id === t._id ? 'bg-primary-50/30 border-l-4 border-primary-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">{t.ticketId}</span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase ${
                      t.status === 'Closed' ? 'bg-slate-50 text-slate-500 border-slate-200' :
                      t.status === 'Pending Customer' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs truncate">{t.subject}</h4>
                  <div className="flex justify-between text-[9px] font-bold text-slate-450 mt-1">
                    <span>Category: {t.category}</span>
                    <span className={`font-black ${
                      t.priority === 'Urgent' ? 'text-red-655' :
                      t.priority === 'High' ? 'text-amber-700' :
                      'text-slate-500'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 italic">No tickets found.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden relative">
          {activeTicket ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/30">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                    <span>{activeTicket.subject}</span>
                    <span className="text-[10px] font-black text-slate-400">({activeTicket.ticketId})</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold">
                    Created: {new Date(activeTicket.createdAt).toLocaleString()}
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2 items-center justify-start md:justify-end">
                  <select
                    value={activeTicket.assignedAdmin?._id || ''}
                    onChange={(e) => updateTicketMetadata('assignedAdmin', e.target.value)}
                    className="input-field py-1.5 px-3 text-[10px] bg-white border-slate-200 max-w-[140px]"
                  >
                    <option value="">Unassigned</option>
                    {adminsList.map(admin => (
                      <option key={admin._id} value={admin._id}>{admin.name}</option>
                    ))}
                  </select>

                  <select
                    value={activeTicket.priority}
                    onChange={(e) => updateTicketMetadata('priority', e.target.value)}
                    className="input-field py-1.5 px-3 text-[10px] bg-white border-slate-200 max-w-[100px]"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>

                  <select
                    value={activeTicket.status}
                    onChange={(e) => updateTicketMetadata('status', e.target.value)}
                    className="input-field py-1.5 px-3 text-[10px] bg-white border-slate-200 max-w-[120px]"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Pending Customer">Pending Customer</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/20">
                {messages.map((m, idx) => {
                  const isSenderAdmin = m.sender?.role === 'admin';
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col max-w-[80%] ${
                        m.isInternalNote ? 'border-l-4 border-amber-400 bg-amber-50/40 p-2 rounded-lg' : ''
                      } ${
                        isSenderAdmin ? 'self-end items-end ml-auto' : 'self-start items-start'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase">
                          {m.sender?.name || 'User'} {m.isInternalNote && '🔒 (Internal Note)'}
                        </span>
                        <span className="text-[8px] text-slate-350">{new Date(m.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        m.isInternalNote ? 'bg-amber-100 text-slate-800 rounded-tr-none' :
                        isSenderAdmin 
                          ? 'bg-primary-600 text-white rounded-tr-none' 
                          : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  );
                })}
                {partnerTyping && (
                  <div className="text-[10px] text-slate-450 italic flex items-center gap-1">
                    <RefreshCcw className="w-3 h-3 animate-spin text-primary-500" />
                    <span>{partnerTyping} is typing...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {activeTicket.status !== 'Closed' && (
                <div className="p-3 border-t border-slate-100 space-y-2 bg-white">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-bold pl-1">
                    <input
                      type="checkbox"
                      id="internal-note"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="internal-note" className="cursor-pointer">Post as Internal Note (Staff Only)</label>
                  </div>
                  
                  <form onSubmit={handleSendReply} className="flex gap-2">
                    <input
                      type="text"
                      placeholder={isInternalNote ? "Type staff internal note..." : "Type reply to customer..."}
                      value={newMsg}
                      onChange={handleTyping}
                      className="input-field flex-1 text-xs py-2"
                    />
                    <button type="submit" className="btn-primary p-2 flex items-center justify-center w-10 h-10 shadow-sm shrink-0">
                      <Send size={15} />
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <MessageSquare className="w-12 h-12 text-slate-300" />
              <h3 className="font-extrabold text-slate-800 text-sm">No Active Ticket</h3>
              <p className="text-slate-400 text-xs max-w-xs leading-normal">
                Select an open ticket from the sidebar to start resolving student queries.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupport;
