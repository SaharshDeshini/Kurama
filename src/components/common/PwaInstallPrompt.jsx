import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed as PWA)
    const isInStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(isInStandaloneMode);

    // Check iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Check if dismissed previously this session
    try {
      if (sessionStorage.getItem('kurama_pwa_dismissed') === 'true') {
        setIsDismissed(true);
      }
    } catch {
      // ignore
    }

    // Capture Chrome/Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('kurama_pwa_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  // Don't show if already installed as app, or user dismissed, or neither Android prompt nor iOS
  if (isStandalone || isDismissed || (!deferredPrompt && !isIos)) {
    return null;
  }

  return (
    <>
      {/* Floating PWA Install Bar on Mobile */}
      <div className="fixed bottom-16 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="p-3 sm:p-3.5 rounded-2xl border border-[#38BDF8]/40 bg-[#060A14]/95 backdrop-blur-2xl text-white shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(56,189,248,0.2)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#38BDF8] to-[#0284C7] flex items-center justify-center text-black font-black shrink-0 shadow-[0_0_15px_rgba(56,189,248,0.5)]">
              <Smartphone className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                <span>Install Kurama App</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30 font-semibold">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-[#8295B0] truncate">
                {isIos ? 'Add to Home Screen for fullscreen' : 'Fast, offline & standalone mobile app'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-[#38BDF8] text-black text-xs font-bold hover:bg-[#0EA5E9] active:scale-95 transition-all shadow-[0_0_12px_rgba(56,189,248,0.4)] flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-[#8295B0] hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#1A2744] bg-[#0A101F] p-5 text-white shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#1A2744]">
              <div className="flex items-center gap-2">
                <Share className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="text-sm font-bold">Install on iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="text-xs text-zinc-300 space-y-3 list-decimal list-inside leading-relaxed">
              <li>
                In Safari, tap the <span className="font-semibold text-[#38BDF8]">Share</span> button <span className="inline-block p-1 bg-white/10 rounded">⎋</span> at the bottom bar.
              </li>
              <li>
                Scroll down and tap <span className="font-semibold text-white">"Add to Home Screen"</span>.
              </li>
              <li>
                Tap <span className="font-semibold text-[#38BDF8]">"Add"</span> in the top right corner.
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2 rounded-xl bg-[#38BDF8] text-black font-bold text-xs hover:bg-[#0EA5E9]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
