import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';
import { LogIn, GraduationCap, ArrowLeft, Shield, Menu, X, Bell } from 'lucide-react';

export default function Header({ 
  showAuth = true, 
  userText = null, 
  onLogout = null, 
  onBack = null,
  hideMenu = false,
  alerts = []
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  return (
    <header className="site-header">
      <div className="header-left">
        {onBack ? (
          <button className="back-btn-header" onClick={onBack}>
            <ArrowLeft size={16} /> <span className="back-text">Back</span>
          </button>
        ) : (
          <h1 className="logo-text" onClick={() => navigate('/')}>FeedbackPulse</h1>
        )}
      </div>

      <div className={`header-right ${menuOpen ? 'menu-open' : ''}`}>
        <div className="header-actions">
          {userText ? (
            <>
              {alerts && alerts.length > 0 && (
                <div className="notification-wrapper">
                  <button className="icon-btn" onClick={() => setNotificationsOpen(!notificationsOpen)}>
                    <Bell size={20} />
                    <span className="notif-badge">{alerts.length}</span>
                  </button>
                  {notificationsOpen && (
                    <div className="notifications-dropdown">
                      <div className="nd-header">
                        <h4>Notifications</h4>
                        <button onClick={() => setNotificationsOpen(false)}><X size={14}/></button>
                      </div>
                      <div className="nd-body">
                        {alerts.map((a, i) => (
                          <div key={i} className={`nd-item ${a.level}`}>
                            <AlertCircle size={16}/>
                            <div>
                              <strong>{a.subject}</strong>
                              <p>{a.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="user-badge">{userText}</div>
              <button className="pill-btn danger" onClick={() => { onLogout?.(); setMenuOpen(false); }}>
                ← Sign Out
              </button>
            </>
          ) : showAuth ? (
            <>
              <button className="pill-btn outline admin-login-btn" onClick={() => { navigate('/admin-login'); setMenuOpen(false); }}>
                <Shield size={16} /> <span>Admin Login</span>
              </button>
              <button className="pill-btn outline cr-login-btn" onClick={() => { navigate('/cr-login'); setMenuOpen(false); }}>
                <GraduationCap size={16} /> <span>CR Login / Sign Up</span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      {!hideMenu && (
        <button className="menu-toggle-btn" onClick={toggleMenu} aria-label="Toggle Menu">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* Mobile Overlay */}
      {menuOpen && !hideMenu && <div className="menu-overlay" onClick={toggleMenu} />}
    </header>
  );
}
