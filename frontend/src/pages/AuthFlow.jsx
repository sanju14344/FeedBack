import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { Lock, BarChart2, Zap, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Onboarding.css';
import './AuthFlow.css';

export default function AuthFlow({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        sessionStorage.setItem('student_uid', session.user.id);
        navigate('/student');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setError('Authentication service is not configured.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth'
      }
    });
    if (error) {
      setError('Failed to initialize Google login.');
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-page">
      {/* Visual Section */}
      <section className="onboarding-visual">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
        
        <motion.div 
          className="visual-content"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="visual-badge">
            <ShieldCheck size={14} /> Enhanced Security
          </div>
          <h1 className="visual-title">
            Empower <br />
            <span className="gradient-text-light">Honest</span> Feedback
          </h1>
          <p className="visual-tagline">
            Your anonymous voice is the catalyst for educational excellence. 
            Join 2,000+ students shaping the future of learning.
          </p>
        </motion.div>
      </section>

      {/* Form Section */}
      <section className="onboarding-form-side">
        <div className="onboarding-nav">
          <button className="back-minimal-btn" onClick={() => navigate('/')}>
             Back
          </button>
        </div>

        <div className="form-content-wrapper">
          <motion.div 
            className="form-card-container"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <GlassCard className="form-card">
              <div className="auth-header">
                <h2 className="auth-step-title">Welcome back</h2>
                <p className="auth-step-subtitle">Securely sign in to your student account.</p>
              </div>

              <div className="auth-actions-v2">
                <button 
                  className={`google-login-btn-premium ${loading ? 'auth-loading' : ''}`}
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="loading-spinner-small" />
                  ) : (
                    <>
                      <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" />
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
                {error && <p className="auth-error-msg">{error}</p>}
              </div>

              <div className="auth-footer-trust">
                <div className="trust-pill"><Lock size={12} /> Anonymous</div>
                <div className="trust-pill"><BarChart2 size={12} /> Insights</div>
                <div className="trust-pill"><Zap size={12} /> Real-time</div>
              </div>
            </GlassCard>
            
            <p className="onboarding-help-text">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

