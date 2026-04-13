import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { getSubjects, getSubmittedSubjects } from '../api';
import './SubjectList.css';

export default function SubjectList({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const deptId = sessionStorage.getItem('student_dept');
  const deptName = sessionStorage.getItem('student_dept_name');
  const yearLabel = { '1':'1st','2':'2nd','3':'3rd','4':'4th' }[sessionStorage.getItem('student_year')] || '';
  const studentUid = sessionStorage.getItem('student_uid');

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState([]);

  useEffect(() => {
    if (!deptId) { navigate('/student'); return; }

    // Load subjects + already-submitted list in parallel
    Promise.all([
      getSubjects(deptId),
      getSubmittedSubjects(studentUid, deptId),
    ])
      .then(([subjRes, submittedRes]) => {
        setSubjects(subjRes.data || []);
        // Merge backend data with any local session cache
        const fromSession = JSON.parse(sessionStorage.getItem('submitted_subjects') || '[]');
        const merged = Array.from(new Set([...(submittedRes.data || []), ...fromSession]));
        setSubmitted(merged);
        sessionStorage.setItem('submitted_subjects', JSON.stringify(merged));
      })
      .catch(() => setError('Failed to load data. Please try again.'))
      .finally(() => setLoading(false));
  }, [deptId]);

  const handleSelectSubject = (subject) => {
    if (submitted.includes(subject.id)) return; // already done
    sessionStorage.setItem('current_subject', JSON.stringify(subject));
    navigate(`/student/feedback/${subject.id}`);
  };

  const allDone = subjects.length > 0 && subjects.every(s => submitted.includes(s.id));

  return (
    <div className="page-wrapper">
      <div className="mesh-bg" />
      <div className="blob blob-1" />
      <div className="blob blob-2" />

      <Header theme={theme} toggleTheme={toggleTheme} showAuth={false} onBack={() => navigate('/student')} />

      <main className="sublist-main">
        <div className="sublist-header">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            {yearLabel} Year · {deptName}
          </div>
          <h1 className="sublist-title">
            Choose a <span className="gradient-text">Subject</span>
          </h1>
          <p className="sublist-subtitle">
            Select a subject below to submit your anonymous feedback. Completed subjects are marked with a ✅.
          </p>
        </div>

        {error && <div className="sublist-error">{error}</div>}

        {loading ? (
          <div className="sublist-loading">
            <div className="spinner" />
            <span>Loading subjects…</span>
          </div>
        ) : subjects.length === 0 ? (
          <GlassCard className="sublist-empty">
            <span className="empty-icon">📭</span>
            <p>No subjects have been added for this department yet.</p>
            <p className="empty-hint">Your Class Representative needs to add subjects first.</p>
          </GlassCard>
        ) : (
          <>
            {allDone && (
              <div className="all-done-banner">
                🎉 You've completed feedback for all subjects! Thank you.
              </div>
            )}
            <div className="subject-grid">
              {subjects.map((subject, idx) => {
                const isDone = submitted.includes(subject.id);
                return (
                  <button
                    key={subject.id}
                    className={`subject-card ${isDone ? 'done' : 'pending'}`}
                    onClick={() => handleSelectSubject(subject)}
                    disabled={isDone}
                  >
                    <div className="subject-index">{String(idx + 1).padStart(2, '0')}</div>
                    <div className="subject-info">
                      <div className="subject-name">{subject.name}</div>
                      {subject.staff_name && (
                        <div className="subject-staff">👨‍🏫 {subject.staff_name}</div>
                      )}
                    </div>
                    <div className="subject-status">
                      {isDone ? (
                        <span className="status-done">✅ Done</span>
                      ) : (
                        <span className="status-pending">Give Feedback →</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
