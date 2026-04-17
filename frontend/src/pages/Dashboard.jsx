import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import HexagonLoader from '../components/HexagonLoader';
import { 
  getCrProfile, 
  getInsights, 
  getFeedbackLogs, 
  getStaff, 
  getSubjects, 
  createStaff, 
  deleteStaff, 
  updateStaff,
  createSubject, 
  deleteSubject,
  updateSubject,
  getDepartmentsByYear
} from '../api';
import { generatePDFReport } from '../utils/reportGenerator';
import './Dashboard.css';

const FeedbackCell = ({ text }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!text) return null;
  const statements = text.split('; ');
  
  const ratings = [];
  const fallbacks = [];
  
  statements.forEach((stmt) => {
    const match = stmt.match(/(.*?):\s*(\d(?:\.\d+)?)\/5(?:\s*\(Comment:\s*(.*?)\))?/i);
    if (match) {
      ratings.push({
        metric: match[1].trim(),
        score: match[2],
        comment: match[3] ? match[3].replace(/\)$/, '').trim() : null
      });
    } else if (stmt.trim()) {
      fallbacks.push(stmt.trim());
    }
  });

  return (
    <div className="feedback-cell-wrapper">
      {fallbacks.length > 0 && (
        <div className="general-comments">
          {fallbacks.map((fb, idx) => {
             const cleanFb = fb.startsWith('General Comment:') ? fb.replace('General Comment:', '').trim() : fb;
             return cleanFb ? <div key={idx} className="student-comment-box">❝ {cleanFb} ❞</div> : null;
          })}
        </div>
      )}
      
      {ratings.length > 0 && (
        <div className="ratings-section">
           {!expanded && fallbacks.length === 0 && (
              <span className="ratings-summary-text">Contains {ratings.length} detailed metric ratings</span>
           )}
           <button 
             className="toggle-ratings-btn" 
             onClick={() => setExpanded(!expanded)}
           >
             {expanded ? '▲ Hide Breakdown' : '⚡ View Rating Breakdown'}
           </button>
           
           {expanded && (
             <div className="ratings-breakdown-grid">
               {ratings.map((r, idx) => (
                 <div key={idx} className="compact-rating">
                   <div className="compact-rating-content">
                     <span className="cr-metric" title={r.metric}>{r.metric}</span>
                     <span className={`cr-score score-${Math.round(r.score)}`}>{r.score}/5</span>
                   </div>
                   {r.comment && <div className="cr-comment">💬 {r.comment}</div>}
                 </div>
               ))}
             </div>
           )}
        </div>
      )}
    </div>
  );
};

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
  
  // Inline Edit States
  const [editSubject, setEditSubject] = useState({ id: null, name: '' });
  const [editStaff, setEditStaff] = useState({ id: null, name: '' });

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
      // 1. Fetch Profile (Critical)
      const profileRes = await getCrProfile(uid);
      const prof = profileRes.data;
      setProfile(prof);

      if (prof.department) {
        // NON-BLOCKING 1: Fetch AI insights asynchronously without blocking UI load
        getInsights(prof.department)
          .then(insightRes => setInsights(insightRes.data))
          .catch(err => console.error("Error fetching insights:", err));

        // 2. Fetch Feedback (Critical for UI)
        const fbRes = await getFeedbackLogs(prof.department);
        setFeedback(fbRes.data);
        
        // UNBLOCK THE UI NOW - we have enough to render Analytics & Feedback tabs!
        setLoading(false);

        // NON-BLOCKING 2: Fetch Management data in the background
        getDepartmentsByYear(prof.year).then(async (deptsRes) => {
          const myDept = deptsRes.data.find(d => d.name === prof.department);
          if (myDept) {
            setProfile(prev => ({ ...prev, dept_id: myDept.id })); // update profile with dept_id
            const [staffRes, subRes] = await Promise.all([
              getStaff(myDept.id),
              getSubjects(myDept.id)
            ]);
            setStaff(staffRes.data);
            setSubjects(subRes.data);
          }
        }).catch(err => console.error("Error fetching management data:", err));
        
        return; // Early return so we don't hit the finally block twice
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      if (loading) setLoading(false);
    }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!newEntry.subject || !newEntry.staff) {
      alert("Both Subject Name and Staff Name are strictly required to create an entry.");
      return;
    }
    if (!profile?.dept_id) return;

    try {
      let targetSubjectId = null;

      // Handle Subject
      const createSubRes = await createSubject({ name: newEntry.subject, department_id: profile.dept_id, year: profile.year });
      targetSubjectId = createSubRes.data.id;

      // Handle Staff
      await createStaff({ name: newEntry.staff, department_id: profile.dept_id, subject_id: targetSubjectId });

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
    if (!window.confirm('Delete this subject and ALL its staff?')) return;
    try {
      await deleteSubject(id);
      setSubjects(subjects.filter(s => s.id !== id));
      setStaff(staff.filter(s => s.subject_id !== id));
    } catch (err) { alert('Delete failed'); }
  };

  const handleSaveEditSubject = async (id) => {
    if (!editSubject.name.trim()) {
      setEditSubject({ id: null, name: '' });
      return;
    }
    try {
      await updateSubject(id, { name: editSubject.name });
      setSubjects(subjects.map(s => s.id === id ? { ...s, name: editSubject.name } : s));
      setEditSubject({ id: null, name: '' });
    } catch (err) { alert('Edit failed'); }
  };

  const handleSaveEditStaff = async (id) => {
    if (!editStaff.name.trim()) {
      setEditStaff({ id: null, name: '' });
      return;
    }
    try {
      await updateStaff(id, { name: editStaff.name });
      setStaff(staff.map(s => s.id === id ? { ...s, name: editStaff.name } : s));
      setEditStaff({ id: null, name: '' });
    } catch (err) { alert('Edit failed'); }
  };

  const onLogout = () => {
    sessionStorage.clear();
    navigate('/');
  };

  if (loading) return <HexagonLoader text="Loading CR Dashboard..." />;

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
                <div className="stat-val">{insights ? `${insights.satisfaction_score}%` : '--%'}</div>
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
              ) : !insights ? (
                <p className="empty-text">Generating AI Insights...</p>
              ) : (
                <p className="empty-text">No enough feedback for AI analysis yet.</p>
              )}
            </GlassCard>

            <div className="charts-grid">
              <GlassCard className="chart-card sentiment-card">
                <h3 className="section-title">Sentiment Distribution</h3>
                <div className="chart-layout">
                  <div className="donut-chart-wrapper">
                    <div className="donut-chart" style={{ 
                      '--pos': `${(feedback.filter(f => f.sentiment_label === 'Positive').length / (feedback.length || 1)) * 100}%`,
                      '--neu': `${(feedback.filter(f => f.sentiment_label === 'Neutral').length / (feedback.length || 1)) * 100}%`,
                      '--neg': `${(feedback.filter(f => f.sentiment_label === 'Negative').length / (feedback.length || 1)) * 100}%`
                    }}></div>
                    <div className="donut-inner">
                      <span className="donut-number">{feedback.length}</span>
                      <span className="donut-label">Reviews</span>
                    </div>
                  </div>
                  
                  <div className="rich-legend">
                    {[
                      { label: 'Positive', count: feedback.filter(f => f.sentiment_label === 'Positive').length, colorClass: 'success' },
                      { label: 'Neutral', count: feedback.filter(f => f.sentiment_label === 'Neutral').length, colorClass: 'warning' },
                      { label: 'Negative', count: feedback.filter(f => f.sentiment_label === 'Negative').length, colorClass: 'error' }
                    ].map(item => {
                      const perc = Math.round((item.count / (feedback.length || 1)) * 100);
                      return (
                        <div key={item.label} className={`legend-row ${item.colorClass}-row`}>
                          <div className="legend-left">
                            <span className={`legend-dot bg-${item.colorClass}`}></span>
                            <span className="legend-name">{item.label}</span>
                          </div>
                          <div className="legend-right">
                            <span className="legend-count">{item.count}</span>
                            <span className="legend-perc">{perc}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </GlassCard>
              
              <GlassCard className="chart-card">
                <h3 className="section-title">
                  <span role="img" aria-label="warning" style={{marginRight: '8px'}}>🚨</span> 
                  Top Complaints Detected
                </h3>
                {!insights ? (
                  <p className="empty-text">Analyzing complaints...</p>
                ) : insights?.top_complaint_phrases?.length > 0 ? (
                  <div className="complaints-list">
                    {insights.top_complaint_phrases.map((kw, i) => (
                      <div key={i} className="complaint-item">
                        <div className="complaint-icon text-error">
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </div>
                        <span className="complaint-text">{kw}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state-small">
                    <span className="empty-emoji">🎉</span>
                    <p className="empty-text">No major complaints detected.</p>
                  </div>
                )}
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
                      <td style={{ minWidth: '400px' }}><FeedbackCell text={f.feedback_text} /></td>
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
                    Both fields are strictly required. You must define the Subject Name and assigning Staff Member exactly as they will appear to your students.
                  </p>
                  <Button type="submit" variant="primary" className="full-width" disabled={!newEntry.subject || !newEntry.staff}>Add Entry</Button>
                </form>
              </GlassCard>
            </div>

            <div className="manage-right">
              <GlassCard className="manage-list-card">
                <div className="list-header">
                  <h3 className="section-title" style={{margin: 0}}>📂 Directory: Subjects & Staff</h3>
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
                    const isEditingSub = editSubject.id === sub.id;

                    return (
                      <div key={sub.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <div className="item-info" style={{ flexGrow: 1, paddingRight: '1rem' }}>
                            {isEditingSub ? (
                              <input 
                                autoFocus
                                className="form-input" 
                                style={{ padding: '0.3rem 0.5rem', fontSize: '0.875rem' }} 
                                value={editSubject.name} 
                                onChange={(e) => setEditSubject({ ...editSubject, name: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveEditSubject(sub.id)}
                              />
                            ) : (
                              <h5>📚 {sub.name}</h5>
                            )}
                            <span style={{ display: 'block', marginTop: '4px' }}>Year {sub.year} • {profile.department}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {isEditingSub ? (
                              <>
                                <button className="text-btn success" style={{color: 'var(--success)'}} onClick={() => handleSaveEditSubject(sub.id)}>Save</button>
                                <button className="text-btn" onClick={() => setEditSubject({ id: null, name: '' })}>Cancel</button>
                              </>
                            ) : (
                              <button className="text-btn outline-blue" onClick={() => setEditSubject({ id: sub.id, name: sub.name })}>Edit</button>
                            )}
                            <button className="text-btn danger" onClick={() => handleDeleteSubject(sub.id)}>Delete</button>
                          </div>
                        </div>
                        
                        {assignedStaff.length > 0 && (
                          <div style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--glass-border)', width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {assignedStaff.map(as => {
                              const isEditingStaff = editStaff.id === as.id;
                              return (
                                <div key={as.id} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                  <div className="item-info" style={{ flexGrow: 1, paddingRight: '1rem' }}>
                                    {isEditingStaff ? (
                                      <input 
                                        autoFocus
                                        className="form-input" 
                                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.85rem' }} 
                                        value={editStaff.name} 
                                        onChange={(e) => setEditStaff({ ...editStaff, name: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEditStaff(as.id)}
                                      />
                                    ) : (
                                      <span style={{color: 'var(--text-main)', fontSize: '0.85rem'}}>👤 {as.name}</span>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {isEditingStaff ? (
                                      <>
                                        <button className="text-btn success" style={{fontSize: '0.75rem', padding: '0.25rem', color: 'var(--success)'}} onClick={() => handleSaveEditStaff(as.id)}>Save</button>
                                        <button className="text-btn" style={{fontSize: '0.75rem', padding: '0.25rem'}} onClick={() => setEditStaff({ id: null, name: '' })}>Cancel</button>
                                      </>
                                    ) : (
                                      <button className="text-btn outline-blue" style={{fontSize: '0.75rem', padding: '0.25rem'}} onClick={() => setEditStaff({ id: as.id, name: as.name })}>Edit</button>
                                    )}
                                    <button className="text-btn danger" style={{fontSize: '0.75rem', padding: '0.25rem'}} onClick={() => handleDeleteStaff(as.id)}>Remove</button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Staff without an assigned subject */}
                  {staff.filter(s => !s.subject_id).map(s => {
                    const isEditingStaff = editStaff.id === s.id;
                    return (
                      <div key={s.id} className="list-item">
                        <div className="item-info" style={{ flexGrow: 1, paddingRight: '1rem' }}>
                          {isEditingStaff ? (
                            <input 
                              autoFocus
                              className="form-input" 
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.875rem' }} 
                              value={editStaff.name} 
                              onChange={(e) => setEditStaff({ ...editStaff, name: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEditStaff(s.id)}
                            />
                          ) : (
                            <h5>👤 {s.name}</h5>
                          )}
                          <span style={{ display: 'block', marginTop: '4px' }}>🏠 Unassigned Staff • {profile.department}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {isEditingStaff ? (
                            <>
                              <button className="text-btn success" style={{color: 'var(--success)'}} onClick={() => handleSaveEditStaff(s.id)}>Save</button>
                              <button className="text-btn" onClick={() => setEditStaff({ id: null, name: '' })}>Cancel</button>
                            </>
                          ) : (
                            <button className="text-btn outline-blue" onClick={() => setEditStaff({ id: s.id, name: s.name })}>Edit</button>
                          )}
                          <button className="text-btn danger" onClick={() => handleDeleteStaff(s.id)}>Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
