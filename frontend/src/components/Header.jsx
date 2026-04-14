import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';
import { LogIn, GraduationCap, ArrowLeft, Shield } from 'lucide-react';

export default function Header({ 
  showAuth = true, 
  userText = null, 
  onLogout = null, 
  onBack = null
}) {
  const navigate = useNavigate();

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
          <>
            <button className="pill-btn outline admin-login-btn" onClick={() => navigate('/admin-login')}>
              <Shield size={16} /> <span>Admin Login</span>
            </button>
            <button className="pill-btn outline" onClick={() => navigate('/cr-login')}>
              <GraduationCap size={16} /> <span>CR Login / Sign Up</span>
            </button>
          </>
        ) : null}
      </div>
    </header>
  );
}
