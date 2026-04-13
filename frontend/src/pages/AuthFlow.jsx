import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { Lock, BarChart2, Zap } from 'lucide-react';
import './AuthFlow.css';

export default function AuthFlow({ theme, toggleTheme }) {
  const navigate = useNavigate();

  return (
    <div className="page-wrapper">
      <div className="mesh-bg" />
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      
      <Header theme={theme} toggleTheme={toggleTheme} showAuth={false} onBack={() => navigate('/')} />
      
      <main className="landing-main">
        <GlassCard className="auth-card">
          <div className="hero-badge">
            <span className="badge-dot"></span> Anonymous & Secure Feedback
          </div>
          
          <h1 className="hero-title auth-title">
            Empower <span className="gradient-text">Honest</span> Feedback
          </h1>
          
          <p className="hero-subtitle auth-subtitle">
            A privacy-first feedback system for students and Class Representatives. Powered by sentiment analysis.
          </p>

          <div className="auth-actions">
            <button className="google-btn" onClick={() => navigate('/feedback/form')}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="G" className="google-icon" />
              Continue with Google
            </button>
            <Button variant="glass" onClick={() => navigate('/cr-login')}>
              CR Admin Dashboard →
            </Button>
          </div>

          <div className="trust-badges">
            <div className="trust-item">
              <Lock size={14} color="#f59e0b" />
              <span>Anonymised by default</span>
            </div>
            <div className="trust-item">
              <BarChart2 size={14} color="#8b5cf6" />
              <span>Sentiment Insights</span>
            </div>
            <div className="trust-item">
              <Zap size={14} color="#ef4444" />
              <span>Real-time reports</span>
            </div>
          </div>
          
          {/* We emulate the look of the little admin login lock at the bottom */}
          <div className="admin-login-sm" onClick={() => navigate('/admin-login')}>
            <Lock size={12} color="#f59e0b" /> Administrator Login
          </div>

        </GlassCard>
      </main>
    </div>
  );
}
