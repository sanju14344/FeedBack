import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import GlassCard from './GlassCard';

/* ─── helpers (duplicated here so this component is self-contained) ─── */
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

const tooltipStyle = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--glass-border)',
  borderRadius: '8px',
  fontSize: '12px',
};

const axisTickStyle = { fill: 'var(--text-muted)', fontSize: 10 };

/**
 * TrendsChart — extracted heavy Recharts block.
 * Lazy-loaded via React.lazy in Dashboard.jsx.
 */
const TrendsChart = React.memo(function TrendsChart({ trendToggle, setTrendToggle, feedback, isMobile }) {
  // On mobile: cap at 5 data points to keep chart lighter
  const limit = isMobile ? 5 : 7;
  const animOn = !isMobile;

  const sentimentData = getSentimentTrend(feedback).slice(-limit);
  const feedbackData  = getTrendData(feedback).slice(-limit);
  const satData       = getSatisfactionTrend(feedback).slice(-limit);

  return (
    <GlassCard className="trends-panel">
      <div className="panel-header">
        <h3><TrendingUp size={20} /> Trend Analysis</h3>
        <div className="trend-toggle-group">
          {['sentiment', 'feedback', 'satisfaction'].map(t => (
            <button
              key={t}
              className={`trend-toggle-btn ${trendToggle === t ? 'active' : ''}`}
              onClick={() => setTrendToggle(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
          {trendToggle === 'sentiment' ? (
            <AreaChart data={sentimentData}>
              <defs>
                <linearGradient id="tcColorPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--success)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="tcColorNeg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--error)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--error)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTickStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area isAnimationActive={animOn} type="monotone" dataKey="pos" name="Positive" stroke="var(--success)" fillOpacity={1} fill="url(#tcColorPos)" strokeWidth={2} />
              <Area isAnimationActive={animOn} type="monotone" dataKey="neg" name="Negative" stroke="var(--error)"   fillOpacity={1} fill="url(#tcColorNeg)" strokeWidth={2} />
            </AreaChart>
          ) : trendToggle === 'feedback' ? (
            <AreaChart data={feedbackData}>
              <defs>
                <linearGradient id="tcColorFb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTickStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area isAnimationActive={animOn} type="monotone" dataKey="value" name="Feedback Count" stroke="var(--primary)" fillOpacity={1} fill="url(#tcColorFb)" strokeWidth={2} />
            </AreaChart>
          ) : (
            <AreaChart data={satData}>
              <defs>
                <linearGradient id="tcColorSat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTickStyle} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v}%`, 'Satisfaction']} />
              <Area isAnimationActive={animOn} type="monotone" dataKey="value" name="Satisfaction %" stroke="var(--accent)" fillOpacity={1} fill="url(#tcColorSat)" strokeWidth={2} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
});

export default TrendsChart;
