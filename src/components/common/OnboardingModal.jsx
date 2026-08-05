import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store';

const ONBOARDING_KEY = 'victoros_onboarding_completed';

const OnboardingModal = () => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;

    // For Guest Demo users, ALWAYS show the onboarding modal on session start as requested!
    if (user.isGuest || user.uid === 'guest_user') {
      setIsOpen(true);
      setStep(0);
    } else {
      // For real users, show once unless completed
      const completed = localStorage.getItem(ONBOARDING_KEY);
      if (!completed) {
        setIsOpen(true);
      }
    }
  }, [user]);

  const handleClose = () => {
    setIsOpen(false);
    if (user && !user.isGuest && user.uid !== 'guest_user') {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }
  };

  const steps = [
    {
      title: '👋 Welcome to ASTER OS',
      subtitle: 'Personal Life Operating System',
      badge: '⚡ GETTING STARTED',
      color: 'var(--yellow)',
      content: (
        <div>
          <p style={{ fontWeight: 700, marginBottom: '16px', lineHeight: '1.6' }}>
            Aster OS is your unified personal command center designed to organize goals, daily journal entries, workouts, wardrobe, coding activity, and watchlists in one place.
          </p>
          <div style={{ padding: '14px', background: 'var(--bg)', border: '2px solid var(--border)', fontWeight: 800, fontSize: '0.85rem' }}>
            💡 Tip: You can press <kbd style={{ background: 'var(--bg2)', padding: '2px 6px', border: '1px solid var(--border)' }}>Ctrl + K</kbd> at any time to open the Command Palette and jump anywhere!
          </div>
        </div>
      )
    },
    {
      title: '🎯 Goal Milestones & Daily Tasks',
      subtitle: 'Track Long-term Objectives & Daily Action Items',
      badge: '🎯 MILESTONES',
      color: '#D1FAE5',
      content: (
        <div>
          <p style={{ fontWeight: 700, marginBottom: '14px', lineHeight: '1.5' }}>
            Break down big ambitions into actionable target dates and sub-milestones. Track progress visually as you complete checklist tasks.
          </p>
          <ul style={{ fontWeight: 800, fontSize: '0.88rem', paddingLeft: '20px', lineHeight: '1.8' }}>
            <li>Categories: Career, Health, Finance, Short Term & Long Term</li>
            <li>Interactive Progress Bar & Automated Status updates</li>
          </ul>
        </div>
      )
    },
    {
      title: '💻 Coding Hub & Platform Integration',
      subtitle: 'LeetCode GraphQL Sync & GitHub Activity Streams',
      badge: '💻 CODING',
      color: '#FEF3C7',
      content: (
        <div>
          <p style={{ fontWeight: 700, marginBottom: '14px', lineHeight: '1.5' }}>
            Sync your LeetCode problem-solving stats and GitHub commit activity in real time.
          </p>
          <ul style={{ fontWeight: 800, fontSize: '0.88rem', paddingLeft: '20px', lineHeight: '1.8' }}>
            <li>LeetCode GraphQL: Real-time streak tracking & recent submission log</li>
            <li>GitHub REST API: Daily PushEvent commit frequency wave chart</li>
            <li>LeetCode Problem Log for revising key algorithm patterns</li>
          </ul>
        </div>
      )
    },
    {
      title: '📓 Sleep & Daily Journal',
      subtitle: 'Track Sleep Quality, Habits & Gratitude',
      badge: '📓 JOURNAL',
      color: '#FEE2E2',
      content: (
        <div>
          <p style={{ fontWeight: 700, marginBottom: '14px', lineHeight: '1.5' }}>
            Monitor your daily physical and mental well-being with rapid daily logs.
          </p>
          <ul style={{ fontWeight: 800, fontSize: '0.88rem', paddingLeft: '20px', lineHeight: '1.8' }}>
            <li>Mood, Sleep Duration & Water Intake Tracker</li>
            <li>Daily Gratitude & Key Accomplishment Notes</li>
          </ul>
        </div>
      )
    },
    {
      title: '🎬 IMDb Movies & 👔 Wardrobe Studio',
      subtitle: 'Personal Watchlists & Wardrobe Outfits',
      badge: '⚡ PRODUCTIVITY & STYLES',
      color: '#EDE9FE',
      content: (
        <div>
          <p style={{ fontWeight: 700, marginBottom: '14px', lineHeight: '1.5' }}>
            Keep track of movies you want to watch and build custom outfits for any season or occasion.
          </p>
          <div style={{ padding: '14px', background: 'var(--bg)', border: '2.5px solid var(--border)', fontWeight: 900, textAlign: 'center' }}>
            🚀 You are all set to explore ASTER OS!
          </div>
        </div>
      )
    }
  ];

  if (!isOpen) return null;

  const current = steps[step];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: '32px 28px',
          background: 'var(--bg2)',
          border: '3.5px solid var(--border)',
          boxShadow: '10px 10px 0px var(--border)',
          position: 'relative'
        }}
      >
        {/* Step Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span className="badge" style={{ background: current.color, color: 'var(--text)', fontSize: '0.8rem', border: '2px solid var(--border)', padding: '6px 12px' }}>
            {current.badge}
          </span>
          <span style={{ fontWeight: 900, fontSize: '0.85rem', color: 'var(--text2)' }}>
            STEP {step + 1} OF {steps.length}
          </span>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '6px', color: 'var(--text)' }}>
          {current.title}
        </h2>
        <p className="text-muted" style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '24px', textTransform: 'uppercase' }}>
          {current.subtitle}
        </p>

        <div style={{ marginBottom: '32px', minHeight: '130px' }}>
          {current.content}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '2.5px solid var(--border)' }}>
          {step > 0 ? (
            <button className="btn btn-secondary btn-sm" onClick={() => setStep(step - 1)}>
              ← PREVIOUS
            </button>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={handleClose}>
              SKIP TOUR
            </button>
          )}

          {step < steps.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setStep(step + 1)}>
              NEXT STEP →
            </button>
          ) : (
            <button className="btn btn-yellow" onClick={handleClose}>
              🚀 START EXPLORING
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
