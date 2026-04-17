import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const features = [
  { icon: '📊', title: 'Real-Time Analytics', desc: 'Instantly visualize feedback trends and class performance over time.', color: '#7c3aed' },
  { icon: '🤖', title: 'AI Sentiment Analysis', desc: 'Automatically classify student sentiment — positive, neutral, or negative.', color: '#06b6d4' },
  { icon: '📄', title: 'PDF Reports', desc: 'Export beautifully formatted analytical reports with a single click.', color: '#10b981' },
  { icon: '🗂️', title: 'Class Directory', desc: 'Manage your subjects, staff, and assignments in a clean hierarchy.', color: '#f59e0b' },
  { icon: '🔒', title: 'Anonymous Feedback', desc: 'Students submit honest feedback without fear — privacy first.', color: '#ef4444' },
  { icon: '🎓', title: 'Multi-Year Support', desc: 'Works across all years and departments within a single institution.', color: '#a855f7' },
];

const steps = [
  { num: '01', title: 'CR Registers', desc: 'Class Representatives create an account and set up their department directory.' },
  { num: '02', title: 'Students Submit', desc: 'Students scan or visit a link to submit anonymous staff feedback in seconds.' },
  { num: '03', title: 'Insights Surface', desc: 'The CR dashboard instantly reflects AI-analyzed sentiment, scores, and trends.' },
];

const stats = [
  { value: '10k+', label: 'Feedbacks Collected' },
  { value: '500+', label: 'Active CRs' },
  { value: '98%', label: 'Satisfaction Rate' },
  { value: '50+', label: 'Institutions' },
];

export default function Landing({ theme, toggleTheme }) {
  const navigate = useNavigate();

  return (
    <div className="landing-root">
      {/* ── NAV ── */}
      <nav className="landing-nav">
        <span className="landing-logo">FeedbackPulse</span>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
        </div>
        <div className="nav-actions">
          <button className="nav-btn outline" onClick={() => navigate('/admin-login')}>Admin</button>
          <button className="nav-btn primary" onClick={() => navigate('/auth')}>Get Started →</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero-section">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />

        <div className="hero-pill">✨ Built for Class Representatives</div>
        <h1 className="hero-headline">
          The Feedback Platform<br />
          <span className="hero-gradient-text">Built for Students</span>
        </h1>
        <p className="hero-sub">
          Collect, analyze, and act on student feedback — powered by AI sentiment analysis,<br />
          real-time dashboards, and beautiful PDF reports.
        </p>
        <div className="hero-cta">
          <button className="cta-primary" onClick={() => navigate('/auth')}>
            Start Free <span>→</span>
          </button>
          <button className="cta-secondary" onClick={() => navigate('/cr-login')}>
            CR Login
          </button>
        </div>

        {/* Mini stat chips */}
        <div className="hero-chips">
          {stats.map(s => (
            <div key={s.label} className="hero-chip">
              <strong>{s.value}</strong> {s.label}
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES BENTO ── */}
      <section id="features" className="features-section">
        <div className="section-label">Features</div>
        <h2 className="section-title">Everything you need in one place</h2>
        <p className="section-sub">From collection to analysis, FeedbackPulse handles the entire workflow.</p>

        <div className="features-bento">
          {features.map((f, i) => (
            <div key={i} className="feature-card" style={{ '--card-color': f.color }}>
              <div className="feature-icon" style={{ background: `${f.color}18`, color: f.color }}>{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
              <div className="feature-glow" style={{ background: `${f.color}20` }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="how-section">
        <div className="section-label">Process</div>
        <h2 className="section-title">How it works</h2>
        <div className="steps-row">
          {steps.map((s, i) => (
            <div key={i} className="step-card">
              <div className="step-num">{s.num}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
              {i < steps.length - 1 && <div className="step-arrow">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── STATS BANNER ── */}
      <section className="stats-section">
        {stats.map(s => (
          <div key={s.label} className="stat-block">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── CTA BANNER ── */}
      <section className="cta-banner">
        <div className="cta-banner-orb" />
        <h2 className="cta-banner-title">Ready to transform your department?</h2>
        <p className="cta-banner-sub">Join thousands of CRs already using FeedbackPulse.</p>
        <button className="cta-primary large" onClick={() => navigate('/auth')}>Get Started Free →</button>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <span className="landing-logo">FeedbackPulse</span>
        <p>Built for students, by students. © 2025</p>
        <div className="footer-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <span onClick={() => navigate('/cr-login')} style={{cursor:'pointer'}}>CR Login</span>
        </div>
      </footer>
    </div>
  );
}
