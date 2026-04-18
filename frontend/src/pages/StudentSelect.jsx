import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  Calendar, 
  School, 
  ArrowRight,
  ArrowRightCircle,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Check
} from 'lucide-react';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { getDepartmentsByYear } from '../api';
import { supabase } from '../supabaseClient';
import './Onboarding.css';
import './StudentSelect.css';

const YEARS = ['1', '2', '3', '4'];
const YEAR_LABELS = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year' };

export default function StudentSelect({ theme, toggleTheme }) {
  const navigate = useNavigate();

  const [selectedYear, setSelectedYear] = useState('');
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Enforce authentication
  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        setIsCheckingAuth(false);
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth', { replace: true });
      } else {
        sessionStorage.setItem('student_uid', session.user.id);
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!selectedYear) return;
    setLoading(true);
    setSelectedDept('');
    setDepartments([]);
    getDepartmentsByYear(selectedYear)
      .then(res => setDepartments(res.data || []))
      .catch(() => setError('Failed to load departments. Please try again.'))
      .finally(() => setLoading(false));
  }, [selectedYear]);

  const handleProceedClick = () => {
    if (!selectedYear || !selectedDept) return;
    setShowConfirm(true);
  };

  const confirmSelection = () => {
    sessionStorage.setItem('student_year', selectedYear);
    sessionStorage.setItem('student_dept', selectedDept);
    const dept = departments.find(d => d.id === selectedDept);
    sessionStorage.setItem('student_dept_name', dept?.name || '');
    navigate('/student/subjects');
  };

  if (isCheckingAuth) return null;

  return (
    <div className="onboarding-page">
      {/* Visual Section */}
      <section className="onboarding-visual select-visual">
         <div className="floating-shapes">
          <div className="shape shape-1" style={{ opacity: 0.4 }}></div>
          <div className="shape shape-2" style={{ opacity: 0.4 }}></div>
        </div>
        
        <motion.div 
          className="visual-content"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="visual-badge">
            <Sparkles size={14} /> Step 2: Personalisation
          </div>
          <h1 className="visual-title">
            Tailor Your <br />
            <span className="gradient-text-light">Experience</span>
          </h1>
          <p className="visual-tagline">
            Select your academic profile to access specific feedback forms and performance insights for your department.
          </p>
        </motion.div>
      </section>

      {/* Form Section */}
      <section className="onboarding-form-side">
        <div className="onboarding-nav">
          <button className="back-minimal-btn" onClick={() => navigate('/auth')}>
             Back
          </button>
        </div>

        <div className="form-content-wrapper">
          <GlassCard className="form-card selection-card">
            <div className="auth-header" style={{ textAlign: 'left' }}>
              <h2 className="auth-step-title">Select Your Profile</h2>
              <p className="auth-step-subtitle">Help us find the right subjects for you.</p>
            </div>

            {error && <div className="auth-error-msg">{error}</div>}

            <div className="selection-body">
              {/* Year Cards */}
              <div className="selection-group">
                <label className="selection-label">Academic Year</label>
                <div className="year-card-grid">
                  {YEARS.map((yr, idx) => (
                    <motion.button
                      key={yr}
                      className={`year-card-premium ${selectedYear === yr ? 'active' : ''}`}
                      onClick={() => setSelectedYear(yr)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + (idx * 0.05) }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="y-icon"><GraduationCap size={20} /></div>
                      <div className="y-info">
                        <span className="y-num">{yr}</span>
                        <span className="y-label">{YEAR_LABELS[yr]}</span>
                      </div>
                      {selectedYear === yr && <div className="y-check"><Check size={14} /></div>}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Department Reveal */}
              <AnimatePresence>
                {selectedYear && (
                  <motion.div 
                    className="selection-group dept-reveal"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <label className="selection-label">Department</label>
                    {loading ? (
                      <div className="selection-loading-box">
                        <div className="loading-spinner-small" />
                        <span>Finding departments...</span>
                      </div>
                    ) : departments.length === 0 ? (
                      <p className="selection-hint">No departments available.</p>
                    ) : (
                      <div className="dept-chip-cloud">
                        {departments.map((dept, idx) => (
                          <motion.button
                            key={dept.id}
                            className={`dept-chip-premium ${selectedDept === dept.id ? 'active' : ''}`}
                            onClick={() => setSelectedDept(dept.id)}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.03 }}
                          >
                            {dept.name}
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="selection-footer">
              <Button
                variant="primary"
                className="proceed-btn-premium"
                onClick={handleProceedClick}
                disabled={!selectedYear || !selectedDept}
              >
                <span>Continue to subjects</span> <ChevronRight size={18} />
              </Button>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="modal-overlay">
          <GlassCard className="modal-content confirm-modal-premium">
            <button className="modal-back-arrow" onClick={() => setShowConfirm(false)} aria-label="Go back">
              <ArrowLeft size={18} />
            </button>
            
            <div className="confirm-icon-top">
              <ShieldAlert size={38} strokeWidth={1.5} />
            </div>
            
            <h2 className="modal-title">Confirm Selection</h2>
            <p className="modal-subtitle">Ensure your details are correct before proceeding.</p>
            
            <div className="confirm-preview-box">
              <div className="preview-row">
                <div className="preview-icon-wrapper"><Calendar size={20} /></div>
                <div className="preview-info">
                  <span className="p-val-label">Academic Year</span>
                  <span className="p-val-text">{YEAR_LABELS[selectedYear]}</span>
                </div>
              </div>
              <div className="preview-divider"></div>
              <div className="preview-row">
                <div className="preview-icon-wrapper"><School size={20} /></div>
                <div className="preview-info">
                   <span className="p-val-label">Department</span>
                   <span className="p-val-text">{departments.find(d => d.id === selectedDept)?.name}</span>
                </div>
              </div>
            </div>

            <div className="modal-actions-premium">
              <Button variant="primary" className="btn-modal-confirm" onClick={confirmSelection}>
                Confirm & Proceed
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

