import React from 'react';
import './GlassCard.css';

export default function GlassCard({ children, className = '', style = {} }) {
  return (
    <div className={`glass-card ${className}`} style={style}>
      {children}
    </div>
  );
}
