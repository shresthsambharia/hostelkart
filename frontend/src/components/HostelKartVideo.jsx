import React from 'react';
import { motion } from 'framer-motion';
import { Play, Sparkles, ShieldCheck, Zap } from 'lucide-react';

export const HostelKartVideo = ({ 
  src = '/videos/hostelkart-demo.mp4',
  poster,
  title = 'See HostelKart in Action'
}) => {
  return (
    <section 
      aria-labelledby="hostelkart-video-heading"
      className="max-w-7xl mx-auto px-4 sm:px-8 space-y-4"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 select-none">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="p-1 bg-emerald-100 text-emerald-700 rounded-lg">
              <Play className="w-3.5 h-3.5 fill-emerald-600" />
            </span>
            <h2 
              id="hostelkart-video-heading" 
              className="text-base sm:text-lg font-black text-slate-850 tracking-tight"
            >
              {title}
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-2xl leading-relaxed">
            Order daily hostel essentials, get room-corridor delivery in minutes, consult your AI Assistant, and track your orders in real time.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" /> Fast Delivery</span>
          <span>•</span>
          <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-emerald-500" /> AI Powered</span>
        </div>
      </div>

      {/* Video Container Card */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative overflow-hidden bg-slate-900 rounded-2.5xl sm:rounded-3xl shadow-premium border border-slate-200/80 group"
      >
        <div className="aspect-video w-full bg-slate-950 flex items-center justify-center relative">
          <video
            className="w-full h-full object-cover rounded-2.5xl sm:rounded-3xl"
            controls
            muted
            playsInline
            preload="metadata"
            poster={poster}
            aria-label="HostelKart demonstration and promotional video"
          >
            <source src={src} type="video/mp4" />
            Your browser does not support HTML5 video playback. Please upgrade your browser to view this video.
          </video>
        </div>
      </motion.div>
    </section>
  );
};

export default HostelKartVideo;
