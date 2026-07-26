import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon, 
  className = '', 
  ...props 
}) => {
  const variantClass = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    yellow: 'btn-yellow',
    dark: 'btn-dark',
    icon: 'btn-icon'
  }[variant] || 'btn-primary';

  const sizeClass = size === 'sm' ? 'btn-sm' : '';

  return (
    <button 
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {icon && <span className="btn-icon-wrapper">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
