import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  RefreshCw,
  AlertTriangle,
  Info,
  TrendingUp,
  Brain,
  Zap,
  Shield,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react';

const calculateConfidence = (feedbackCount) => {
  if (feedbackCount <= 5) return 65;
  if (feedbackCount <= 20) return 82;
  return 94;
};

// Circular animated health score ring
const HealthRing = ({ score, size = 120 }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(score, 100) / 100) * circ;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const glowColor = score >= 75 ? 'rgba(16,185,129,0.4)' : score >= 50 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)';
  const label = score >= 75 ? 'Healthy' : score >= 50 ? 'Moderate' : 'Critical';

  return (
    <div className="ai-health-ring-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter: `drop-shadow(0 0 10px ${glowColor})` }}>
        <defs>
          <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={score >= 75 ? '#06b6d4' : score >= 50 ? '#ef4444' : '#7c3aed'} />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        {/* Progress */}
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke="url(#healthGrad)" strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)' }}
        />
        {/* Score text */}
        <text x="50%" y="45%" textAnchor="middle" dy="0.35em" fill={color} fontSize={size * 0.22} fontWeight="900" fontFamily="inherit">
          {score}
        </text>
        <text x="50%" y="68%" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={size * 0.1} fontWeight="600" fontFamily="inherit">
          / 100
        </text>
      </svg>
      <span className={`ai-health-label hl-${label.toLowerCase()}`}>{label}</span>
    </div>
  );
};

// Typing effect hook
const useTypingEffect = (text, speed = 18, trigger = true) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!trigger || !text) {
      setDisplayed(text || '');
      setDone(true);
      return;
    }
    setDisplayed('');
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(timer); setDone(true); }
    }, speed);
    return () => clearInterval(timer);
  }, [text, trigger]);

  return { displayed, done };
};

// Priority icon map
const PriorityIcon = ({ level }) => {
  if (level === 'high') return <AlertCircle size={14} />;
  if (level === 'medium') return <AlertTriangle size={14} />;
  return <Info size={14} />;
};

const AICommandPanel = React.memo(function AICommandPanel({
  insights,
  isAnalyzing,
  reAnalyze,
  feedbackCount,
  isMobile,
}) {
  const conf = calculateConfidence(feedbackCount);
  const [summaryVisible, setSummaryVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(t);
  }, []);

  const summaryText = insights?.ai_summary || (insights ? 'Sentiment patterns detected. Class performance shows mixed signals across subjects.' : '');
  const { displayed: typedSummary } = useTypingEffect(summaryText, 12, mounted && !!insights && !isAnalyzing);

  // Build alert items from insights
  const alertItems = [];
  if (insights?.detected_issues) {
    insights.detected_issues.forEach((issue) => {
      alertItems.push({
        level: issue.priority?.toLowerCase() || 'medium',
        text: issue.issue,
      });
    });
  }

  const score = insights?.class_health_score || 0;

  return (
    <div className={`ai-command-center ${isAnalyzing ? 'ai-analyzing' : ''}`}>
      {/* Animated border glow */}
      <div className="aicc-glow-border" />

      {/* Header */}
      <div className="aicc-header">
        <div className="aicc-title-group">
          <div className="aicc-brain-icon">
            <Brain size={20} />
          </div>
          <div>
            <h3 className="aicc-title">AI Command Center</h3>
            <span className="aicc-subtitle">Powered by sentiment intelligence</span>
          </div>
        </div>
        <div className="aicc-header-right">
          <div className="aicc-live-status">
            <span className="aicc-live-dot" />
            <span>AI Monitoring Active</span>
          </div>
          <motion.button
            className={`aicc-reanalyze-btn ${isAnalyzing ? 'loading' : ''}`}
            onClick={reAnalyze}
            disabled={isAnalyzing}
            whileHover={isAnalyzing ? {} : { scale: 1.04 }}
            whileTap={isAnalyzing ? {} : { scale: 0.97 }}
          >
            <RefreshCw size={14} className={isAnalyzing ? 'spin' : ''} />
            {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
          </motion.button>
        </div>
      </div>

      {/* Body */}
      {isAnalyzing ? (
        <div className="aicc-skeleton">
          <div className="aicc-sk-row">
            <div className="aicc-sk-ring" />
            <div className="aicc-sk-lines">
              <div className="skel-bar aicc-sk-bar1" />
              <div className="skel-bar aicc-sk-bar2" />
              <div className="skel-bar aicc-sk-bar3" />
            </div>
          </div>
          <div className="skel-bar aicc-sk-full" />
          <div className="skel-bar aicc-sk-full short" />
        </div>
      ) : insights ? (
        <div className="aicc-body">
          {/* Section A: Health Score + Confidence */}
          <div className="aicc-health-row">
            <HealthRing score={score} size={isMobile ? 100 : 120} />
            <div className="aicc-health-info">
              <div className="aicc-class-label">Class Health Score</div>
              <p className="aicc-health-desc">
                Aggregated from sentiment distribution, satisfaction %, and feedback volume.
              </p>
              <div className="aicc-conf-block">
                <span className="aicc-conf-label">AI Confidence</span>
                <div className="aicc-conf-bar-wrap">
                  <div className="aicc-conf-bar">
                    <motion.div
                      className="aicc-conf-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${conf}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                  <span className="aicc-conf-pct">{conf}%</span>
                </div>
              </div>
              <div className="aicc-overall-badge-row">
                <span className={`aicc-overall-badge badge-${insights.ai_overall?.toLowerCase()}`}>
                  {insights.ai_overall} Sentiment
                </span>
                <span className="aicc-sat-badge">
                  <TrendingUp size={12} /> {insights.satisfaction_score ?? '--'}% Satisfaction
                </span>
              </div>
            </div>
          </div>

          {/* Section B: AI Summary */}
          <div className="aicc-summary-block">
            <button className="aicc-summary-toggle" onClick={() => setSummaryVisible(v => !v)}>
              <Sparkles size={14} />
              <span>AI Class Summary</span>
              {summaryVisible ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <AnimatePresence>
              {summaryVisible && (
                <motion.div
                  className="aicc-summary-text"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <p>
                    {typedSummary}
                    <span className="aicc-cursor" />
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section C: Strengths + Concerns */}
          <div className={`aicc-blocks ${isMobile ? 'aicc-blocks-col' : ''}`}>
            <div className="aicc-block aicc-block-green">
              <label><CheckCircle2 size={14} /> Key Strengths</label>
              <ul>
                {insights.ai_strengths?.map((s, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                    {s}
                  </motion.li>
                ))}
              </ul>
            </div>
            <div className="aicc-block aicc-block-red">
              <label><AlertCircle size={14} /> Critical Issues</label>
              <ul>
                {insights.ai_improvements?.map((s, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                    {s}
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section D: Priority Alerts */}
          {alertItems.length > 0 && (
            <div className="aicc-alerts-section">
              <div className="aicc-alerts-title"><Zap size={14} /> Priority Alerts</div>
              <div className="aicc-alerts-list">
                {alertItems.slice(0, 4).map((alert, i) => (
                  <motion.div
                    key={i}
                    className={`aicc-alert-chip aicc-alert-${alert.level}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <PriorityIcon level={alert.level} />
                    <span>{alert.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Section E: Recommendations */}
          {insights.ai_suggestions?.length > 0 && (
            <div className="aicc-recs-section">
              <div className="aicc-recs-title"><Lightbulb size={14} /> Actionable Recommendations</div>
              <div className="aicc-recs-grid">
                {insights.ai_suggestions.map((s, i) => (
                  <motion.div
                    key={i}
                    className="aicc-rec-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    whileHover={isMobile ? {} : { y: -2, boxShadow: '0 8px 24px rgba(124,58,237,0.2)' }}
                  >
                    <div className="aicc-rec-num">{String(i + 1).padStart(2, '0')}</div>
                    <p>{s}</p>
                    <ArrowRight size={14} className="aicc-rec-arrow" />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="aicc-footer">
            <Shield size={12} />
            <span>Last analysis: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="aicc-footer-dot" />
            <span>{feedbackCount} responses analyzed</span>
          </div>
        </div>
      ) : (
        <div className="aicc-placeholder">
          <motion.div
            className="aicc-pulse-ring"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          />
          <Brain size={32} opacity={0.3} />
          <p>Aggregating sentiment patterns...</p>
          <span>Collecting feedback data to begin analysis</span>
        </div>
      )}
    </div>
  );
});

export default AICommandPanel;
