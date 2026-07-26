import React from 'react';

const StatCard = ({ icon, value, label, bg = '#fff', color = 'var(--text)' }) => {
  return (
    <div className="stat-card" style={{ background: bg }}>
      {icon && <div className="icon">{icon}</div>}
      <div className="value" style={{ color }}>{value}</div>
      <div className="label">{label}</div>
    </div>
  );
};

export default StatCard;
