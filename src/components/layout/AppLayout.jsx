import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { CommandPalette } from '../command/CommandPalette';
import { SettingsModal } from '../settings/SettingsModal';
import { AuthModal } from '../auth/AuthModal';
import { useData } from '../../context/DataContext';

export function AppLayout() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const openSettings = () => setIsSettingsOpen(true);

  const { isAuthModalOpen, setIsAuthModalOpen, syncWithCloud } = useData();
  const openAuth = () => setIsAuthModalOpen(true);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#030712] text-zinc-100 font-sans">
      <Sidebar onOpenSettings={openSettings} onOpenAuth={openAuth} />
      <MobileNav onOpenSettings={openSettings} onOpenAuth={openAuth} />
      <CommandPalette onOpenSettings={openSettings} onOpenAuth={openAuth} />
      <main className="flex-1 min-w-0 pb-20 md:pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-8 w-full min-w-0">
          <Outlet context={{ openSettings, openAuth }} />
        </div>
      </main>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onOpenAuth={openAuth} />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSyncSuccess={syncWithCloud}
      />
    </div>
  );
}
