import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { getSubjects, getSubmittedSubjects, getStaff } from '../api';
import { 
  BookOpen, 
  User, 
  CheckCircle, 
  Clock, 
  Star, 
  ChevronRight, 
  ArrowLeft,
  LayoutGrid
} from 'lucide-react';
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

    Promise.all([
      getSubjects(deptId),
      getSubmittedSubjects(studentUid, deptId),
      getStaff(deptId)
    ])
      .then(([subjRes, submittedRes, staffRes]) => {
        const staffList = staffRes.data || [];
        const enrichedSubjects = (subjRes.data || []).map(subject => {
          const assignedStaff = staffList.find(s => s.subject_id === subject.id);
          return assignedStaff ? { ...subject, staff_name: assignedStaff.name, staff_id: assignedStaff.id } : subject;
        });
        
        setSubjects(enrichedSubjects);
        const fromSession = JSON.parse(sessionStorage.getItem('submitted_subjects') || '[]');
        const merged = Array.from(new Set([...(submittedRes.data || []), ...fromSession]));
        setSubmitted(merged);
        sessionStorage.setItem('submitted_subjects', JSON.stringify(merged));
      })
      .catch(() => setError('Failed to load data. Please try again.'))
      .finally(() => setLoading(false));
  }, [deptId, studentUid, navigate]);

  const { pendingSubjects, completedSubjects } = useMemo(() => {
    return {
      pendingSubjects: subjects.filter(s => !submitted.includes(s.id)),
      completedSubjects: subjects.filter(s => submitted.includes(s.id))
    };
  }, [subjects, submitted]);

  const completionRate = subjects.length > 0 
    ? Math.round((submitted.length / subjects.length) * 100) 
    : 0;

  const handleSelectSubject = (subject) => {
    if (submitted.includes(subject.id)) return;
    sessionStorage.setItem('current_subject', JSON.stringify(subject));
    navigate(`/student/feedback/${subject.id}`);
  };

  return (
    <div className="page-wrapper dashboard-theme">
      <Header theme={theme} toggleTheme={toggleTheme} showAuth={false} onBack={() => navigate('/student')} />

      <main className="sublist-premium-container">
        <div className="sublist-header-v2">
          <div className="header-top">
            <button className="back-minimal-btn" onClick={() => navigate('/student')}>
              <ArrowLeft size={18} /> Back
            </button>
            <div className="header-meta">
              <span className="meta-badge">{yearLabel} Year</span>
              <span className="meta-badge">{deptName}</span>
            </div>
          </div>

          <div className="title-section">
            <h1 className="sublist-title-v2">Choose a Subject</h1>
            <p className="sublist-subtitle-v2">Select a subject to submit your anonymous feedback.</p>
          </div>

          <div className="progress-overview">
            <div className="progress-info">
              <span className="p-label">Participation Progress</span>
              <span className="p-value">{submitted.length} of {subjects.length} Completed</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${completionRate}%` }}></div>
            </div>
          </div>
        </div>

        {error && <div className="sublist-error-v2">{error}</div>}

        {loading ? (
          <div className="sublist-loading-v2">
            <div className="spinner-glow" />
            <span>Curating your dashboard…</span>
          </div>
        ) : subjects.length === 0 ? (
          <GlassCard className="sublist-empty-v2">
            <div className="empty-state-icon">
              <LayoutGrid size={48} opacity={0.5} />
            </div>
            <h3>No subjects found</h3>
            <p>Your academic department hasn't listed any subjects for this term yet.</p>
          </GlassCard>
        ) : (
          <div className="sections-container">
            {pendingSubjects.length > 0 && (
              <section className="subject-section">
                <div className="section-header">
                  <div className="section-indicator pending"></div>
                  <h2 className="section-title">Pending Feedback</h2>
                  <span className="section-count">{pendingSubjects.length}</span>
                </div>
                <div className="subject-grid-v2">
                  {pendingSubjects.map((subject, idx) => (
                    <SubjectCard 
                      key={subject.id}
                      subject={subject}
                      isDone={false}
                      index={idx}
                      onSelect={() => handleSelectSubject(subject)}
                    />
                  ))}
                </div>
              </section>
            )}

            {completedSubjects.length > 0 && (
              <section className="subject-section">
                <div className="section-header">
                  <div className="section-indicator completed"></div>
                  <h2 className="section-title">Completed Subjects</h2>
                  <span className="section-count">{completedSubjects.length}</span>
                </div>
                <div className="subject-grid-v2">
                  {completedSubjects.map((subject, idx) => (
                    <SubjectCard 
                      key={subject.id}
                      subject={subject}
                      isDone={true}
                      index={idx + pendingSubjects.length}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function SubjectCard({ subject, isDone, onSelect, index }) {
  // Staggered animation delay
  const animationDelay = `${(index % 6) * 0.08}s`;

  return (
    <div 
      className={`subject-card-v2 ${isDone ? 'is-done' : 'is-pending'}`}
      onClick={!isDone ? onSelect : undefined}
      style={{ animationDelay }}
    >
      <div className="card-top">
        <div className="subject-icon-box">
          <BookOpen size={20} />
        </div>
        <div className={`status-pill ${isDone ? 'done' : 'pending'}`}>
          {isDone ? <><CheckCircle size={12} /> Completed</> : <><Clock size={12} /> Pending</>}
        </div>
      </div>

      <div className="card-body">
        <h3 className="s-name">{subject.name}</h3>
        <div className="s-tagline">
          <User size={14} /> <span>{subject.staff_name || 'Department Faculty'}</span>
        </div>
      </div>

      <div className="card-footer">
        <div className="insight-preview">
          <Star size={12} fill="#f59e0b" stroke="none" />
          <span>High rating subject</span>
        </div>
        <button className={`action-btn ${isDone ? 'view' : 'start'}`}>
          {isDone ? 'Done' : 'Review'} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
