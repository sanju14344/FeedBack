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

const renderFormattedFeedback = (text) => {
  if (!text) return null;
  const statements = text.split('; ');
  
  return (
    <div className="feedback-breakdown">
      {statements.map((stmt, idx) => {
        // Example: "Teacher explains clearly: 3/5 (Comment: Needs better examples)"
        const match = stmt.match(/(.*?):\s*(\d(?:\.\d+)?)\/5(?:\s*\(Comment:\s*(.*?)\))?/i);
        
        if (match) {
          const metric = match[1].trim();
          const score = match[2];
          const comment = match[3] ? match[3].replace(/\)$/, '').trim() : null; // Remove trailing parenthesis if caught
          
          return (
            <div key={idx} className="fb-item">
              <div className="fb-header">
                <span className="fb-metric">{metric}</span>
                <span className={`fb-score fb-score-${Math.round(score)}`}>{score}/5</span>
              </div>
              {comment && <div className="fb-comment">💬 "{comment}"</div>}
            </div>
          );
        }
        
        // Fallback for non-matching statements
        return <div key={idx} className="fb-item fb-fallback">{stmt}</div>;
      })}
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Management Form States
  const [newEntry, setNewEntry] = useState({ subject: '', staff: '' });
  
  // Refactored Management UI States
  const [editingItem, setEditingItem] = useState({ type: null, subId: null, subName: '', staffId: null, staffName: '' });

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

  const handleSaveModalEdit = async () => {
    try {
      if (editingItem.type === 'assignment') {
        const promises = [];
        
        // Check if subject name changed and is not empty
        if (editingItem.subName.trim() && editingItem.subName !== subjects.find(s => s.id === editingItem.subId)?.name) {
          promises.push(
            updateSubject(editingItem.subId, { name: editingItem.subName })
              .then(() => setSubjects(prev => prev.map(s => s.id === editingItem.subId ? { ...s, name: editingItem.subName } : s)))
          );
        }
        
        // Check if staff existed, changed, and is not empty
        if (editingItem.staffId && editingItem.staffName.trim() && editingItem.staffName !== staff.find(s => s.id === editingItem.staffId)?.name) {
          promises.push(
            updateStaff(editingItem.staffId, { name: editingItem.staffName })
              .then(() => setStaff(prev => prev.map(s => s.id === editingItem.staffId ? { ...s, name: editingItem.staffName } : s)))
          );
        }

        await Promise.all(promises);
      } else if (editingItem.type === 'staff') { // Legacy support for unassigned staff (if any)
        if (editingItem.staffName.trim()) {
           await updateStaff(editingItem.staffId, { name: editingItem.staffName });
           setStaff(staff.map(s => s.id === editingItem.staffId ? { ...s, name: editingItem.staffName } : s));
        }
      }
      
      setEditingItem({ type: null, subId: null, subName: '', staffId: null, staffName: '' });
    } catch (err) {
      alert('Edit failed');
    }
  };

  const refreshDirectory = async () => {
    if (!profile?.dept_id) return;
    setIsRefreshing(true);
    try {
      const [staffRes, subRes] = await Promise.all([
        getStaff(profile.dept_id),
        getSubjects(profile.dept_id)
      ]);
      setStaff(staffRes.data);
      setSubjects(subRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
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
                        <span className={`sentiment-badge ${f.sentiment_label?.toLowerCase() === 'positive' ? 'badge-positive' : f.sentiment_label?.toLowerCase() === 'negative' ? 'badge-negative' : 'badge-neutral'}`}>
                          {f.sentiment_label === 'Positive' ? '✓' : f.sentiment_label === 'Negative' ? '✕' : '○'} {f.sentiment_label}
                        </span>
                      </td>
                      <td style={{ minWidth: '400px' }}>{renderFormattedFeedback(f.feedback_text)}</td>
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
              <GlassCard className="fancy-form-card">
                <div className="fancy-form-header">
                  <div className="fancy-icon-container">
                    <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                  </div>
                  <h3 className="section-title" style={{margin:0}}>Add Entry</h3>
                </div>
                <p className="form-subtitle">Register a new Subject and its assigned Staff directly into your department.</p>

                <form className="fancy-form" onSubmit={handleAddEntry}>
                  <div className="fancy-input-wrapper">
                    <span className="fancy-input-icon">📚</span>
                    <input 
                      type="text" 
                      className="fancy-input" 
                      placeholder="Subject Name (e.g. DBMS)" 
                      value={newEntry.subject}
                      onChange={(e) => setNewEntry({ ...newEntry, subject: e.target.value })}
                    />
                  </div>
                  <div className="fancy-input-wrapper">
                    <span className="fancy-input-icon">👤</span>
                    <input 
                      type="text" 
                      className="fancy-input" 
                      placeholder="Staff Name (e.g. Dr. Ramesh)" 
                      value={newEntry.staff}
                      onChange={(e) => setNewEntry({ ...newEntry, staff: e.target.value })}
                    />
                  </div>
                  <Button type="submit" variant="primary" className="fancy-submit-btn" disabled={!newEntry.subject || !newEntry.staff}>
                    Create Assignment
                  </Button>
                </form>
              </GlassCard>
            </div>

            <div className="manage-right">
              <GlassCard className="manage-list-card">
                <div className="list-header">
                  <h3 className="section-title" style={{margin: 0}}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '8px', verticalAlign: 'middle'}}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    Subject Directory
                  </h3>
                  <button className="refresh-btn" onClick={refreshDirectory} disabled={isRefreshing}>
                    <svg className={isRefreshing ? 'spin' : ''} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                    Refresh
                  </button>
                </div>
                
                <div className="manage-list">
                  {staff.length === 0 && subjects.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📂</div>
                      <p>No subjects or staff added yet.</p>
                    </div>
                  ) : null}

                  {subjects.map((sub, index) => {
                    const assignedStaff = staff.filter(s => s.subject_id === sub.id);

                    return (
                      <div key={sub.id} className="inline-dir-row" style={{ '--row-index': index }}>
                        {/* Left: Subject Info */}
                        <div className="dir-subject">
                          <div className="dir-icon">📚</div>
                          <div className="dir-meta">
                            <div className="dir-title">{sub.name}</div>
                          </div>
                        </div>

                        {/* Middle: Connecting UI */}
                        <div className="dir-connector">
                          <div className="connector-line"></div>
                          <div className="connector-dot"></div>
                        </div>

                        {/* Right: Staff Info */}
                        <div className="dir-staff-container">
                          {assignedStaff.length > 0 ? (
                            assignedStaff.map(as => (
                              <div key={as.id} className="dir-staff-pill">
                                <div className="staff-avatar" style={{ width: '20px', height: '20px', fontSize: '0.6rem' }}>{as.name.substring(0,2).toUpperCase()}</div>
                                <span className="staff-name" style={{ fontSize: '0.8rem' }}>{as.name}</span>
                              </div>
                            ))
                          ) : (
                            <div className="dir-staff-empty">
                              <span>Unassigned</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Far Right: Unified Actions */}
                        <div className="dir-unified-actions">
                          <button className="icon-btn edit" title="Edit Assignment" onClick={() => setEditingItem({ 
                              type: 'assignment', 
                              subId: sub.id, 
                              subName: sub.name, 
                              staffId: assignedStaff.length > 0 ? assignedStaff[0].id : null,
                              staffName: assignedStaff.length > 0 ? assignedStaff[0].name : ''
                            })}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="16 3 21 8 8 21 3 21 3 16 16 3"></polygon></svg>
                          </button>
                          <button className="icon-btn delete" title="Delete Assignment" onClick={() => handleDeleteSubject(sub.id)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Staff without an assigned subject */}
                  {staff.filter(s => !s.subject_id).map((s, index) => {
                    const isEditingStaff = editStaff.id === s.id;
                    const baseIndex = subjects.length; // offset for following rows
                    return (
                      <div key={s.id} className="list-item" style={{ '--row-index': baseIndex + index, animation: 'revealUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both', animationDelay: `calc(0.1s * ${baseIndex + index})` }}>
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
        {/* Modal Overlay for Global Editing */}
        {editingItem.type && (
          <div className="edit-modal-overlay">
            <div className="edit-modal-card">
              <h3 style={{margin: '0 0 1.5rem 0', color: 'var(--text-main)'}}>
                {editingItem.type === 'assignment' ? 'Edit Assignment' : 'Edit Staff'}
              </h3>
              
              {editingItem.type === 'assignment' && (
                <>
                  <div style={{ paddingBottom: '1rem' }}>
                    <label className="form-subtitle" style={{ display: 'block', marginBottom: '0.25rem' }}>Subject Name</label>
                    <input 
                      autoFocus
                      className="modal-input" 
                      style={{ marginBottom: 0 }}
                      value={editingItem.subName}
                      onChange={e => setEditingItem(prev => ({ ...prev, subName: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleSaveModalEdit()}
                    />
                  </div>
                  
                  {editingItem.staffId && (
                    <div style={{ paddingBottom: '1.5rem' }}>
                      <label className="form-subtitle" style={{ display: 'block', marginBottom: '0.25rem' }}>Staff Name</label>
                      <input 
                        className="modal-input" 
                        style={{ marginBottom: 0 }}
                        value={editingItem.staffName}
                        onChange={e => setEditingItem(prev => ({ ...prev, staffName: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleSaveModalEdit()}
                      />
                    </div>
                  )}
                </>
              )}

              {editingItem.type === 'staff' && (
                <div style={{ paddingBottom: '1.5rem' }}>
                    <label className="form-subtitle" style={{ display: 'block', marginBottom: '0.25rem' }}>Staff Name</label>
                    <input 
                      autoFocus
                      className="modal-input" 
                      style={{ marginBottom: 0 }}
                      value={editingItem.staffName}
                      onChange={e => setEditingItem(prev => ({ ...prev, staffName: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleSaveModalEdit()}
                    />
                </div>
              )}

              <div className="modal-actions" style={editingItem.type === 'assignment' && !editingItem.staffId ? { marginTop: '0.5rem' } : {}}>
                <button className="btn-modal-cancel" onClick={() => setEditingItem({ type: null, subId: null, subName: '', staffId: null, staffName: '' })}>Cancel</button>
                <button className="btn-modal-save" onClick={handleSaveModalEdit}>Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
