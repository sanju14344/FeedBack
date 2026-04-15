import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { 
  getCrProfile, 
  getInsights, 
  getFeedbackLogs, 
  getStaff, 
  getSubjects, 
  createStaff, 
  deleteStaff, 
  createSubject, 
  deleteSubject,
  getDepartmentsByYear
} from '../api';
import { generatePDFReport } from '../utils/reportGenerator';
import './Dashboard.css';

export default function Dashboard({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Analytics');
  const [profile, setProfile] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [insights, setInsights] = useState(null);
  const [staff, setStaff] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Management Form States
  const [newEntry, setNewEntry] = useState({ subject: '', staff: '' });

  useEffect(() => {
    const uid = sessionStorage.getItem('cr_uid');
    if (!uid) {
      navigate('/cr-login');
      return;
    }
    fetchData(uid);
  }, [navigate]);

  const fetchData = async (uid) => {
    setLoading(true);
    try {
      const profileRes = await getCrProfile(uid);
      const prof = profileRes.data;
      setProfile(prof);

      if (prof.department) {
        // Fetch all related data
        const [fbRes, insightRes] = await Promise.all([
          getFeedbackLogs(prof.department),
          getInsights(prof.department)
        ]);
        setFeedback(fbRes.data);
        setInsights(insightRes.data);
        
        // Fetch management data
        // We need the department ID for creation
        const deptsRes = await getDepartmentsByYear(prof.year);
        const myDept = deptsRes.data.find(d => d.name === prof.department);
        
        if (myDept) {
          const [staffRes, subRes] = await Promise.all([
            getStaff(myDept.id),
            getSubjects(myDept.id)
          ]);
          setStaff(staffRes.data);
          setSubjects(subRes.data);
          setProfile(prev => ({ ...prev, dept_id: myDept.id }));
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!newEntry.subject && !newEntry.staff) return;
    if (!profile?.dept_id) return;

    try {
      let targetSubjectId = null;

      // 1. Handle Subject
      if (newEntry.subject) {
        const existingSubject = subjects.find(s => s.name.toLowerCase() === newEntry.subject.toLowerCase());
        if (existingSubject) {
          targetSubjectId = existingSubject.id;
        } else {
          try {
            const subRes = await createSubject({ name: newEntry.subject, department_id: profile.dept_id, year: profile.year });
            targetSubjectId = subRes.data.id;
          } catch (err) {
            console.error('Failed to add subject', err);
          }
        }
      }

      // 2. Handle Staff
      if (newEntry.staff) {
        try {
          await createStaff({ name: newEntry.staff, department_id: profile.dept_id, subject_id: targetSubjectId });
        } catch (err) {
          console.error('Failed to add staff', err);
        }
      }

      setNewEntry({ subject: '', staff: '' });
      const [staffRes, subRes] = await Promise.all([
        getStaff(profile.dept_id),
        getSubjects(profile.dept_id)
      ]);
      setStaff(staffRes.data);
      setSubjects(subRes.data);
    } catch (err) {
      alert('An unexpected error occurred.');
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Delete this staff?')) return;
    try {
      await deleteStaff(id);
      setStaff(staff.filter(s => s.id !== id));
    } catch (err) { alert('Delete failed'); }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('Delete this subject?')) return;
    try {
      await deleteSubject(id);
      setSubjects(subjects.filter(s => s.id !== id));
    } catch (err) { alert('Delete failed'); }
  };

  const onLogout = () => {
    sessionStorage.clear();
    navigate('/');
  };

  if (loading) return <div className="loading-screen">Loading dashboard...</div>;

  return (
    <div className="page-wrapper dashboard-wrapper">
      <Header 
        theme={theme} 
        toggleTheme={toggleTheme} 
        userText={`${profile?.full_name || 'CR'} (${profile?.year || '?'} Year, ${profile?.department || '?'})`} 
        onLogout={onLogout} 
      />

      <main className="dashboard-main">
        {/* Navigation Tabs */}
        <div className="dash-tabs">
          <button className={`tab-btn ${activeTab === 'Analytics' ? 'active' : ''}`} onClick={() => setActiveTab('Analytics')}>
            <span role="img" aria-label="analytics">📊</span> Analytics
          </button>
          <button className={`tab-btn ${activeTab === 'Feedback' ? 'active' : ''}`} onClick={() => setActiveTab('Feedback')}>
            <span role="img" aria-label="feedback">💬</span> Feedback
          </button>
          <button className={`tab-btn ${activeTab === 'Manage' ? 'active' : ''}`} onClick={() => setActiveTab('Manage')}>
            <span role="img" aria-label="manage">⚙️</span> Manage
          </button>
        </div>

        {activeTab === 'Analytics' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Analytics Overview</h2>
              <Button onClick={() => generatePDFReport(profile, insights, feedback)} variant="primary">
                Download PDF Report
              </Button>
            </div>
            {/* Stat Cards */}
            <div className="stats-grid">
              <GlassCard className="stat-card">
                <div className="stat-title">TOTAL FEEDBACK</div>
                <div className="stat-val">{feedback.length}</div>
                <div className="stat-line bg-black"></div>
              </GlassCard>
              <GlassCard className="stat-card">
                <div className="stat-title">POSITIVE</div>
                <div className="stat-val success">{feedback.filter(f => f.sentiment_label === 'Positive').length}</div>
                <div className="stat-line bg-success"></div>
              </GlassCard>
              <GlassCard className="stat-card">
                <div className="stat-title">NEUTRAL</div>
                <div className="stat-val warning">{feedback.filter(f => f.sentiment_label === 'Neutral').length}</div>
                <div className="stat-line bg-warning"></div>
              </GlassCard>
              <GlassCard className="stat-card">
                <div className="stat-title">NEGATIVE</div>
                <div className="stat-val error">{feedback.filter(f => f.sentiment_label === 'Negative').length}</div>
                <div className="stat-line bg-error"></div>
              </GlassCard>
              <GlassCard className="stat-card">
                <div className="stat-title">SATISFACTION</div>
                <div className="stat-val">{insights?.satisfaction_score || 0}%</div>
                <div className="stat-line bg-black"></div>
              </GlassCard>
            </div>

            {/* AI Insights Board */}
            <GlassCard className="chart-card" style={{ marginBottom: '2rem' }}>
              <h3 className="section-title">✨ AI Powered Insights</h3>
              {insights?.ai_summary ? (
                <>
                  <p className="ai-summary-text">{insights.ai_summary}</p>
                  <div className="ai-grid">
                    <div className="ai-box">
                      <h4>✅ Key Strengths</h4>
                      <ul className="ai-list">
                        {insights.ai_strengths?.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                    <div className="ai-box">
                      <h4>⚠️ Improvement Areas</h4>
                      <ul className="ai-list">
                        {insights.ai_improvements?.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                    <div className="ai-box">
                      <h4>💡 Actionable Suggestions</h4>
                      <ul className="ai-list">
                        {insights.ai_suggestions?.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                    <div className="ai-box">
                      <h4>📍 Top Compliment Phrases</h4>
                      <div className="keyword-tags">
                        {insights.top_compliment_phrases?.map((kw, i) => (
                          <span key={i} className="kw-tag tag-success">{kw}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="empty-text">No enough feedback for AI analysis yet.</p>
              )}
            </GlassCard>

            <div className="charts-grid">
              <GlassCard className="chart-card">
                <h3 className="section-title">Sentiment Distribution</h3>
                <div className="chart-container">
                  <div className="donut-legend">
                    <span className="legend-item"><span className="legend-box bg-success"></span> Positive</span>
                    <span className="legend-item"><span className="legend-box bg-warning"></span> Neutral</span>
                    <span className="legend-item"><span className="legend-box bg-error"></span> Negative</span>
                  </div>
                  <div className="donut-chart" style={{ 
                    '--pos': `${(feedback.filter(f => f.sentiment_label === 'Positive').length / (feedback.length || 1)) * 100}%`,
                    '--neu': `${(feedback.filter(f => f.sentiment_label === 'Neutral').length / (feedback.length || 1)) * 100}%`,
                    '--neg': `${(feedback.filter(f => f.sentiment_label === 'Negative').length / (feedback.length || 1)) * 100}%`
                  }}></div>
                </div>
              </GlassCard>
              
              <GlassCard className="chart-card">
                <h3 className="section-title">Complaints (AI Detected)</h3>
                <div className="keyword-tags">
                  {insights?.top_complaint_phrases?.map((kw, i) => (
                    <span key={i} className="kw-tag tag-error" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>{kw}</span>
                  ))}
                  {(!insights?.top_complaint_phrases || insights.top_complaint_phrases.length === 0) && <p className="empty-text">No major complaints detected.</p>}
                </div>
              </GlassCard>
            </div>
          </>
        )}

        {activeTab === 'Feedback' && (
          <GlassCard className="chart-card">
            <h3 className="section-title">Student Feedback Board</h3>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Subject</th>
                    <th>Staff</th>
                    <th>Sentiment</th>
                    <th>Feedback Text</th>
                  </tr>
                </thead>
                <tbody>
                  {feedback.map(f => (
                    <tr key={f.id}>
                      <td>{new Date(f.created_at).toLocaleDateString()}</td>
                      <td>{f.subjects?.name || 'Unknown'}</td>
                      <td>{f.staff?.name || 'N/A'}</td>
                      <td>
                        <span className={`sentiment-badge ${f.sentiment_label?.toLowerCase() === 'positive' ? 'tag-success' : f.sentiment_label?.toLowerCase() === 'negative' ? 'tag-error' : 'tag-neutral'}`}
                          style={{ 
                            background: f.sentiment_label === 'Positive' ? 'var(--success-bg)' : f.sentiment_label === 'Negative' ? 'var(--error-bg)' : 'rgba(0,0,0,0.05)',
                            color: f.sentiment_label === 'Positive' ? 'var(--success)' : f.sentiment_label === 'Negative' ? 'var(--error)' : 'var(--text-sub)'
                          }}
                        >
                          {f.sentiment_label}
                        </span>
                      </td>
                      <td style={{ maxWidth: '400px' }}>{f.feedback_text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {feedback.length === 0 && <p className="empty-text" style={{ padding: '2rem', textAlign: 'center' }}>No feedback received yet.</p>}
            </div>
          </GlassCard>
        )}

        {activeTab === 'Manage' && (
          <div className="manage-layout">
            <div className="manage-left">
              <GlassCard className="manage-form-card">
                <h3 className="section-title">➕ Add Staff or Subject</h3>
                <p className="form-subtitle">They will be added to your department automatically.</p>
                <form className="manage-form" onSubmit={handleAddEntry}>
                  <div className="form-group">
                    <label>SUBJECT NAME</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. DBMS" 
                      value={newEntry.subject}
                      onChange={(e) => setNewEntry({ ...newEntry, subject: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>STAFF NAME</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Dr. Ramesh" 
                      value={newEntry.staff}
                      onChange={(e) => setNewEntry({ ...newEntry, staff: e.target.value })}
                    />
                  </div>
                  <p className="helper-text">
                    If you only want to create a subject, you can leave staff name empty and add it later. Oh wait, both were required before. Let's make Staff Name optional if you just want a subject.
                  </p>
                  <Button type="submit" variant="primary" className="full-width">Add Entry</Button>
                </form>
              </GlassCard>
            </div>

            <div className="manage-right">
              <GlassCard className="manage-list-card">
                <div className="list-header">
                  <h3 className="section-title">📂 Directory: Subjects & Staff</h3>
                  <span className="live-badge">🟢 LIVE</span>
                </div>
                
                <div className="manage-list">
                  {staff.length === 0 && subjects.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📂</div>
                      <p>No subjects or staff added yet.</p>
                    </div>
                  ) : null}

                  {subjects.map(sub => {
                    const assignedStaff = staff.filter(s => s.subject_id === sub.id);
                    return (
                      <div key={sub.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <div className="item-info">
                            <h5>📚 {sub.name}</h5>
                            <span>Year {sub.year} • {profile.department}</span>
                          </div>
                          <button className="text-btn danger" onClick={() => handleDeleteSubject(sub.id)}>Delete Subject</button>
                        </div>
                        
                        {assignedStaff.length > 0 && (
                          <div style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--glass-border)', width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {assignedStaff.map(as => (
                              <div key={as.id} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                <div className="item-info">
                                  <span style={{color: 'var(--text-main)', fontSize: '0.85rem'}}>👤 {as.name}</span>
                                </div>
                                <button className="text-btn danger" style={{fontSize: '0.75rem', padding: '0.25rem'}} onClick={() => handleDeleteStaff(as.id)}>Remove</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Staff without an assigned subject */}
                  {staff.filter(s => !s.subject_id).map(s => (
                    <div key={s.id} className="list-item">
                      <div className="item-info">
                        <h5>👤 {s.name}</h5>
                        <span>🏠 Unassigned Staff • {profile.department}</span>
                      </div>
                      <button className="text-btn danger" onClick={() => handleDeleteStaff(s.id)}>Delete</button>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
