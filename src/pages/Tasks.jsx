import { useEffect, useState } from 'react';
import { useTaskStore } from '../store';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import TaskCard from '../components/common/TaskCard';
import { PlusIcon } from '../components/common/Icons';

const Tasks = () => {
  const { tasks, loading, fetchTasks, addTask, deleteTask } = useTaskStore();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'eisenhower'

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addTask(newTaskTitle);
    setNewTaskTitle('');
  };

  return (
    <div>
      <div className="page-header flex flex-between align-center">
        <div>
          <h1 style={{ margin: 0 }}>✅ QUICK TASKS & EISENHOWER MATRIX</h1>
          <p className="text-muted" style={{ margin: '4px 0 0', fontWeight: 800, fontSize: '0.82rem' }}>
            Organize priority tasks into Urgent & Important Quadrants
          </p>
        </div>
        <div style={{ display: 'inline-flex', border: '2px solid var(--border)' }}>
          <button
            className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 0, boxShadow: 'none', border: 'none' }}
            onClick={() => setViewMode('list')}
          >
            📋 LIST VIEW
          </button>
          <button
            className={`btn ${viewMode === 'eisenhower' ? 'btn-yellow' : 'btn-ghost'}`}
            style={{ borderRadius: 0, boxShadow: 'none', border: 'none', borderLeft: '2px solid var(--border)' }}
            onClick={() => setViewMode('eisenhower')}
          >
            🎯 EISENHOWER MATRIX
          </button>
        </div>
      </div>
      
      <Card className="mb-24">
        <form onSubmit={handleAddTask} className="flex gap-12">
          <input 
            type="text" 
            className="form-input flex-1" 
            placeholder="What needs to be done?" 
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <Button type="submit" variant="primary" icon={<PlusIcon />}>
            Add Task
          </Button>
        </form>
      </Card>

      {viewMode === 'eisenhower' ? (
        <div className="grid-2 mb-24" style={{ gap: '16px' }}>
          <Card style={{ background: '#FEE2E2', border: '3px solid var(--border)' }}>
            <h3 className="card-title" style={{ color: 'var(--red)', margin: 0 }}>🔥 Q1: URGENT & IMPORTANT (DO NOW)</h3>
            <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '12px' }}>High priority deadlines & critical tasks</p>
            {tasks.slice(0, 3).map(t => (
              <div key={t.id} style={{ padding: '8px 12px', background: 'var(--bg2)', border: '1.5px solid var(--border)', marginBottom: '6px', fontWeight: 800, fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{t.title}</span>
                <span style={{ cursor: 'pointer', color: 'var(--red)' }} onClick={() => deleteTask(t.id)}>✕</span>
              </div>
            ))}
          </Card>

          <Card style={{ background: '#FEF3C7', border: '3px solid var(--border)' }}>
            <h3 className="card-title" style={{ color: '#D97706', margin: 0 }}>🎯 Q2: IMPORTANT & NOT URGENT (SCHEDULE)</h3>
            <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '12px' }}>Goals, skills, exercise & long-term plans</p>
            {tasks.slice(3, 6).map(t => (
              <div key={t.id} style={{ padding: '8px 12px', background: 'var(--bg2)', border: '1.5px solid var(--border)', marginBottom: '6px', fontWeight: 800, fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{t.title}</span>
                <span style={{ cursor: 'pointer', color: 'var(--red)' }} onClick={() => deleteTask(t.id)}>✕</span>
              </div>
            ))}
          </Card>

          <Card style={{ background: '#DBEAFE', border: '3px solid var(--border)' }}>
            <h3 className="card-title" style={{ color: '#1D4ED8', margin: 0 }}>⚡ Q3: URGENT & NOT IMPORTANT (DELEGATE)</h3>
            <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '12px' }}>Interrupts, emails & quick admin tasks</p>
            {tasks.slice(6, 8).map(t => (
              <div key={t.id} style={{ padding: '8px 12px', background: 'var(--bg2)', border: '1.5px solid var(--border)', marginBottom: '6px', fontWeight: 800, fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{t.title}</span>
                <span style={{ cursor: 'pointer', color: 'var(--red)' }} onClick={() => deleteTask(t.id)}>✕</span>
              </div>
            ))}
          </Card>

          <Card style={{ background: '#E9E8E3', border: '3px solid var(--border)' }}>
            <h3 className="card-title" style={{ color: 'var(--text2)', margin: 0 }}>🧹 Q4: NOT URGENT & NOT IMPORTANT (ELIMINATE)</h3>
            <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '12px' }}>Distractions & low-value activities</p>
            {tasks.slice(8).map(t => (
              <div key={t.id} style={{ padding: '8px 12px', background: 'var(--bg2)', border: '1.5px solid var(--border)', marginBottom: '6px', fontWeight: 800, fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{t.title}</span>
                <span style={{ cursor: 'pointer', color: 'var(--red)' }} onClick={() => deleteTask(t.id)}>✕</span>
              </div>
            ))}
          </Card>
        </div>
      ) : (
        <Card style={{ padding: 0 }}>
          {loading ? (
            <div className="empty-state">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>No tasks found. Add one above!</p>
            </div>
          ) : (
            tasks.map(task => (
              <TaskCard 
                key={task.id}
                title={task.title}
                status={task.status}
                onDelete={() => deleteTask(task.id)}
              />
            ))
          )}
        </Card>
      )}
    </div>
  );
};

export default Tasks;