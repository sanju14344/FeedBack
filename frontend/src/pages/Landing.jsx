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
    <div className="landing-wrapper">
      <div className="mesh-bg" />
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      
      <Header theme={theme} toggleTheme={toggleTheme} showAuth={false} />
      <main className="landing-main-v2">
        <div className="landing-left">
          <h1 className="hero-title-v2">
            Unlock Real-Time Student Feedback You Thought Was Out of Reach – <br/>
            <span className="text-highlight">Now Just One Click Away!</span>
          </h1>
          <div className="hero-action-container">
            <button className="primary-glow-btn" onClick={() => navigate('/auth')}>
              Get Started <span className="arrow">›</span>
            </button>
            <div className="floating-cursor">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 3L19 10L12 12L10 19L5 3Z" fill="#a855f7" stroke="white" strokeWidth="1.5"/>
              </svg>
              <div className="cursor-tag">David</div>
            </div>
          </div>
        </div>

        <div className="landing-right">
          <div className="orbital-container">
            <div className="orbital-center">
              <h3>10k+</h3>
              <p>Feedbacks</p>
            </div>
            
            <div className="orbit-ring ring-1">
              <div className="orbit-item item-1">
                <img src="https://i.pravatar.cc/100?img=21" alt="User" />
              </div>
            </div>
            <div className="orbit-ring ring-2">
              <div className="orbit-item item-2">
                <div className="glass-icon blue-glow">🔔</div>
              </div>
              <div className="orbit-item item-3">
                <img src="https://i.pravatar.cc/100?img=32" alt="User" />
              </div>
            </div>
            <div className="orbit-ring ring-3">
              <div className="orbit-item item-4">
                <div className="glass-icon orange-glow">👥</div>
              </div>
              <div className="orbit-item item-5">
                <img src="https://i.pravatar.cc/100?img=12" alt="User" />
              </div>
              <div className="orbit-item item-6">
                <div className="glass-icon purple-glow">💬</div>
              </div>
              <div className="orbit-item item-7">
                <img src="https://i.pravatar.cc/100?img=41" alt="User" />
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="landing-logos">
        <div className="logo-item">🎓 Stanford</div>
        <div className="logo-item">🏛️ Harvard</div>
        <div className="logo-item">⚛️ MIT</div>
        <div className="logo-item">🦁 Oxford</div>
        <div className="logo-item">🛡️ Cambridge</div>
      </footer>
    </div>
  );
}
