import React from 'react';

const Card = ({ title, value, children, className = '', hover = true, style, ...props }) => {
  return (
    <div 
      className={`card ${hover ? 'card-hover' : ''} ${className}`} 
      style={style}
      {...props}
    >
      {title && <div className="card-title">{title}</div>}
      {value !== undefined && <div className="card-value">{value}</div>}
      {children}
    </div>
  );
};

export default Card;
