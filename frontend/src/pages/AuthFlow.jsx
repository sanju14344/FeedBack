import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { Lock, BarChart2, Zap } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './AuthFlow.css';

export default function AuthFlow({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Guard: supabase may be null if env vars are missing in production
    if (!supabase) return;

    // Listen for auth state changes (like when returning from Google OAuth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only navigate on explicit SIGNED_IN event, not on INITIAL_SESSION so users aren't auto-trapped
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
      setError('Authentication service is not configured. Please contact support.');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth'
      }
    });
    if (error) {
      console.error('Error logging in with Google:', error.message);
      setError('Failed to initialize Google login. Check Supabase URL settings.');
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        sessionStorage.setItem('student_uid', data.user.id);
        navigate('/student');
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // If email confirmation is required by Supabase settings, inform the user
        if (data?.user?.identities?.length === 0) {
          setError('Email already exists or sign up failed.');
        } else {
          setMessage('Success! You can now sign in.');
          setIsLogin(true);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="mesh-bg" />
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      
      <Header showAuth={true} onBack={() => navigate('/')} />
      
      <main className="landing-main">
        <GlassCard className="auth-card">
          <div className="hero-badge">
            <span className="badge-dot"></span> Anonymous & Secure Feedback
          </div>
          
          <h1 className="hero-title auth-title">
            Empower <span className="gradient-text">Honest</span> Feedback
          </h1>

          <div className="auth-actions" style={{ flexDirection: 'column', gap: '1rem', alignItems: 'center', marginTop: '2rem' }}>
            <button type="button" className="google-btn" onClick={handleGoogleLogin} style={{ width: '100%' }}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="G" className="google-icon" />
              Continue with Google
            </button>
          </div>

          <div className="trust-badges" style={{ marginTop: '2rem' }}>
            <div className="trust-item"><Lock size={14} color="#f59e0b" /><span>Anonymised by default</span></div>
            <div className="trust-item"><BarChart2 size={14} color="#8b5cf6" /><span>Sentiment Insights</span></div>
            <div className="trust-item"><Zap size={14} color="#ef4444" /><span>Real-time reports</span></div>
          </div>

        </GlassCard>
      </main>
    </div>
  );
}
