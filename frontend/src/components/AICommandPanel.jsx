import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';

const calculateConfidence = (feedbackCount) => {
  if (feedbackCount <= 5) return 65;
  if (feedbackCount <= 20) return 82;
  return 94;
};

/**
 * AICommandPanel — extracted from Dashboard.jsx.
 * Wrapped in React.memo to prevent re-renders from unrelated state.
 * Lazy-loaded via React.lazy in Dashboard.jsx.
 */
const AICommandPanel = React.memo(function AICommandPanel({
  insights,
  isAnalyzing,
  reAnalyze,
  feedbackCount,
  isMobile,
}) {
  const conf = calculateConfidence(feedbackCount);

  // On mobile: simpler list items (no staggered motion.li)
  const Li = isMobile
    ? ({ children }) => <li>{children}</li>
    : ({ children, delay }) => (
        <motion.li
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay }}
        >
          {children}
        </motion.li>
      );

  const Tag = isMobile
    ? ({ children }) => <div className="s-tag">{children}</div>
    : ({ children, delay }) => (
        <motion.div
          className="s-tag"
          whileHover={{ scale: 1.05 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay }}
        >
          {children}
        </motion.div>
      );

  return (
    <div className={`ai-insight-panel glass-card ${isAnalyzing ? 'ai-analyzing' : ''}`}>
      <div className="ai-panel-header">
        <div className="aip-title-group">
          <div className="ai-sparkles-icon"><Sparkles size={20} /></div>
          <div>
            <h3>AI Command Center</h3>
            <span className="ai-panel-sub">Powered by sentiment intelligence</span>
          </div>
        </div>
        <button
          className={`reanalyze-btn ${isAnalyzing ? 'loading' : ''}`}
          onClick={reAnalyze}
          disabled={isAnalyzing}
        >
          <RefreshCw size={15} className={isAnalyzing ? 'spin' : ''} />
          {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
        </button>
      </div>

      {isAnalyzing ? (
        <div className="ai-skeleton-body">
          <div className="skel skel-badge" /><div className="skel skel-bar" />
          <div className="skel skel-line" /><div className="skel skel-line short" />
          <div className="skel skel-line" /><div className="skel skel-line short" />
        </div>
      ) : insights ? (
        <div className="ai-structured-body">
          <div className="ai-status-row">
            <span className={`ai-badge ${insights.ai_overall?.toLowerCase()}`}>
              {insights.ai_overall} Sentiment
            </span>
            <div className="ai-conf-wrap">
              <span className="ai-conf-label">Confidence</span>
              <div className="conf-bar">
                <div className="conf-fill" style={{ width: `${conf}%` }} />
              </div>
              <span className="ai-conf-pct">{conf}%</span>
            </div>
          </div>

          <div className="ai-content-blocks">
            <div className="ai-block block-success">
              <label><CheckCircle2 size={14} /> Key Strengths</label>
              <ul>
                {insights.ai_strengths?.map((s, i) => (
                  <Li key={i} delay={i * 0.06}>{s}</Li>
                ))}
              </ul>
            </div>
            <div className="ai-block block-warning">
              <label><AlertCircle size={14} /> Critical Issues</label>
              <ul>
                {insights.ai_improvements?.map((s, i) => (
                  <Li key={i} delay={i * 0.06}>{s}</Li>
                ))}
              </ul>
            </div>
          </div>

          <div className="ai-action-suggestion">
            <label><Lightbulb size={16} /> Recommended Actions</label>
            <div className="suggestion-tags">
              {insights.ai_suggestions?.map((s, i) => (
                <Tag key={i} delay={0.1 + i * 0.06}>{s}</Tag>
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
    </div>
  );
});

export default AICommandPanel;
