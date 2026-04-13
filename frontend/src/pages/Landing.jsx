import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { Shield } from 'lucide-react';
import './Landing.css';

export default function Landing({ theme, toggleTheme }) {
  const navigate = useNavigate();

  return (
    <div className="page-wrapper">
      <div className="mesh-bg" />
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      
      <Header theme={theme} toggleTheme={toggleTheme} showAuth={false} />
      
      <main className="landing-main">
        <GlassCard className="hero-card">
          <div className="hero-badge">
            <span className="badge-dot"></span> Anonymous & Secure Feedback
          </div>
          
          <h1 className="hero-title">
            Empower <span className="gradient-text">Honest</span><br />
            Student Feedback
          </h1>
          
          <p className="hero-subtitle">
            A privacy-first platform for students to rate their teachers and subjects —
            completely anonymously. Class Representatives get real-time insights
            powered by AI sentiment analysis.
          </p>

          <div className="hero-actions">
            <Button variant="primary" onClick={() => navigate('/auth')}>
              Get Started →
            </Button>
          </div>
        </GlassCard>
      </main>
    </div>
  );
}
