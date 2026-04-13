import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { getDepartmentsByYear } from '../api';
import './StudentSelect.css';

const YEARS = ['1', '2', '3', '4'];
const YEAR_LABELS = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year' };

export default function StudentSelect({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const studentUid = sessionStorage.getItem('student_uid') || 'guest-' + Math.random().toString(36).slice(2, 10);

  const [selectedYear, setSelectedYear] = useState('');
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Store UID in session storage so it persists across pages for this session
  useEffect(() => {
    if (!sessionStorage.getItem('student_uid')) {
      sessionStorage.setItem('student_uid', studentUid);
    }
  }, []);

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

  const handleProceed = () => {
    if (!selectedYear || !selectedDept) return;
    sessionStorage.setItem('student_year', selectedYear);
    sessionStorage.setItem('student_dept', selectedDept);
    const dept = departments.find(d => d.id === selectedDept);
    sessionStorage.setItem('student_dept_name', dept?.name || '');
    navigate('/student/subjects');
  };

  return (
    <div className="page-wrapper">
      <div className="mesh-bg" />
      <div className="blob blob-1" />
      <div className="blob blob-2" />

      <Header theme={theme} toggleTheme={toggleTheme} showAuth={false} onBack={() => navigate('/auth')} />

      <main className="landing-main">
        <GlassCard className="select-card">
          <div className="select-header">
            <div className="hero-badge">
              <span className="badge-dot"></span>
              Student Feedback Portal
            </div>
            <h1 className="select-title">Select Your <span className="gradient-text">Year & Department</span></h1>
            <p className="select-subtitle">Choose your academic year and department to see the relevant feedback forms.</p>
          </div>

          {error && <div className="select-error">{error}</div>}

          <div className="select-body">
            {/* Year Selector */}
            <div className="select-group">
              <label className="select-label">Academic Year</label>
              <div className="year-grid">
                {YEARS.map(yr => (
                  <button
                    key={yr}
                    className={`year-btn ${selectedYear === yr ? 'active' : ''}`}
                    onClick={() => setSelectedYear(yr)}
                  >
                    <span className="year-num">{yr}</span>
                    <span className="year-text">{YEAR_LABELS[yr]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Department Selector */}
            <div className="select-group">
              <label className="select-label">Department</label>
              {!selectedYear ? (
                <p className="select-hint">Select a year first to see departments.</p>
              ) : loading ? (
                <div className="select-loading">
                  <div className="spinner" />
                  <span>Loading departments…</span>
                </div>
              ) : departments.length === 0 ? (
                <p className="select-hint">No departments found for this year.</p>
              ) : (
                <div className="dept-grid">
                  {departments.map(dept => (
                    <button
                      key={dept.id}
                      className={`dept-btn ${selectedDept === dept.id ? 'active' : ''}`}
                      onClick={() => setSelectedDept(dept.id)}
                    >
                      {dept.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="primary"
              className="proceed-btn"
              onClick={handleProceed}
              disabled={!selectedYear || !selectedDept}
            >
              View Feedback Forms →
            </Button>
          </div>
        </GlassCard>
      </main>
    </div>
  );
}
