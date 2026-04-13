import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { submitFeedback } from '../api';
import './FeedbackForm.css';

const QUESTIONS = [
  { key: 'q1', label: 'Teacher explains concepts clearly' },
  { key: 'q2', label: 'Finishes the syllabus on time' },
  { key: 'q3', label: 'Teaching methods help you understand' },
  { key: 'q4', label: 'Encourages questions and discussion' },
  { key: 'q5', label: 'Tests and marks are fair' },
  { key: 'q6', label: 'Overall satisfaction with this subject' },
];

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="star-row">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className={`star-btn ${star <= (hovered || value) ? 'filled' : ''}`}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
        >
          ★
        </button>
      ))}
      <span className="star-label">{value ? `${value}/5` : 'Not rated'}</span>
    </div>
  );
}

export default function FeedbackForm({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const { subjectId } = useParams();

  const subject = (() => {
    try { return JSON.parse(sessionStorage.getItem('current_subject') || 'null'); }
    catch { return null; }
  })();
  const studentUid = sessionStorage.getItem('student_uid');
  const deptId = sessionStorage.getItem('student_dept');

  const [ratings, setRatings] = useState({ q1:0, q2:0, q3:0, q4:0, q5:0, q6:0 });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [sentiment, setSentiment] = useState('');

  useEffect(() => {
    if (!subject || !studentUid) navigate('/student');
  }, []);

  const allRated = Object.values(ratings).every(v => v > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allRated) { setError('Please rate all 6 questions before submitting.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        student_uid: studentUid,
        subject_id: subjectId,
        staff_id: subject?.staff_id || null,
        feedback_text: comment,
        ...ratings,
      };
      const res = await submitFeedback(payload);
      setSentiment(res.data?.sentiment || 'Neutral');

      // Mark this subject as submitted in session storage
      const prev = JSON.parse(sessionStorage.getItem('submitted_subjects') || '[]');
      sessionStorage.setItem('submitted_subjects', JSON.stringify([...prev, subjectId]));
      setSubmitted(true);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Submission failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const sentimentColors = { Positive: '#22c55e', Neutral: '#f59e0b', Negative: '#ef4444' };
  const sentimentEmoji = { Positive: '😊', Neutral: '😐', Negative: '😟' };

  if (submitted) {
    return (
      <div className="page-wrapper">
        <div className="mesh-bg" />
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <Header theme={theme} toggleTheme={toggleTheme} showAuth={false} />
        <main className="landing-main">
          <GlassCard className="success-card">
            <div className="success-icon">✅</div>
            <h2 className="success-title">Feedback Submitted!</h2>
            <p className="success-subtitle">
              Your anonymous feedback for <strong>{subject?.name}</strong> has been recorded.
            </p>
            {sentiment && (
              <div className="sentiment-pill" style={{ background: sentimentColors[sentiment] + '22', color: sentimentColors[sentiment], border: `1px solid ${sentimentColors[sentiment]}44` }}>
                {sentimentEmoji[sentiment]} Detected as <strong>{sentiment}</strong>
              </div>
            )}
            <div className="success-actions">
              <Button variant="primary" onClick={() => navigate('/student/subjects')}>
                ← Back to Subjects
              </Button>
              <Button variant="glass" onClick={() => navigate('/student')}>
                Change Department
              </Button>
            </div>
          </GlassCard>
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="mesh-bg" />
      <div className="blob blob-1" />
      <div className="blob blob-2" />

      <Header theme={theme} toggleTheme={toggleTheme} showAuth={false} onBack={() => navigate('/student/subjects')} />

      <main className="form-main">
        <GlassCard className="feedback-card">
          <div className="form-header">
            <div className="hero-badge">
              <span className="badge-dot"></span>
              Anonymous Feedback
            </div>
            <h1 className="form-title">{subject?.name}</h1>
            <p className="form-subtitle">
              Your identity is completely anonymous. Rate each aspect honestly.
            </p>
          </div>

          <form className="feedback-form" onSubmit={handleSubmit}>
            {/* Star Ratings */}
            <div className="ratings-section">
              <h3 className="section-heading">Rate Each Aspect</h3>
              {QUESTIONS.map(q => (
                <div key={q.key} className="rating-row">
                  <span className="rating-label">{q.label}</span>
                  <StarRating
                    value={ratings[q.key]}
                    onChange={val => setRatings(prev => ({ ...prev, [q.key]: val }))}
                  />
                </div>
              ))}
            </div>

            {/* Text Comment */}
            <div className="comment-section">
              <h3 className="section-heading">Additional Comments <span className="optional">(Optional)</span></h3>
              <textarea
                className="comment-box"
                placeholder="Share any specific feedback, suggestions, or concerns about this subject…"
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={4}
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="form-footer">
              <div className="anon-note">
                🔒 Your submission is completely anonymous and cannot be traced back to you.
              </div>
              <Button
                variant="primary"
                type="submit"
                className={`submit-btn ${submitting ? 'loading' : ''}`}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit Feedback →'}
              </Button>
            </div>
          </form>
        </GlassCard>
      </main>
    </div>
  );
}
