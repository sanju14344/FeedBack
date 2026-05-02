import React from 'react';
import './SkeletonLoader.css';

/**
 * SkeletonLoader — lightweight shimmer placeholder shown while
 * lazy-loaded components are fetching.
 *
 * variants: 'card' | 'chart' | 'ai-panel' | 'stat-row'
 */
const SkeletonLoader = React.memo(function SkeletonLoader({ variant = 'card', className = '' }) {
  if (variant === 'chart') {
    return (
      <div className={`sk-root sk-chart ${className}`}>
        <div className="sk-header-row">
          <div className="sk-line sk-w60" />
          <div className="sk-pill" />
        </div>
        <div className="sk-chart-bars">
          {[40, 65, 50, 80, 55, 70, 45].map((h, i) => (
            <div key={i} className="sk-bar" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'ai-panel') {
    return (
      <div className={`sk-root sk-ai ${className}`}>
        <div className="sk-header-row">
          <div className="sk-avatar" />
          <div style={{ flex: 1 }}>
            <div className="sk-line sk-w50 sk-mb8" />
            <div className="sk-line sk-w30" />
          </div>
          <div className="sk-pill sk-w80" />
        </div>
        <div className="sk-badge sk-mb12" />
        <div className="sk-conf-row">
          <div className="sk-line sk-w30 sk-mb0" />
          <div className="sk-conf-bar" />
          <div className="sk-line sk-w15 sk-mb0" />
        </div>
        <div className="sk-blocks">
          <div className="sk-block">
            <div className="sk-line sk-w40 sk-mb8" />
            <div className="sk-line sk-mb4" />
            <div className="sk-line sk-w80 sk-mb4" />
            <div className="sk-line sk-w60" />
          </div>
          <div className="sk-block">
            <div className="sk-line sk-w40 sk-mb8" />
            <div className="sk-line sk-mb4" />
            <div className="sk-line sk-w80 sk-mb4" />
            <div className="sk-line sk-w50" />
          </div>
        </div>
        <div className="sk-tags">
          {[90, 120, 100].map((w, i) => (
            <div key={i} className="sk-tag" style={{ width: w }} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'stat-row') {
    return (
      <div className={`sk-root sk-stat-row ${className}`}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="sk-stat-card">
            <div className="sk-stat-icon" />
            <div style={{ flex: 1 }}>
              <div className="sk-line sk-w40 sk-mb8" />
              <div className="sk-line sk-w60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default: generic card
  return (
    <div className={`sk-root sk-card ${className}`}>
      <div className="sk-line sk-w50 sk-mb8" />
      <div className="sk-line sk-mb4" />
      <div className="sk-line sk-w80" />
    </div>
  );
});

export default SkeletonLoader;
