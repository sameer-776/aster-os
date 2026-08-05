import { useEffect, useState } from 'react';
import { useCodingStore } from '../store';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import StatCard from '../components/common/StatCard';
import { TrashIcon, PlusIcon, SearchIcon } from '../components/common/Icons';

const Coding = () => {
  const { problems, profileStats, handles, loading, fetchCodingData, addProblem, deleteProblem } = useCodingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [newProb, setNewProb] = useState({
    title: '',
    platform: 'LeetCode',
    difficulty: 'Easy',
    notes: ''
  });

  useEffect(() => {
    fetchCodingData();
  }, [fetchCodingData]);

  const handleAddProblem = (e) => {
    e.preventDefault();
    if (newProb.title.trim()) {
      addProblem(newProb);
      setNewProb({ title: '', platform: 'LeetCode', difficulty: 'Easy', notes: '' });
    }
  };

  const totalCount = problems.length;
  const easyCount = problems.filter(p => p.difficulty === 'Easy').length;
  const mediumCount = problems.filter(p => p.difficulty === 'Medium').length;
  const hardCount = problems.filter(p => p.difficulty === 'Hard').length;

  const filteredProblems = problems.filter(p => {
    const matchesPlatform = platformFilter === 'ALL' ? true : p.platform === platformFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query ||
      p.title.toLowerCase().includes(query) ||
      (p.notes && p.notes.toLowerCase().includes(query)) ||
      (p.platform && p.platform.toLowerCase().includes(query));

    return matchesPlatform && matchesSearch;
  });

  // Render SVG Wave Chart Path from waveCoordinates
  const waveCoords = profileStats?.githubCommits?.waveCoordinates || [0.1, 0.4, 0.2, 0.7, 0.5, 0.9, 0.6, 0.8, 0.3, 0.9, 0.7, 1.0, 0.4, 0.8];
  const svgWidth = 600;
  const svgHeight = 100;
  const points = waveCoords.map((val, idx) => {
    const x = (idx / (waveCoords.length - 1)) * svgWidth;
    const y = svgHeight - (val * (svgHeight - 20) + 10);
    return `${x},${y}`;
  }).join(' ');

  const leetcodeStats = profileStats?.leetcode;

  return (
    <div>
      {/* Header */}
      <div className="page-header flex flex-between align-center">
        <div>
          <h1 style={{ margin: 0 }}>💻 CODING HUB</h1>
          <p className="text-muted" style={{ fontWeight: 800, margin: '4px 0 0', textTransform: 'uppercase', fontSize: '0.82rem' }}>
            LeetCode GraphQL Sync & GitHub Activity Streams
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-4 mb-24">
        <StatCard value={totalCount} label="TOTAL LOGS" bg="#FFFFFF" color="var(--text)" />
        <StatCard value={leetcodeStats?.streak ? `🔥 ${leetcodeStats.streak} DAYS` : easyCount} label={leetcodeStats?.streak ? "LEETCODE STREAK" : "EASY SOLVED"} bg="#ecfdf5" color="var(--green)" />
        <StatCard value={leetcodeStats?.totalSolved || mediumCount} label={leetcodeStats?.totalSolved ? "LEETCODE TOTAL" : "MEDIUM SOLVED"} bg="#fffbeb" color="var(--orange)" />
        <StatCard value={profileStats?.githubCommits?.totalRecentCommits || hardCount} label={profileStats?.githubCommits ? "RECENT COMMITS" : "HARD SOLVED"} bg="#fef2f2" color="var(--red)" />
      </div>

      {/* GitHub Commit Wave Chart & LeetCode Live Sync Card */}
      <div className="grid-2 mb-24" style={{ gap: '20px' }}>
        <Card style={{ background: 'var(--bg2)' }}>
          <div className="flex flex-between align-center mb-12">
            <h3 className="card-title" style={{ margin: 0 }}>📈 GITHUB COMMIT WAVE CHART</h3>
            <span className="badge badge-purple">PushEvent Daily Frequency</span>
          </div>
          <p className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '16px' }}>
            {handles?.github ? `@${handles.github}'s 14-Day Activity Wave Coordinates` : 'Connect your GitHub handle in Settings to fetch live commits!'}
          </p>
          <div style={{ background: 'var(--bg)', padding: '12px', border: '2px solid var(--border)', borderRadius: '4px' }}>
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: '90px', display: 'block' }}>
              <defs>
                <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="var(--yellow)" />
                </linearGradient>
              </defs>
              <polyline
                fill="none"
                stroke="url(#waveGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            </svg>
          </div>
        </Card>

        <Card style={{ background: 'var(--bg2)' }}>
          <div className="flex flex-between align-center mb-12">
            <h3 className="card-title" style={{ margin: 0 }}>⚡ LEETCODE LIVE GRAPHQL SYNC</h3>
            {leetcodeStats?.streak !== undefined && (
              <span className="badge badge-yellow">🔥 {leetcodeStats.streak} Day Streak</span>
            )}
          </div>
          {leetcodeStats?.recentSubmissions && leetcodeStats.recentSubmissions.length > 0 ? (
            <div>
              <p className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '12px' }}>
                Recent Live Submissions (@{handles?.leetcode}):
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {leetcodeStats.recentSubmissions.slice(0, 3).map((sub, idx) => (
                  <div key={idx} style={{ padding: '6px 10px', background: 'var(--bg)', border: '1.5px solid var(--border)', fontSize: '0.8rem', fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{sub.title} ({sub.lang})</span>
                    <span style={{ color: sub.status === 'Accepted' ? 'var(--green)' : 'var(--red)' }}>{sub.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                {handles?.leetcode ? `Fetched stats for @${handles.leetcode}: ${leetcodeStats?.totalSolved || 0} solved problems.` : 'Enter your LeetCode handle in Settings to fetch GraphQL streak & submissions!'}
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Log Problem / GitHub Push Form */}
      <Card className="mb-24">
        <h3 className="card-title">➕ LOG CODING PROBLEM OR GITHUB PROJECT PUSH</h3>
        <form onSubmit={handleAddProblem} className="form-row flex-wrap">
          <input
            className="form-input"
            type="text"
            placeholder="Title (e.g. Two Sum, Implemented Auth Feature)"
            value={newProb.title}
            onChange={e => setNewProb({ ...newProb, title: e.target.value })}
            required
            style={{ flex: 2, minWidth: '220px' }}
          />
          <select
            className="form-select"
            style={{ maxWidth: '160px' }}
            value={newProb.platform}
            onChange={e => setNewProb({ ...newProb, platform: e.target.value })}
          >
            <option value="LeetCode">LeetCode</option>
            <option value="GitHub Push">GitHub Push</option>
            <option value="HackerRank">HackerRank</option>
            <option value="Codeforces">Codeforces</option>
            <option value="Project / Custom">Project / Custom</option>
          </select>
          <select
            className="form-select"
            style={{ maxWidth: '120px' }}
            value={newProb.difficulty}
            onChange={e => setNewProb({ ...newProb, difficulty: e.target.value })}
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <input
            className="form-input"
            type="text"
            placeholder="Notes / Repo Link / Approach (Optional)"
            value={newProb.notes}
            onChange={e => setNewProb({ ...newProb, notes: e.target.value })}
            style={{ flex: 2, minWidth: '200px' }}
          />
          <Button type="submit" variant="primary" icon={<PlusIcon />}>
            LOG
          </Button>
        </form>
      </Card>

      {/* Filter and Search Row */}
      <div className="flex flex-between gap-16 mb-24" style={{ flexWrap: 'wrap' }}>
        <div className="topbar-search" style={{ maxWidth: '300px' }}>
          <SearchIcon size={16} />
          <input
            type="text"
            placeholder="Search coding logs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'inline-flex', border: 'var(--bw) solid var(--border)', boxShadow: '3px 3px 0px var(--border)' }}>
          {['ALL', 'LeetCode', 'GitHub Push', 'HackerRank', 'Codeforces'].map((plat, idx, arr) => (
            <button
              key={plat}
              className={`btn ${platformFilter === plat ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                borderRadius: 0,
                boxShadow: 'none',
                border: 'none',
                borderRight: idx < arr.length - 1 ? 'var(--bw) solid var(--border)' : 'none'
              }}
              onClick={() => setPlatformFilter(plat)}
            >
              {plat}
            </button>
          ))}
        </div>
      </div>

      {/* Logged Activities List */}
      <div className="flex" style={{ flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div className="empty-state">Loading coding logs...</div>
        ) : filteredProblems.length === 0 ? (
          <div className="empty-state">No coding logs found. Time to grind!</div>
        ) : (
          filteredProblems.map(p => {
            const diffColor = p.difficulty === 'Easy' ? 'var(--green)' : p.difficulty === 'Medium' ? 'var(--orange)' : 'var(--red)';
            return (
              <Card key={p.id} className="card-hover flex flex-between flex-center" style={{ borderLeft: `6px solid ${diffColor}` }}>
                <div>
                  <div className="flex align-center gap-8 mb-4">
                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem', textTransform: 'uppercase' }}>{p.title}</h3>
                    <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{p.platform || 'LeetCode'}</span>
                    <span className="badge badge-yellow" style={{ fontSize: '0.7rem' }}>{p.difficulty}</span>
                  </div>
                  {p.notes && <div className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 700 }}>{p.notes}</div>}
                </div>
                <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => deleteProblem(p.id)} title="Delete Log">
                  <TrashIcon size={16} />
                </button>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Coding;
