import React, { useState } from 'react';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import './Dashboard.css';

export default function Dashboard({ theme, toggleTheme }) {
  const [activeTab, setActiveTab] = useState('Analytics');

  return (
    <div className="page-wrapper dashboard-wrapper">
      <Header 
        theme={theme} 
        toggleTheme={toggleTheme} 
        userText="đŸ'¤ salab (1st Year, IT)" 
        onLogout={() => console.log('Logged out')} 
      />

      <main className="dashboard-main">
        {/* Navigation Tabs */}
        <div className="dash-tabs">
          <button className={`tab-btn ${activeTab === 'Analytics' ? 'active' : ''}`} onClick={() => setActiveTab('Analytics')}>
            <span role="img" aria-label="analytics">📊</span> Analytics
          </button>
          <button className={`tab-btn ${activeTab === 'Feedback' ? 'active' : ''}`} onClick={() => setActiveTab('Feedback')}>
            <span role="img" aria-label="feedback">💬</span> Feedback
          </button>
          <button className={`tab-btn ${activeTab === 'Manage' ? 'active' : ''}`} onClick={() => setActiveTab('Manage')}>
            <span role="img" aria-label="manage">⚙️</span> Manage
          </button>
        </div>

        {/* Action Bar */}
        <GlassCard className="action-bar">
          <div className="action-left">
            <span className="file-icon">📄</span> <span className="action-label">Subject Report:</span>
            <select className="subject-select">
              <option>— Pick a subject —</option>
            </select>
            <Button variant="primary" className="btn-sm">Generate PDF</Button>
          </div>
          <div className="action-right">
            <span className="file-icon">📋</span> <span className="action-label">Full Class:</span>
            <Button variant="primary" className="btn-sm">Full Report PDF</Button>
            <Button variant="glass" className="btn-sm outline-blue">↻ Re-analyze All</Button>
          </div>
        </GlassCard>

        {/* Stat Cards */}
        <div className="stats-grid">
          <GlassCard className="stat-card">
            <div className="stat-title">TOTAL FEEDBACK</div>
            <div className="stat-val">6</div>
            <div className="stat-line bg-black"></div>
          </GlassCard>
          <GlassCard className="stat-card">
            <div className="stat-title">POSITIVE</div>
            <div className="stat-val success">1</div>
            <div className="stat-line bg-success"></div>
          </GlassCard>
          <GlassCard className="stat-card">
            <div className="stat-title">NEUTRAL</div>
            <div className="stat-val warning">5</div>
            <div className="stat-line bg-warning"></div>
          </GlassCard>
          <GlassCard className="stat-card">
            <div className="stat-title">NEGATIVE</div>
            <div className="stat-val error">0</div>
            <div className="stat-line bg-error"></div>
          </GlassCard>
          <GlassCard className="stat-card">
            <div className="stat-title">AVG SCORE</div>
            <div className="stat-val">0.03</div>
            <div className="stat-line bg-black"></div>
          </GlassCard>
        </div>

        {/* Charts & Keywords */}
        <div className="charts-grid">
          <GlassCard className="chart-card">
            <h3 className="section-title">Sentiment Distribution</h3>
            <div className="chart-container">
              {/* CSS Donut Chart */}
              <div className="donut-legend">
                <span className="legend-item"><span className="legend-box bg-success"></span> Positive</span>
                <span className="legend-item"><span className="legend-box bg-warning"></span> Neutral</span>
                <span className="legend-item"><span className="legend-box bg-error"></span> Negative</span>
              </div>
              <div className="donut-chart" style={{ '--pos': '16%', '--neu': '84%', '--neg': '0%' }}></div>
            </div>
          </GlassCard>

          <GlassCard className="chart-card">
            <h3 className="section-title">Top Keywords</h3>
            
            <div className="keyword-section">
              <h4 className="keyword-subtitle">Compliments</h4>
              <div className="keyword-tags">
                <span className="kw-tag tag-success">helpful</span>
                <span className="kw-tag tag-success">good</span>
              </div>
            </div>

            <div className="keyword-section">
              <h4 className="keyword-subtitle">Complaints</h4>
              <p className="empty-text">None detected</p>
            </div>
          </GlassCard>
        </div>

      </main>
    </div>
  );
}
