import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  MessageSquare, 
  Settings, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Lightbulb, 
  Bookmark,
  BookOpen,
  User,
  Users,
  FolderOpen,
  Search,
  Check,
  X,
  Minus,
  Home,
  Book,
  RefreshCw,
  TrendingUp,
  Bell,
  Filter,
  Calendar,
  Award,
  Terminal,
  Activity,
  ChevronDown,
  Trash2,
  PlusCircle,
  FileText,
  Clock,
  PieChart as PieIcon,
  ListTodo
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  LineChart, 
  Line,
  BarChart,
  Bar,
  Cell
} from 'recharts';
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
  getDepartmentsByYear,
  startSession,
  endSession,
  getSessionStatus,
  getSessionHistory
} from '../api';
import { generatePDFReport, generateSubjectPDF } from '../utils/reportGenerator';
import { motion, AnimatePresence } from 'framer-motion';
import './Dashboard.css';

// --- HELPERS ---
const calculateConfidence = (feedbackCount) => {
  if (feedbackCount <= 5) return 65;
  if (feedbackCount <= 20) return 82;
  return 94;
};

const getTrendData = (feedback) => {
  const dates = {};
  feedback.forEach(f => {
    const d = new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dates[d] = (dates[d] || 0) + 1;
  });
  return Object.entries(dates).map(([name, value]) => ({ name, value })).reverse().slice(-7);
};

const getSentimentTrend = (feedback) => {
  const dates = {};
  feedback.forEach(f => {
    const d = new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!dates[d]) dates[d] = { pos: 0, neg: 0, neu: 0 };
    if (f.sentiment_label === 'Positive') dates[d].pos++;
    else if (f.sentiment_label === 'Negative') dates[d].neg++;
    else dates[d].neu++;
  });
  return Object.entries(dates).map(([name, data]) => ({ name, ...data })).reverse().slice(-7);
};

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
              {comment && <div className="fb-comment"><MessageSquare size={12} style={{marginRight: '6px', verticalAlign: 'middle'}} /> "{comment}"</div>}
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
  
  // NEW REDESIGN STATES
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Sentiments');
  const [subjectFilter, setSubjectFilter] = useState('All Subjects');
  const [actions, setActions] = useState([]);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [newActionText, setNewActionText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(null);
  // PDF confirmation modal state
  const [pdfConfirm, setPdfConfirm] = useState(null);
  // Session state
  const [session, setSession] = useState(null);         // null | { is_active, started_at, ended_at }
  const [sessionHistory, setSessionHistory] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  // Legacy Manage tab inline staff edit state
  const [editStaff, setEditStaff] = useState({ id: null, name: '' });

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
    
    // Load Actions from LocalStorage
    const savedActions = localStorage.getItem(`cr_actions_${uid}`);
    if (savedActions) setActions(JSON.parse(savedActions));
  }, [navigate]);

  useEffect(() => {
    const uid = sessionStorage.getItem('cr_uid');
    if (uid && actions.length > 0) {
      localStorage.setItem(`cr_actions_${uid}`, JSON.stringify(actions));
    }
  }, [actions]);

  const fetchData = async (uid) => {
    setLoading(true);
    try {
      // 1. Fetch Profile (Critical)
      const profileRes = await getCrProfile(uid);
      const prof = profileRes.data;
      setProfile(prof);

      if (prof.department) {
        // Fetch AI insights
        handleGetInsights(prof.department);

        // 2. Fetch Feedback (Critical for UI)
        const fbRes = await getFeedbackLogs(prof.department);
        setFeedback(fbRes.data);
        
        // UNBLOCK THE UI NOW
        setLoading(false);

        // Background data fetching for Management
        getDepartmentsByYear(prof.year).then(async (deptsRes) => {
          const myDept = deptsRes.data.find(d => d.name === prof.department);
          if (myDept) {
            setProfile(prev => ({ ...prev, dept_id: myDept.id }));
            const [staffRes, subRes, sessionRes, historyRes] = await Promise.all([
              getStaff(myDept.id),
              getSubjects(myDept.id),
              getSessionStatus(myDept.id),
              getSessionHistory(myDept.id)
            ]);
            setStaff(staffRes.data);
            setSubjects(subRes.data);
            setSession(sessionRes.data.is_active ? sessionRes.data : null);
            setSessionHistory(historyRes.data || []);
          }
        }).catch(err => console.error("Error fetching management data:", err));
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      if (loading) setLoading(false);
    }
  };

  const handleGetInsights = async (dept) => {
    try {
      const insightRes = await getInsights(dept);
      setInsights(insightRes.data);
    } catch (err) {
      console.error("Error fetching insights:", err);
    }
  };

  const reAnalyze = async () => {
    if (!profile?.department) return;
    setIsAnalyzing(true);
    try {
      await handleGetInsights(profile.department);
      // Simulate deep analysis delay for UX
      await new Promise(r => setTimeout(r, 1500));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddAction = () => {
    if (!newActionText.trim()) return;
    const newAction = {
      id: Date.now(),
      text: newActionText,
      completed: false,
      date: new Date().toISOString()
    };
    setActions([newAction, ...actions]);
    setNewActionText('');
  };

  const toggleAction = (id) => {
    setActions(actions.map(a => a.id === id ? { ...a, completed: !a.completed } : a));
  };

  const deleteAction = (id) => {
    setActions(actions.filter(a => a.id !== id));
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

  const handleStartSession = async () => {
    if (!profile?.dept_id) return;
    setSessionLoading(true);
    try {
      const res = await startSession({ dept_id: profile.dept_id, cr_id: profile.id });
      setSession(res.data);
      const histRes = await getSessionHistory(profile.dept_id);
      setSessionHistory(histRes.data || []);
    } catch (err) {
      alert('Failed to start session');
      console.error(err);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!profile?.dept_id) return;
    setSessionLoading(true);
    try {
      await endSession({ dept_id: profile.dept_id, cr_id: profile.id });
      setSession(null);
      setShowEndConfirm(false);
      const histRes = await getSessionHistory(profile.dept_id);
      setSessionHistory(histRes.data || []);
    } catch (err) {
      alert('Failed to end session');
      console.error(err);
    } finally {
      setSessionLoading(false);
    }
  };

  const onLogout = () => {
    sessionStorage.clear();
    navigate('/');
  };

  if (loading) return <HexagonLoader text="Loading CR Dashboard..." />;

  return (
    <div className="page-wrapper dashboard-wrapper">
      <div className="dashboard-orb dashboard-orb-1" />
      <div className="dashboard-orb dashboard-orb-2" />
      <div className="dashboard-orb dashboard-orb-3" />
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
            <BarChart3 size={18} /> Analytics
          </button>
          <button className={`tab-btn ${activeTab === 'Feedback' ? 'active' : ''}`} onClick={() => setActiveTab('Feedback')}>
            <MessageSquare size={18} /> Feedback
          </button>
          <button className={`tab-btn ${activeTab === 'Manage' ? 'active' : ''}`} onClick={() => setActiveTab('Manage')}>
            <Settings size={18} /> Manage
          </button>
          <button className={`tab-btn ${activeTab === 'Session' ? 'active' : ''}`} onClick={() => setActiveTab('Session')}>
            <Calendar size={18} /> Session
          </button>
        </div>

        {activeTab === 'Analytics' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="analytics-workspace"
          >
            {/* --- TOP SUMMARY BAR --- */}
            <div className="analytics-header-bar">
               <div className="ah-left">
                  <h2 className="workspace-title">Department Analytics</h2>
                  <p className="workspace-sub">Real-time feedback intelligence for {profile?.department}</p>
               </div>
               <div className="ah-right">
                  <span className="last-sync"><RefreshCw size={12} className={isAnalyzing ? 'spin' : ''} /> {insights ? 'Synced' : 'Syncing...'}</span>
                  <Button onClick={() => setPdfConfirm({ type: `full` })} variant="primary" className="btn-report">
                    <FileText size={16} /> Export PDF
                  </Button>
               </div>
            </div>

            {/* --- CORE STATS GRID --- */}
            <div className="stats-row">
              {[
                { label: 'Total Logs', val: feedback.length, icon: <MessageSquare size={20} />, color: 'primary' },
                { label: 'Positive', val: feedback.filter(f => f.sentiment_label === 'Positive').length, icon: <CheckCircle2 size={20} />, color: 'success' },
                { label: 'Negative', val: feedback.filter(f => f.sentiment_label === 'Negative').length, icon: <AlertCircle size={20} />, color: 'error' },
                { label: 'Satisfaction', val: insights ? `${insights.satisfaction_score}%` : '--%', icon: <Award size={20} />, color: 'accent' },
              ].map((s, i) => (
                <GlassCard key={i} className={`stat-card-new stat-${s.color}`}>
                  <div className="scn-icon">{s.icon}</div>
                  <div className="scn-info">
                    <span className="scn-label">{s.label}</span>
                    <span className="scn-val">{s.val}</span>
                  </div>
                  <div className="scn-graph-peak">
                    <Activity size={16} />
                  </div>
                </GlassCard>
              ))}
            </div>

            {/* --- AI INTELLIGENCE & TRENDS PANEL --- */}
            <div className="intelligence-grid">
              {/* AI Structured Card */}
              <GlassCard className="ai-insight-panel">
                <div className="ai-panel-header">
                  <div className="aip-title-group">
                    <Sparkles size={22} className="text-primary" />
                    <h3>AI Intelligence Report</h3>
                  </div>
                  <button 
                    className={`reanalyze-btn ${isAnalyzing ? 'loading' : ''}`}
                    onClick={reAnalyze}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? <RefreshCw size={16} className="spin" /> : <RefreshCw size={16} />}
                    {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
                  </button>
                </div>

                {insights ? (
                  <div className="ai-structured-body">
                    <div className="ai-status-row">
                       <span className={`ai-badge ${insights.ai_overall?.toLowerCase()}`}>
                         {insights.ai_overall} Sentiment
                       </span>
                       <span className="ai-conf">Confidence Score: {calculateConfidence(feedback.length)}%</span>
                    </div>

                    <div className="ai-content-blocks">
                      <div className="ai-block block-success">
                        <label><CheckCircle2 size={14} /> Key Strengths</label>
                        <ul>
                          {insights.ai_strengths?.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                      <div className="ai-block block-warning">
                        <label><AlertCircle size={14} /> Critical Issues</label>
                        <ul>
                          {insights.ai_improvements?.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    </div>
                    
                    <div className="ai-action-suggestion">
                      <label><Lightbulb size={16} /> Recommended Actions</label>
                      <div className="suggestion-tags">
                        {insights.ai_suggestions?.map((s, i) => (
                          <div key={i} className="s-tag">{s}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="ai-loading-placeholder">
                    <div className="pulse-circle" />
                    <p>Aggregating sentiment patterns...</p>
                  </div>
                )}
              </GlassCard>

              {/* Trends Chart */}
              <GlassCard className="trends-panel">
                <div className="panel-header">
                  <h3><TrendingUp size={20} /> Trend Analysis</h3>
                  <div className="trend-legend">
                    <span className="dot pos"></span> Pos
                    <span className="dot neg"></span> Neg
                  </div>
                </div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={getSentimentTrend(feedback)}>
                      <defs>
                        <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--success)" stopOpacity={0.3}/><stop offset="95%" stopColor="var(--success)" stopOpacity={0}/></linearGradient>
                        <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--error)" stopOpacity={0.3}/><stop offset="95%" stopColor="var(--error)" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 10}} />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="pos" stroke="var(--success)" fillOpacity={1} fill="url(#colorPos)" strokeWidth={2} />
                      <Area type="monotone" dataKey="neg" stroke="var(--error)" fillOpacity={1} fill="url(#colorNeg)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </div>

            {/* --- SUBJECT-WISE ANALYSIS GRID --- */}
            <div className="subject-analysis-section">
              <div className="section-header-row">
                <h3 className="sub-section-title"><PieIcon size={20} /> Subject Performance</h3>
                <span className="badge-count">{subjects.length} Subjects</span>
              </div>
              <div className="subject-cards-grid">
                {subjects.map(sub => {
                  const subFeedback = feedback.filter(f => f.subject_id === sub.id);
                  const posCount = subFeedback.filter(f => f.sentiment_label === 'Positive').length;
                  const score = subFeedback.length > 0 ? (posCount / subFeedback.length) * 100 : 0;
                  
                  return (
                    <motion.div 
                      key={sub.id}
                      layoutId={sub.id}
                      className={`subject-score-card ${expandedSubject === sub.id ? 'expanded' : ''}`}
                      onClick={() => setExpandedSubject(expandedSubject === sub.id ? null : sub.id)}
                      whileHover={{ y: -5 }}
                    >
                      <div className="ssc-main">
                        <div className="ssc-info">
                          <h4>{sub.name}</h4>
                          <span className="ssc-count">{subFeedback.length} Feedbacks</span>
                        </div>
                        <div className={`ssc-score ${score >= 75 ? 'good' : score >= 50 ? 'mid' : 'bad'}`}>
                          {score.toFixed(0)}%
                        </div>
                      </div>
                      
                      <div className="ssc-mini-status">
                         <div className="status-bar"><div className="status-fill" style={{ width: `${score}%` }} /></div>
                      </div>

                      {expandedSubject === sub.id && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ssc-details">
                          <div className="ssc-metrics">
                             <div className="m-item"><span>Positive</span> <label className="text-success">{posCount}</label></div>
                             <div className="m-item"><span>Neutral</span> <label className="text-warning">{subFeedback.filter(f => f.sentiment_label === 'Neutral').length}</label></div>
                             <div className="m-item"><span>Negative</span> <label className="text-error">{subFeedback.filter(f => f.sentiment_label === 'Negative').length}</label></div>
                          </div>
                          <p className="ssc-note">Latest concern: {subFeedback[0]?.feedback_text ? (subFeedback[0].feedback_text.substring(0, 40) + '...') : 'No feedback yet'}</p>
                        </motion.div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* --- KEYWORDS & ALERTS CENTER --- */}
            <div className="action-center-grid">
               {/* Keywords Cloud */}
               <GlassCard className="keywords-cloud">
                 <div className="panel-header">
                   <h3><Terminal size={18} /> Top Sentiment Phrases</h3>
                 </div>
                 <div className="tag-cloud">
                   {insights?.top_compliment_phrases?.map((p, i) => (
                     <span key={i} className="cloud-tag tag-pos">{p}</span>
                   ))}
                   {insights?.top_complaint_phrases?.map((p, i) => (
                     <span key={i} className="cloud-tag tag-neg">{p}</span>
                   ))}
                 </div>
               </GlassCard>

               {/* Action Tracker (localStorage MVP) */}
               <GlassCard className="action-tracker">
                 <div className="panel-header">
                   <h3><ListTodo size={18} /> CR Action Center</h3>
                   <span className="action-badge">{actions.filter(a => !a.completed).length} pending</span>
                 </div>
                 <div className="action-input-grp">
                    <input 
                      type="text" 
                      placeholder="e.g. Schedule staff meeting..." 
                      value={newActionText}
                      onChange={(e) => setNewActionText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddAction()}
                    />
                    <button onClick={handleAddAction}><PlusCircle size={18} /></button>
                 </div>
                 <div className="action-list-mini">
                    {actions.map(action => (
                      <div key={action.id} className={`action-item-mini ${action.completed ? 'done' : ''}`}>
                         <div className="action-chk" onClick={() => toggleAction(action.id)}>
                            {action.completed ? <CheckCircle2 size={16} /> : <div className="chk-box" />}
                         </div>
                         <span className="action-txt">{action.text}</span>
                         <button className="action-del" onClick={() => deleteAction(action.id)}><Trash2 size={12} /></button>
                      </div>
                    ))}
                    {actions.length === 0 && <p className="empty-actions">No actions tracked yet. Start organizing your resolutions.</p>}
                 </div>
               </GlassCard>
            </div>
          </motion.div>
        )}

        {activeTab === 'Feedback' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="feedback-subject-list-workspace"
          >
            <div className="fsl-header">
              <h2 className="workspace-title">Feedback by Subject</h2>
              <p className="workspace-sub">Tap a subject to view all its student feedback</p>
            </div>

            {subjects.length === 0 ? (
              <div className="empty-explorer">
                <Activity size={48} opacity={0.2} />
                <p>No subjects found for your department.</p>
              </div>
            ) : (
              <div className="fsl-list">
                {subjects.map((sub, idx) => {
                  const subFeedback = feedback.filter(f => f.subject_id === sub.id);
                  const posCount = subFeedback.filter(f => f.sentiment_label === 'Positive').length;
                  const negCount = subFeedback.filter(f => f.sentiment_label === 'Negative').length;
                  const neuCount = subFeedback.filter(f => f.sentiment_label === 'Neutral').length;
                  const score = subFeedback.length > 0 ? Math.round((posCount / subFeedback.length) * 100) : null;
                  const assignedStaff = staff.find(s => s.subject_id === sub.id);

                  return (
                    <motion.div
                      key={sub.id}
                      className="fsl-row"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.07 }}
                      onClick={() => setSelectedSubject(sub)}
                      whileHover={{ x: 4 }}
                    >
                      <div className="fsl-rank">{String(idx + 1).padStart(2, '0')}</div>

                      <div className="fsl-subject-icon">
                        <BookOpen size={20} />
                      </div>

                      <div className="fsl-subject-info">
                        <h3 className="fsl-subject-name">{sub.name}</h3>
                        <span className="fsl-staff-name">
                          <User size={12} /> {assignedStaff?.name || 'Department Faculty'}
                        </span>
                      </div>

                      <div className="fsl-chips">
                        <span className="fsl-chip chip-pos"><CheckCircle2 size={11} /> {posCount} Pos</span>
                        <span className="fsl-chip chip-neu"><Minus size={11} /> {neuCount} Neu</span>
                        <span className="fsl-chip chip-neg"><AlertCircle size={11} /> {negCount} Neg</span>
                      </div>

                      <div className="fsl-score-col">
                        {score !== null ? (
                          <span className={`fsl-score ${score >= 75 ? 'good' : score >= 50 ? 'mid' : 'bad'}`}>
                            {score}%
                          </span>
                        ) : (
                          <span className="fsl-score no-data">—</span>
                        )}
                        <span className="fsl-fb-count">{subFeedback.length} responses</span>
                      </div>

                      <div className="fsl-arrow">
                        <ChevronDown size={20} style={{ transform: 'rotate(-90deg)' }} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Subject Feedback Modal */}
            <AnimatePresence>
              {selectedSubject && (
                <SubjectFeedbackModal
                  subject={selectedSubject}
                  feedbackList={feedback.filter(f => f.subject_id === selectedSubject.id)}
                  onClose={() => setSelectedSubject(null)}
                  renderFormattedFeedback={renderFormattedFeedback}
                  profile={profile}
                  staff={staff}
                />
              )}
            </AnimatePresence>
          </motion.div>
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
                    <span className="fancy-input-icon"><BookOpen size={18} /></span>
                    <input 
                      type="text" 
                      className="fancy-input" 
                      placeholder="Subject Name (e.g. DBMS)" 
                      value={newEntry.subject}
                      onChange={(e) => setNewEntry({ ...newEntry, subject: e.target.value })}
                    />
                  </div>
                  <div className="fancy-input-wrapper">
                    <span className="fancy-input-icon"><User size={18} /></span>
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
                      <div className="empty-icon"><FolderOpen size={48} style={{opacity: 0.5}} /></div>
                      <p>No subjects or staff added yet.</p>
                    </div>
                  ) : null}

                  {subjects.map((sub, index) => {
                    const assignedStaff = staff.filter(s => s.subject_id === sub.id);

                    return (
                      <div key={sub.id} className="inline-dir-row" style={{ '--row-index': index }}>
                         {/* Left: Subject Info */}
                        <div className="dir-subject">
                          <div className="dir-icon"><Book size={20} style={{color: 'var(--primary)'}} /></div>
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
                    const baseIndex = subjects.length;
                    const handleSaveEditStaff = async (id) => {
                      if (!editStaff.name.trim()) return;
                      try {
                        await updateStaff(id, { name: editStaff.name });
                        setStaff(prev => prev.map(st => st.id === id ? { ...st, name: editStaff.name } : st));
                        setEditStaff({ id: null, name: '' });
                      } catch (err) { alert('Edit failed'); }
                    };
                    return (
                      <div key={s.id} className="list-item" style={{ '--row-index': baseIndex + index }}>
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
                            <h5><User size={16} style={{verticalAlign: 'middle', marginRight: '6px'}} /> {s.name}</h5>
                          )}
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                            <Home size={14} style={{opacity: 0.6}} /> Unassigned Staff • {profile.department}
                          </span>
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

        {/* --- SESSION TAB --- */}
        {activeTab === 'Session' && (
          <motion.div 
            className="session-tab-content"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="admin-header" style={{ marginBottom: '2rem' }}>
              <div className="ah-left">
                <h2 className="workspace-title">Session Control</h2>
                <p className="workspace-sub">Manage when students can submit feedback for {profile?.department}</p>
              </div>
            </div>

            <GlassCard className="session-control-card">
              <div className="session-status-area">
                <div className={`session-status-badge ${session ? 'live' : 'offline'}`}>
                  <div className="status-dot"></div>
                  {session ? 'Session is LIVE' : 'No active session'}
                </div>
                {session && (
                  <p className="session-started-time">
                    Started at: {new Date(session.started_at).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="session-actions">
                {!session ? (
                  <Button 
                    variant="primary" 
                    className="btn-start-session"
                    onClick={handleStartSession}
                    disabled={sessionLoading}
                  >
                    {sessionLoading ? <div className="loading-spinner-small" /> : <Calendar size={18} />}
                    Start New Session
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="danger" 
                      className="btn-end-session"
                      onClick={() => setShowEndConfirm(true)}
                    >
                      <X size={18} /> End Current Session
                    </Button>

                    {showEndConfirm && (
                      <div className="end-session-confirm">
                        <p>Are you sure? Students will no longer be able to submit feedback.</p>
                        <div className="esc-actions">
                          <button className="esc-cancel" onClick={() => setShowEndConfirm(false)}>Cancel</button>
                          <button className="esc-confirm" onClick={handleEndSession} disabled={sessionLoading}>
                            {sessionLoading ? 'Ending...' : 'Yes, End Session'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </GlassCard>

            <div className="session-history-container">
              <h3 className="history-title">Session History</h3>
              {sessionHistory.length === 0 ? (
                <div className="empty-history">No past sessions found.</div>
              ) : (
                <div className="history-list">
                  {sessionHistory.map(hist => (
                    <div key={hist.id} className="history-card">
                      <div className="hc-left">
                        <div className={`hc-status ${hist.is_active ? 'active' : 'ended'}`}>
                          {hist.is_active ? 'Active' : 'Ended'}
                        </div>
                        <div className="hc-times">
                          <span><strong>Start:</strong> {new Date(hist.started_at).toLocaleString()}</span>
                          {hist.ended_at && (
                            <span><strong>End:</strong> {new Date(hist.ended_at).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="hc-right">
                        <div className="hc-count">
                          <Users size={18} />
                          <strong>{hist.student_count}</strong>
                        </div>
                        <span className="hc-count-label">Students Participated</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* PDF Confirm Modal — Full Report */}
        <AnimatePresence>
          {pdfConfirm?.type === 'full' && (
            <PdfConfirmModal
              title="Export Full Department Report"
              description={`This will generate a multi-page PDF covering all ${subjects.length} subjects, AI insights, and every feedback log for ${profile?.department}.`}
              fileName={`FeedbackPulse_${profile?.department}_Report.pdf`}
              onConfirm={() => {
                setPdfConfirm(null);
                generatePDFReport(profile, insights, feedback, subjects, staff);
              }}
              onCancel={() => setPdfConfirm(null)}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ─── SUBJECT FEEDBACK MODAL ───────────────────────────────────────────────────
function SubjectFeedbackModal({ subject, feedbackList, onClose, renderFormattedFeedback, profile, staff }) {
  const [filter, setFilter] = useState('All');
  const [showPdfConfirm, setShowPdfConfirm] = useState(false);
  const staffObj = staff?.find(s => s.subject_id === subject.id);

  const filtered = feedbackList.filter(f =>
    filter === 'All' || f.sentiment_label === filter
  );

  const posCount = feedbackList.filter(f => f.sentiment_label === 'Positive').length;
  const negCount = feedbackList.filter(f => f.sentiment_label === 'Negative').length;
  const neuCount = feedbackList.filter(f => f.sentiment_label === 'Neutral').length;

  return createPortal(
    <motion.div
      className="sfm-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="sfm-panel"
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sfm-header">
          <div className="sfm-title-group">
            <div className="sfm-icon-box"><BookOpen size={22} /></div>
            <div>
              <h2 className="sfm-title">{subject.name}</h2>
              <span className="sfm-sub-count">{feedbackList.length} student responses</span>
            </div>
          </div>
          <div className="sfm-header-actions">
            <button
              className="sfm-close-btn sfm-dl-btn"
              onClick={() => setShowPdfConfirm(true)}
              data-tooltip="Download PDF"
            >
              <FileText size={18} />
            </button>
            <button className="sfm-close-btn" onClick={onClose} data-tooltip="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Sentiment Summary Pills */}
        <div className="sfm-summary-row">
          <div className="sfm-sum-pill sum-pos"><CheckCircle2 size={14} />{posCount} Positive</div>
          <div className="sfm-sum-pill sum-neu"><Minus size={14} />{neuCount} Neutral</div>
          <div className="sfm-sum-pill sum-neg"><AlertCircle size={14} />{negCount} Negative</div>
        </div>

        {/* Filter Tabs */}
        <div className="sfm-filter-tabs">
          {['All', 'Positive', 'Neutral', 'Negative'].map(f => (
            <button
              key={f}
              className={`sfm-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Feedback Cards */}
        <div className="sfm-cards-scroll">
          {filtered.length === 0 ? (
            <div className="sfm-empty">
              <Activity size={40} opacity={0.2} />
              <p>No {filter.toLowerCase()} feedback for this subject yet.</p>
            </div>
          ) : (
            filtered.map((f, idx) => (
              <motion.div
                key={f.id}
                className={`sfm-card sfm-card-${f.sentiment_label?.toLowerCase()}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <div className="sfm-card-header">
                  <span className="sfm-card-date"><Calendar size={12} /> {new Date(f.created_at).toLocaleDateString()}</span>
                  <span className={`sentiment-pill ${f.sentiment_label?.toLowerCase()}`}>{f.sentiment_label}</span>
                </div>
                <div className="sfm-card-body">
                  {renderFormattedFeedback(f.feedback_text)}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Subject PDF Confirm */}
      <AnimatePresence>
        {showPdfConfirm && (
          <PdfConfirmModal
            title={`Download Report`}
            description={`This will generate a PDF with all ${feedbackList.length} feedback entries for "${subject.name}"${staffObj ? ` taught by ${staffObj.name}` : ''}.`}
            fileName={`FeedbackPulse_${subject.name.replace(/[^a-z0-9]/gi, '_')}.pdf`}
            onConfirm={() => {
              setShowPdfConfirm(false);
              generateSubjectPDF(subject, feedbackList, profile, staffObj);
            }}
            onCancel={() => setShowPdfConfirm(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>,
    document.body
  );
}

// ─── PDF CONFIRM MODAL ────────────────────────────────────────────────────────
function PdfConfirmModal({ title, description, fileName, onConfirm, onCancel }) {
  return createPortal(
    <motion.div
      className="pcm-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="pcm-card"
        initial={{ opacity: 0, scale: 0.88, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 40 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="pcm-icon-ring">
          <div className="pcm-icon-inner">
            <FileText size={28} />
          </div>
        </div>

        <h3 className="pcm-title">{title}</h3>
        <p className="pcm-desc">{description}</p>

        <div className="pcm-filename">
          <FileText size={13} />
          <span>{fileName}</span>
        </div>

        <div className="pcm-permission-note">
          <CheckCircle2 size={14} />
          <span>This report is confidential. Download only on authorised devices.</span>
        </div>

        <div className="pcm-actions">
          <button className="pcm-btn-cancel" onClick={onCancel}>
            <X size={16} /> Cancel
          </button>
          <button className="pcm-btn-confirm" onClick={onConfirm}>
            <FileText size={16} /> Yes, Download
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
