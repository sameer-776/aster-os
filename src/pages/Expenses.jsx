import { useEffect, useState } from 'react';
import { useExpenseStore } from '../store';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import StatCard from '../components/common/StatCard';
import { TrashIcon, PlusIcon } from '../components/common/Icons';

const Expenses = () => {
  const { expenses, loading, fetchExpenses, addExpense, deleteExpense } = useExpenseStore();
  const [newExp, setNewExp] = useState({ title: '', amount: '', category: 'Food' });
  const categories = ['Food', 'Transport', 'College', 'Entertainment', 'Other'];

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (newExp.title && newExp.amount) {
      addExpense(newExp);
      setNewExp({ title: '', amount: '', category: 'Food' });
    }
  };
  
  const [budgetCap, setBudgetCap] = useState(10000);
  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const percentSpent = Math.min(100, Math.round((totalSpent / Math.max(1, budgetCap)) * 100));

  return (
    <div>
      <div className="page-header">
        <h1>💰 EXPENSES & BUDGET TRACKER</h1>
      </div>
      
      <div className="grid-2 mb-24" style={{ gap: '20px' }}>
        <StatCard value={`₹${totalSpent}`} label="TOTAL AMOUNT SPENT" bg="#ecfdf5" color="var(--green)" />
        <Card style={{ background: 'var(--bg2)' }}>
          <div className="flex flex-between align-center mb-8">
            <span className="card-title" style={{ margin: 0 }}>🎯 MONTHLY BUDGET CAP</span>
            <div className="flex align-center gap-8">
              <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>CAP: ₹</span>
              <input
                type="number"
                className="form-input"
                style={{ width: '100px', padding: '4px 8px' }}
                value={budgetCap}
                onChange={e => setBudgetCap(Number(e.target.value))}
              />
            </div>
          </div>
          <div style={{ height: '14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${percentSpent}%`, height: '100%', background: percentSpent > 90 ? 'var(--red)' : percentSpent > 75 ? 'var(--orange)' : 'var(--green)', transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ marginTop: '6px', fontSize: '0.78rem', fontWeight: 800, textAlign: 'right', color: percentSpent > 90 ? 'var(--red)' : 'var(--text2)' }}>
            {percentSpent}% Spent of ₹{budgetCap} Limit {percentSpent > 90 && '⚠️ OVER BUDGET WARNING!'}
          </div>
        </Card>
      </div>
      
      <Card className="mb-24">
        <form onSubmit={handleAdd} className="form-row flex-wrap">
          <input 
            className="form-input" 
            type="text" 
            placeholder="What did you buy? (e.g. Coffee)" 
            value={newExp.title} 
            onChange={e => setNewExp({...newExp, title: e.target.value})} 
            required 
          />
          <input 
            className="form-input" 
            type="number" 
            placeholder="Amount (₹)" 
            value={newExp.amount} 
            onChange={e => setNewExp({...newExp, amount: e.target.value})} 
            style={{ maxWidth: '160px' }} 
            required 
          />
          <select 
            className="form-select" 
            value={newExp.category} 
            onChange={e => setNewExp({...newExp, category: e.target.value})} 
            style={{ maxWidth: '160px' }}
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Button type="submit" variant="primary" icon={<PlusIcon />}>
            Log Expense
          </Button>
        </form>
      </Card>
      
      <div className="flex" style={{ flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div className="empty-state">Loading expenses...</div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">No expenses logged yet.</div>
        ) : (
          expenses.map(e => (
            <Card key={e.id} className="flex flex-between flex-center">
              <div>
                <h3 style={{ margin: 0, fontWeight: 900 }}>{e.title}</h3>
                <div className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '4px' }}>
                  {e.category}
                </div>
              </div>
              <div className="flex flex-center gap-16">
                <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--red)' }}>
                  -₹{e.amount}
                </div>
                <button className="btn-icon" onClick={() => deleteExpense(e.id)}>
                  <TrashIcon size={14} />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Expenses;