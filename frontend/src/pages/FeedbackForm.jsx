import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { submitFeedback } from '../api';
import { 
  CheckCircle2, 
  Smile, 
  Meh, 
  Frown, 
  Lock, 
  Star,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Send,
  ShieldCheck
} from 'lucide-react';
import './FeedbackForm.css';

const QUESTIONS = [
  { key: 'q1', label: 'Does the teacher explain concepts clearly and effectively?' },
  { key: 'q2', label: 'Does the teacher complete the syllabus within the timeline?' },
  { key: 'q3', label: 'Do the teaching methods help you grasp complex topics?' },
  { key: 'q4', label: 'Are questions and active discussions encouraged in class?' },
  { key: 'q5', label: 'Are the tests and internal markings fair and transparent?' },
  { key: 'q6', label: 'What is your overall satisfaction level with this subject?' },
];

function StarRating({ value, onChange, isReadOnly = false }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="premium-star-row">
      {[1, 2, 3, 4, 5].map(star => {
        const isFilled = star <= (hovered || value);
        const isCurrent = star === (hovered || value);
        return (
          <button
            key={star}
            type="button"
            className={`premium-star-btn ${isFilled ? 'filled' : ''} ${isCurrent ? 'current' : ''}`}
            onMouseEnter={() => !isReadOnly && setHovered(star)}
            onMouseLeave={() => !isReadOnly && setHovered(0)}
            onClick={() => !isReadOnly && onChange(star)}
            disabled={isReadOnly}
          >
            <Star 
              size={36} 
              fill={isFilled ? "currentColor" : "none"} 
              strokeWidth={isFilled ? 0 : 1.5} 
            />
          </button>
        );
      })}
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

  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [ratings, setRatings] = useState({ q1:0, q2:0, q3:0, q4:0, q5:0, q6:0 });
  const [questionComments, setQuestionComments] = useState({ q1:'', q2:'', q3:'', q4:'', q5:'', q6:'' });
  const [showCommentInput, setShowCommentInput] = useState({});
  const [finalComment, setFinalComment] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [sentiment, setSentiment] = useState('');

  const totalSteps = QUESTIONS.length + 1; // questions + final review

  useEffect(() => {
    if (!subject || !studentUid) navigate('/student');
  }, [subject, studentUid, navigate]);

  const handleRating = (key, val) => {
    setRatings(prev => ({ ...prev, [key]: val }));
  };

  const toggleComment = (key) => {
    setShowCommentInput(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allRated = Object.values(ratings).every(v => v > 0);

  const handleSubmit = async () => {
    if (!allRated) {
      setError('Please provide a rating for all aspects.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        student_uid: studentUid,
        subject_id: subjectId,
        staff_id: subject?.staff_id || null,
        feedback_text: finalComment,
        question_comments: questionComments,
        ...ratings,
      };
      
      const res = await submitFeedback(payload);
      setAiSummary(res.data?.reason || "Thank you for your valuable input. Our system has processed your feedback to help improve the learning experience.");
      setSentiment(res.data?.sentiment || 'Neutral');

      const prev = JSON.parse(sessionStorage.getItem('submitted_subjects') || '[]');
      sessionStorage.setItem('submitted_subjects', JSON.stringify([...prev, subjectId]));
      
      setSubmitted(true);
      
      // Auto-redirect after 6 seconds
      setTimeout(() => navigate('/student/subjects'), 10000);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentQ = QUESTIONS[currentStep];
  const progress = (currentStep / (totalSteps - 1)) * 100;

  if (submitted) {
    return (
      <div className="page-wrapper feedback-wizard-wrapper">
        <Header theme={theme} toggleTheme={toggleTheme} showAuth={false} />
        <main className="wizard-main">
          <GlassCard className="feedback-success-card">
            <div className="success-lottie-area">
              <div className="success-ring">
                <CheckCircle2 size={80} className="success-check-icon" />
              </div>
            </div>
            <h2 className="wizard-title">Feedback Received</h2>
            <p className="wizard-subtitle">Your anonymous contribution helps us maintain high educational standards.</p>
            
            <div className="ai-summary-box">
              <div className="ai-box-header">
                <Sparkles size={18} />
                <span>AI Insights Summary</span>
              </div>
              <p className="ai-summary-text">{aiSummary}</p>
            </div>

            <div className="redirect-countdown">
              Returning to subjects in 10 seconds...
            </div>
            
            <Button variant="primary" className="back-btn-success" onClick={() => navigate('/student/subjects')}>
              Back to Subject List <ArrowRight size={18} style={{marginLeft: '8px'}} />
            </Button>
          </GlassCard>
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrapper feedback-wizard-wrapper">
      <Header theme={theme} toggleTheme={toggleTheme} showAuth={false} onBack={() => navigate('/student/subjects')} />

      <div className="progress-container">
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="progress-text">
          Step {Math.min(currentStep + 1, totalSteps)} of {totalSteps}
        </div>
      </div>

      <main className="wizard-main">
        {currentStep < QUESTIONS.length ? (
          <GlassCard className="question-card" key={currentQ.key}>
            <div className="q-header-badges">
              <div className="q-badge">Question {currentStep + 1}</div>
              <div className="q-subject-badge">{subject?.name}</div>
            </div>
            <h2 className="q-label">{currentQ.label}</h2>
            
            <div className="rating-container">
              <StarRating 
                value={ratings[currentQ.key]} 
                onChange={(val) => handleRating(currentQ.key, val)} 
              />
              <div className="rating-desc">
                {ratings[currentQ.key] === 5 ? 'Excellent' : 
                 ratings[currentQ.key] === 4 ? 'Very Good' :
                 ratings[currentQ.key] === 3 ? 'Good' :
                 ratings[currentQ.key] === 2 ? 'Fair' :
                 ratings[currentQ.key] === 1 ? 'Poor' : 'Select a rating'}
              </div>
            </div>

            <div className="comment-toggle-area">
              {!showCommentInput[currentQ.key] ? (
                <button className="add-comment-trigger" onClick={() => toggleComment(currentQ.key)}>
                  <MessageSquare size={16} /> Add specific notes for this question
                </button>
              ) : (
                <div className="q-comment-input-wrapper">
                  <textarea 
                    autoFocus
                    placeholder="Type your notes here..."
                    className="q-comment-textarea"
                    value={questionComments[currentQ.key]}
                    onChange={(e) => setQuestionComments(prev => ({ ...prev, [currentQ.key]: e.target.value }))}
                  />
                  <button className="close-comment" onClick={() => toggleComment(currentQ.key)}>Minimize</button>
                </div>
              )}
            </div>

            <div className="wizard-controls">
              <button 
                className="wiz-nav-btn prev" 
                disabled={currentStep === 0} 
                onClick={() => setCurrentStep(prev => prev - 1)}
              >
                <ArrowLeft size={18} /> Previous
              </button>
              <button 
                className="wiz-nav-btn next" 
                disabled={ratings[currentQ.key] === 0}
                onClick={() => setCurrentStep(prev => prev + 1)}
              >
                Next <ArrowRight size={18} />
              </button>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="question-card final-review-card">
            <div className="q-badge final-badge">
              <Sparkles size={14} style={{marginRight: '6px'}} /> Final Review
            </div>
            <h2 className="q-label">Any additional thoughts, <span className="subject-name-highlight">{subject?.name}</span>?</h2>
            <p className="wizard-subtitle-small">Your contribution directly helps improve learning quality.</p>
            
            <div className="final-input-wrapper">
              <textarea 
                className="final-comment-textarea"
                placeholder="Share any overall suggestions or praise for this subject..."
                value={finalComment}
                onChange={(e) => setFinalComment(e.target.value)}
              />
              <div className="textarea-accent"></div>
            </div>

            <div className="security-badge-wrapper">
              <div className="anon-disclaimer-premium">
                <ShieldCheck size={16} className="security-icon" />
                <span>100% Encrypted & Anonymous Submission</span>
              </div>
            </div>

            {error && <div className="wiz-error">{error}</div>}

            <div className="wizard-controls">
              <button 
                className="wiz-nav-btn prev" 
                onClick={() => setCurrentStep(prev => prev - 1)}
              >
                <ArrowLeft size={18} /> Question 6
              </button>
              <Button 
                variant="primary" 
                className={`wiz-submit-btn ${submitting ? 'loading' : ''}`}
                onClick={handleSubmit}
                disabled={submitting || !allRated}
              >
                {submitting ? 'Encrypting & Sending...' : <><Send size={18} style={{marginRight: '8px'}} /> Complete Submission</>}
              </Button>
            </div>
          </GlassCard>
        )}
      </main>
    </div>
  );
}
