import { useEffect, useState, useMemo } from 'react';
import { useGymStore } from '../store';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import { TrashIcon, PlusIcon } from '../components/common/Icons';

const getLocalYMD = (dateObj = new Date()) => {
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
};

const MOTIVATION_QUOTES = [
  "Discipline beats motivation every single time.",
  "Small daily improvements over time lead to stunning results.",
  "Action drives inspiration, not the other way around.",
  "Pain is temporary. Pride is forever.",
  "Your body can stand almost anything. It's your mind that you have to convince."
];

const SPLITS = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Cardio', 'Rest'];

const Gym = () => {
  const {
    workouts,
    bodyWeightLogs,
    loading,
    activeWorkout,
    prCelebration,
    fetchWorkouts,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    startLiveWorkout,
    updateLiveWorkout,
    finishLiveWorkout,
    cancelLiveWorkout,
    logBodyWeight,
    clearPRCelebration,
    getPersonalRecords,
    getWorkoutStreak
  } = useGymStore();

  // Quote index state
  const [quoteIdx, setQuoteIdx] = useState(0);

  // Structured Workout Logger State (for Logging new daily entry OR updating existing entry)
  const [isLoggerOpen, setIsLoggerOpen] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState(null);
  const [logDate, setLogDate] = useState(getLocalYMD());
  const [logSplit, setLogSplit] = useState('Push');
  const [logDuration, setLogDuration] = useState('50');
  const [logExercises, setLogExercises] = useState([
    { name: 'Bench Press', weight: 80, sets: 4, reps: 10, notes: '' },
    { name: 'Incline Dumbbell Press', weight: 28, sets: 3, reps: 12, notes: '' }
  ]);

  // Workout History View Details Modal State
  const [viewDetailsWorkout, setViewDetailsWorkout] = useState(null);

  // Body Weight Input State
  const [weightInput, setWeightInput] = useState('');

  // 1RM Calculator State
  const [rmWeight, setRmWeight] = useState(100);
  const [rmReps, setRmReps] = useState(5);

  // Utility Rest Timer State
  const [restSeconds, setRestSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Load workouts on mount
  useEffect(() => {
    fetchWorkouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-rotate motivation quote
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIdx(prev => (prev + 1) % MOTIVATION_QUOTES.length);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Utility Rest Timer interval
  useEffect(() => {
    let interval = null;
    if (timerActive && restSeconds > 0) {
      interval = setInterval(() => setRestSeconds(prev => prev - 1), 1000);
    } else if (restSeconds === 0 && timerActive) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, restSeconds]);

  // Calculated Stats
  const personalRecords = useMemo(() => {
    const prs = {};
    if (!workouts) return prs;
    workouts.forEach(w => {
      if (w.exercises && Array.isArray(w.exercises)) {
        w.exercises.forEach(ex => {
          const name = ex.name?.trim();
          const weight = Number(ex.weight) || 0;
          if (name && weight > 0) {
            if (!prs[name] || weight > prs[name]) {
              prs[name] = weight;
            }
          }
        });
      }
    });
    return prs;
  }, [workouts]);

  const streak = useMemo(() => {
    if (!workouts || workouts.length === 0) return 0;
    const dates = [...new Set(workouts.map(w => w.date))].filter(Boolean).sort().reverse();
    const today = getLocalYMD();
    const yesterday = getLocalYMD(new Date(Date.now() - 86400000));

    let checkDate = dates.includes(today) ? today : (dates.includes(yesterday) ? yesterday : null);
    if (!checkDate) return 0;

    let count = 0;
    let curr = new Date(checkDate);
    while (true) {
      const formatted = getLocalYMD(curr);
      if (dates.includes(formatted)) {
        count++;
        curr.setDate(curr.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [workouts]);

  const prCount = Object.keys(personalRecords).length;

  const currentWeight = useMemo(() => {
    if (bodyWeightLogs.length === 0) return 77.0;
    return bodyWeightLogs[bodyWeightLogs.length - 1].weight;
  }, [bodyWeightLogs]);

  const monthlyWorkoutsCount = useMemo(() => {
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return workouts.filter(w => w.date && w.date.startsWith(currentMonthPrefix)).length;
  }, [workouts]);

  const totalVolumeLifted = useMemo(() => {
    return workouts.reduce((sum, w) => sum + (Number(w.totalVolume) || 0), 0);
  }, [workouts]);

  // 1RM Calculations
  const estimated1RM = Math.round(rmWeight * (1 + rmReps / 30));
  const getStrengthCategory = (oneRM) => {
    if (oneRM < 60) return { category: 'Beginner', badge: 'badge-blue' };
    if (oneRM < 95) return { category: 'Intermediate', badge: 'badge-yellow' };
    if (oneRM < 130) return { category: 'Advanced', badge: 'badge-orange' };
    return { category: 'Elite', badge: 'badge-purple' };
  };
  const strengthCat = getStrengthCategory(estimated1RM);

  const predictedSets = [
    { pct: '95%', reps: '1 Rep', weight: Math.round(estimated1RM * 0.95) },
    { pct: '90%', reps: '3 Reps', weight: Math.round(estimated1RM * 0.90) },
    { pct: '85%', reps: '5 Reps', weight: Math.round(estimated1RM * 0.85) },
    { pct: '80%', reps: '8 Reps', weight: Math.round(estimated1RM * 0.80) },
    { pct: '75%', reps: '10 Reps', weight: Math.round(estimated1RM * 0.75) }
  ];

  // Open Logger for New Entry
  const handleOpenNewLogger = () => {
    setEditingWorkoutId(null);
    setLogDate(getLocalYMD());
    setLogSplit('Push');
    setLogDuration('50');
    setLogExercises([
      { name: 'Bench Press', weight: 80, sets: 4, reps: 10, notes: '' },
      { name: 'Incline Dumbbell Press', weight: 28, sets: 3, reps: 12, notes: '' }
    ]);
    setIsLoggerOpen(true);
  };

  // Open Logger to Edit / Update Existing Entry
  const handleOpenEditLogger = (workout) => {
    setEditingWorkoutId(workout.id);
    setLogDate(workout.date || getLocalYMD());
    setLogSplit(workout.split || 'Push');
    setLogDuration(String(workout.duration || 45));
    if (workout.exercises && Array.isArray(workout.exercises) && workout.exercises.length > 0) {
      setLogExercises(workout.exercises.map(ex => ({
        name: ex.name || '',
        weight: Number(ex.weight) || 0,
        sets: Number(ex.sets) || 3,
        reps: Number(ex.reps) || 10,
        notes: ex.notes || ''
      })));
    } else {
      setLogExercises([
        { name: 'Exercise 1', weight: 60, sets: 3, reps: 10, notes: workout.notes || '' }
      ]);
    }
    setIsLoggerOpen(true);
  };

  // Exercise Logger row handlers
  const handleAddExerciseRow = () => {
    setLogExercises(prev => [...prev, { name: '', weight: 50, sets: 3, reps: 10, notes: '' }]);
  };

  const handleUpdateExerciseRow = (index, field, value) => {
    setLogExercises(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveExerciseRow = (index) => {
    setLogExercises(prev => prev.filter((_, i) => i !== index));
  };

  // Save Workout Entry (Create or Update)
  const handleSaveWorkoutEntry = async (e) => {
    e.preventDefault();
    const workoutPayload = {
      date: logDate,
      split: logSplit,
      duration: Number(logDuration) || 45,
      exercises: logExercises.filter(ex => ex.name.trim() !== '')
    };

    if (editingWorkoutId) {
      await updateWorkout(editingWorkoutId, workoutPayload);
    } else {
      await addWorkout(workoutPayload);
    }

    setIsLoggerOpen(false);
  };

  // Handle Body Weight Submit
  const handleSaveBodyWeight = (e) => {
    e.preventDefault();
    if (!weightInput) return;
    logBodyWeight(weightInput);
    setWeightInput('');
  };

  // Achievements calculation
  const achievementsList = [
    { title: 'First Workout', desc: 'Log your first workout', icon: '🏋️', unlocked: workouts.length >= 1 },
    { title: '7 Day Streak', desc: 'Train for 7 consecutive days', icon: '🔥', unlocked: streak >= 7 },
    { title: 'Bench 100kg', desc: 'Hit a 100kg Bench Press', icon: '💪', unlocked: (personalRecords['Bench Press'] || 0) >= 100 },
    { title: '100,000kg Lifted', desc: 'Lift a cumulative total of 100k kg', icon: '⚡', unlocked: totalVolumeLifted >= 100000 },
    { title: '50 Workouts', desc: 'Complete 50 workout sessions', icon: '🏅', unlocked: workouts.length >= 50 },
    { title: 'Iron Warrior', desc: 'Complete 10 workouts in a month', icon: '🛡️', unlocked: monthlyWorkoutsCount >= 10 }
  ];

  // Graph Data
  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - 86400000 * i);
      const ymd = getLocalYMD(d);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const count = workouts.filter(w => w.date === ymd).length;
      days.push({ label: dayLabel, count, ymd });
    }
    return days;
  }, [workouts]);

  const splitDist = useMemo(() => {
    const counts = {};
    workouts.forEach(w => {
      const s = w.split || 'Other';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [workouts]);

  const volumeTrend = useMemo(() => {
    return workouts.slice(0, 5).reverse().map(w => ({
      label: w.date.slice(5),
      volume: Math.round((w.totalVolume || 0) / 100) / 10 // in thousands
    }));
  }, [workouts]);

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* HEADER & MOTIVATION BAR */}
      <div className="page-header flex flex-between align-center mb-24" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            🏋️ PERSONAL FITNESS OS
          </h1>
          <p className="text-muted" style={{ margin: '4px 0 0', fontWeight: 800, fontSize: '0.85rem' }}>
            Action-Oriented Daily Workout Companion & Performance Tracker
          </p>
        </div>

        {/* Motivation Card */}
        <Card style={{ background: 'var(--yellow)', border: 'var(--bw) solid var(--border)', padding: '12px 18px', maxWidth: '420px' }} className="btn-press-anim">
          <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text)', marginBottom: '2px' }}>
            💡 Today's Discipline Quote
          </div>
          <div style={{ fontWeight: 800, fontSize: '0.88rem', fontStyle: 'italic' }}>
            "{MOTIVATION_QUOTES[quoteIdx]}"
          </div>
        </Card>
      </div>

      {/* 1. TODAY'S WORKOUT HERO SECTION (LARGEST COMPONENT) */}
      <Card className="mb-24 card-hover-lift" style={{ background: 'var(--bg2)', border: '3px solid var(--border)', boxShadow: '7px 7px 0px var(--border)', padding: '24px' }}>
        <div className="flex flex-between align-center mb-16" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span className="badge-blue" style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TODAY'S WORKOUT TARGET
            </span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, margin: '8px 0 4px', textTransform: 'uppercase' }}>
              {activeWorkout ? `${activeWorkout.split} DAY (LIVE ACTIVE)` : 'PUSH DAY - CHEST & TRICEPS'}
            </h2>
            <p className="text-muted" style={{ fontWeight: 800, fontSize: '0.9rem', margin: 0 }}>
              {activeWorkout ? 'Session in progress! Push for every rep.' : 'Target: Hypertrophy & Strength Focus • 4 Exercises Scheduled'}
            </p>
          </div>

          <div className="flex gap-12" style={{ flexWrap: 'wrap' }}>
            {activeWorkout ? (
              <Button
                variant="primary"
                size="lg"
                className="btn-press-anim"
                style={{ background: 'var(--orange)', color: 'var(--text)', fontWeight: 900, fontSize: '1.1rem', padding: '14px 28px', border: '3px solid var(--border)' }}
                onClick={() => {}}
              >
                🔥 CONTINUE WORKOUT
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className="btn-press-anim"
                style={{ background: 'var(--accent)', color: '#FFF', fontWeight: 900, fontSize: '1.1rem', padding: '14px 28px', border: '3px solid var(--border)' }}
                onClick={() => startLiveWorkout('Push')}
              >
                ⚡ START WORKOUT
              </Button>
            )}

            <Button
              variant="ghost"
              size="lg"
              className="btn-press-anim"
              style={{ fontWeight: 800, border: '2px solid var(--border)' }}
              onClick={handleOpenNewLogger}
              icon={<PlusIcon />}
            >
              Log Daily Entry
            </Button>
          </div>
        </div>

        {/* Hero Quick Metrics */}
        <div className="grid-4 gap-16 mt-20" style={{ background: 'var(--bg)', padding: '16px', border: '2px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--text2)', textTransform: 'uppercase' }}>Current Split</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent)' }}>{activeWorkout ? activeWorkout.split : 'Push Day'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--text2)', textTransform: 'uppercase' }}>Duration Goal</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>60 Mins</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--text2)', textTransform: 'uppercase' }}>Exercises Planned</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>4 Exercises</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--text2)', textTransform: 'uppercase' }}>Est. Burn</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--green)' }}>~420 kcal</div>
          </div>
        </div>
      </Card>

      {/* 2. QUICK STATS ROW */}
      <div className="grid-4 gap-16 mb-24">
        <Card className="card-hover-lift" style={{ background: 'var(--bg2)', border: '2px solid var(--border)' }}>
          <div className="flex flex-between align-center mb-8">
            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text2)', textTransform: 'uppercase' }}>Current Weight</span>
            <span style={{ fontSize: '1.3rem' }}>⚖️</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text)' }}>{currentWeight} <span style={{ fontSize: '1rem', color: 'var(--text2)' }}>kg</span></div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--green)', marginTop: '4px' }}>↓ 0.6 kg this month</div>
        </Card>

        <Card className="card-hover-lift" style={{ background: 'var(--bg2)', border: '2px solid var(--border)' }}>
          <div className="flex flex-between align-center mb-8">
            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text2)', textTransform: 'uppercase' }}>Workout Streak</span>
            <span style={{ fontSize: '1.3rem' }}>🔥</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--orange)' }}>{streak} <span style={{ fontSize: '1rem', color: 'var(--text2)' }}>Days</span></div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text2)', marginTop: '4px' }}>Consistent momentum</div>
        </Card>

        <Card className="card-hover-lift" style={{ background: 'var(--bg2)', border: '2px solid var(--border)' }}>
          <div className="flex flex-between align-center mb-8">
            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text2)', textTransform: 'uppercase' }}>Monthly Workouts</span>
            <span style={{ fontSize: '1.3rem' }}>📅</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent)' }}>{monthlyWorkoutsCount} <span style={{ fontSize: '1rem', color: 'var(--text2)' }}>Sessions</span></div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--green)', marginTop: '4px' }}>Target: 16 sessions/mo</div>
        </Card>

        <Card className="card-hover-lift" style={{ background: 'var(--bg2)', border: '2px solid var(--border)' }}>
          <div className="flex flex-between align-center mb-8">
            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text2)', textTransform: 'uppercase' }}>Personal Records</span>
            <span style={{ fontSize: '1.3rem' }}>🏆</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--purple)' }}>{prCount} <span style={{ fontSize: '1rem', color: 'var(--text2)' }}>PRs</span></div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text2)', marginTop: '4px' }}>Best: Bench 100kg</div>
        </Card>
      </div>

      {/* 3. LIVE WORKOUT MODE DASHBOARD (WHEN ACTIVE) */}
      {activeWorkout && (
        <Card className="mb-24 live-workout-hero" style={{ padding: '24px' }}>
          <div className="flex flex-between align-center mb-16" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="badge-yellow" style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 900 }}>
                ● LIVE ACTIVE WORKOUT MODE
              </span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '8px 0 0', textTransform: 'uppercase', color: '#FFF' }}>
                CURRENT EXERCISE: {activeWorkout.exercises[activeWorkout.currentExerciseIndex]?.name || 'Bench Press'}
              </h2>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={cancelLiveWorkout}
              style={{ background: 'var(--red)', color: '#FFF', fontWeight: 800 }}
            >
              Cancel Workout
            </Button>
          </div>

          <div className="grid-4 gap-16 mb-20">
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 800 }}>CURRENT WEIGHT</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FACC15' }}>
                {activeWorkout.exercises[activeWorkout.currentExerciseIndex]?.weight || 80} KG
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 800 }}>CURRENT SET</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38BDF8' }}>
                {activeWorkout.currentSet} / {activeWorkout.exercises[activeWorkout.currentExerciseIndex]?.sets || 4}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 800 }}>REST TIMER</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#4ADE80' }}>
                01:30
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 800 }}>NEXT EXERCISE</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {activeWorkout.exercises[activeWorkout.currentExerciseIndex + 1]?.name || 'Incline Dumbbell Press'}
              </div>
            </div>
          </div>

          <div className="flex gap-12 flex-center" style={{ flexWrap: 'wrap' }}>
            <Button
              size="lg"
              className="btn-press-anim"
              style={{ background: 'var(--yellow)', color: 'var(--text)', fontWeight: 900, padding: '12px 24px', border: '2px solid var(--border)' }}
              onClick={() => {
                const currentEx = activeWorkout.exercises[activeWorkout.currentExerciseIndex];
                if (currentEx) {
                  updateLiveWorkout({
                    exercises: activeWorkout.exercises.map((ex, idx) => 
                      idx === activeWorkout.currentExerciseIndex ? { ...ex, reps: (ex.reps || 10) + 1 } : ex
                    )
                  });
                }
              }}
            >
              + REP
            </Button>

            <Button
              size="lg"
              className="btn-press-anim"
              style={{ background: 'var(--green)', color: 'var(--text)', fontWeight: 900, padding: '12px 24px', border: '2px solid var(--border)' }}
              onClick={() => {
                updateLiveWorkout({ currentSet: activeWorkout.currentSet + 1 });
              }}
            >
              + SET
            </Button>

            <Button
              size="lg"
              className="btn-press-anim"
              style={{ background: 'var(--accent)', color: '#FFF', fontWeight: 900, padding: '12px 24px', border: '2px solid var(--border)' }}
              onClick={() => {
                if (activeWorkout.currentExerciseIndex + 1 < activeWorkout.exercises.length) {
                  updateLiveWorkout({
                    currentExerciseIndex: activeWorkout.currentExerciseIndex + 1,
                    currentSet: 1
                  });
                }
              }}
            >
              NEXT EXERCISE →
            </Button>

            <Button
              size="lg"
              className="btn-press-anim"
              style={{ background: 'var(--purple)', color: '#FFF', fontWeight: 900, padding: '12px 24px', border: '2px solid var(--border)' }}
              onClick={finishLiveWorkout}
            >
              🏆 FINISH WORKOUT
            </Button>
          </div>
        </Card>
      )}

      {/* 4. PROGRESS CHARTS / ANALYTICS DASHBOARD */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '16px', textTransform: 'uppercase' }}>
        📈 PERFORMANCE ANALYTICS DASHBOARD
      </h2>

      <div className="grid-2 gap-20 mb-24">
        {/* Weekly Workout Frequency */}
        <Card style={{ background: 'var(--bg2)', border: '2px solid var(--border)' }} className="card-hover-lift">
          <h3 className="card-title flex flex-center gap-8 mb-16">
            <span>🏋️</span> WEEKLY WORKOUT FREQUENCY
          </h3>
          <div style={{ height: '140px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '8px', paddingBottom: '8px', borderBottom: '2px solid var(--border)' }}>
            {last7Days.map((d, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div 
                  style={{ 
                    width: '100%', 
                    maxWidth: '32px',
                    height: `${d.count > 0 ? 100 : 12}px`, 
                    background: d.count > 0 ? 'var(--accent)' : 'var(--bg4)', 
                    border: '2px solid var(--border)',
                    transition: 'height 0.3s ease' 
                  }}
                  title={`${d.label}: ${d.count} workouts`}
                />
                <span style={{ fontSize: '0.7rem', fontWeight: 800, marginTop: '6px' }}>{d.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Workout Split Distribution */}
        <Card style={{ background: 'var(--bg2)', border: '2px solid var(--border)' }} className="card-hover-lift">
          <h3 className="card-title flex flex-center gap-8 mb-16">
            <span>🍕</span> WORKOUT SPLIT DISTRIBUTION
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {splitDist.length === 0 ? (
              <div className="text-muted text-center" style={{ padding: '20px' }}>No split data logged yet.</div>
            ) : (
              splitDist.map((item, idx) => {
                const colors = ['var(--accent)', 'var(--green)', 'var(--purple)', 'var(--yellow)', 'var(--orange)'];
                const color = colors[idx % colors.length];
                const pct = Math.round((item.count / workouts.length) * 100);
                return (
                  <div key={item.name}>
                    <div className="flex flex-between mb-4" style={{ fontSize: '0.8rem', fontWeight: 800 }}>
                      <span>{item.name}</span>
                      <span>{item.count} sessions ({pct}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: 'var(--bg4)', border: '1.5px solid var(--border)' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <div className="grid-2 gap-20 mb-24">
        {/* Total Weight Lifted Volume Trend */}
        <Card style={{ background: 'var(--bg2)', border: '2px solid var(--border)' }} className="card-hover-lift">
          <h3 className="card-title flex flex-center gap-8 mb-16">
            <span>💪</span> TOTAL VOLUME LIFTED TREND (1K KG)
          </h3>
          <div style={{ height: '140px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '12px', paddingBottom: '8px', borderBottom: '2px solid var(--border)' }}>
            {volumeTrend.map((v, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div 
                  style={{ 
                    width: '100%', 
                    maxWidth: '40px',
                    height: `${Math.min(120, Math.max(16, v.volume * 12))}px`, 
                    background: 'var(--purple)', 
                    border: '2px solid var(--border)' 
                  }}
                  title={`${v.label}: ${v.volume}k kg`}
                />
                <span style={{ fontSize: '0.7rem', fontWeight: 800, marginTop: '6px' }}>{v.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Body Weight Trend & Logger */}
        <Card style={{ background: 'var(--bg2)', border: '2px solid var(--border)' }} className="card-hover-lift">
          <div className="flex flex-between align-center mb-12">
            <h3 className="card-title flex flex-center gap-8" style={{ margin: 0 }}>
              <span>⚖️</span> BODY WEIGHT TREND
            </h3>
            <form onSubmit={handleSaveBodyWeight} className="flex gap-8">
              <input
                type="number"
                step="0.1"
                placeholder="Log kg"
                className="form-input"
                style={{ width: '90px', padding: '4px 8px' }}
                value={weightInput}
                onChange={e => setWeightInput(e.target.value)}
              />
              <Button type="submit" size="sm" variant="dark">Save</Button>
            </form>
          </div>

          <div style={{ height: '120px', display: 'flex', alignItems: 'flex-end', gap: '12px', paddingBottom: '8px', borderBottom: '2px solid var(--border)' }}>
            {bodyWeightLogs.slice(-6).map((log, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 900, marginBottom: '4px' }}>{log.weight}</div>
                <div 
                  style={{ 
                    width: '100%', 
                    maxWidth: '28px',
                    height: `${Math.max(15, (log.weight - 70) * 10)}px`, 
                    background: 'var(--green)', 
                    border: '2px solid var(--border)' 
                  }}
                />
                <span style={{ fontSize: '0.65rem', fontWeight: 800, marginTop: '6px' }}>{log.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 5. WORKOUT HISTORY SECTION */}
      <div className="flex flex-between align-center mb-16">
        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>
          📜 WORKOUT HISTORY & LOGGED ENTRIES
        </h2>
        <Button variant="primary" size="sm" onClick={handleOpenNewLogger} icon={<PlusIcon />}>
          Log Entry / Update Entry
        </Button>
      </div>

      <div className="grid-2 gap-16 mb-32">
        {loading ? (
          <Card className="empty-state">Loading workout history...</Card>
        ) : workouts.length === 0 ? (
          <Card className="empty-state" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontWeight: 900, marginBottom: '8px' }}>No workout history yet.</h3>
            <p className="text-muted mb-16">Start your first workout or log a daily entry to build momentum!</p>
            <Button variant="primary" onClick={handleOpenNewLogger}>Log First Workout</Button>
          </Card>
        ) : (
          workouts.map(workout => (
            <Card key={workout.id} className="card-hover-lift" style={{ background: 'var(--bg2)', border: '2px solid var(--border)', position: 'relative' }}>
              <div className="flex flex-between align-center mb-12">
                <div className="flex align-center gap-8">
                  <span className="badge-blue" style={{ fontWeight: 900, fontSize: '0.75rem', padding: '3px 8px' }}>
                    {workout.split || 'Push'}
                  </span>
                  {workout.isPR && (
                    <span className="badge-purple" style={{ fontWeight: 900, fontSize: '0.75rem', padding: '3px 8px' }}>
                      🔥 PR ACHIEVED
                    </span>
                  )}
                </div>
                <div className="text-muted" style={{ fontWeight: 800, fontSize: '0.82rem' }}>
                  {workout.date}
                </div>
              </div>

              <div className="flex flex-between align-center mb-12">
                <div>
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.3rem', color: 'var(--accent)' }}>
                    {workout.split} Workout
                  </h3>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text2)', marginTop: '2px' }}>
                    ⏱️ {workout.duration} mins • ⚡ {workout.calories || 350} kcal • 🏋️ Volume: {workout.totalVolume || 0} kg
                  </div>
                </div>
              </div>

              <div className="flex gap-8 mt-16" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  style={{ border: '1.5px solid var(--border)', fontWeight: 800 }}
                  onClick={() => setViewDetailsWorkout(workout)}
                >
                  View Details
                </Button>

                <Button 
                  size="sm" 
                  variant="dark" 
                  style={{ fontWeight: 800 }}
                  onClick={() => handleOpenEditLogger(workout)}
                >
                  Update Entry
                </Button>

                <button 
                  className="btn-icon" 
                  onClick={() => deleteWorkout(workout.id)}
                  style={{ marginLeft: 'auto', padding: '6px' }}
                  title="Delete Workout Entry"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 6. ACHIEVEMENT SYSTEM SECTION */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '16px', textTransform: 'uppercase' }}>
        🏅 FITNESS ACHIEVEMENTS
      </h2>
      <div className="grid-3 gap-16 mb-32">
        {achievementsList.map((ach) => (
          <Card 
            key={ach.title} 
            className="card-hover-lift"
            style={{ 
              background: ach.unlocked ? 'var(--bg2)' : 'var(--bg4)', 
              border: '2px solid var(--border)',
              opacity: ach.unlocked ? 1 : 0.65
            }}
          >
            <div className="flex align-center gap-12 mb-8">
              <span style={{ fontSize: '2rem' }}>{ach.icon}</span>
              <div>
                <h4 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem' }}>{ach.title}</h4>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text2)' }}>{ach.desc}</div>
              </div>
            </div>
            <div style={{ marginTop: '10px' }}>
              {ach.unlocked ? (
                <span className="badge-green" style={{ fontWeight: 900, fontSize: '0.7rem', padding: '3px 8px' }}>
                  ✓ UNLOCKED
                </span>
              ) : (
                <span className="badge-orange" style={{ fontWeight: 900, fontSize: '0.7rem', padding: '3px 8px' }}>
                  🔒 LOCKED
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* 7. UTILITY TOOLS SECTION (1RM CALCULATOR & REST TIMER BELOW ANALYTICS) */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '16px', textTransform: 'uppercase' }}>
        🛠️ UTILITY TOOLS
      </h2>
      <div className="grid-2 gap-20 mb-24">
        {/* Enhanced 1RM Calculator */}
        <Card style={{ background: 'var(--bg2)', border: '2px solid var(--border)' }}>
          <h3 className="card-title" style={{ margin: 0, marginBottom: '12px' }}>📊 1-REP MAX (1RM) CALCULATOR</h3>
          <div className="flex gap-12 mb-12">
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 900 }}>WEIGHT (KG)</label>
              <input type="number" className="form-input" value={rmWeight} onChange={e => setRmWeight(Number(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 900 }}>REPS</label>
              <input type="number" className="form-input" value={rmReps} onChange={e => setRmReps(Number(e.target.value))} />
            </div>
          </div>

          <div className="flex flex-between align-center mb-12" style={{ padding: '12px', background: 'var(--bg)', border: '2px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text2)' }}>ESTIMATED 1RM</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent)' }}>{estimated1RM} KG</div>
            </div>
            <span className={strengthCat.badge} style={{ padding: '4px 10px', fontWeight: 900, fontSize: '0.8rem' }}>
              {strengthCat.category}
            </span>
          </div>

          <div style={{ fontSize: '0.78rem', fontWeight: 900, marginBottom: '6px' }}>PREDICTED WORKING SETS:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', textAlign: 'center' }}>
            {predictedSets.map(s => (
              <div key={s.pct} style={{ background: 'var(--bg4)', border: '1px solid var(--border)', padding: '6px 4px' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 900 }}>{s.pct}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--accent)' }}>{s.weight}k</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text2)' }}>{s.reps}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Rest Interval Timer */}
        <Card style={{ background: 'var(--bg2)', border: '2px solid var(--border)' }}>
          <h3 className="card-title" style={{ margin: 0, marginBottom: '12px' }}>⏱️ REST INTERVAL TIMER</h3>
          <div className="flex gap-8 mb-16" style={{ flexWrap: 'wrap' }}>
            {[60, 90, 120, 180].map(sec => (
              <button
                key={sec}
                className="btn btn-ghost btn-sm btn-press-anim"
                style={{ border: '1.5px solid var(--border)', fontWeight: 800 }}
                onClick={() => { setRestSeconds(sec); setTimerActive(true); }}
              >
                {sec}s Rest
              </button>
            ))}
          </div>

          <div 
            className={restSeconds > 0 && restSeconds <= 10 ? 'gym-timer-pulse' : ''}
            style={{ 
              padding: '18px', 
              background: 'var(--bg)', 
              border: '2px solid var(--border)', 
              fontWeight: 900, 
              fontSize: '1.4rem', 
              textAlign: 'center', 
              color: restSeconds < 10 && restSeconds > 0 ? 'var(--red)' : 'var(--green)' 
            }}
          >
            {restSeconds > 0 ? `⏳ ${restSeconds}s Remaining` : '✅ Ready for Next Set!'}
          </div>
        </Card>
      </div>

      {/* MODAL: LOG NEW ENTRY OR UPDATE EXISTING ENTRY */}
      {isLoggerOpen && (
        <Modal 
          isOpen={isLoggerOpen} 
          onClose={() => setIsLoggerOpen(false)}
          title={editingWorkoutId ? "✏️ UPDATE WORKOUT ENTRY" : "📝 LOG DAILY WORKOUT ENTRY"}
        >
          <form onSubmit={handleSaveWorkoutEntry} className="flex" style={{ flexDirection: 'column', gap: '16px' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Date</label>
                <input type="date" className="form-input" value={logDate} onChange={e => setLogDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Duration (Mins)</label>
                <input type="number" className="form-input" value={logDuration} onChange={e => setLogDuration(e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label>Workout Split</label>
              <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                {SPLITS.map(s => (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={logSplit === s ? 'dark' : 'ghost'}
                    onClick={() => setLogSplit(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <div className="flex flex-between align-center mb-8">
                <label style={{ margin: 0 }}>Structured Exercises</label>
                <Button type="button" size="sm" variant="ghost" onClick={handleAddExerciseRow} icon={<PlusIcon />}>
                  Add Exercise
                </Button>
              </div>

              <div className="flex" style={{ flexDirection: 'column', gap: '10px' }}>
                {logExercises.map((ex, idx) => (
                  <div key={idx} style={{ background: 'var(--bg)', padding: '10px', border: '1.5px solid var(--border)' }}>
                    <div className="flex gap-8 mb-8">
                      <input
                        type="text"
                        placeholder="Exercise Name (e.g. Bench Press)"
                        className="form-input"
                        style={{ flex: 2 }}
                        value={ex.name}
                        onChange={e => handleUpdateExerciseRow(idx, 'name', e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Weight (kg)"
                        className="form-input"
                        style={{ flex: 1 }}
                        value={ex.weight}
                        onChange={e => handleUpdateExerciseRow(idx, 'weight', Number(e.target.value))}
                      />
                    </div>
                    <div className="flex gap-8">
                      <input
                        type="number"
                        placeholder="Sets"
                        className="form-input"
                        style={{ flex: 1 }}
                        value={ex.sets}
                        onChange={e => handleUpdateExerciseRow(idx, 'sets', Number(e.target.value))}
                      />
                      <input
                        type="number"
                        placeholder="Reps"
                        className="form-input"
                        style={{ flex: 1 }}
                        value={ex.reps}
                        onChange={e => handleUpdateExerciseRow(idx, 'reps', Number(e.target.value))}
                      />
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => handleRemoveExerciseRow(idx)}
                        title="Remove"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-12" style={{ justifyContent: 'flex-end', marginTop: '12px' }}>
              <Button type="button" variant="ghost" onClick={() => setIsLoggerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                {editingWorkoutId ? "Update Entry" : "Save Entry"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: VIEW WORKOUT DETAILS */}
      {viewDetailsWorkout && (
        <Modal
          isOpen={!!viewDetailsWorkout}
          onClose={() => setViewDetailsWorkout(null)}
          title={`🏋️ ${viewDetailsWorkout.split} Workout Details (${viewDetailsWorkout.date})`}
        >
          <div className="mb-16 flex flex-between align-center" style={{ background: 'var(--bg)', padding: '12px', border: '1.5px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text2)' }}>TOTAL VOLUME</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent)' }}>{viewDetailsWorkout.totalVolume || 0} KG</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text2)' }}>DURATION</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{viewDetailsWorkout.duration} Mins</div>
            </div>
          </div>

          <h4 style={{ fontWeight: 900, marginBottom: '10px' }}>EXERCISES LOGGED:</h4>
          <div className="flex" style={{ flexDirection: 'column', gap: '8px' }}>
            {viewDetailsWorkout.exercises && viewDetailsWorkout.exercises.length > 0 ? (
              viewDetailsWorkout.exercises.map((ex, idx) => (
                <div key={idx} style={{ background: 'var(--bg2)', padding: '10px 14px', border: '1.5px solid var(--border)' }} className="flex flex-between align-center">
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>{ex.name}</div>
                    {ex.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text2)', fontStyle: 'italic' }}>{ex.notes}</div>}
                  </div>
                  <div style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--accent)' }}>
                    {ex.sets} sets × {ex.reps} reps @ {ex.weight} kg
                  </div>
                </div>
              ))
            ) : (
              <div className="text-muted" style={{ padding: '8px' }}>{viewDetailsWorkout.notes || 'No detailed exercise records.'}</div>
            )}
          </div>

          <div className="flex" style={{ justifyContent: 'flex-end', marginTop: '16px' }}>
            <Button variant="dark" onClick={() => setViewDetailsWorkout(null)}>Close</Button>
          </div>
        </Modal>
      )}

      {/* MODAL: PR CELEBRATION WITH CONFETTI */}
      {prCelebration && (
        <Modal
          isOpen={!!prCelebration}
          onClose={clearPRCelebration}
          title="🔥 NEW PERSONAL RECORD ACHIEVED!"
        >
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '8px' }}>🏆</div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--purple)', margin: '0 0 8px' }}>
              {prCelebration.exercise}
            </h2>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent)', margin: '8px 0' }}>
              {prCelebration.weight} KG
            </div>
            <span className="badge-green" style={{ padding: '6px 14px', fontSize: '1rem', fontWeight: 900 }}>
              +{prCelebration.diff} KG Increase!
            </span>

            <p style={{ margin: '20px 0 16px', fontWeight: 800, color: 'var(--text2)' }}>
              Outstanding performance! You just shattered your previous record. Keep pushing forward!
            </p>

            <Button variant="primary" size="lg" onClick={clearPRCelebration} style={{ width: '100%', fontWeight: 900 }}>
              CONTINUE TRAINING
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Gym;