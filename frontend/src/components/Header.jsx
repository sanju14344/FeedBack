import React from 'react';
import './Header.css';
import { LogIn, GraduationCap, Moon, Sun, ArrowLeft } from 'lucide-react';

export default function Header({ 
  showAuth = true, 
  userText = null, 
  onLogout = null, 
  onBack = null,
  theme, 
  toggleTheme 
}) {
  return (
    <header className="site-header">
      <div className="header-left">
        {onBack ? (
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={16} /> <span style={{ marginLeft: 6 }}>Back</span>
          </button>
        ) : (
          <h1 className="logo-text">FeedbackPulse</h1>
        )}
      </div>

      <div className="header-right">
        {userText ? (
          <>
            <div className="user-badge">{userText}</div>
            <button className="pill-btn danger" onClick={onLogout}>
              ← Sign Out
            </button>
          </>
        ) : showAuth ? (
          <button className="pill-btn outline">
            <GraduationCap size={16} /> <span>CR Login / Sign Up</span>
          </button>
        ) : null}
        
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          <span>Toggle Theme</span>
        </button>
      </div>
    </header>
  );
}
