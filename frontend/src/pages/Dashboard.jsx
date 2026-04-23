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
  TrendingDown,
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
  ListTodo,
  AlertTriangle,
  Zap,
  Target,
  Shield
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

const getSatisfactionTrend = (feedback) => {
  const dates = {};
  feedback.forEach(f => {
    const d = new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!dates[d]) dates[d] = { pos: 0, total: 0 };
    dates[d].total++;
    if (f.sentiment_label === 'Positive') dates[d].pos++;
  });
  return Object.entries(dates)
    .map(([name, data]) => ({ name, value: data.total > 0 ? Math.round((data.pos / data.total) * 100) : 0 }))
    .reverse().slice(-7);
};

const getTrendDelta = (feedback, key = 'total') => {
  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;
  const recent = feedback.filter(f => now - new Date(f.created_at).getTime() < week);
  const prior = feedback.filter(f => {
    const age = now - new Date(f.created_at).getTime();
    return age >= week && age < 2 * week;
  });
  const getCount = (arr, k) => {
    if (k === 'total') return arr.length;
    if (k === 'positive') return arr.filter(f => f.sentiment_label === 'Positive').length;
    if (k === 'negative') return arr.filter(f => f.sentiment_label === 'Negative').length;
    return arr.length;
  };
  const rCount = getCount(recent, key);
  const pCount = getCount(prior, key);
  if (pCount === 0) return null;
  return Math.round(((rCount - pCount) / pCount) * 100);
};

const getAlerts = (feedback, subjects, dismissed = []) => {
  const alerts = [];
  subjects.forEach(sub => {
    const subFb = feedback.filter(f => f.subject_id === sub.id);
    if (subFb.length === 0) return;
    const pos = subFb.filter(f => f.sentiment_label === 'Positive').length;
    const score = Math.round((pos / subFb.length) * 100);
    const id = `low-sat-${sub.id}`;
    if (!dismissed.includes(id)) {
      if (score < 50) {
        alerts.push({ id, level: 'critical', subject: sub.name, message: `Critically low satisfaction at ${score}% — immediate attention needed` });
      } else if (score < 65) {
        alerts.push({ id, level: 'warning', subject: sub.name, message: `Below-average satisfaction at ${score}% — trending negatively` });
      }
    }
  });
  const negDelta = getTrendDelta(feedback, 'negative');
  const negAlertId = 'neg-trend-week';
  if (negDelta !== null && negDelta > 20 && !dismissed.includes(negAlertId)) {
    alerts.push({ id: negAlertId, level: 'warning', subject: 'Overall', message: `Negative feedback surged ${negDelta}% this week` });
  }
  return alerts;
};

const Sparkline = ({ data, color = 'var(--primary)', height = 28, width = 72 }) => {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="sparkline-svg" style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
};

const CircularProgress = ({ score, size = 68 }) => {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(score, 100) / 100) * circ;
  const color = score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--error)';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="circular-ring-svg">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <circle
        cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1.2s ease' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fill={color} fontSize={size * 0.21} fontWeight="800" fontFamily="inherit">
        {score}%
      </text>
    </svg>
  );
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

  // === UPGRADE: New state for premium features ===
  const [trendToggle, setTrendToggle] = useState('sentiment');
  const [actionPriority, setActionPriority] = useState('Medium');
  const [actionSubjectTag, setActionSubjectTag] = useState('');
  const [alertsDismissed, setAlertsDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cr_alerts_dismissed') || '[]'); } catch { return []; }
  });
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const [sessionEndSummary, setSessionEndSummary] = useState(null);
  const [lastUpdated] = useState(new Date());

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
      priority: actionPriority,
      subjectTag: actionSubjectTag || null,
      completed: false,
      date: new Date().toISOString()
    };
    setActions([newAction, ...actions]);
    setNewActionText('');
    setActionSubjectTag('');
    setActionPriority('Medium');
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
    // Capture summary snapshot before ending
    const posCount = feedback.filter(f => f.sentiment_label === 'Positive').length;
    const negCount = feedback.filter(f => f.sentiment_label === 'Negative').length;
    const dominant = posCount > negCount ? 'Positive' : negCount > posCount ? 'Negative' : 'Neutral';
    const sessionDuration = session?.started_at
      ? Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000)
      : 0;
    try {
      await endSession({ dept_id: profile.dept_id, cr_id: profile.id });
      setSession(null);
      setShowEndConfirm(false);
      const histRes = await getSessionHistory(profile.dept_id);
      const lastSes = (histRes.data || [])[0];
      setSessionHistory(histRes.data || []);
      setSessionEndSummary({
        duration: sessionDuration,
        studentCount: lastSes?.student_count ?? '—',
        dominant,
        topComplaint: insights?.top_complaint_phrases?.[0] || null,
        satisfaction: insights?.satisfaction_score || 0,
        posCount,
        negCount,
        totalFeedback: feedback.length
      });
      setShowSessionSummary(true);
    } catch (err) {
      alert('Failed to end session');
      console.error(err);
    } finally {
      setSessionLoading(false);
    }
  };

  const dismissAlert = (id) => {
    const updated = [...alertsDismissed, id];
    setAlertsDismissed(updated);
    localStorage.setItem('cr_alerts_dismissed', JSON.stringify(updated));
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
                  {session && <span className="session-live-badge"><span className="slb-dot"/>LIVE SESSION</span>}
                  <span className="last-sync"><RefreshCw size={12} className={isAnalyzing ? 'spin' : ''} /> {lastUpdated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
                  <Button onClick={() => setPdfConfirm({ type: 'full' })} variant="primary" className="btn-report">
                    <FileText size={16} /> Export PDF
                  </Button>
               </div>
            </div>

            {/* --- CORE STATS GRID --- */}
            {(() => {
              const sparkFb = getTrendData(feedback);
              const sparkPos = getSentimentTrend(feedback).map(d => ({ value: d.pos }));
              const sparkNeg = getSentimentTrend(feedback).map(d => ({ value: d.neg }));
              const dTotal = getTrendDelta(feedback, 'total');
              const dPos   = getTrendDelta(feedback, 'positive');
              const dNeg   = getTrendDelta(feedback, 'negative');
              const cards = [
                { label: 'Total Feedback', val: feedback.length, icon: <MessageSquare size={20}/>, color: 'primary', delta: dTotal, spark: sparkFb, sparkColor: 'var(--primary)' },
                { label: 'Positive',       val: feedback.filter(f=>f.sentiment_label==='Positive').length, icon:<CheckCircle2 size={20}/>, color:'success', delta:dPos, spark:sparkPos, sparkColor:'var(--success)' },
                { label: 'Negative',       val: feedback.filter(f=>f.sentiment_label==='Negative').length, icon:<AlertCircle size={20}/>, color:'error',   delta:dNeg, spark:sparkNeg, sparkColor:'var(--error)' },
                { label: 'Satisfaction',   val: insights?`${insights.satisfaction_score}%`:'--%',          icon:<Award size={20}/>,        color:'accent', delta:null, spark:getSatisfactionTrend(feedback), sparkColor:'var(--accent)' },
              ];
              return (
                <div className="stats-row">
                  {cards.map((s, i) => (
                    <motion.div key={i} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.07}} whileHover={{scale:1.03}} className={`stat-card-new stat-${s.color}`}>
                      <div className="scn-icon">{s.icon}</div>
                      <div className="scn-info">
                        <span className="scn-label">{s.label}</span>
                        <span className="scn-val">{s.val}</span>
                        {s.delta !== null && s.delta !== undefined && (
                          <span className={`scn-trend ${s.delta >= 0 ? 'up' : 'down'}`}>
                            {s.delta >= 0 ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                            {Math.abs(s.delta)}% vs last week
                          </span>
                        )}
                      </div>
                      <div className="scn-sparkline">
                        <Sparkline data={s.spark} color={s.sparkColor} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              );
            })()}

            {/* --- AI INTELLIGENCE & TRENDS PANEL --- */}
            <div className="intelligence-grid">
              {/* AI Command Center */}
              <div className={`ai-insight-panel glass-card ${isAnalyzing ? 'ai-analyzing' : ''}`}>
                <div className="ai-panel-header">
                  <div className="aip-title-group">
                    <div className="ai-sparkles-icon"><Sparkles size={20}/></div>
                    <div>
                      <h3>AI Command Center</h3>
                      <span className="ai-panel-sub">Powered by sentiment intelligence</span>
                    </div>
                  </div>
                  <button className={`reanalyze-btn ${isAnalyzing?'loading':''}`} onClick={reAnalyze} disabled={isAnalyzing}>
                    <RefreshCw size={15} className={isAnalyzing?'spin':''}/>
                    {isAnalyzing?'Analyzing...':'Re-analyze'}
                  </button>
                </div>

                {isAnalyzing ? (
                  <div className="ai-skeleton-body">
                    <div className="skel skel-badge"/><div className="skel skel-bar"/>
                    <div className="skel skel-line"/><div className="skel skel-line short"/>
                    <div className="skel skel-line"/><div className="skel skel-line short"/>
                  </div>
                ) : insights ? (
                  <div className="ai-structured-body">
                    <div className="ai-status-row">
                      <span className={`ai-badge ${insights.ai_overall?.toLowerCase()}`}>
                        {insights.ai_overall} Sentiment
                      </span>
                      <div className="ai-conf-wrap">
                        <span className="ai-conf-label">Confidence</span>
                        <div className="conf-bar"><div className="conf-fill" style={{width:`${calculateConfidence(feedback.length)}%`}}/></div>
                        <span className="ai-conf-pct">{calculateConfidence(feedback.length)}%</span>
                      </div>
                    </div>

                    <div className="ai-content-blocks">
                      <div className="ai-block block-success">
                        <label><CheckCircle2 size={14}/> Key Strengths</label>
                        <ul>{insights.ai_strengths?.map((s,i)=>(
                          <motion.li key={i} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.06}}>{s}</motion.li>
                        ))}</ul>
                      </div>
                      <div className="ai-block block-warning">
                        <label><AlertCircle size={14}/> Critical Issues</label>
                        <ul>{insights.ai_improvements?.map((s,i)=>(
                          <motion.li key={i} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.06}}>{s}</motion.li>
                        ))}</ul>
                      </div>
                    </div>

                    <div className="ai-action-suggestion">
                      <label><Lightbulb size={16}/> Recommended Actions</label>
                      <div className="suggestion-tags">
                        {insights.ai_suggestions?.map((s,i)=>(
                          <motion.div key={i} className="s-tag" whileHover={{scale:1.05}} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.1+i*0.06}}>{s}</motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="ai-loading-placeholder">
                    <div className="pulse-circle"/>
                    <p>Aggregating sentiment patterns...</p>
                  </div>
                )}
              </div>

              {/* Trends Chart */}
              <GlassCard className="trends-panel">
                <div className="panel-header">
                  <h3><TrendingUp size={20}/> Trend Analysis</h3>
                  <div className="trend-toggle-group">
                    {['sentiment','feedback','satisfaction'].map(t=>(
                      <button key={t} className={`trend-toggle-btn ${trendToggle===t?'active':''}`} onClick={()=>setTrendToggle(t)}>
                        {t.charAt(0).toUpperCase()+t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={220}>
                    {trendToggle==='sentiment' ? (
                      <AreaChart data={getSentimentTrend(feedback)}>
                        <defs>
                          <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--success)" stopOpacity={0.3}/><stop offset="95%" stopColor="var(--success)" stopOpacity={0}/></linearGradient>
                          <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--error)" stopOpacity={0.3}/><stop offset="95%" stopColor="var(--error)" stopOpacity={0}/></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)"/>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'var(--text-muted)',fontSize:10}}/>
                        <Tooltip contentStyle={{background:'var(--bg-elevated)',border:'1px solid var(--glass-border)',borderRadius:'8px',fontSize:'12px'}}/>
                        <Area type="monotone" dataKey="pos" name="Positive" stroke="var(--success)" fillOpacity={1} fill="url(#colorPos)" strokeWidth={2}/>
                        <Area type="monotone" dataKey="neg" name="Negative" stroke="var(--error)"   fillOpacity={1} fill="url(#colorNeg)" strokeWidth={2}/>
                      </AreaChart>
                    ) : trendToggle==='feedback' ? (
                      <AreaChart data={getTrendData(feedback)}>
                        <defs><linearGradient id="colorFb" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/><stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)"/>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'var(--text-muted)',fontSize:10}}/>
                        <Tooltip contentStyle={{background:'var(--bg-elevated)',border:'1px solid var(--glass-border)',borderRadius:'8px',fontSize:'12px'}}/>
                        <Area type="monotone" dataKey="value" name="Feedback Count" stroke="var(--primary)" fillOpacity={1} fill="url(#colorFb)" strokeWidth={2}/>
                      </AreaChart>
                    ) : (
                      <AreaChart data={getSatisfactionTrend(feedback)}>
                        <defs><linearGradient id="colorSat" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/><stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)"/>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'var(--text-muted)',fontSize:10}}/>
                        <Tooltip contentStyle={{background:'var(--bg-elevated)',border:'1px solid var(--glass-border)',borderRadius:'8px',fontSize:'12px'}} formatter={v=>[`${v}%`,'Satisfaction']}/>
                        <Area type="monotone" dataKey="value" name="Satisfaction %" stroke="var(--accent)" fillOpacity={1} fill="url(#colorSat)" strokeWidth={2}/>
                      </AreaChart>
                    )}
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
                {subjects.map((sub, idx) => {
                  const subFeedback = feedback.filter(f => f.subject_id === sub.id);
                  const posCount = subFeedback.filter(f => f.sentiment_label === 'Positive').length;
                  const negCount = subFeedback.filter(f => f.sentiment_label === 'Negative').length;
                  const neuCount = subFeedback.filter(f => f.sentiment_label === 'Neutral').length;
                  const score = subFeedback.length > 0 ? Math.round((posCount / subFeedback.length) * 100) : 0;
                  const assignedFaculty = staff.find(s => s.subject_id === sub.id);
                  const healthClass = score >= 75 ? 'healthy' : score >= 50 ? 'moderate' : 'critical';
                  return (
                    <motion.div
                      key={sub.id}
                      className={`subject-score-card ${healthClass} ${expandedSubject===sub.id?'expanded':''}`}
                      onClick={() => setExpandedSubject(expandedSubject===sub.id ? null : sub.id)}
                      whileHover={{ y: -6, boxShadow: '0 12px 32px rgba(124,58,237,0.2)' }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06 }}
                    >
                      <div className="ssc-main">
                        <div className="ssc-info">
                          <h4>{sub.name}</h4>
                          <span className="ssc-faculty"><User size={11}/> {assignedFaculty?.name || 'Faculty'}</span>
                          <span className="ssc-count">{subFeedback.length} responses</span>
                        </div>
                        <CircularProgress score={score} />
                      </div>
                      <div className={`ssc-health-bar health-${healthClass}`}/>
                      {expandedSubject === sub.id && (
                        <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} className="ssc-details">
                          <div className="ssc-mini-bar">
                            {subFeedback.length > 0 && (
                              <>
                                <div className="smb-fill smb-pos" style={{width:`${(posCount/subFeedback.length)*100}%`}}/>
                                <div className="smb-fill smb-neu" style={{width:`${(neuCount/subFeedback.length)*100}%`}}/>
                                <div className="smb-fill smb-neg" style={{width:`${(negCount/subFeedback.length)*100}%`}}/>
                              </>
                            )}
                          </div>
                          <div className="ssc-metrics">
                            <div className="m-item"><span>Positive</span><label className="text-success">{posCount}</label></div>
                            <div className="m-item"><span>Neutral</span><label className="text-warning">{neuCount}</label></div>
                            <div className="m-item"><span>Negative</span><label className="text-error">{negCount}</label></div>
                          </div>
                          {subFeedback[0]?.feedback_text && (
                            <p className="ssc-note">Latest: "{subFeedback[0].feedback_text.substring(0,60)}..."</p>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* --- ALERTS & WARNINGS PANEL --- */}
            {(() => {
              const activeAlerts = getAlerts(feedback, subjects, alertsDismissed);
              if (activeAlerts.length === 0) return null;
              return (
                <div className="alerts-section">
                  <div className="section-header-row">
                    <h3 className="sub-section-title"><AlertTriangle size={20}/> Attention Needed
                      <span className="alerts-count-badge">{activeAlerts.length}</span>
                    </h3>
                  </div>
                  <div className="alerts-grid">
                    {activeAlerts.map(alert => (
                      <motion.div key={alert.id} className={`alert-card alert-${alert.level}`}
                        initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} exit={{opacity:0,x:12}}
                      >
                        <div className="alert-icon-wrap">
                          {alert.level==='critical' ? <AlertCircle size={18}/> : <AlertTriangle size={18}/>}
                        </div>
                        <div className="alert-body">
                          <span className="alert-subject">{alert.subject}</span>
                          <p className="alert-msg">{alert.message}</p>
                        </div>
                        <button className="alert-dismiss" onClick={()=>dismissAlert(alert.id)}><X size={14}/></button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* --- KEYWORDS & ACTION CENTER --- */}
            <div className="action-center-grid">
               {/* Keywords Cloud */}
               <GlassCard className="keywords-cloud">
                 <div className="panel-header">
                   <h3><Terminal size={18}/> Top Sentiment Phrases</h3>
                 </div>
                 <div className="tag-cloud">
                   {insights?.top_compliment_phrases?.map((p,i) => (
                     <motion.span key={i} className="cloud-tag tag-pos" whileHover={{scale:1.08}}>{p}</motion.span>
                   ))}
                   {insights?.top_complaint_phrases?.map((p,i) => (
                     <motion.span key={i} className="cloud-tag tag-neg" whileHover={{scale:1.08}}>{p}</motion.span>
                   ))}
                 </div>
               </GlassCard>

               {/* Action Center */}
               <GlassCard className="action-tracker">
                 <div className="panel-header">
                   <h3><ListTodo size={18}/> CR Action Center</h3>
                   <span className="action-badge">{actions.filter(a=>!a.completed).length} pending</span>
                 </div>
                 <div className="action-input-area">
                   <div className="action-input-grp">
                     <input type="text" placeholder="Add an action item..." value={newActionText}
                       onChange={e=>setNewActionText(e.target.value)}
                       onKeyDown={e=>e.key==='Enter'&&handleAddAction()}
                     />
                     <button onClick={handleAddAction}><PlusCircle size={18}/></button>
                   </div>
                   <div className="action-meta-row">
                     <select className="action-priority-select" value={actionPriority} onChange={e=>setActionPriority(e.target.value)}>
                       <option value="High">🔴 High</option>
                       <option value="Medium">🟡 Medium</option>
                       <option value="Low">🟢 Low</option>
                     </select>
                     <select className="action-subject-select" value={actionSubjectTag} onChange={e=>setActionSubjectTag(e.target.value)}>
                       <option value="">No subject tag</option>
                       {subjects.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
                     </select>
                   </div>
                 </div>
                 <div className="action-list-mini">
                   <AnimatePresence>
                     {actions.map(action=>(
                       <motion.div key={action.id} layout
                         className={`action-item-mini ${action.completed?'done':''}`}
                         initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,height:0}}
                       >
                         <div className="action-chk" onClick={()=>toggleAction(action.id)}>
                           {action.completed?<CheckCircle2 size={16}/>:<div className="chk-box"/>}
                         </div>
                         <div className="action-body">
                           <span className="action-txt">{action.text}</span>
                           <div className="action-tags-row">
                             {action.priority && <span className={`action-priority-tag p-${action.priority?.toLowerCase()}`}>{action.priority}</span>}
                             {action.subjectTag && <span className="action-subject-tag">{action.subjectTag}</span>}
                           </div>
                         </div>
                         <button className="action-del" onClick={()=>deleteAction(action.id)}><Trash2 size={12}/></button>
                       </motion.div>
                     ))}
                   </AnimatePresence>
                   {actions.length===0&&<p className="empty-actions">No actions tracked yet. Add your first resolution above.</p>}
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

            <GlassCard className="session-intel-card">
              <div className="sic-header">
                <div className="sic-icon"><Zap size={20}/></div>
                <div>
                  <h4>Session Intelligence</h4>
                  <span className="sic-sub">Live analytics for {profile?.department}</span>
                </div>
                <span className={`session-status-badge sic-badge ${session?'live':'offline'}`}>
                  <span className="status-dot"/>{session?'LIVE':'IDLE'}
                </span>
              </div>
              <div className="sic-stats">
                <div className="sic-stat">
                  <span className="sic-stat-label">Total Feedback</span>
                  <span className="sic-stat-val">{feedback.length}</span>
                </div>
                <div className="sic-stat">
                  <span className="sic-stat-label">Positive</span>
                  <span className="sic-stat-val text-success">{feedback.filter(f=>f.sentiment_label==='Positive').length}</span>
                </div>
                <div className="sic-stat">
                  <span className="sic-stat-label">Negative</span>
                  <span className="sic-stat-val text-error">{feedback.filter(f=>f.sentiment_label==='Negative').length}</span>
                </div>
                <div className="sic-stat">
                  <span className="sic-stat-label">Satisfaction</span>
                  <span className="sic-stat-val text-primary">{insights?.satisfaction_score??'--'}%</span>
                </div>
              </div>
              {session && <p className="sic-started"><Clock size={12}/> Session started: {new Date(session.started_at).toLocaleString()}</p>}
            </GlassCard>

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

        {/* PDF Confirm Modal */}
        <AnimatePresence>
          {pdfConfirm?.type === 'full' && (
            <PdfConfirmModal
              title="Export Full Department Report"
              description={`This will generate a multi-page PDF covering all ${subjects.length} subjects, AI insights, and every feedback log for ${profile?.department}.`}
              fileName={`FeedbackPulse_${profile?.department}_Report.pdf`}
              onConfirm={() => { setPdfConfirm(null); generatePDFReport(profile, insights, feedback, subjects, staff); }}
              onCancel={() => setPdfConfirm(null)}
            />
          )}
        </AnimatePresence>

        {/* Session End Summary Modal */}
        <AnimatePresence>
          {showSessionSummary && sessionEndSummary && (
            <SessionSummaryModal summary={sessionEndSummary} onClose={()=>setShowSessionSummary(false)} />
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

// ─── SESSION SUMMARY MODAL ────────────────────────────────────────────────────
function SessionSummaryModal({ summary, onClose }) {
  const sentColor = summary.dominant === 'Positive' ? 'var(--success)' : summary.dominant === 'Negative' ? 'var(--error)' : 'var(--warning)';
  return createPortal(
    <motion.div className="ses-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}>
      <motion.div className="ses-card" initial={{opacity:0,scale:0.9,y:30}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.9,y:30}} transition={{type:'spring',stiffness:320,damping:28}} onClick={e=>e.stopPropagation()}>
        <div className="ses-header">
          <div className="ses-icon-ring"><CheckCircle2 size={28} color="var(--success)"/></div>
          <h3>Session Ended</h3>
          <p>Here's a summary of your feedback session</p>
        </div>
        <div className="ses-stats-grid">
          <div className="ses-stat"><span className="ses-stat-val">{summary.totalFeedback}</span><span className="ses-stat-label">Total Responses</span></div>
          <div className="ses-stat"><span className="ses-stat-val text-success">{summary.posCount}</span><span className="ses-stat-label">Positive</span></div>
          <div className="ses-stat"><span className="ses-stat-val text-error">{summary.negCount}</span><span className="ses-stat-label">Negative</span></div>
          <div className="ses-stat"><span className="ses-stat-val">{summary.studentCount}</span><span className="ses-stat-label">Students</span></div>
          <div className="ses-stat"><span className="ses-stat-val">{summary.duration}m</span><span className="ses-stat-label">Duration</span></div>
          <div className="ses-stat"><span className="ses-stat-val" style={{color:sentColor}}>{summary.dominant}</span><span className="ses-stat-label">Sentiment</span></div>
        </div>
        {summary.topComplaint && (
          <div className="ses-complaint"><AlertCircle size={14}/> Top concern: <em>"{summary.topComplaint}"</em></div>
        )}
        <button className="ses-close-btn" onClick={onClose}>Close Summary</button>
      </motion.div>
    </motion.div>,
    document.body
  );
}
