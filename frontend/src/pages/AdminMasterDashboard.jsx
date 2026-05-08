import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Trash2,
  ShieldCheck,
  Users,
  LogOut,
  Clock,
  BadgeCheck,
} from 'lucide-react';
import { getCRs, approveCR, rejectCR } from '../api';
import './AdminMasterDashboard.css';

/* ── Particle Canvas ─────────────────────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const particles = [];
    const COUNT = 70;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 0.4,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(139,92,246,${0.1 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(196,181,253,${p.alpha})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);
  return <canvas ref={canvasRef} className="amd-particle-canvas" />;
}

/* ── Status Badge ────────────────────────────────────────────── */
function StatusBadge({ approved }) {
  return approved ? (
    <span className="amd-status amd-status--approved">
      <BadgeCheck size={13} strokeWidth={2.5} />
      Approved
    </span>
  ) : (
    <span className="amd-status amd-status--pending">
      <Clock size={13} strokeWidth={2.5} />
      Pending
    </span>
  );
}

/* ── Main Component ──────────────────────────────────────────── */
export default function AdminMasterDashboard() {
  const navigate = useNavigate();
  const [crs, setCrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null); // which row is processing

  const fetchCRs = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await getCRs();
      setCrs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchCRs(); }, []);

  const handleApprove = async (id) => {
    setActionId(id);
    try {
      await approveCR(id);
      await fetchCRs();
    } catch (err) {
      console.error(err);
      alert('Failed to approve CR. Please check the console or server logs.');
    }
    setActionId(null);
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject / remove this CR?')) return;
    setActionId(id);
    try {
      await rejectCR(id);
      await fetchCRs();
    } catch (err) {
      console.error(err);
      alert('Failed to remove CR. Please check the console or server logs.');
    }
    setActionId(null);
  };

  const handleSignOut = () => {
    sessionStorage.removeItem('admin_auth');
    navigate('/');
  };

  const approvedCount = crs.filter(c => c.is_approved).length;
  const pendingCount = crs.filter(c => !c.is_approved).length;

  /* ── Animation variants ── */
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  };
  const rowVariants = {
    hidden: { opacity: 0, x: -16 },
    visible: (i) => ({
      opacity: 1, x: 0,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 },
    }),
  };

  return (
    <div className="amd-root">
      {/* Background layers */}
      <div className="mesh-bg" />
      <div className="light-blob-static blob-1" />
      <div className="light-blob-static blob-2" />

      {/* Header */}
      <motion.header
        className="amd-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="amd-header-logo">
          <div className="amd-header-badge">
            <ShieldCheck size={18} strokeWidth={2} />
          </div>
          <span className="amd-header-title">FeedbackPulse</span>
          <span className="amd-header-tag">Master Admin</span>
        </div>
        <div className="amd-header-right">
          <div className="amd-user-pill">
            <ShieldCheck size={14} strokeWidth={2} />
            <span>Master Administrator</span>
          </div>
          <motion.button
            className="amd-signout-btn"
            onClick={handleSignOut}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <LogOut size={15} strokeWidth={2} />
            Sign Out
          </motion.button>
        </div>
      </motion.header>

      {/* Main content */}
      <main className="amd-main">
        <motion.div
          className="amd-content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Page heading */}
          <motion.div className="amd-page-head" variants={itemVariants}>
            <div className="amd-page-icon">
              <Users size={22} strokeWidth={2} />
            </div>
            <div>
              <h1 className="amd-page-title">Class Representatives [v2]</h1>
              <p className="amd-page-sub">Approve new CR requests, manage access and remove members.</p>
            </div>
          </motion.div>

          {/* Stats row */}
          <div className="amd-stats">
            <motion.div className="amd-stat-card" variants={itemVariants}>
              <span className="amd-stat-val">{crs.length}</span>
              <span className="amd-stat-label">Total CRs</span>
            </motion.div>
            <motion.div className="amd-stat-card amd-stat-card--approved" variants={itemVariants}>
              <span className="amd-stat-val">{approvedCount}</span>
              <span className="amd-stat-label">Approved</span>
            </motion.div>
            <motion.div className="amd-stat-card amd-stat-card--pending" variants={itemVariants}>
              <span className="amd-stat-val">{pendingCount}</span>
              <span className="amd-stat-label">Pending</span>
            </motion.div>
          </div>

          {/* Table card */}
          <motion.div className="amd-card" variants={itemVariants}>
            {/* Card header */}
            <div className="amd-card-header">
              <span className="amd-card-title">
                <Users size={16} strokeWidth={2} />
                CR Directory
              </span>
              <motion.button
                className="amd-refresh-btn"
                onClick={() => fetchCRs(true)}
                disabled={refreshing}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <motion.span animate={refreshing ? { rotate: 360 } : { rotate: 0 }} transition={{ duration: 0.8, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
                  <RefreshCw size={14} strokeWidth={2.2} />
                </motion.span>
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </motion.button>
            </div>

            {/* Table */}
            <div className="amd-table-wrap">
              <table className="amd-table">
                <thead>
                  <tr>
                    <th>Name / Email</th>
                    <th>Department</th>
                    <th>Year</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="amd-td-center">
                        <div className="amd-loading">
                          <div className="amd-spinner" />
                          <span>Loading CRs…</span>
                        </div>
                      </td>
                    </tr>
                  ) : crs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="amd-td-center">
                        <div className="amd-empty">
                          <Users size={36} strokeWidth={1.5} />
                          <p>No Class Representatives found.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <AnimatePresence>
                      {crs.map((cr, i) => (
                        <motion.tr
                          key={cr.id}
                          className="amd-row"
                          custom={i}
                          variants={rowVariants}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, x: 20, transition: { duration: 0.25 } }}
                          layout
                        >
                          <td>
                            <div className="amd-name">{cr.full_name}</div>
                            <div className="amd-email">{cr.email}</div>
                          </td>
                          <td>
                            <span className="amd-dept-badge">{cr.department}</span>
                          </td>
                          <td>
                            <span className="amd-year">{cr.year} Year</span>
                          </td>
                          <td>
                            <span className="amd-phone">{cr.phone || '—'}</span>
                          </td>
                          <td>
                            <StatusBadge approved={cr.is_approved} />
                          </td>
                          <td>
                            <div className="amd-actions">
                              {!cr.is_approved && (
                                <motion.button
                                  className="amd-action-btn amd-action-btn--approve"
                                  title="Approve"
                                  onClick={() => handleApprove(cr.id)}
                                  disabled={actionId === cr.id}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <CheckCircle size={17} strokeWidth={2} />
                                </motion.button>
                              )}
                              <motion.button
                                className="amd-action-btn amd-action-btn--delete"
                                title={cr.is_approved ? 'Revoke Access' : 'Reject'}
                                onClick={() => handleReject(cr.id)}
                                disabled={actionId === cr.id}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                {cr.is_approved ? <Trash2 size={16} strokeWidth={2} /> : <XCircle size={17} strokeWidth={2} />}
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
