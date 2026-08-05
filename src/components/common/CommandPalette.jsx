import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../../store';

const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { setThemePreset } = useSettingsStore();
  const inputRef = useRef(null);

  const navigationCommands = [
    { title: '⚡ Go to Dashboard', icon: '✦', path: '/' },
    { title: '📓 Go to Journal', icon: '📓', path: '/journal' },
    { title: '🎯 Go to Goals', icon: '🎯', path: '/goals' },
    { title: '💻 Go to Coding Hub', icon: '💻', path: '/coding' },
    { title: '🎬 Go to Movies Tracker', icon: '🎬', path: '/movies' },
    { title: '👔 Go to Wardrobe Studio', icon: '👔', path: '/wardrobe' },
    { title: '🏋️ Go to Gym Workouts', icon: '🏋️', path: '/gym' },
    { title: '🎓 Go to College Tracker', icon: '🎓', path: '/college' },
    { title: '💰 Go to Expenses', icon: '💰', path: '/expenses' },
    { title: '📅 Go to Calendar', icon: '📅', path: '/calendar' },
    { title: '📊 Go to Analytics', icon: '📊', path: '/analytics' },
    { title: '⚙️ Go to Settings', icon: '⚙️', path: '/settings' },
  ];

  const themeCommands = [
    { title: '🎨 Theme: Paper Neo-Brutalist (Default)', preset: 'paper' },
    { title: '🎨 Theme: Cyber Dark', preset: 'dark' },
    { title: '🎨 Theme: Cobalt Blue', preset: 'cobalt' },
    { title: '🎨 Theme: Cyber Amber', preset: 'amber' },
    { title: '🎨 Theme: Electric Violet', preset: 'violet' },
    { title: '🎨 Theme: Emerald Mint', preset: 'emerald' },
    { title: '🎨 Theme: Crimson Red', preset: 'crimson' }
  ];

  const allItems = [
    ...navigationCommands.map(item => ({ ...item, type: 'nav' })),
    ...themeCommands.map(item => ({ ...item, type: 'theme' }))
  ];

  const filteredItems = allItems.filter(item =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else window.dispatchEvent(new CustomEvent('open-command-palette'));
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          executeCommand(filteredItems[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex]);

  const executeCommand = (item) => {
    if (item.type === 'nav') {
      navigate(item.path);
    } else if (item.type === 'theme') {
      setThemePreset(item.preset);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--bg2)',
          border: '3px solid var(--border)',
          boxShadow: '8px 8px 0px var(--border)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2.5px solid var(--border)', padding: '12px 16px' }}>
          <span style={{ fontSize: '1.2rem', marginRight: '10px' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search... (Esc to close)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text)',
              fontSize: '1rem',
              fontWeight: '700'
            }}
          />
          <span className="badge" style={{ background: 'var(--bg4)', fontSize: '0.7rem' }}>ESC</span>
        </div>

        <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px 0' }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text2)', fontWeight: '700' }}>
              No commands found for "{query}"
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={idx}
                  onClick={() => executeCommand(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    padding: '10px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--yellow)' : 'transparent',
                    color: 'var(--text)',
                    fontWeight: isSelected ? '900' : '700',
                    borderLeft: isSelected ? '4px solid var(--border)' : '4px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {item.icon && <span>{item.icon}</span>}
                    <span>{item.title}</span>
                  </div>
                  {isSelected && <span style={{ fontSize: '0.75rem', fontWeight: 900 }}>↵ ENTER</span>}
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: '8px 16px', background: 'var(--bg4)', borderTop: '2px solid var(--border)', fontSize: '0.75rem', fontWeight: 800, display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
          <span>Navigation: ↑↓ Navigate | ↵ Select</span>
          <span>Shortcut: Ctrl + K</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
