import React from 'react';
import './Button.css';

export default function Button({ children, variant = 'primary', icon, onClick, className = '', type = 'button' }) {
  // variants: 'primary', 'glass', 'text'
  return (
    <button type={type} className={`custom-btn btn-${variant} ${className}`} onClick={onClick}>
      {icon && <span className="btn-icon">{icon}</span>}
      <span className="btn-label">{children}</span>
    </button>
  );
}
