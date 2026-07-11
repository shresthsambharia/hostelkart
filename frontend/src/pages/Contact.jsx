import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && email && message) {
      setSubmitted(true);
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12 animate-fadeIn">
      {/* Title */}
      <div className="text-center space-y-4">
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-100 text-primary-700 uppercase tracking-widest">
          Support Desk
        </span>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight sm:text-5xl">
          Get in <span className="text-primary-600">Touch</span>
        </h1>
        <p className="text-slate-500 text-base max-w-xl mx-auto leading-relaxed">
          Have questions about your order, custom delivery requests, or joining as a rider? Fill out the form below or contact us directly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Support channels list */}
        <div className="space-y-4 md:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start space-x-4">
            <div className="p-2.5 bg-primary-50 text-primary-600 rounded-lg shrink-0">
              <Mail size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Email Us</h4>
              <p className="text-xs text-slate-400 mt-0.5">Response in 2 hrs</p>
              <a href="mailto:supporthostelkart@gmail.com" className="text-xs font-semibold text-primary-600 hover:underline block mt-1.5 break-all">
                supporthostelkart@gmail.com
              </a>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start space-x-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
              <Phone size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Call/WhatsApp</h4>
              <p className="text-xs text-slate-400 mt-0.5">Direct hotline</p>
              <a href="tel:+919876543210" className="text-xs font-semibold text-emerald-600 hover:underline block mt-1.5">
                +91 98765 43210
              </a>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start space-x-4">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Our Hub</h4>
              <p className="text-xs text-slate-400 mt-0.5">Store & rider depot</p>
              <span className="text-xs font-semibold text-slate-600 block mt-1.5 leading-normal">
                Hostel Complex Block A, Room 101, University Campus
              </span>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm md:col-span-2 space-y-6">
          <h3 className="font-extrabold text-slate-850 text-xl border-b border-slate-100 pb-3 flex justify-between items-center flex-wrap gap-2">
            <span>Send a Message</span>
            <Link to="/support" className="text-xs font-black text-primary-600 hover:underline uppercase tracking-wide">
              Go to Support Tickets →
            </Link>
          </h3>
          
          {submitted ? (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-6 rounded-xl text-center space-y-3 animate-fadeIn">
              <div className="inline-block p-2 bg-emerald-100 text-emerald-600 rounded-full">
                <CheckCircle size={32} />
              </div>
              <h4 className="font-bold text-base">Message Sent Successfully!</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Thank you for reaching out. A campus support executive will get back to you shortly.
              </p>
              <button 
                onClick={() => setSubmitted(false)}
                className="text-xs font-bold text-primary-600 hover:underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    className="input-field text-sm"
                    placeholder="e.g. Rohan Sen"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    className="input-field text-sm"
                    placeholder="e.g. rohan@uni.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  className="input-field text-sm"
                  placeholder="e.g. 10 digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Message</label>
                <textarea
                  required
                  rows={4}
                  className="input-field text-sm"
                  placeholder="Type your query or custom request details here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full btn-primary py-3 flex items-center justify-center space-x-2 text-xs font-bold shadow-md hover:shadow-lg transition-all"
              >
                <Send size={14} />
                <span>Submit Query</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Contact;
