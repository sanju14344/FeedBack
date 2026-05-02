import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  BookOpen,
  ChevronDown,
  Check,
} from 'lucide-react';
import { crLogin, crSignup } from '../api';
import './Login.css';

/* ── Admin Credentials (change these to your real values) ── */
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password';

const YEAR_OPTIONS = [
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
];

/* ── Custom Year Dropdown (Portal) ───────────────────────────── */
function YearDropdown({ value, onChange, hasError = false }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);            // ← tracks portal <ul>
  const selected = YEAR_OPTIONS.find((o) => o.value === value);

  // Compute menu position from trigger bounding rect
  const openMenu = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setOpen(true);
  };

  const toggleMenu = () => {
    if (open) {
      setOpen(false);
    } else {
      openMenu();
    }
  };

  // Close on outside click — but NOT when clicking inside the portal menu
  useEffect(() => {
    const handler = (e) => {
      const inWrap = wrapRef.current && wrapRef.current.contains(e.target);
      const inMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!inWrap && !inMenu) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Recompute position on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setMenuPos({
          top: rect.bottom + window.scrollY + 6,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  const menuPortal = (
    <AnimatePresence>
      {open && (
        <motion.ul
          ref={menuRef}                    // ← attach menuRef here
          className="yr-menu yr-menu--portal"
          role="listbox"
          aria-label="Select year"
          style={{
            position: 'absolute',
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
          }}
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {YEAR_OPTIONS.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={value === opt.value}
              className={`yr-option ${value === opt.value ? 'yr-option--selected' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              <span>{opt.label}</span>
              {value === opt.value && <Check size={14} strokeWidth={2.5} className="yr-check" />}
            </li>
          ))}
        </motion.ul>
      )}
    </AnimatePresence>
  );

  return (
    <div
      className={`yr-wrap ${open ? 'yr-open' : ''} ${value ? 'yr-has-value' : ''} ${hasError ? 'yr-wrap--error' : ''}`}
      ref={wrapRef}
    >
      <button
        type="button"
        id="field-year"
        className="yr-trigger"
        ref={triggerRef}
        onClick={toggleMenu}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`yr-trigger-text ${!selected ? 'yr-placeholder' : ''}`}>
          {selected ? selected.label : ''}
        </span>
        <motion.span
          className="yr-chevron"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.22 }}
        >
          <ChevronDown size={15} strokeWidth={2.5} />
        </motion.span>
      </button>

      <label htmlFor="field-year" className="yr-label">Year</label>

      {/* Portal — renders OUTSIDE any overflow:hidden ancestor */}
      {ReactDOM.createPortal(menuPortal, document.body)}
    </div>
  );
}

/* ── Canvas Particle Background ─────────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animId;
    const particles = [];
    const COUNT = 80;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Spawn particles
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2.2 + 0.4,
        dx: (Math.random() - 0.5) * 0.35,
        dy: (Math.random() - 0.5) * 0.35,
        alpha: Math.random() * 0.55 + 0.15,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(139,92,246,${0.12 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw dots
      for (const p of particles) {
        ctx.beginPath();
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        grad.addColorStop(0, `rgba(167,139,250,${p.alpha})`);
        grad.addColorStop(1, `rgba(99,102,241,0)`);
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

  return <canvas ref={canvasRef} className="particle-canvas" />;
}

/* ── Floating Orbs ───────────────────────────────────────────── */
function FloatingOrbs() {
  return (
    <div className="orbs-container" aria-hidden="true">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
    </div>
  );
}

/* ── Main Login Component ────────────────────────────────────── */
export default function Login({ role = 'CR' }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('signin'); // 'signin' | 'request'
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const isLogin = activeTab === 'signin';

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccessMsg('');
    setFieldErrors({});
  };

  /* Validate Request Access form — returns error message or null */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateSignup = () => {
    const missing = [];
    const errs = {};

    if (!fullName.trim()) { missing.push('Full Name'); errs.fullName = true; }
    if (!department.trim()) { missing.push('Department'); errs.department = true; }
    if (!year) { missing.push('Year'); errs.year = true; }
    if (!email.trim()) { missing.push('Email'); errs.email = true; }
    else if (!EMAIL_RE.test(email.trim())) {
      missing.push('a valid Email address (e.g. you@domain.com)');
      errs.email = true;
    }
    if (password.length < 6) {
      missing.push('Password (min 6 characters)');
      errs.password = true;
    }

    setFieldErrors(errs);

    if (missing.length === 0) return null;
    if (missing.length === 1) return `Please enter ${missing[0]}.`;
    const last = missing.pop();
    return `Please fill in: ${missing.join(', ')} and ${last}.`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    /* ── Admin credential validation ── */
    if (role === 'Admin') {
      if (!email.trim() || !password) {
        setError('Both email and password are required.');
        setFieldErrors({ email: !email.trim(), password: !password });
        return;
      }
      // Exact-match check against stored admin credentials
      if (
        email.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase() ||
        password !== ADMIN_PASSWORD
      ) {
        setError('Invalid administrator credentials. Access denied.');
        setFieldErrors({ email: true, password: true });
        return;
      }
    }

    /* ── CR signup validation ── */
    if (!isLogin && role === 'CR') {
      const validationError = validateSignup();
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setLoading(true);

    try {
      if (role === 'Admin') {
        // Credentials already verified above — simulate network delay then enter
        await new Promise((r) => setTimeout(r, 750));
        sessionStorage.setItem('admin_auth', 'true');
        navigate('/admin-master');
        return;
      }
      if (isLogin) {
        const res = await crLogin({ email, password });
        sessionStorage.setItem('cr_uid', res.data.uid);
        navigate('/dashboard');
      } else {
        const res = await crSignup({
          email,
          password,
          full_name: fullName,
          department,
          year,
        });
        setSuccessMsg(res.data.message || 'Access request submitted successfully!');
        setFieldErrors({});
        setActiveTab('signin');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* Label active state helper */
  const isActive = (val) => val.length > 0;


  return (
    <div className={`cr-login-root${role === 'Admin' ? ' cr-login-root--admin' : ''}`}>
      {/* Layered Background */}
      <div className="cr-bg-gradient" />
      <FloatingOrbs />
      <ParticleCanvas />

      {/* Centered Card */}
      <div className="cr-center-stage">
        <motion.div
          className="cr-card-wrapper"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Back button */}
          <motion.button
            className="cr-back-btn"
            onClick={() => navigate(-1)}
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Go back"
          >
            ← Back
          </motion.button>

          {/* Glass Card */}
          <div className="cr-glass-card">
            {/* Header */}
            <div className="cr-card-header">
              <motion.div
                className="cr-logo-badge"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
              >
                {role === 'Admin'
                  ? <ShieldCheck size={28} strokeWidth={2} />
                  : <GraduationCap size={28} strokeWidth={2} />}
              </motion.div>

              <motion.h1
                className="cr-title"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                {role === 'CR' ? 'Class Representative' : 'Master Administrator'}
              </motion.h1>

              <motion.p
                className="cr-subtitle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                {role === 'CR'
                  ? isLogin
                    ? 'Sign in to access your CR dashboard.'
                    : 'Submit a request to join the feedback network.'
                  : 'High-level system administration portal.'}
              </motion.p>
            </div>

            {/* Tab Switcher (CR only) */}
            {role === 'CR' && (
              <div className="cr-tab-rail" role="tablist" aria-label="Authentication mode">
                <motion.div
                  className="cr-tab-pill"
                  animate={{ x: activeTab === 'signin' ? 0 : '100%' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
                <button
                  role="tab"
                  aria-selected={activeTab === 'signin'}
                  className={`cr-tab-btn ${activeTab === 'signin' ? 'cr-tab-active' : ''}`}
                  onClick={() => handleTabChange('signin')}
                  id="tab-signin"
                >
                  Sign In
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === 'request'}
                  className={`cr-tab-btn ${activeTab === 'request' ? 'cr-tab-active' : ''}`}
                  onClick={() => handleTabChange('request')}
                  id="tab-request"
                >
                  Request Access
                </button>
              </div>
            )}

            {/* Form */}
            <motion.form
              className="cr-form"
              onSubmit={handleSubmit}
              noValidate
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.09, delayChildren: 0.35 } },
              }}
            >
              <AnimatePresence mode="wait">
                {!isLogin && role === 'CR' && (
                  <motion.div
                    key="request-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className="cr-extra-fields"
                  >
                    {/* Full Name */}
                    <div className={`cr-field ${focusedField === 'name' ? 'focused' : ''} ${isActive(fullName) ? 'has-value' : ''} ${fieldErrors.fullName ? 'field-error' : ''}`}>
                      <User className="cr-field-icon" size={17} />
                      <input
                        id="field-fullname"
                        type="text"
                        className="cr-input"
                        required
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => { setFullName(e.target.value); setFieldErrors((p) => ({ ...p, fullName: false })); }}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                      />
                      <label htmlFor="field-fullname" className="cr-float-label">Full Name</label>
                    </div>

                    {/* Department + Year */}
                    <div className="cr-row">
                      <div className={`cr-field ${focusedField === 'dept' ? 'focused' : ''} ${isActive(department) ? 'has-value' : ''} ${fieldErrors.department ? 'field-error' : ''}`}>
                        <BookOpen className="cr-field-icon" size={17} />
                        <input
                          id="field-dept"
                          type="text"
                          className="cr-input"
                          required
                          placeholder=" "
                          value={department}
                          onChange={(e) => { setDepartment(e.target.value); setFieldErrors((p) => ({ ...p, department: false })); }}
                          onFocus={() => setFocusedField('dept')}
                          onBlur={() => setFocusedField(null)}
                        />
                        <label htmlFor="field-dept" className="cr-float-label">Department</label>
                      </div>

                      <YearDropdown
                        value={year}
                        onChange={(v) => { setYear(v); setFieldErrors((p) => ({ ...p, year: false })); }}
                        hasError={fieldErrors.year}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }}>
                <div className={`cr-field ${focusedField === 'email' ? 'focused' : ''} ${isActive(email) ? 'has-value' : ''} ${fieldErrors.email ? 'field-error' : ''}`}>
                  <Mail className="cr-field-icon" size={17} />
                  <input
                    id="field-email"
                    type="email"
                    className="cr-input"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: false })); }}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <label htmlFor="field-email" className="cr-float-label">Email Address</label>
                </div>
              </motion.div>

              {/* Password */}
              <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }}>
                <div className={`cr-field ${focusedField === 'pass' ? 'focused' : ''} ${isActive(password) ? 'has-value' : ''} ${fieldErrors.password ? 'field-error' : ''}`}>
                  <Lock className="cr-field-icon" size={17} />
                  <input
                    id="field-password"
                    type={showPassword ? 'text' : 'password'}
                    className="cr-input"
                    required
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    minLength={6}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: false })); }}
                    onFocus={() => setFocusedField('pass')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <label htmlFor="field-password" className="cr-float-label">Password</label>
                  <button
                    type="button"
                    className="cr-pass-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </motion.div>

              {/* Error / Success */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    key="err"
                    className="cr-alert cr-alert--error"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    role="alert"
                  >
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </motion.div>
                )}
                {successMsg && (
                  <motion.div
                    key="ok"
                    className="cr-alert cr-alert--success"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    role="status"
                  >
                    <CheckCircle2 size={15} />
                    <span>{successMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.button
                type="submit"
                id="btn-submit"
                className="cr-submit-btn"
                disabled={loading}
                whileHover={!loading ? { scale: 1.035 } : {}}
                whileTap={!loading ? { scale: 0.97 } : {}}
              >
                {loading ? (
                  <span className="cr-spinner" aria-label="Loading" />
                ) : (
                  <>
                    <ShieldCheck size={18} strokeWidth={2.2} />
                    <span>{isLogin ? 'Secure Sign In' : 'Submit Request'}</span>
                  </>
                )}
              </motion.button>

              {isLogin && role === 'CR' && (
                <p className="cr-footer-hint">
                  Don't have access?{' '}
                  <button
                    type="button"
                    className="cr-link-btn"
                    onClick={() => handleTabChange('request')}
                  >
                    Request it here
                  </button>
                </p>
              )}
            </motion.form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
