import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';
import { 
  BarChart2, 
  Brain, 
  FileText, 
  FolderTree, 
  ShieldCheck, 
  GraduationCap, 
  Sparkles,
  Clock,
  Check,
  ListTodo,
  Mail,
  MessageSquare,
  CalendarDays,
  LayoutGrid,
  Star,
  BookOpen,
  Library,
  Globe,
  Award,
  Monitor,
  PenTool,
  Lightbulb,
  Camera,
  Heart,
  ChevronRight,
  ArrowRight,
  UserPlus,
  MousePointer2,
  PieChart,
  Zap,
  Lock,
  ThumbsUp
} from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';

/* ─── SVG Cartoon Characters (transparent, inline) ─── */

function SvgWalker() {
  return (
    <svg width="90" height="120" viewBox="0 0 90 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <circle cx="45" cy="18" r="14" fill="#4996E8" stroke="#1e60c7" strokeWidth="2"/>
      {/* Eyes */}
      <circle cx="39" cy="15" r="2.5" fill="white"/>
      <circle cx="51" cy="15" r="2.5" fill="white"/>
      <circle cx="39.5" cy="15.5" r="1.2" fill="#1e60c7"/>
      <circle cx="51.5" cy="15.5" r="1.2" fill="#1e60c7"/>
      {/* Smile */}
      <path d="M40 22 Q45 26 50 22" stroke="#1e60c7" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Body */}
      <rect x="38" y="34" width="14" height="28" rx="5" fill="#4996E8" stroke="#1e60c7" strokeWidth="1.5"/>
      {/* Neck */}
      <rect x="42" y="30" width="6" height="6" rx="2" fill="#4996E8"/>
      {/* Left Arm */}
      <path d="M38 40 Q22 48 20 58" stroke="#4996E8" strokeWidth="7" strokeLinecap="round" fill="none"/>
      {/* Right Arm (swinging) */}
      <path d="M52 40 Q65 44 68 55" stroke="#4996E8" strokeWidth="7" strokeLinecap="round" fill="none"/>
      {/* Left Leg */}
      <path d="M42 62 Q36 80 30 95" stroke="#4996E8" strokeWidth="7" strokeLinecap="round" fill="none"/>
      {/* Right Leg (forward) */}
      <path d="M48 62 Q56 80 60 95" stroke="#4996E8" strokeWidth="7" strokeLinecap="round" fill="none"/>
      {/* Feet */}
      <ellipse cx="30" cy="97" rx="8" ry="4" fill="#1e60c7"/>
      <ellipse cx="60" cy="97" rx="8" ry="4" fill="#1e60c7"/>
    </svg>
  );
}

function SvgMeditator() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <circle cx="50" cy="20" r="16" fill="#4996E8" stroke="#1e60c7" strokeWidth="2"/>
      {/* Eyes closed (meditating) */}
      <path d="M42 18 Q44 16 46 18" stroke="#1e60c7" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M54 18 Q56 16 58 18" stroke="#1e60c7" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Smile */}
      <path d="M44 25 Q50 29 56 25" stroke="#1e60c7" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Body */}
      <path d="M50 38 Q50 55 50 65" stroke="#4996E8" strokeWidth="10" strokeLinecap="round" fill="none"/>
      {/* Cross legs */}
      <path d="M50 65 Q30 68 18 80" stroke="#4996E8" strokeWidth="8" strokeLinecap="round" fill="none"/>
      <path d="M50 65 Q70 68 82 80" stroke="#4996E8" strokeWidth="8" strokeLinecap="round" fill="none"/>
      {/* Feet flat */}
      <ellipse cx="20" cy="82" rx="9" ry="4" fill="#1e60c7"/>
      <ellipse cx="80" cy="82" rx="9" ry="4" fill="#1e60c7"/>
      {/* Arms up in meditation */}
      <path d="M44 44 Q28 38 22 28" stroke="#4996E8" strokeWidth="7" strokeLinecap="round" fill="none"/>
      <path d="M56 44 Q72 38 78 28" stroke="#4996E8" strokeWidth="7" strokeLinecap="round" fill="none"/>
      {/* Hands */}
      <circle cx="22" cy="27" r="5" fill="#4996E8" stroke="#1e60c7" strokeWidth="1.5"/>
      <circle cx="78" cy="27" r="5" fill="#4996E8" stroke="#1e60c7" strokeWidth="1.5"/>
    </svg>
  );
}

function SvgClimber() {
  return (
    <svg width="90" height="140" viewBox="0 0 90 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ladder */}
      <rect x="50" y="0" width="5" height="140" rx="2.5" fill="#93c5fd"/>
      <rect x="70" y="0" width="5" height="140" rx="2.5" fill="#93c5fd"/>
      <rect x="50" y="20" width="25" height="4" rx="2" fill="#60a5fa"/>
      <rect x="50" y="45" width="25" height="4" rx="2" fill="#60a5fa"/>
      <rect x="50" y="70" width="25" height="4" rx="2" fill="#60a5fa"/>
      <rect x="50" y="95" width="25" height="4" rx="2" fill="#60a5fa"/>
      <rect x="50" y="120" width="25" height="4" rx="2" fill="#60a5fa"/>
      {/* Head */}
      <circle cx="30" cy="28" r="14" fill="#F5A623" stroke="#d48600" strokeWidth="2"/>
      {/* Eyes */}
      <circle cx="25" cy="25" r="2" fill="white"/>
      <circle cx="35" cy="25" r="2" fill="white"/>
      <circle cx="25.5" cy="25.5" r="1" fill="#d48600"/>
      <circle cx="35.5" cy="25.5" r="1" fill="#d48600"/>
      {/* Smile */}
      <path d="M26 33 Q30 37 34 33" stroke="#d48600" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Body */}
      <rect x="22" y="44" width="16" height="28" rx="5" fill="#F5A623" stroke="#d48600" strokeWidth="1.5"/>
      {/* Neck */}
      <rect x="26" y="40" width="8" height="6" rx="2" fill="#F5A623"/>
      {/* Right arm grabbing ladder */}
      <path d="M38 50 Q52 48 55 47" stroke="#F5A623" strokeWidth="7" strokeLinecap="round" fill="none"/>
      {/* Left arm down */}
      <path d="M22 54 Q10 56 8 62" stroke="#F5A623" strokeWidth="7" strokeLinecap="round" fill="none"/>
      {/* Left leg bent */}
      <path d="M28 72 Q24 90 22 105" stroke="#F5A623" strokeWidth="7" strokeLinecap="round" fill="none"/>
      {/* Right leg on rung */}
      <path d="M34 72 Q44 80 53 82" stroke="#F5A623" strokeWidth="7" strokeLinecap="round" fill="none"/>
      {/* Feet */}
      <ellipse cx="22" cy="107" rx="8" ry="4" fill="#d48600"/>
    </svg>
  );
}

function SvgArtist() {
  return (
    <svg width="100" height="140" viewBox="0 0 100 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Giant Pencil */}
      <rect x="68" y="5" width="18" height="110" rx="4" fill="#fde68a" stroke="#f59e0b" strokeWidth="2"/>
      <polygon points="68,115 86,115 77,135" fill="#f59e0b" stroke="#d97706" strokeWidth="1"/>
      <rect x="68" y="5" width="18" height="14" rx="4" fill="#fca5a5"/>
      <line x1="68" y1="20" x2="86" y2="20" stroke="#d97706" strokeWidth="2"/>
      {/* Head */}
      <circle cx="35" cy="22" r="15" fill="#4996E8" stroke="#1e60c7" strokeWidth="2"/>
      {/* Eyes */}
      <circle cx="30" cy="19" r="2.5" fill="white"/>
      <circle cx="40" cy="19" r="2.5" fill="white"/>
      <circle cx="30.5" cy="19.5" r="1.2" fill="#1e60c7"/>
      <circle cx="40.5" cy="19.5" r="1.2" fill="#1e60c7"/>
      {/* Excited smile */}
      <path d="M29 28 Q35 33 41 28" stroke="#1e60c7" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Body */}
      <rect x="27" y="39" width="16" height="30" rx="5" fill="#4996E8" stroke="#1e60c7" strokeWidth="1.5"/>
      {/* Neck */}
      <rect x="31" y="35" width="8" height="6" rx="2" fill="#4996E8"/>
      {/* Right arm holding pencil high */}
      <path d="M43 45 Q58 30 68 18" stroke="#4996E8" strokeWidth="7" strokeLinecap="round" fill="none"/>
      {/* Left arm out */}
      <path d="M27 45 Q14 42 10 50" stroke="#4996E8" strokeWidth="7" strokeLinecap="round" fill="none"/>
      {/* Left Leg */}
      <path d="M32 69 Q26 92 22 110" stroke="#4996E8" strokeWidth="7" strokeLinecap="round" fill="none"/>
      {/* Right Leg */}
      <path d="M38 69 Q44 92 48 110" stroke="#4996E8" strokeWidth="7" strokeLinecap="round" fill="none"/>
      {/* Feet */}
      <ellipse cx="22" cy="112" rx="8" ry="4" fill="#1e60c7"/>
      <ellipse cx="48" cy="112" rx="8" ry="4" fill="#1e60c7"/>
    </svg>
  );
}

function SvgSitter() {
  return (
    <svg width="90" height="80" viewBox="0 0 90 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <circle cx="30" cy="15" r="13" fill="#F5A623" stroke="#d48600" strokeWidth="2"/>
      {/* Eyes */}
      <circle cx="25" cy="12" r="2" fill="white"/>
      <circle cx="35" cy="12" r="2" fill="white"/>
      <circle cx="25.5" cy="12.5" r="1" fill="#d48600"/>
      <circle cx="35.5" cy="12.5" r="1" fill="#d48600"/>
      {/* Smile */}
      <path d="M25 20 Q30 24 35 20" stroke="#d48600" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Neck */}
      <rect x="26" y="27" width="8" height="5" rx="2" fill="#F5A623"/>
      {/* Body */}
      <rect x="20" y="32" width="20" height="22" rx="5" fill="#F5A623" stroke="#d48600" strokeWidth="1.5"/>
      {/* Left arm leaning */}
      <path d="M20 38 Q8 42 5 50" stroke="#F5A623" strokeWidth="7" strokeLinecap="round" fill="none"/>
      {/* Right arm out */}
      <path d="M40 38 Q54 36 58 30" stroke="#F5A623" strokeWidth="7" strokeLinecap="round" fill="none"/>
      {/* Legs (sitting) */}
      <path d="M24 54 Q22 65 15 72" stroke="#F5A623" strokeWidth="7" strokeLinecap="round" fill="none"/>
      <path d="M36 54 Q55 58 72 56" stroke="#F5A623" strokeWidth="7" strokeLinecap="round" fill="none"/>
      {/* Feet */}
      <ellipse cx="14" cy="74" rx="7" ry="4" fill="#d48600"/>
      <ellipse cx="72" cy="58" rx="7" ry="4" fill="#d48600"/>
    </svg>
  );
}

const whyFeatures = [
  { 
    icon: <ShieldCheck size={28} />, 
    title: 'Anonymous Feedback', 
    desc: 'Students share honest opinions without hesitation, ensuring complete privacy and safety.', 
    color: '#7c3aed' 
  },
  { 
    icon: <Zap size={28} />, 
    title: 'Real-time Insights', 
    desc: 'Instantly visualize class performance and staff scores as soon as feedback is submitted.', 
    color: '#06b6d4' 
  },
  { 
    icon: <Brain size={28} />, 
    title: 'AI Analysis', 
    desc: 'Our advanced NLP models categorize sentiment and identify key teaching trends automatically.', 
    color: '#10b981' 
  },
  { 
    icon: <MousePointer2 size={28} />, 
    title: 'Easy to Use', 
    desc: 'Simple, mobile-first interface designed for both busy students and administrators.', 
    color: '#f59e0b' 
  },
];

const roadmapSteps = [
  { id: 1, icon: <UserPlus />, title: 'Login', desc: 'Securely authenticate via your institution portal to access the workspace.' },
  { id: 2, icon: <Library />, title: 'Select Subject', desc: 'Pick the subject and faculty member you want to share feedback on.' },
  { id: 3, icon: <MessageSquare />, title: 'Submit Feedback', desc: 'Answer a few short questions anonymously to share your perspective.' },
  { id: 4, icon: <PieChart />, title: 'View Insights', desc: 'Administrators get detailed AI-powered reports of the feedback patterns.' },
];

const stats = [
  { value: '10k+', label: 'Feedbacks Collected' },
  { value: '500+', label: 'Active CRs' },
  { value: '98%', label: 'Satisfaction Rate' },
  { value: '50+', label: 'Institutions' },
];


export default function Landing({ theme, toggleTheme }) {
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-animate').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-root">
      {/* ── NAV ── */}
      <nav className="landing-nav">
        <span className="landing-logo">FeedbackPulse</span>
        <div className="nav-actions">
          <button className="nav-btn outline" onClick={() => navigate('/admin-login')}>Admin</button>
          <button className="nav-btn primary" onClick={() => navigate('/auth')}>Get Started →</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero-section">
        {/* Background faint education icons */}
        <div className="bg-edu-icons">
          <GraduationCap className="edu-icon edu-1" size={180} strokeWidth={1} />
          <BookOpen className="edu-icon edu-2" size={150} strokeWidth={1} />
          <Library className="edu-icon edu-3" size={200} strokeWidth={1} />
          <Globe className="edu-icon edu-4" size={160} strokeWidth={1} />
          <Award className="edu-icon edu-5" size={140} strokeWidth={1} />
          <FileText className="edu-icon edu-6" size={130} strokeWidth={1} />
          <Monitor className="edu-icon edu-7" size={170} strokeWidth={1} />
          <PenTool className="edu-icon edu-8" size={120} strokeWidth={1} />
        </div>

        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />

        <div className="floating-cards">
          {/* Center Top */}
          <div className="float-card fc-center-top">
            <LayoutGrid size={32} className="fc-icon-primary" />
          </div>

          {/* Top Left */}
          <div className="float-card fc-top-left fc-sticky">
            <p>Capture student voices to improve academics securely.</p>
            <div className="fc-check-badge">
              <Check size={20} color="white" />
            </div>
          </div>

          {/* Top Right */}
          <div className="float-card fc-top-right">
            <div className="fc-header">Reminders</div>
            <div className="fc-body">
              <div className="fc-row"><Clock size={14}/> Feedback Deadline</div>
              <div className="fc-row small blue">Tomorrow, 11:59 PM</div>
            </div>
          </div>

          {/* Bottom Left */}
          <div className="float-card fc-bottom-left">
            <div className="fc-header">Live Tasks</div>
            <div className="fc-task">
              <span>CS 101 Feedback</span>
              <div className="fc-progress"><div className="fc-progress-bar" style={{width: '60%', backgroundColor: '#06b6d4' }}></div></div>
            </div>
            <div className="fc-task">
              <span>Math 202 Feedback</span>
              <div className="fc-progress"><div className="fc-progress-bar" style={{width: '85%', backgroundColor: '#7c3aed' }}></div></div>
            </div>
          </div>

          {/* Bottom Right */}
          <div className="float-card fc-bottom-right">
            <div className="fc-header">100+ Integrations</div>
            <div className="fc-icons-row">
              <div className="fc-icon-box"><Mail size={20} color="#ea4335" /></div>
              <div className="fc-icon-box"><MessageSquare size={20} color="#4a154b" /></div>
              <div className="fc-icon-box"><CalendarDays size={20} color="#34a853" /></div>
            </div>
          </div>
        </div>

        <div className="hero-center-content">
          <div className="dynamic-feedback-title">
            <h1 className="feedback-word">FEEDBACK</h1>

            {/* Animated SVG Cartoon Characters */}
            <div className="cartoon-char character-walker">
              <SvgWalker />
            </div>
            <div className="cartoon-char character-meditator">
              <SvgMeditator />
            </div>
            <div className="cartoon-char character-sitter">
              <SvgSitter />
            </div>
            <div className="cartoon-char character-climber">
              <SvgClimber />
            </div>
            <div className="cartoon-char character-artist">
              <SvgArtist />
            </div>

            {/* Decorative Floating Elements */}
            <div className="floating-deco deco-a-plus">A+</div>
            <div className="floating-deco deco-heart">
              <Heart size={18} fill="#ef4444" color="#ef4444" />
            </div>
            <div className="floating-deco deco-lightbulb">
              <Lightbulb size={22} color="#f59e0b" fill="#fef3c7" />
            </div>
            <div className="floating-deco deco-star">
              <Star size={18} fill="#7c3aed" color="#7c3aed" />
            </div>
          </div>

          <div className="hero-subtitle-container">
            <span className="hero-gradient-text">Built for Students</span>
          </div>
          <p className="hero-sub">
            Collect, analyze, and act on student feedback — powered by AI sentiment analysis,<br />
            real-time dashboards, and beautiful PDF reports.
          </p>
          <div className="hero-cta">
            <button className="cta-primary" onClick={() => navigate('/auth')}>
              Get Start <span>→</span>
            </button>
            <button className="cta-secondary" onClick={() => navigate('/cr-login')}>
              CR Login
            </button>
          </div>
        </div>

        {/* Mini stat chips */}
        <div className="hero-chips">
          {stats.map(s => (
            <div key={s.label} className="hero-chip">
              <strong>{s.value}</strong> {s.label}
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 1: WHY THIS PLATFORM? ── */}
      <section className="lp-section why-section">
        <div className="lp-container">
          <motion.div 
            className="lp-header"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="lp-label">Value Proposition</span>
            <h2 className="lp-title">Why FeedbackPulse?</h2>
            <p className="lp-desc">The ultimate bridge between students and academic excellence.</p>
          </motion.div>

          <div className="why-grid">
            {whyFeatures.map((f, i) => (
              <motion.div 
                key={i} 
                className="why-card"
                initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                whileHover={{ y: -10, boxShadow: '0 20px 40px var(--glass-shadow-dark)' }}
              >
                <div className="why-icon" style={{ background: `${f.color}15`, color: f.color }}>{f.icon}</div>
                <h3 className="why-card-title">{f.title}</h3>
                <p className="why-card-desc">{f.desc}</p>
                <div className="why-card-glow" style={{ background: f.color }} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 2: HOW IT WORKS ── */}
      <section className="lp-section how-roadmap-section">
        <div className="lp-container">
          <motion.div 
            className="lp-header"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="lp-label">Workflow</span>
            <h2 className="lp-title">Seamless 4-Step Process</h2>
          </motion.div>

          <div className="roadmap-container">
            <div className="roadmap-line" />
            <div className="roadmap-steps">
              {roadmapSteps.map((s, i) => (
                <motion.div 
                  key={s.id} 
                  className="roadmap-step"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                >
                  <div className="roadmap-node">
                    <div className="node-outer">
                      <div className="node-inner">{s.icon}</div>
                    </div>
                  </div>
                  <div className="roadmap-content">
                    <h3 className="roadmap-step-title">{s.title}</h3>
                    <p className="roadmap-step-desc">{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* ── SECTION 3: KEY FEATURES ── */}
      <section className="kf-section">
        <div className="lp-container">
          <div className="kf-item">
            <motion.div 
              className="kf-text"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <span className="kf-tag">Analytics</span>
              <h2 className="kf-title">Deep Insights into Class Performance</h2>
              <p className="kf-desc">Our AI-driven dashboard doesn't just show numbers; it tells you exactly where the friction points are in your department.</p>
              <ul className="kf-points">
                <li className="kf-point"><div className="kf-point-check"><Check size={14} /></div> Weekly Sentiment Trends</li>
                <li className="kf-point"><div className="kf-point-check"><Check size={14} /></div> Faculty Performance Matrix</li>
                <li className="kf-point"><div className="kf-point-check"><Check size={14} /></div> Automated PDF Reporting</li>
              </ul>
            </motion.div>
            <motion.div 
              className="kf-visual"
              initial={{ opacity: 0, x: 50, rotate: 5 }}
              whileInView={{ opacity: 1, x: 0, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="kf-mockup-frame">
                <div className="kf-mockup-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', padding: '2rem' }}>
                  <BarChart2 size={120} color="var(--primary)" strokeWidth={1} />
                </div>
              </div>
            </motion.div>
          </div>

          <div className="kf-item reverse">
            <motion.div 
              className="kf-text"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <span className="kf-tag">Privacy</span>
              <h2 className="kf-title">Students Speak Without Fear</h2>
              <p className="kf-desc">Honesty is the key to improvement. We ensure every single feedback entry is untraceable, encouraging students to be 100% candid.</p>
              <ul className="kf-points">
                <li className="kf-point"><div className="kf-point-check"><Check size={14} /></div> Zero-Log Authentication</li>
                <li className="kf-point"><div className="kf-point-check"><Check size={14} /></div> Encrypted Data Streams</li>
                <li className="kf-point"><div className="kf-point-check"><Check size={14} /></div> Trust-Centered Design</li>
              </ul>
            </motion.div>
            <motion.div 
              className="kf-visual"
              initial={{ opacity: 0, x: -50, rotate: -5 }}
              whileInView={{ opacity: 1, x: 0, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="kf-mockup-frame">
                <div className="kf-mockup-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', padding: '2.5rem' }}>
                  <Lock size={120} color="var(--accent)" strokeWidth={1} />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: INTERACTIVE DEMO ── */}
      <section className="lp-section demo-section">
        <div className="lp-container">
          <motion.div 
            className="lp-header"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="lp-label">Experience</span>
            <h2 className="lp-title">Live Preview</h2>
            <p className="lp-desc">Interact with our sleek, intuitive components right now.</p>
          </motion.div>

          <div className="demo-grid">
            {/* Mock Feedback Form */}
            <motion.div 
              className="demo-card"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="demo-card-title"><PenTool size={20} /> Student Feedback</h3>
              <div className="mini-feedback-form">
                <div className="mf-input-group">
                  <label className="mf-label">Select Faculty</label>
                  <div className="mf-input">Dr. Sarah Jenkins (OS)</div>
                </div>
                <div className="mf-input-group">
                  <label className="mf-label">Rating</label>
                  <div className="mf-rating">
                    {[1,2,3,4,5].map(v => <Star key={v} size={20} className={`mf-star ${v <= 4 ? 'active' : ''}`} fill={v <= 4 ? "#f59e0b" : "none"} />)}
                  </div>
                </div>
                <div className="mf-input-group">
                  <label className="mf-label">Comments</label>
                  <div className="mf-input" style={{ height: '60px' }}>Excellent teaching methodology...</div>
                </div>
                <button className="mf-submit">Submit Anonymously</button>
              </div>
            </motion.div>

            {/* Mock Dashboard Preview */}
            <motion.div 
              className="demo-card"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="demo-card-title"><LayoutGrid size={20} /> CR Analytics</h3>
              <div className="mini-dash">
                <div className="md-stat-rows">
                  <div className="md-stat-box">
                    <div className="md-stat-val">1.2k</div>
                    <div className="md-stat-label">Feedbacks</div>
                  </div>
                  <div className="md-stat-box">
                    <div className="md-stat-val">4.8</div>
                    <div className="md-stat-label">Avg Rating</div>
                  </div>
                </div>
                <div className="md-chart-sim">
                  <div className="md-chart-bar" style={{ height: '60%' }} />
                  <div className="md-chart-bar" style={{ height: '100%', background: 'var(--primary)' }} />
                  <div className="md-chart-bar" style={{ height: '80%', background: 'var(--accent)' }} />
                  <div className="md-chart-bar" style={{ height: '40%' }} />
                </div>
                <button className="mf-submit" style={{ background: 'var(--bg-elevated)', color: 'var(--primary)', border: '1px solid var(--glass-border)' }}>View Full Report</button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: TRUST & BENEFITS ── */}
      <section className="lp-section trust-section">
        <div className="lp-container">
          <div className="trust-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem' }}>
            <motion.div 
              className="trust-item" style={{ textAlign: 'center' }}
              whileHover={{ scale: 1.05 }}
            >
              <div style={{ color: 'var(--primary)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}><ShieldCheck size={48} /></div>
              <h3 style={{ marginBottom: '1rem', fontWeight: 800 }}>Secure & Anonymous</h3>
              <p style={{ color: 'var(--text-sub)' }}>End-to-end encryption ensures that your identity remains a secret forever.</p>
            </motion.div>
            <motion.div 
              className="trust-item" style={{ textAlign: 'center' }}
              whileHover={{ scale: 1.05 }}
            >
              <div style={{ color: 'var(--accent)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}><Zap size={48} /></div>
              <h3 style={{ marginBottom: '1rem', fontWeight: 800 }}>Fast & Simple</h3>
              <p style={{ color: 'var(--text-sub)' }}>The quickest way to collect feedback. No complex setup, no training needed.</p>
            </motion.div>
            <motion.div 
              className="trust-item" style={{ textAlign: 'center' }}
              whileHover={{ scale: 1.05 }}
            >
              <div style={{ color: 'var(--success)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}><PieChart size={48} /></div>
              <h3 style={{ marginBottom: '1rem', fontWeight: 800 }}>Data-Driven Insights</h3>
              <p style={{ color: 'var(--text-sub)' }}>Turn feedback into actionable data points to drive real departmental change.</p>
            </motion.div>
          </div>
        </div>
      </section>


      {/* ── SECTION 6: CTA ── */}
      <section className="lp-section final-cta-section" style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--glass-border)' }}>
        <div className="lp-container" style={{ textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
             <h2 className="lp-title" style={{ marginBottom: '2rem' }}>Start Sharing Your <span className="gradient-text">Feedback</span> Today</h2>
             <motion.button 
               className="cta-primary large"
               whileHover={{ scale: 1.05, gap: '1rem' }}
               whileTap={{ scale: 0.95 }}
               onClick={() => navigate('/auth')}
             >
               Start Your Journey <ArrowRight size={20} />
             </motion.button>
             <p style={{ marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Join 500+ CRs already transforming their colleges.</p>
          </motion.div>
        </div>
      </section>


      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <span className="landing-logo">FeedbackPulse</span>
        <p>Built for students, by students. © 2025</p>
        {/* We can remove the footer links completely since we removed top nav links earlier. Or keep it empty? User only asked to remove cr login. We removed 'Features' and 'How it works' from top but let's just remove CR login here. */}
        <div className="footer-links">
        </div>
      </footer>
    </div>
  );
}
