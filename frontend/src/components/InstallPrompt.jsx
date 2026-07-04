import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsVisible(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleCloseClick = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 md:top-auto md:bottom-8 md:right-8 md:left-auto md:w-96 bg-white/95 backdrop-blur-md border border-slate-100/80 shadow-2xl rounded-2xl p-4 z-50 animate-slide-down md:animate-slide-up flex items-start gap-3.5">
      <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center shrink-0">
        <Download className="w-6 h-6" />
      </div>
      <div className="flex-1 space-y-1">
        <h4 className="text-xs font-bold text-slate-800 leading-tight">Install HostelKart Web App</h4>
        <p className="text-[10px] text-slate-450 font-medium">Add to your Home Screen for faster access, push updates, and offline support!</p>
        <div className="flex items-center gap-2 pt-1.5">
          <button
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-[10px] font-black text-white rounded-lg transition-colors"
          >
            Install Now
          </button>
          <button
            onClick={handleCloseClick}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-500 rounded-lg transition-colors border border-slate-200"
          >
            Later
          </button>
        </div>
      </div>
      <button
        onClick={handleCloseClick}
        className="w-6 h-6 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-650"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default InstallPrompt;
