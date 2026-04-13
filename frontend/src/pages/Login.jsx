import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { crLogin, crSignup } from '../api';
import './Login.css';

export default function Login({ theme, toggleTheme, role='CR' }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (role === 'Admin') {
        navigate('/admin-master');
        return;
      }

      if (isLogin) {
        const res = await crLogin({ email, password });
        sessionStorage.setItem('cr_uid', res.data.uid);
        navigate('/dashboard');
      } else {
        const res = await crSignup({ email, password, full_name: fullName, department, year });
        setMessage(res.data.message);
        setIsLogin(true); // Switch back to login
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="mesh-bg" />
      
      <Header theme={theme} toggleTheme={toggleTheme} showAuth={false} onBack={() => navigate(-1)} />
      
      <main className="landing-main">
        <GlassCard className="login-card">
          <h2 className="login-title">{role === 'CR' ? 'Class Representative' : 'Master Administrator'}</h2>
          
          {role === 'CR' && (
            <div className="auth-tabs">
              <button className={`auth-tab ${isLogin ? 'active' : ''}`} onClick={() => { setIsLogin(true); setError(''); setMessage(''); }}>Sign In</button>
              <button className={`auth-tab ${!isLogin ? 'active' : ''}`} onClick={() => { setIsLogin(false); setError(''); setMessage(''); }}>Request Access</button>
            </div>
          )}

          <p className="login-subtitle" style={{marginTop: role==='CR' ? '1rem' : '0'}}>
            {role === 'CR' 
              ? (isLogin ? 'Login to your CR dashboard.' : 'Sign up. Requires Administrator approval.') 
              : 'Secure portal for system administration.'}
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            {!isLogin && role === 'CR' && (
              <>
                <div className="input-group">
                  <label>Full Name</label>
                  <input type="text" className="custom-input" placeholder="Jane Doe" value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>
                <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label>Department</label>
                    <input type="text" className="custom-input" placeholder="e.g. CSE" value={department} onChange={e => setDepartment(e.target.value)} required />
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label>Year</label>
                    <select className="custom-input" value={year} onChange={e => setYear(e.target.value)} required style={{background: 'var(--input-bg)'}}>
                      <option value="" disabled>Select Year</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="input-group">
              <label>Email Address</label>
              <input type="email" className="custom-input" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            
            <div className="input-group">
              <label>Password</label>
              <input type="password" className="custom-input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>

            {error && <div className="form-error" style={{padding: '0.5rem', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: '6px', fontSize: '0.875rem'}}>{error}</div>}
            {message && <div className="form-success" style={{padding: '0.5rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: '6px', fontSize: '0.875rem'}}>{message}</div>}

            <Button variant="primary" type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Processing...' : (isLogin ? 'Secure Sign In' : 'Submit Request')}
            </Button>
          </form>
        </GlassCard>
      </main>
    </div>
  );
}

