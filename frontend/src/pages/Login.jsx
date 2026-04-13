import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import './Login.css';

export default function Login({ theme, toggleTheme, role='CR' }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (role === 'CR') {
      navigate('/dashboard');
    } else {
      navigate('/admin-master');
    }
  };

  return (
    <div className="page-wrapper">
      <div className="mesh-bg" />
      
      <Header theme={theme} toggleTheme={toggleTheme} showAuth={false} onBack={() => navigate(-1)} />
      
      <main className="landing-main">
        <GlassCard className="login-card">
          <h2 className="login-title">{role === 'CR' ? 'Class Rep Login' : 'Master Administrator'}</h2>
          <p className="login-subtitle">
            {role === 'CR' 
              ? 'Login with the credentials provided by your Administrator.' 
              : 'Secure portal for system administration.'}
          </p>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="input-group">
              <label>Email Address</label>
              <input 
                type="email" 
                className="custom-input" 
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="input-group">
              <label>Password</label>
              <input 
                type="password" 
                className="custom-input" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button variant="primary" type="submit" className="login-submit">
              Secure Sign In
            </Button>
          </form>
        </GlassCard>
      </main>
    </div>
  );
}
