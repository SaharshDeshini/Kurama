import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  BookOpen,
  StickyNote,
  BookA,
  Settings,
  Flame,
  Menu,
  X
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/notes', label: 'Notes', icon: StickyNote },
  { path: '/english-daily', label: 'English Daily', icon: BookA },
  { path: '/journal', label: 'Journal', icon: BookOpen },
];

export function MobileNav({ onOpenSettings, onOpenAuth }) {
  const [isOpen, setIsOpen] = useState(false);

  const closeAndOpenSettings = () => {
    setIsOpen(false);
    onOpenSettings();
  };

  const closeAndOpenAuth = () => {
    setIsOpen(false);
    if (onOpenAuth) onOpenAuth();
  };

  return (
    <div className="md:hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#15233C] bg-[#060A14]/92 backdrop-blur-2xl sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#38BDF8] via-[#0EA5E9] to-[#0284C7] flex items-center justify-center text-black shadow-[0_0_16px_rgba(56,189,248,0.55)]">
            <Flame className="w-4 h-4 fill-current stroke-[2.5]" />
          </div>
          <span className="text-sm font-black tracking-tight text-white font-sans">
            Kurama
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg text-subtle-dark hover:bg-surface-dark"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Slide-down Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 top-[49px] z-40 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#0A101F] border-b-2 border-border-dark p-4 space-y-1 max-h-[80vh] overflow-y-auto shadow-xl">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#00B4FF]/15 text-[#00B4FF] font-semibold'
                      : 'text-subtle-dark hover:bg-surface-dark hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
            <button
              type="button"
              onClick={closeAndOpenAuth}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-[#00B4FF] hover:bg-[#00B4FF]/10"
            >
              <span>Cloud Sync (Supabase)</span>
            </button>
            <button
              type="button"
              onClick={closeAndOpenSettings}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-subtle-dark hover:bg-surface-dark hover:text-white"
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Quick Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#15233C] bg-[#060A14]/94 backdrop-blur-2xl flex justify-around py-2.5 px-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.6)]">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-all ${
              isActive ? 'text-[#38BDF8] shadow-glow-sm' : 'text-[#8295B0] hover:text-white'
            }`
          }
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </NavLink>
        <NavLink
          to="/notes"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-all ${
              isActive ? 'text-[#38BDF8] shadow-glow-sm' : 'text-[#8295B0] hover:text-white'
            }`
          }
        >
          <StickyNote className="w-4 h-4" />
          <span>Notes</span>
        </NavLink>
        <NavLink
          to="/english-daily"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-all ${
              isActive ? 'text-[#38BDF8] shadow-glow-sm' : 'text-[#8295B0] hover:text-white'
            }`
          }
        >
          <BookA className="w-4 h-4" />
          <span>English</span>
        </NavLink>
        <NavLink
          to="/journal"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-all ${
              isActive ? 'text-[#38BDF8] shadow-glow-sm' : 'text-[#8295B0] hover:text-white'
            }`
          }
        >
          <BookOpen className="w-4 h-4" />
          <span>Journal</span>
        </NavLink>
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-all text-[#8295B0] hover:text-white cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
