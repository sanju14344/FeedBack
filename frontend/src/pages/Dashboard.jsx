import React, { useState, useEffect, lazy, Suspense, memo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useMobile } from '../utils/useMobile';
import SkeletonLoader from '../components/SkeletonLoader';

// Lazy-loaded heavy components (charts + AI panel)
const LazyTrendsChart   = lazy(() => import('../components/TrendsChart'));
const LazyAICommandPanel = lazy(() => import('../components/AICommandPanel'));
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
  Shield,
  Brain,
  ArrowLeft,
  Smile,
  Meh,
  Frown,
  LayoutDashboard,
  Play,
  StopCircle,
  History,
  BadgeCheck
} from 'lucide-react';
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
  getSessionHistory,
  sendChatQuery
} from '../api';
import { generatePDFReport, generateSubjectPDF } from '../utils/reportGenerator';
import { motion, AnimatePresence } from 'framer-motion';
import './Dashboard.css';
import './AnalyticsBoard.css';


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
        alerts.push({ id, level: 'critical', subject: sub.name, message: `Critically low satisfaction at ${score}% â€” immediate attention needed` });
      } else if (score < 65) {
        alerts.push({ id, level: 'warning', subject: sub.name, message: `Below-average satisfaction at ${score}% â€” trending negatively` });
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

const Sparkline = memo(function Sparkline({ data, color = 'var(--primary)', height = 28, width = 72 }) {
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
});

const CircularProgress = memo(function CircularProgress({ score, size = 68 }) {
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
});

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

const PremiumSessionDropdown = ({ sessionHistory, selectedSessionId, onSessionChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedSession = sessionHistory.find(s => s.id === selectedSessionId);
  const triggerText = selectedSessionId === 'all' 
    ? 'All Sessions' 
    : (selectedSession?.is_active ? '🔴 Live Session' : `Session ${sessionHistory.length - sessionHistory.indexOf(selectedSession)} (${new Date(selectedSession?.started_at).toLocaleDateString()})`);

  return (
    <div className="aw2-custom-select-container" ref={dropdownRef}>
      <div 
        className={`aw2-custom-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
          {triggerText}
        </span>
        <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="aw2-custom-select-options"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <div 
              className={`aw2-custom-select-option ${selectedSessionId === 'all' ? 'selected' : ''}`}
              onClick={() => { onSessionChange({ target: { value: 'all' } }); setIsOpen(false); }}
            >
              <div className="aw2-option-icon past" />
              All Sessions
            </div>
            {sessionHistory.map((s, i) => (
              <div 
                key={s.id}
                className={`aw2-custom-select-option ${selectedSessionId === s.id ? 'selected' : ''}`}
                onClick={() => { onSessionChange({ target: { value: s.id } }); setIsOpen(false); }}
              >
                <div className={`aw2-option-icon ${s.is_active ? 'active' : 'past'}`} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600 }}>{s.is_active ? '🔴 Live Session' : `Session ${sessionHistory.length - i}`}</span>
                  {!s.is_active && <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{new Date(s.started_at).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Dashboard({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const isMobile = useMobile();
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
  const [session, setSession] = useState(null);         // null | { is_active, started_at, ended_at }
  const [sessionHistory, setSessionHistory] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('all');
  const [sessionLoading, setSessionLoading] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [liveFeedback, setLiveFeedback] = useState([]);
  const [liveInsights, setLiveInsights] = useState(null);
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

  // Chat Assistant State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ role: 'ai', text: "Hi! I'm your AI assistant. Ask me anything about the recent feedback." }]);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);

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

  useEffect(() => {
    if (!profile?.dept_id) return;

    const targetSessionId = session ? session.id : (sessionHistory?.length > 0 ? sessionHistory[0].id : null);

    if (targetSessionId) {
      getFeedbackLogs(profile.dept_id, targetSessionId, profile.year)
        .then(res => setLiveFeedback(res.data || []))
        .catch(console.error);
      getInsights(profile.dept_id, targetSessionId, profile.year)
        .then(res => setLiveInsights(res.data || null))
        .catch(console.error);
    } else {
      setLiveFeedback([]);
      setLiveInsights(null);
    }
  }, [session, sessionHistory, profile?.dept_id]);

  const fetchData = async (uid) => {
    setLoading(true);
    try {
      const profileRes = await getCrProfile(uid);
      const prof = profileRes.data;
      setProfile(prof);

      if (prof.department) {
        let defId = 'all';
        try {
          const deptsRes = await getDepartmentsByYear(prof.year);
          const myDept = deptsRes.data.find(d => d.name === prof.department);
          if (myDept) {
            setProfile(prev => ({ ...prev, dept_id: myDept.id }));
            const [staffRes, subRes, sessionRes, historyRes] = await Promise.all([
              getStaff(myDept.id),
              getSubjects(myDept.id, prof.year),
              getSessionStatus(myDept.id),
              getSessionHistory(myDept.id)
            ]);
            setStaff(staffRes.data);
            setSubjects(subRes.data);
            
            // Only show active session if it belongs to this CR
            const activeSessionData = sessionRes.data?.is_active ? sessionRes.data : null;
            const isMyActiveSession = activeSessionData && activeSessionData.cr_id === uid;
            setSession(isMyActiveSession ? activeSessionData : null);
            
            // Only show history created by this CR
            const myHistory = (historyRes.data || []).filter(s => s.cr_id === uid);
            setSessionHistory(myHistory);
            
            defId = isMyActiveSession ? activeSessionData.id : (myHistory.length > 0 ? myHistory[0].id : 'all');
            setSelectedSessionId(defId);
          }
        } catch(e) {
          console.error("Error fetching management data:", e);
        }

        // Use the resolved myDept.id for precise querying
        const targetDeptId = deptsRes?.data?.find(d => d.name === prof.department)?.id;
        if (targetDeptId) {
          handleGetInsights(targetDeptId, defId === 'all' ? '' : defId, prof.year);
          const fbRes = await getFeedbackLogs(targetDeptId, defId === 'all' ? '' : defId, prof.year);
          setFeedback(fbRes.data);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionChange = async (e) => {
    const newId = e.target.value;
    setSelectedSessionId(newId);
    if (!profile?.dept_id) return;
    
    setIsRefreshing(true);
    try {
      handleGetInsights(profile.dept_id, newId === 'all' ? '' : newId, profile.year);
      const fbRes = await getFeedbackLogs(profile.dept_id, newId === 'all' ? '' : newId, profile.year);
      setFeedback(fbRes.data);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleGetInsights = async (deptId, sessionId = '', year = '') => {
    try {
      const insightRes = await getInsights(deptId, sessionId, year);
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
        getSubjects(profile.dept_id, profile.year)
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
        getSubjects(profile.dept_id, profile.year)
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
    const posCount = liveFeedback.filter(f => f.sentiment_label === 'Positive').length;
    const negCount = liveFeedback.filter(f => f.sentiment_label === 'Negative').length;
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
        topComplaint: liveInsights?.top_complaint_phrases?.[0] || null,
        satisfaction: liveInsights?.satisfaction_score || 0,
        posCount,
        negCount,
        totalFeedback: liveFeedback.length
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

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !profile?.dept_id) return;
    const msg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatInput('');
    setIsChatTyping(true);

    try {
      const res = await sendChatQuery(profile.dept_id, selectedSessionId === 'all' ? '' : selectedSessionId, msg, profile.year);
      setChatMessages(prev => [...prev, { role: 'ai', text: res.data.response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', text: "Sorry, I couldn't process that right now." }]);
    } finally {
      setIsChatTyping(false);
    }
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
        alerts={getAlerts(feedback, subjects, alertsDismissed)}
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
            initial={isMobile ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={isMobile ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: isMobile ? 0.2 : 0.3 }}
            className="aw2"
          >
            {/* ══════════ PREMIUM COMMAND BAR ══════════ */}
            <div className="aw2-premium-command-bar">
              {/* Top row: CR profile + actions */}
              <div className="aw2-pcb-top">
                <div className="aw2-pcb-profile">
                  <div className="aw2-pcb-avatar">
                    {(profile?.full_name || 'CR').charAt(0).toUpperCase()}
                  </div>
                  <div className="aw2-pcb-info">
                    <span className="aw2-pcb-name">{profile?.full_name || 'Class Representative'}</span>
                    <span className="aw2-pcb-context">{profile?.year} Year · {profile?.department}</span>
                  </div>
                  {session
                    ? <span className="aw2-session-live-badge"><span className="aw2-live-dot"/>🟢 LIVE SESSION</span>
                    : <span className="aw2-session-idle-badge">⚪ IDLE</span>
                  }
                </div>
                <div className="aw2-pcb-actions">
                  <span className="aw2-sync-chip">
                    <RefreshCw size={11} className={isAnalyzing ? 'spin' : ''}/>
                    {lastUpdated.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                  </span>
                  <PremiumSessionDropdown 
                    sessionHistory={sessionHistory}
                    selectedSessionId={selectedSessionId}
                    onSessionChange={handleSessionChange}
                  />
                  <button className="aw2-pdf-btn" onClick={() => setPdfConfirm({ type: 'full' })}>
                    <FileText size={15}/> Export Report
                  </button>
                </div>
              </div>
              {/* Bottom row: Dashboard title + health mini */}
              <div className="aw2-pcb-title-row">
                <div className="aw2-pcb-title-group">
                  <div className="aw2-title-icon"><LayoutDashboard size={20}/></div>
                  <div>
                    <h2 className="aw2-title">Analytics Command Center</h2>
                    <p className="aw2-subtitle">
                      Real-time intelligence · <span className="aw2-dept">{profile?.department}</span>
                      {profile?.is_approved && (
                        <span className="verified-badge-inline" title="Verified CR">
                          <CheckCircle2 size={12} fill="var(--auth-accent)" color="#fff" />
                          Verified
                        </span>
                      )}
                      {session && <span className="aw2-live-pill"><span className="aw2-live-dot"/>LIVE</span>}
                    </p>
                  </div>
                </div>
                <div className="aw2-pcb-health-mini">
                  <div className="aw2-phm-score" style={{
                    color: (insights?.class_health_score||0) >= 75 ? '#10b981' : (insights?.class_health_score||0) >= 50 ? '#f59e0b' : '#ef4444'
                  }}>
                    {insights?.class_health_score || '--'}
                  </div>
                  <div className="aw2-phm-label">Class Health</div>
                </div>
              </div>
            </div>

            {/* ══════════ KPI CARDS ══════════ */}
            {(() => {
              const sparkFb  = getTrendData(feedback);
              const sentTrnd = getSentimentTrend(feedback);
              const sparkPos = sentTrnd.map(d => ({ value: d.pos }));
              const sparkNeg = sentTrnd.map(d => ({ value: d.neg }));
              const dTotal   = getTrendDelta(feedback, 'total');
              const dPos     = getTrendDelta(feedback, 'positive');
              const dNeg     = getTrendDelta(feedback, 'negative');
              const satScore = insights?.satisfaction_score ?? null;
              const cards = [
                { id:'total',   label:'Total Feedback', val: feedback.length,                                                    icon:<MessageSquare size={20}/>, accent:'#7c3aed', delta:dTotal, spark:sparkFb,  sparkC:'#7c3aed' },
                { id:'pos',     label:'Positive',        val: feedback.filter(f=>f.sentiment_label==='Positive').length,         icon:<CheckCircle2  size={20}/>, accent:'#10b981', delta:dPos,   spark:sparkPos, sparkC:'#10b981' },
                { id:'neg',     label:'Negative',        val: feedback.filter(f=>f.sentiment_label==='Negative').length,         icon:<AlertCircle   size={20}/>, accent:'#ef4444', delta:dNeg,   spark:sparkNeg, sparkC:'#ef4444' },
                { id:'sat',     label:'Satisfaction',    val: satScore !== null ? `${satScore}%` : '--%',                        icon:<Award         size={20}/>, accent:'#06b6d4', delta:null,   spark:getSatisfactionTrend(feedback), sparkC:'#06b6d4' },
              ];
              return (
                <div className="aw2-kpi-grid">
                  {cards.map((c, i) => (
                    <motion.div
                      key={c.id}
                      className="aw2-kpi-card"
                      style={{ '--kpi-accent': c.accent }}
                      initial={isMobile ? {opacity:0} : {opacity:0,y:20}}
                      animate={isMobile ? {opacity:1} : {opacity:1,y:0}}
                      transition={isMobile ? {duration:0.2} : {delay:i*0.07}}
                      whileHover={isMobile ? {} : {y:-4}}
                    >
                      <div className="aw2-kpi-icon">{c.icon}</div>
                      <div className="aw2-kpi-body">
                        <span className="aw2-kpi-label">{c.label}</span>
                        <span className="aw2-kpi-val">{c.val}</span>
                        {c.delta !== null && c.delta !== undefined && (
                          <span className={`aw2-kpi-delta ${c.delta >= 0 ? 'up' : 'down'}`}>
                            {c.delta >= 0 ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                            {Math.abs(c.delta)}% vs last week
                          </span>
                        )}
                      </div>
                      <div className="aw2-kpi-spark">
                        <Sparkline data={c.spark} color={c.sparkC} height={36} width={80}/>
                      </div>
                    </motion.div>
                  ))}
                </div>
              );
            })()}

            {/* â•â•â•â•â•â•â•â•â•â• HEALTH + GAMIFICATION STRIP â•â•â•â•â•â•â•â•â•â• */}
            <div className="aw2-hg-strip">
              <div className="aw2-health-card">
                <div className="aw2-hc-icon-wrap"><Activity size={18}/></div>
                <div className="aw2-hc-info">
                  <span className="aw2-hc-label">Class Health Score</span>
                  <span className="aw2-hc-sub">Aggregated from sentiment &amp; satisfaction</span>
                </div>
                <div className="aw2-hc-score-wrap">
                  <CircularProgress score={insights?.class_health_score || 0} size={64}/>
                  <span className={`aw2-health-badge ${insights?.health_status?.toLowerCase() || 'evaluating'}`}>
                    {insights?.health_status || 'Evaluating'}
                  </span>
                </div>
              </div>
              <div className="aw2-gm-card">
                <div className="aw2-gm-stat">
                  <span className="aw2-gm-val">{actions.filter(a => a.completed).length}</span>
                  <span className="aw2-gm-label">Issues Resolved</span>
                </div>
                <div className="aw2-gm-divider"/>
                <div className="aw2-gm-stat">
                  <span className="aw2-gm-val aw2-gm-green">+{Math.max(0, getTrendDelta(feedback,'satisfaction') || 0)}%</span>
                  <span className="aw2-gm-label">Satisfaction Growth</span>
                </div>
              </div>
            </div>

            {/* â•â•â•â•â•â•â•â•â•â• AI + ISSUES GRID â•â•â•â•â•â•â•â•â•â• */}
            <div className="aw2-intel-grid">
              {/* AI Command Center */}
              <Suspense fallback={<SkeletonLoader variant="ai-panel"/>}>
                <LazyAICommandPanel
                  insights={insights}
                  isAnalyzing={isAnalyzing}
                  reAnalyze={reAnalyze}
                  feedbackCount={feedback.length}
                  isMobile={isMobile}
                />
              </Suspense>

              {/* Detected Issues + Trend Story */}
              <div className="aw2-issues-col">
                <div className="aw2-panel aw2-issues-panel">
                  <div className="aw2-panel-hdr">
                    <AlertTriangle size={18}/><span>Auto-Detected Issues</span>
                  </div>
                  <div className="aw2-issues-list">
                    {insights?.detected_issues?.length > 0 ? insights.detected_issues.map((issue, idx) => (
                      <div key={idx} className={`aw2-issue aw2-issue-${issue.priority.toLowerCase()}`}>
                        <span className="aw2-issue-pri">{issue.priority}</span>
                        <p>{issue.issue}</p>
                      </div>
                    )) : (
                      <div className="aw2-di-empty">
                        <CheckCircle2 size={22} opacity={0.4}/>
                        <p>No critical issues detected</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* â•â•â•â•â•â•â•â•â•â• TRENDS + TIMELINE â•â•â•â•â•â•â•â•â•â• */}
            <div className="aw2-trends-row">
              <Suspense fallback={<SkeletonLoader variant="chart"/>}>
                <LazyTrendsChart
                  trendToggle={trendToggle}
                  setTrendToggle={setTrendToggle}
                  feedback={feedback}
                  isMobile={isMobile}
                />
              </Suspense>
            </div>

            {/* â•â•â•â•â•â•â•â•â•â• SUBJECT PERFORMANCE GRID â•â•â•â•â•â•â•â•â•â• */}


            {/* â•â•â•â•â•â•â•â•â•â• ALERTS â•â•â•â•â•â•â•â•â•â• */}
            {(() => {
              const activeAlerts = getAlerts(feedback, subjects, alertsDismissed);
              if (activeAlerts.length === 0) return null;
              return (
                <div className="aw2-alerts-section">
                  <div className="aw2-section-hdr">
                    <h3 className="aw2-section-title">
                      <AlertTriangle size={18}/> Attention Needed
                      <span className="aw2-alert-badge">{activeAlerts.length}</span>
                    </h3>
                  </div>
                  <div className="aw2-alerts-grid">
                    {activeAlerts.map(alert => (
                      <motion.div key={alert.id} className={`aw2-alert aw2-alert-${alert.level}`}
                        initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} exit={{opacity:0,x:12}}
                      >
                        <div className="aw2-alert-icon">
                          {alert.level==='critical' ? <AlertCircle size={18}/> : <AlertTriangle size={18}/>}
                        </div>
                        <div className="aw2-alert-body">
                          <span className="aw2-alert-subj">{alert.subject}</span>
                          <p>{alert.message}</p>
                        </div>
                        <button className="aw2-alert-dismiss" onClick={()=>dismissAlert(alert.id)}><X size={14}/></button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })()}

          </motion.div>
        )}

        {activeTab === 'Feedback' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="feedback-subject-list-workspace"
          >
            <div className="aw2-section-hdr" style={{ marginBottom: '1.5rem' }}>
              <div>
                <h2 className="workspace-title">Subject Performance Tracker</h2>
                <p className="workspace-sub">Deep dive into student feedback across all subjects</p>
              </div>
            </div>

            {subjects.length === 0 ? (
              <div className="empty-history">
                <BookOpen size={48} opacity={0.2} />
                <p>No subjects found for your department.</p>
              </div>
            ) : (
              <div className="aw2-subject-grid">
                {subjects.map((sub, idx) => {
                  const subFeedback = feedback.filter(f => f.subject_id === sub.id);
                  const posCount = subFeedback.filter(f => f.sentiment_label === 'Positive').length;
                  const negCount = subFeedback.filter(f => f.sentiment_label === 'Negative').length;
                  const neuCount = subFeedback.filter(f => f.sentiment_label === 'Neutral').length;
                  const score = subFeedback.length > 0 ? Math.round((posCount / subFeedback.length) * 100) : null;
                  const assignedStaff = staff.find(s => s.subject_id === sub.id);
                  
                  const subColor = score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : score !== null ? 'var(--error)' : 'var(--glass-border)';

                  return (
                    <motion.div
                      key={sub.id}
                      className="aw2-sub-card"
                      style={{ '--sub-color': subColor }}
                      initial={isMobile ? { opacity: 0 } : { opacity: 0, y: 15 }}
                      animate={isMobile ? { opacity: 1 } : { opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => setSelectedSubject(sub)}
                      whileHover={{ y: -4 }}
                    >
                      <div className="aw2-sc-top">
                        <div className="aw2-sc-info">
                          <h4>{sub.name}</h4>
                          <span className="aw2-sc-faculty"><User size={12}/> {assignedStaff?.name || 'Unassigned'}</span>
                          <span className="aw2-sc-count">{subFeedback.length} responses</span>
                        </div>
                        {score !== null ? (
                          <div className={`aw2-health-badge ${score >= 75 ? 'healthy' : score >= 50 ? 'moderate' : 'critical'}`}>
                            {score}%
                          </div>
                        ) : (
                          <div className="aw2-health-badge evaluating">N/A</div>
                        )}
                      </div>

                      <div className="aw2-sc-bar-wrap">
                        <div className="aw2-sc-bar">
                          <motion.div className="aw2-sc-fill aw2-sc-pos" initial={{width:0}} animate={{width:`${subFeedback.length ? (posCount/subFeedback.length)*100 : 0}%`}} />
                          <motion.div className="aw2-sc-fill aw2-sc-neu" initial={{width:0}} animate={{width:`${subFeedback.length ? (neuCount/subFeedback.length)*100 : 0}%`}} />
                          <motion.div className="aw2-sc-fill aw2-sc-neg" initial={{width:0}} animate={{width:`${subFeedback.length ? (negCount/subFeedback.length)*100 : 0}%`}} />
                        </div>
                      </div>

                      <div className="aw2-sc-detail">
                        <div className="aw2-sc-metrics">
                          <div className="aw2-scm"><span>Pos</span><label style={{color:'var(--success)'}}>{posCount}</label></div>
                          <div className="aw2-scm"><span>Neu</span><label style={{color:'var(--warning)'}}>{neuCount}</label></div>
                          <div className="aw2-scm"><span>Neg</span><label style={{color:'var(--error)'}}>{negCount}</label></div>
                        </div>
                        {subFeedback.length > 0 && subFeedback[0].feedback_text && (
                          <p className="aw2-sc-quote">"{subFeedback[0].feedback_text.substring(0, 60)}..."</p>
                        )}
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
                  sessionHistory={sessionHistory}
                  selectedSessionId={selectedSessionId}
                  handleSessionChange={handleSessionChange}
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
                            <Home size={14} style={{opacity: 0.6}} /> Unassigned Staff â€¢ {profile.department}
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
            initial={isMobile ? { opacity: 0 } : { opacity: 0, y: 15 }}
            animate={isMobile ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: isMobile ? 0.2 : 0.3 }}
          >
            {/* Header */}
            <div className="session-tab-header">
              <div>
                <h2 className="workspace-title">Session Control Center</h2>
                <p className="workspace-sub">Manage live feedback windows for <strong>{profile?.department}</strong></p>
              </div>
              <span className={`st-status-badge ${session ? 'live' : 'idle'}`}>
                <span className="st-status-dot" />
                {session ? '🟢 SESSION LIVE' : '⚪ SESSION IDLE'}
                {profile?.is_approved && <span className="verified-cr-pill-small"><BadgeCheck size={12}/> VERIFIED CR</span>}
              </span>
            </div>

            {/* Intelligence Grid */}
            <div className="st-intelligence-grid">
              {/* Mood Meter */}
              <GlassCard className="st-mood-card">
                <div className="st-card-header">
                  <div className="st-card-icon"><Activity size={18}/></div>
                  <div>
                    <h4>{session ? 'Live Mood Meter' : 'Latest Mood Meter'}</h4>
                    <span>{session ? 'Real-time sentiment snapshot' : 'Final sentiment snapshot'}</span>
                  </div>
                </div>
                {(() => {
                  const pos = liveFeedback.filter(f => f.sentiment_label === 'Positive').length;
                  const neg = liveFeedback.filter(f => f.sentiment_label === 'Negative').length;
                  const neu = liveFeedback.length - pos - neg;
                  const total = liveFeedback.length || 1;
                  return (
                    <div className="st-mood-body">
                      <div className="st-mood-items">
                        <div className="st-mood-item st-mood-pos">
                          <Smile size={24}/>
                          <span className="st-mood-pct">{Math.round((pos/total)*100)}%</span>
                          <span className="st-mood-label">Positive</span>
                          <span className="st-mood-count">{pos}</span>
                        </div>
                        <div className="st-mood-item st-mood-neu">
                          <Meh size={24}/>
                          <span className="st-mood-pct">{Math.round((neu/total)*100)}%</span>
                          <span className="st-mood-label">Neutral</span>
                          <span className="st-mood-count">{neu}</span>
                        </div>
                        <div className="st-mood-item st-mood-neg">
                          <Frown size={24}/>
                          <span className="st-mood-pct">{Math.round((neg/total)*100)}%</span>
                          <span className="st-mood-label">Negative</span>
                          <span className="st-mood-count">{neg}</span>
                        </div>
                      </div>
                      <div className="st-mood-bar">
                        <motion.div className="st-mf-pos" style={{width:`${(pos/total)*100}%`}}
                          initial={{width:0}} animate={{width:`${(pos/total)*100}%`}} transition={{duration:0.8}}/>
                        <motion.div className="st-mf-neu" style={{width:`${(neu/total)*100}%`}}
                          initial={{width:0}} animate={{width:`${(neu/total)*100}%`}} transition={{duration:0.8,delay:0.1}}/>
                        <motion.div className="st-mf-neg" style={{width:`${(neg/total)*100}%`}}
                          initial={{width:0}} animate={{width:`${(neg/total)*100}%`}} transition={{duration:0.8,delay:0.2}}/>
                      </div>
                      <div className="st-mood-total">{liveFeedback.length} total responses collected</div>
                    </div>
                  );
                })()}
              </GlassCard>

              {/* Session Stats */}
              <GlassCard className="st-stats-card">
                <div className="st-card-header">
                  <div className="st-card-icon"><Zap size={18}/></div>
                  <div>
                    <h4>Session Intelligence</h4>
                    <span>{session ? 'Live analytics' : 'Latest session analytics'} · {profile?.department}</span>
                  </div>
                </div>
                <div className="sic-stats">
                  <div className="sic-stat">
                    <span className="sic-stat-label">Total Feedback</span>
                    <span className="sic-stat-val">{liveFeedback.length}</span>
                  </div>
                  <div className="sic-stat">
                    <span className="sic-stat-label">Positive</span>
                    <span className="sic-stat-val text-success">{liveFeedback.filter(f=>f.sentiment_label==='Positive').length}</span>
                  </div>
                  <div className="sic-stat">
                    <span className="sic-stat-label">Negative</span>
                    <span className="sic-stat-val text-error">{liveFeedback.filter(f=>f.sentiment_label==='Negative').length}</span>
                  </div>
                  <div className="sic-stat">
                    <span className="sic-stat-label">Satisfaction</span>
                    <span className="sic-stat-val text-primary">{liveInsights?.satisfaction_score??'--'}%</span>
                  </div>
                </div>
                {session && <p className="sic-started"><Clock size={12}/> Started: {new Date(session.started_at).toLocaleString()}</p>}
              </GlassCard>
            </div>

            {/* Session Control */}
            <GlassCard className="session-control-card-premium">
              <div className="sccp-left">
                <div className={`sccp-status ${session ? 'live' : 'idle'}`}>
                  <div className="status-dot"></div>
                  <div>
                    <span className="sccp-status-text">{session ? 'Session is LIVE' : 'No Active Session'}</span>
                    <span className="sccp-status-sub">
                      {session
                        ? `Students can submit feedback · Started ${new Date(session.started_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`
                        : 'Start a session to enable student feedback submission'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="sccp-right">
                {!session ? (
                  <Button 
                    variant="primary" 
                    className="btn-start-session"
                    icon={sessionLoading ? <div className="loading-spinner-small" /> : <Play size={18} />}
                    onClick={handleStartSession}
                    disabled={sessionLoading}
                  >
                    Start New Session
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="danger" 
                      className="btn-end-session"
                      icon={<StopCircle size={18} />}
                      onClick={() => setShowEndConfirm(true)}
                    >
                      End Session
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

            {/* Session History */}
            <div className="session-history-container">
              <div className="history-header-row">
                <History size={18}/>
                <h3 className="history-title">Session History</h3>
                <span className="history-count-badge">{sessionHistory.length} sessions</span>
              </div>
              {sessionHistory.length === 0 ? (
                <div className="empty-history">
                  <Calendar size={32} opacity={0.2}/>
                  <p>No past sessions found. Start your first session above.</p>
                </div>
              ) : (
                <div className="history-list">
                  {sessionHistory.map((hist, idx) => {
                    const dur = hist.ended_at
                      ? Math.round((new Date(hist.ended_at) - new Date(hist.started_at)) / 60000)
                      : null;
                    return (
                      <motion.div
                        key={hist.id}
                        className="history-card-premium"
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.06 }}
                      >
                        <div className="hcp-icon">
                          {hist.is_active ? <Zap size={18} color="#10b981"/> : <CheckCircle2 size={18} opacity={0.5}/>}
                        </div>
                        <div className="hcp-info">
                          <span className="hcp-name">Session {sessionHistory.length - idx}</span>
                          <span className="hcp-date">
                            {new Date(hist.started_at).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'})}
                            {hist.ended_at && ` · ${dur}m duration`}
                          </span>
                        </div>
                        <div className="hcp-stats">
                          <div className="hcp-stat">
                            <Users size={14}/>
                            <strong>{hist.student_count ?? '—'}</strong>
                            <span>students</span>
                          </div>
                        </div>
                        <div className={`hcp-badge ${hist.is_active ? 'active' : 'ended'}`}>
                          {hist.is_active ? 'Active' : 'Ended'}
                        </div>
                      </motion.div>
                    );
                  })}
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

        {/* --- FLOATING AI CHAT ASSISTANT --- */}
        {createPortal(
          <div className={`floating-chat-widget ${chatOpen ? 'open' : ''}`}>
            <AnimatePresence>
              {!chatOpen && (
                <motion.button 
                  className="chat-fab" 
                  onClick={() => setChatOpen(true)}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  whileHover={isMobile ? {} : { scale: 1.05 }}
                >
                  <MessageSquare size={24} />
                </motion.button>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {chatOpen && (
                <motion.div 
                  className="chat-panel"
                  initial={{ opacity: 0, y: isMobile ? 10 : 20, scale: isMobile ? 1 : 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: isMobile ? 10 : 20, scale: isMobile ? 1 : 0.95 }}
                  transition={isMobile ? { duration: 0.2 } : { type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <div className="chat-header">
                    <div className="ch-info">
                      <Sparkles size={18} />
                      <span>AI Assistant</span>
                    </div>
                    <button onClick={() => setChatOpen(false)}><X size={16}/></button>
                  </div>
                  <div className="chat-body">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`chat-bubble ${msg.role}`}>
                        <div className="cb-inner">{msg.text}</div>
                      </div>
                    ))}
                    {isChatTyping && (
                      <div className="chat-bubble ai typing">
                        <div className="dot"></div><div className="dot"></div><div className="dot"></div>
                      </div>
                    )}
                  </div>
                  <form className="chat-input-area" onSubmit={handleChatSubmit}>
                    <input 
                      type="text" 
                      placeholder="Ask about feedback trends..." 
                      value={chatInput} 
                      onChange={e => setChatInput(e.target.value)}
                      disabled={isChatTyping}
                    />
                    <button type="submit" disabled={!chatInput.trim() || isChatTyping}>
                      <ArrowLeft size={16} style={{transform: 'rotate(135deg)'}} />
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>,
          document.body
        )}
      </main>
    </div>
  );
}

// â”€â”€â”€ SUBJECT FEEDBACK MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SubjectFeedbackModal({ subject, feedbackList, onClose, renderFormattedFeedback, profile, staff, sessionHistory, selectedSessionId, handleSessionChange }) {
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
            <PremiumSessionDropdown 
              sessionHistory={sessionHistory}
              selectedSessionId={selectedSessionId}
              onSessionChange={handleSessionChange}
            />
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

// â”€â”€â”€ PDF CONFIRM MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ SESSION SUMMARY MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
