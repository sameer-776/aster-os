import React from 'react';
import { useAuthStore, useSettingsStore } from '../../store';
import { SearchIcon, MenuIcon } from '../common/Icons';

const Topbar = ({ onMenuToggle }) => {
  const { user, logout } = useAuthStore();
  const { username } = useSettingsStore();

  const displayName = username || (user ? user.email.split('@')[0] : 'Commander');

  return (
    <header className="topbar">
      <button className="menu-toggle" onClick={onMenuToggle} title="Toggle Sidebar">
        <MenuIcon size={20} />
      </button>

      <div 
        className="topbar-search" 
        onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
        style={{ cursor: 'pointer' }}
      >
        <SearchIcon size={16} />
        <input 
          type="text" 
          placeholder="Search commands & pages... (Ctrl+K)" 
          readOnly
          style={{ cursor: 'pointer' }}
        />
        <kbd>Ctrl+K</kbd>
      </div>

      <div className="topbar-actions">
        <span className="user-badge">👤 {displayName}</span>
        {user && (
          <button className="btn btn-danger btn-sm" onClick={logout}>
            LOGOUT
          </button>
        )}
      </div>
    </header>
  );
};

export default Topbar;
