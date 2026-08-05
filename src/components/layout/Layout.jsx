import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CommandPalette from '../common/CommandPalette';
import OnboardingModal from '../common/OnboardingModal';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleOpenCP = () => setCommandPaletteOpen(true);
    window.addEventListener('open-command-palette', handleOpenCP);
    return () => window.removeEventListener('open-command-palette', handleOpenCP);
  }, []);

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main">
        <Topbar onMenuToggle={() => setSidebarOpen(prev => !prev)} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <OnboardingModal />
    </div>
  );
};

export default Layout;
