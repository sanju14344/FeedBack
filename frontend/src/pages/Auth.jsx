import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  BookOpen, 
  GraduationCap, 
  ChevronRight, 
  ChevronLeft, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Eye,
  EyeOff,
  Zap,
  Activity,
  Brain,
  LayoutDashboard,
  FileText,
  Search,
  Check
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { crLogin, crSignup } from '../api';
import './Auth.css';

const STEPS = [
  { id: 1, title: 'Basic Details' },
  { id: 2, title: 'Phone Verification' },
  { id: 3, title: 'Create Password' },
  { id: 4, title: 'Final Review' }
];

const FEATURES = [
  { icon: <ShieldCheck size={20}/>, text: 'Verified CR Access' },
  { icon: <Activity size={20}/>, text: 'Live Session Management' },
  { icon: <Brain size={20}/>, text: 'AI Feedback Intelligence' },
  { icon: <LayoutDashboard size={20}/>, text: 'Department Analytics' },
  { icon: <Search size={20}/>, text: 'Real-Time Monitoring' },
  { icon: <FileText size={20}/>, text: 'Smart Reports' }
];

export default function Auth({ role = 'CR' }) {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'request'
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  
  useEffect(() => {
    if (role === 'Admin') setAuthMode('signin');
  }, [role]);
  
  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    department: '',
    year: '',
    phone: '',
    otp: ['', '', '', '', '', '']
  });

  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [passStrength, setPassStrength] = useState(0);

  const otpRefs = useRef([]);

  // Calculate Password Strength
  useEffect(() => {
    let score = 0;
    if (formData.password.length > 8) score += 25;
    if (/[A-Z]/.test(formData.password)) score += 25;
    if (/[0-9]/.test(formData.password)) score += 25;
    if (/[^A-Za-z0-9]/.test(formData.password)) score += 25;
    setPassStrength(score);
  }, [formData.password]);

  const handleInputChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    setError('');
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...formData.otp];
    newOtp[index] = value;
    setFormData(prev => ({ ...prev, otp: newOtp }));

    if (value !== '' && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !formData.otp[index] && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  const sendOTP = async () => {
    if (!formData.phone) {
      setError('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      // Ensure E.164 format (e.g., +91...)
      const cleanedPhone = formData.phone.replace(/\D/g, '');
      const finalPhone = formData.phone.startsWith('+') ? formData.phone : `+91${cleanedPhone}`;
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: finalPhone,
      });
      if (error) throw error;
      setOtpSent(true);
      setSuccess('OTP sent successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    const otpCode = formData.otp.join('');
    if (otpCode.length < 6) return;
    setLoading(true);
    try {
      const cleanedPhone = formData.phone.replace(/\D/g, '');
      const finalPhone = formData.phone.startsWith('+') ? formData.phone : `+91${cleanedPhone}`;

      const { error } = await supabase.auth.verifyOtp({
        phone: finalPhone,
        token: otpCode,
        type: 'sms',
      });
      if (error) throw error;
      setPhoneVerified(true);
      setSuccess('Phone verified successfully!');
      setTimeout(() => setStep(3), 1000);
    } catch (err) {
      setError('Invalid OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (role === 'Admin') {
        // Hardcoded admin validation as per current system
        if (formData.email.toLowerCase() === 'admin@example.com' && formData.password === 'password') {
          sessionStorage.setItem('admin_auth', 'true');
          navigate('/admin-master');
        } else {
          throw new Error('Invalid administrator credentials.');
        }
      } else {
        const res = await crLogin({ email: formData.email, password: formData.password });
        sessionStorage.setItem('cr_uid', res.data.uid);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || err.response?.data?.error || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    setLoading(true);
    try {
      await crSignup({
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName,
        department: formData.department,
        year: formData.year,
        phone: formData.phone
      });
      setSuccess('Request submitted! Waiting for admin approval.');
      setStep(5); // Final state
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.fullName || !formData.email || !formData.department || !formData.year) {
        setError('Please fill all fields');
        return;
      }
    }
    setStep(s => s + 1);
    setError('');
  };

  return (
    <div className="auth-root">
      {/* ── LEFT SIDE (BRANDING) ── */}
      <div className="auth-brand-panel">
        <div className="light-blob blob-1" />
        <div className="light-blob blob-2" />
        
        <motion.div 
          className="auth-brand-content"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div 
            className="auth-feature-icon" 
            style={{ width: 48, height: 48, marginBottom: 24 }}
            animate={{ rotate: [0, 10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <GraduationCap size={28} />
          </motion.div>
          <h1>AI-Powered Class<br/>Representative Network</h1>
          <p>Securely manage feedback sessions, analytics, and AI-driven insights with our institutional onboarding system.</p>
          
          <div className="auth-features-grid">
            {FEATURES.map((f, i) => (
              <motion.div 
                key={i} 
                className="auth-feature-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <div className="auth-feature-icon">{f.icon}</div>
                <span>{f.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── RIGHT SIDE (AUTH CARD) ── */}
      <div className="auth-form-panel">
        <motion.div 
          className="auth-glass-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="auth-card-header">
            {role === 'CR' && (
              <div className="auth-mode-toggle">
                <motion.div 
                  className="auth-toggle-indicator"
                  animate={{ x: authMode === 'signin' ? 0 : '100%' }}
                />
                <button 
                  className={`auth-toggle-btn ${authMode === 'signin' ? 'active' : ''}`}
                  onClick={() => { setAuthMode('signin'); setStep(1); }}
                >
                  Sign In
                </button>
                <button 
                  className={`auth-toggle-btn ${authMode === 'request' ? 'active' : ''}`}
                  onClick={() => setAuthMode('request')}
                >
                  Request Access
                </button>
              </div>
            )}
            
            <h2>{role === 'Admin' ? 'Master Admin' : (authMode === 'signin' ? 'Welcome Back' : 'Join the Network')}</h2>
            <p>{role === 'Admin' ? 'Institutional access portal' : (authMode === 'signin' ? 'Secure access to your analytics' : 'Start your multi-step onboarding')}</p>
          </div>

          <AnimatePresence>
            {showForgot && (
              <motion.div 
                className="forgot-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div 
                  className="forgot-modal"
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                >
                  <h3>Reset Password</h3>
                  <p>Enter your registered phone number to receive an OTP.</p>
                  
                  <div className="auth-input-group">
                    <label className="auth-label">Phone Number</label>
                    <div className="auth-input-wrapper">
                      <Phone size={18} />
                      <input 
                        type="tel" 
                        className="auth-input" 
                        value={formData.phone}
                        onChange={e => handleInputChange('phone', e.target.value)}
                      />
                    </div>
                  </div>

                  {!otpSent ? (
                    <button className="auth-submit-btn" onClick={sendOTP}>Send Reset OTP</button>
                  ) : (
                    <>
                      <div className="otp-container">
                        {formData.otp.map((digit, i) => (
                          <input 
                            key={i}
                            ref={el => otpRefs.current[i] = el}
                            type="text"
                            maxLength="1"
                            className="otp-input"
                            value={digit}
                            onChange={e => handleOtpChange(i, e.target.value)}
                            onKeyDown={e => handleKeyDown(i, e)}
                          />
                        ))}
                      </div>
                      <button className="auth-submit-btn" onClick={() => setStep(3)}>Verify & Reset</button>
                    </>
                  )}
                  <button className="auth-back-btn" onClick={() => setShowForgot(false)}>Cancel</button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {authMode === 'signin' ? (
              <motion.form 
                key="signin"
                className="auth-form-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSignIn}
              >
                <div className="auth-input-group">
                  <label className="auth-label">College Email</label>
                  <div className="auth-input-wrapper">
                    <Mail size={18} />
                    <input 
                      type="email" 
                      className="auth-input" 
                      placeholder="name@college.edu"
                      value={formData.email}
                      onChange={e => handleInputChange('email', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="auth-input-group">
                  <label className="auth-label">Password</label>
                  <div className="auth-input-wrapper password-wrapper">
                    <Lock size={18} />
                    <input 
                      type={showPass ? 'text' : 'password'} 
                      className="auth-input" 
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={e => handleInputChange('password', e.target.value)}
                      required
                    />
                    <button 
                      type="button" 
                      className="auth-pass-toggle" 
                      onClick={() => setShowPass(!showPass)}
                    >
                      {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                </div>
                
                {error && <div className="auth-alert error"><AlertCircle size={16}/> {error}</div>}
                
                <button className="auth-submit-btn" disabled={loading}>
                  {loading ? 'Authenticating...' : 'Secure Sign In'}
                </button>
                <button type="button" className="auth-back-btn" onClick={() => setShowForgot(true)}>Forgot Password?</button>
              </motion.form>
            ) : (
              <motion.div 
                key="request"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="auth-progress-bar">
                  {STEPS.map(s => (
                    <div key={s.id} className={`auth-progress-dot ${step >= s.id ? 'active' : ''}`} />
                  ))}
                </div>

                {step === 1 && (
                  <div className="auth-form-step">
                    <div className="auth-input-group">
                      <label className="auth-label">Full Name</label>
                      <div className="auth-input-wrapper"><User size={18} /><input type="text" className="auth-input" value={formData.fullName} onChange={e => handleInputChange('fullName', e.target.value)} /></div>
                    </div>
                    <div className="auth-input-group">
                      <label className="auth-label">College Email</label>
                      <div className="auth-input-wrapper"><Mail size={18} /><input type="email" className="auth-input" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div className="auth-input-group" style={{ flex: 1 }}>
                        <label className="auth-label">Dept</label>
                        <div className="auth-input-wrapper"><BookOpen size={18} /><input type="text" className="auth-input" value={formData.department} onChange={e => handleInputChange('department', e.target.value)} /></div>
                      </div>
                      <div className="auth-input-group" style={{ width: '100px' }}>
                        <label className="auth-label">Year</label>
                        <input type="text" className="auth-input" style={{ paddingLeft: 14 }} value={formData.year} onChange={e => handleInputChange('year', e.target.value)} />
                      </div>
                    </div>
                    <button className="auth-submit-btn" onClick={nextStep}>Next Step <ChevronRight size={18}/></button>
                  </div>
                )}

                {step === 2 && (
                  <div className="auth-form-step">
                    <div className="auth-input-group">
                      <label className="auth-label">Phone Number</label>
                      <div className="auth-input-wrapper">
                        <Phone size={18} />
                        <input 
                          type="tel" 
                          className="auth-input" 
                          placeholder="+91 98765 43210"
                          value={formData.phone}
                          onChange={e => handleInputChange('phone', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    {!otpSent ? (
                      <button className="auth-submit-btn" onClick={sendOTP} disabled={loading}>
                        {loading ? 'Sending...' : 'Send OTP'}
                      </button>
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Enter 6-digit verification code</p>
                        <div className="otp-container">
                          {formData.otp.map((digit, i) => (
                            <input 
                              key={i}
                              ref={el => otpRefs.current[i] = el}
                              type="text"
                              maxLength="1"
                              className="otp-input"
                              value={digit}
                              onChange={e => handleOtpChange(i, e.target.value)}
                              onKeyDown={e => handleKeyDown(i, e)}
                            />
                          ))}
                        </div>
                        <button className="auth-submit-btn" onClick={verifyOTP} disabled={loading || formData.otp.join('').length < 6}>
                          {loading ? 'Verifying...' : 'Verify Phone'}
                        </button>
                      </div>
                    )}
                    <button className="auth-back-btn" onClick={() => setStep(1)}><ChevronLeft size={16}/> Back</button>
                  </div>
                )}

                {step === 3 && (
                  <div className="auth-form-step">
                    <div className="auth-input-group">
                      <label className="auth-label">Create Password</label>
                      <div className="auth-input-wrapper password-wrapper">
                        <Lock size={18} />
                        <input 
                          type={showPass ? 'text' : 'password'} 
                          className="auth-input" 
                          placeholder="••••••••"
                          value={formData.password} 
                          onChange={e => handleInputChange('password', e.target.value)} 
                        />
                        <button 
                          type="button" 
                          className="auth-pass-toggle" 
                          onClick={() => setShowPass(!showPass)}
                        >
                          {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                        </button>
                      </div>
                    </div>
                    <div className="pass-strength-meter">
                      <div className="pass-strength-bar" style={{ width: `${passStrength}%`, background: passStrength > 75 ? '#22c55e' : passStrength > 40 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    <ul className="pass-reqs">
                      <li className={formData.password.length > 8 ? 'met' : ''}><Check size={12}/> 8+ characters</li>
                      <li className={/[A-Z]/.test(formData.password) ? 'met' : ''}><Check size={12}/> Upper case</li>
                      <li className={/[0-9]/.test(formData.password) ? 'met' : ''}><Check size={12}/> Number</li>
                    </ul>
                    <button className="auth-submit-btn" onClick={nextStep} disabled={passStrength < 50}>Review Request</button>
                  </div>
                )}

                {step === 4 && (
                  <div className="auth-form-step">
                    <div className="review-summary">
                      <div className="review-item"><label>Name</label><span>{formData.fullName}</span></div>
                      <div className="review-item"><label>Email</label><span>{formData.email}</span></div>
                      <div className="review-item"><label>Academic</label><span>{formData.year} Year, {formData.department}</span></div>
                      <div className="review-item"><label>Phone</label><span style={{ color: '#22c55e' }}>{formData.phone} (Verified)</span></div>
                    </div>
                    <button className="auth-submit-btn" onClick={handleRequestAccess} disabled={loading}>
                      {loading ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                )}

                {step === 5 && (
                  <div className="auth-form-step" style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="success-circle"
                    >
                      <CheckCircle2 size={64} color="#22c55e" />
                    </motion.div>
                    <h3 style={{ marginTop: '1.5rem' }}>Request Submitted</h3>
                    <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>Your academic profile is being reviewed by the department administrator.</p>
                    
                    <div className="status-timeline" style={{ marginTop: '2rem', textAlign: 'left' }}>
                      <div className="status-item done"><div className="dot"/><div className="text">Request Submitted</div></div>
                      <div className="status-item done"><div className="dot"/><div className="text">Phone Verified</div></div>
                      <div className="status-item pending"><div className="dot"/><div className="text">Admin Approval</div></div>
                      <div className="status-item idle"><div className="dot"/><div className="text">Account Activated</div></div>
                    </div>
                  </div>
                )}
                
                {error && <div className="auth-alert error"><AlertCircle size={16}/> {error}</div>}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
