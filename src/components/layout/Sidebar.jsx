import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import WarmTooltip, { WarmTooltipGroup } from '../ui/WarmTooltip';
import {
  Home,
  BookOpen,
  StickyNote,
  BookA,
  Settings,
  Flame,
  Cloud,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: Home, shortcut: '⌘1' },
  { path: '/notes', label: 'Notes', icon: StickyNote, shortcut: '⌘2' },
  { path: '/english-daily', label: 'English Daily', icon: BookA, shortcut: '⌘3' },
  { path: '/journal', label: 'Journal', icon: BookOpen, shortcut: '⌘4' },
];

export function Sidebar({ onOpenSettings, onOpenAuth }) {
  const { currentUser, isSyncing } = useData();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('kurama_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('kurama_sidebar_collapsed', String(next));
      } catch (err) {
        // ignore
      }
      return next;
    });
  };

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 border-r border-[#15233C] bg-[#060A14]/92 backdrop-blur-2xl h-screen sticky top-0 py-5 select-none transition-all duration-300 ease-in-out z-30 shadow-[4px_0_30px_rgba(0,0,0,0.7)] ${
        isCollapsed ? 'w-[72px] px-2.5' : 'w-60 px-3.5'
      } justify-between relative overflow-hidden`}
    >
      {/* Top ambient radiant sky-blue light cone */}
      <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-[#38BDF8]/15 via-[#0EA5E9]/5 to-transparent pointer-events-none" />

      <div className="relative z-10">
        {/* Brand & Collapse Toggle */}
        <div className={`mb-6 flex items-center ${isCollapsed ? 'justify-center flex-col gap-3' : 'justify-between px-1.5'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#38BDF8] via-[#0EA5E9] to-[#0284C7] flex items-center justify-center text-black shadow-[0_0_22px_rgba(56,189,248,0.6)] shrink-0 transition-transform hover:scale-105 active:scale-95 cursor-pointer">
              <Flame className="w-5 h-5 fill-current stroke-[2.5]" />
            </div>
            {!isCollapsed && (
              <span className="text-base font-black tracking-tight text-white font-sans animate-in fade-in duration-200">
                Kurama
              </span>
            )}
          </div>

          <WarmTooltip
            content={isCollapsed ? 'Expand Sidebar' : 'Collapse to Rail'}
            side={isCollapsed ? 'right' : 'bottom'}
            surfaceColor="#0A1222"
            inkColor="#F1F5F9"
          >
            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-1.5 rounded-xl border border-[#16233B] bg-[#0A1222]/80 text-[#8295B0] hover:text-[#38BDF8] hover:border-[#38BDF8]/40 hover:bg-[#38BDF8]/10 transition-all active:scale-95 shadow-sm"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse to rail'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </WarmTooltip>
        </div>

        {/* Navigation list with WarmTooltipGroup */}
        <WarmTooltipGroup delay={200} warmWindow={260} travel={280} lean={2}>
          <nav className="space-y-1.5">
            {NAV_ITEMS.map(({ path, label, icon: Icon, shortcut }) => (
              <div key={path} className="relative">
                <WarmTooltip
                  content={label}
                  shortcut={shortcut}
                  side="right"
                  disabled={!isCollapsed}
                  surfaceColor="#0A1222"
                  inkColor="#F1F5F9"
                  arrow={true}
                  className="w-full block"
                >
                  <NavLink
                    to={path}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 rounded-xl text-xs font-semibold transition-all ${
                        isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5'
                      } ${
                        isActive
                          ? 'bg-gradient-to-r from-[#38BDF8]/20 via-[#38BDF8]/10 to-transparent text-[#38BDF8] border border-[#38BDF8]/40 shadow-[0_0_18px_rgba(56,189,248,0.22)]'
                          : 'text-[#8FA0BC] hover:text-white hover:bg-[#0D172A] hover:border hover:border-[#1E2E4A]/80'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && !isCollapsed && (
                          <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#38BDF8] shadow-[0_0_10px_#38BDF8]" />
                        )}
                        <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-[#38BDF8] scale-110' : ''}`} />
                        {!isCollapsed && (
                          <span className="animate-in fade-in duration-200 truncate">{label}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                </WarmTooltip>
              </div>
            ))}
          </nav>
        </WarmTooltipGroup>
      </div>

      {/* Cloud Sync & Settings at bottom */}
      <div className="pt-3 border-t border-[#15233C] space-y-2 relative z-10">
        {/* Cloud Sync Button */}
        <WarmTooltip
          content={currentUser ? `Cloud Synced: ${currentUser.email}` : 'Connect Supabase Cloud'}
          side="right"
          disabled={!isCollapsed}
          surfaceColor="#0A1222"
          inkColor="#F1F5F9"
          className="w-full block"
        >
          <button
            type="button"
            onClick={onOpenAuth}
            className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all border ${
              isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
            } ${
              currentUser
                ? 'bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/40 hover:bg-[#38BDF8]/20 shadow-[0_0_14px_rgba(56,189,248,0.25)]'
                : 'border-[#15233C] bg-[#0A1222]/60 text-[#8FA0BC] hover:text-white hover:border-[#38BDF8]/30 hover:bg-[#0E192E]'
            }`}
            aria-label={currentUser ? `Cloud Sync Active (${currentUser.email})` : 'Connect Supabase Cloud Sync'}
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="relative">
                <Cloud className={`w-4 h-4 shrink-0 ${currentUser ? 'text-[#38BDF8]' : 'text-[#8FA0BC]'}`} />
                {currentUser && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
              {!isCollapsed && (
                <span className="truncate">
                  {currentUser ? currentUser.email.split('@')[0] : 'Cloud Sync'}
                </span>
              )}
            </div>
            {!isCollapsed && currentUser && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
          </button>
        </WarmTooltip>

        {/* Settings button */}
        <WarmTooltip
          content="Settings & Preferences"
          shortcut="⌘,"
          side="right"
          disabled={!isCollapsed}
          surfaceColor="#0A1222"
          inkColor="#F1F5F9"
          className="w-full block"
        >
          <button
            type="button"
            onClick={onOpenSettings}
            className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all group ${
              isCollapsed ? 'justify-center p-3' : 'gap-2.5 px-3 py-2.5'
            } border border-[#15233C] bg-[#0A1222]/60 text-[#8FA0BC] hover:text-white hover:border-[#38BDF8]/30 hover:bg-[#0E192E]`}
            aria-label="Open Settings"
          >
            <Settings className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:rotate-45 group-hover:text-[#38BDF8]" />
            {!isCollapsed && <span className="animate-in fade-in duration-200">Settings</span>}
          </button>
        </WarmTooltip>

        {!isCollapsed && (
          <div className="px-1.5 pt-1 text-[10px] text-[#64748B] flex items-center justify-between font-mono animate-in fade-in">
            <span>Palette</span>
            <kbd className="px-1.5 py-0.5 rounded border border-[#1A2744] bg-[#090F1C] text-[#38BDF8] font-bold text-[9px]">
              ⌘K
            </kbd>
          </div>
        )}
      </div>
    </aside>
  );
}
