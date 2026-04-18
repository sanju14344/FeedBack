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
  Heart
} from 'lucide-react';

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

const features = [
  { icon: <BarChart2 size={24} />, title: 'Real-Time Analytics', desc: 'Instantly visualize feedback trends and class performance over time.', color: '#7c3aed' },
  { icon: <Brain size={24} />, title: 'AI Sentiment Analysis', desc: 'Automatically classify student sentiment — positive, neutral, or negative.', color: '#06b6d4' },
  { icon: <FileText size={24} />, title: 'PDF Reports', desc: 'Export beautifully formatted analytical reports with a single click.', color: '#10b981' },
  { icon: <FolderTree size={24} />, title: 'Class Directory', desc: 'Manage your subjects, staff, and assignments in a clean hierarchy.', color: '#f59e0b' },
  { icon: <ShieldCheck size={24} />, title: 'Anonymous Feedback', desc: 'Students submit honest feedback without fear — privacy first.', color: '#ef4444' },
  { icon: <GraduationCap size={24} />, title: 'Multi-Year Support', desc: 'Works across all years and departments within a single institution.', color: '#a855f7' },
];

const steps = [
  { num: '01', title: 'CR Registers', desc: 'Class Representatives create an account and set up their department directory.' },
  { num: '02', title: 'Students Submit', desc: 'Students scan or visit a link to submit anonymous staff feedback in seconds.' },
  { num: '03', title: 'Insights Surface', desc: 'The CR dashboard instantly reflects AI-analyzed sentiment, scores, and trends.' },
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

      {/* ── FEATURES BENTO ── */}
      <section id="features" className="features-section">
        <div className="float-card scroll-animate sa-right fc-user-dash">
          <div className="fc-header">CR Dashboard</div>
          <div className="fc-stat-row"><span>Total Feedbacks</span><strong>1,204</strong></div>
          <div className="fc-stat-row"><span>Avg Score</span><strong style={{color: '#10b981'}}>4.8 / 5</strong></div>
          <div className="fc-chart">
            <div className="fc-bar" style={{height: '40%'}}></div>
            <div className="fc-bar" style={{height: '70%', backgroundColor: 'var(--primary)'}}></div>
            <div className="fc-bar" style={{height: '100%', backgroundColor: 'var(--primary)'}}></div>
            <div className="fc-bar" style={{height: '60%'}}></div>
          </div>
        </div>

        <div className="section-label">Features</div>
        <h2 className="section-title">Everything you need in one place</h2>
        <p className="section-sub">From collection to analysis, FeedbackPulse handles the entire workflow.</p>

        <div className="features-marquee-wrapper">
          <div className="features-bento">
            {[...features, ...features].map((f, i) => (
              <div key={i} className="feature-card" style={{ '--card-color': f.color }}>
                <div className="feature-icon" style={{ background: `${f.color}18`, color: f.color }}>{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
                <div className="feature-glow" style={{ background: `${f.color}20` }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="how-section">
        <div className="float-card scroll-animate sa-left fc-signup">
          <div className="fc-header">Create CR Account</div>
          <div className="fc-input">mail@college.edu</div>
          <div className="fc-input">••••••••</div>
          <div className="fc-btn">Register Workspace</div>
        </div>

        <div className="section-label">Process</div>
        <h2 className="section-title">How it works</h2>
        <div className="steps-row">
          {steps.map((s, i) => (
            <div key={i} className="step-card">
              <div className="step-num">{s.num}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
              {i < steps.length - 1 && <div className="step-arrow">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── STATS BANNER ── */}
      <section className="stats-section">
        {stats.map(s => (
          <div key={s.label} className="stat-block">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── CTA BANNER ── */}
      <section className="cta-banner">
        <div className="float-card scroll-animate sa-bottom fc-feedback">
          <div className="fc-header">Rate your experience</div>
          <div className="fc-stars">
            <Star size={16} fill="var(--primary)" color="var(--primary)" />
            <Star size={16} fill="var(--primary)" color="var(--primary)" />
            <Star size={16} fill="var(--primary)" color="var(--primary)" />
            <Star size={16} fill="var(--primary)" color="var(--primary)" />
            <Star size={16} fill="var(--primary)" color="var(--primary)" />
          </div>
          <div className="fc-input large">I really liked the methodology...</div>
          <div className="fc-btn small">Submit Anonymous</div>
        </div>

        <div className="cta-banner-orb" />
        <h2 className="cta-banner-title">Ready to transform your department?</h2>
        <p className="cta-banner-sub">Join thousands of CRs already using FeedbackPulse.</p>
        <button className="cta-primary large" style={{position: 'relative', zIndex: 1}} onClick={() => navigate('/auth')}>Get Start →</button>
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
