// ============================================================
// FeedbackPulse — app.js
// ============================================================

// --- Configuration ---
const SUPABASE_URL = "https://mulrywrsywtbuidrmcbb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11bHJ5d3JzeXd0YnVpZHJtY2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTY2OTEsImV4cCI6MjA4NzQ3MjY5MX0.uxTxFc0uTOjPe4oukao_ra_ZHBMRdPjIWtdO4m_eaoU";
const API_BASE = "http://127.0.0.1:5000/api";

// --- Supabase client ---
let sb = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ── DOM refs ──────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const sections = {
    landing: $('landing-section'),
    crLogin: $('cr-login-section'),
    student: $('student-dashboard'),
    cr: $('cr-dashboard'),
};

// ── State ─────────────────────────────────────────────────────
let allFeedbackCache = [];
let overallChart = null;
let currentUser = null;
let staffListInterval = null;

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    registerListeners();
    loadDepartmentsPublic();
});

// ============================================================
// AUTH
// ============================================================
let _sessionHandled = false;

async function initAuth() {
    if (!sb) return;

    const { data: { session } } = await sb.auth.getSession();
    if (session && !_sessionHandled) {
        _sessionHandled = true;
        if (window.location.hash.includes('access_token')) {
            history.replaceState(null, '', window.location.pathname);
        }
        await handleSessionUser(session.user);
        return;
    }

    sb.auth.onAuthStateChange(async (_event, session) => {
        if (session && !_sessionHandled) {
            _sessionHandled = true;
            await handleSessionUser(session.user);
        }
    });
}

async function handleSessionUser(user) {
    currentUser = user;
    const name = user.user_metadata?.full_name || user.email;
    const isCR = await checkIfCR(user);

    $('user-info').textContent = `👤 ${name}`;
    $('user-info').style.display = 'inline-block';
    $('logout-btn').style.display = 'inline-flex';

    if (isCR) {
        showSection('cr');
        loadCRDashboard();
    } else {
        showSection('student');
    }
}

async function checkIfCR(user) {
    if (user.user_metadata?.role === 'cr') return true;
    try {
        const res = await fetch(`${API_BASE}/auth/check-cr?uid=${user.id}`);
        if (res.ok) {
            const d = await res.json();
            return d.is_cr === true;
        }
    } catch (_) { }
    return false;
}

async function loginWithGoogle() {
    if (!sb) return showToast('Supabase not configured.', 'error');
    const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) showToast(error.message, 'error');
}

// ── CR Email Login ─────────────────────────────────────────────
async function handleCREmailLogin(e) {
    e.preventDefault();
    if (!sb) return showToast('Supabase not configured.', 'error');

    const btn = $('cr-submit-btn');
    btn.innerHTML = '<span class="loader"></span> Signing in…';
    btn.disabled = true;

    const email = $('cr-email').value.trim();
    const password = $('cr-password').value;
    const passcode = $('cr-login-passcode').value.trim();

    try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);

        const user = data.user;

        const crCheck = await fetch(`${API_BASE}/auth/check-cr?uid=${user.id}`).then(r => r.json());
        if (!crCheck.is_cr) {
            await sb.auth.signOut();
            throw new Error('This account is not registered as a CR. Please sign up first.');
        }

        if (passcode) {
            const vRes = await fetch(`${API_BASE}/auth/verify-passcode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user.id, passcode }),
            }).then(r => r.json());

            if (!vRes.verified) {
                await sb.auth.signOut();
                throw new Error('Incorrect passcode. Please try again.');
            }
        } else {
            const vRes = await fetch(`${API_BASE}/auth/verify-passcode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user.id, passcode: '' }),
            });
            if (vRes.status === 401) {
                await sb.auth.signOut();
                btn.textContent = 'Sign In';
                btn.disabled = false;
                showToast('Please enter your passcode.', 'error');
                return;
            }
        }

        showToast('Welcome back! 🎉', 'success');
        _sessionHandled = true;
        await handleSessionUser(user);

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.textContent = 'Sign In';
        btn.disabled = false;
    }
}

// ── CR Email Sign-Up ───────────────────────────────────────────
async function handleCRSignup(e) {
    e.preventDefault();
    if (!sb) return showToast('Supabase not configured.', 'error');

    const btn = $('cr-reg-btn');
    btn.innerHTML = '<span class="loader"></span> Creating account…';
    btn.disabled = true;

    const name = $('cr-reg-name').value.trim();
    const email = $('cr-reg-email').value.trim();
    const department = $('cr-reg-department').value.trim();
    const password = $('cr-reg-password').value;
    const passcode = $('cr-reg-passcode').value.trim();

    if (!passcode || !/^\d{4,8}$/.test(passcode)) {
        btn.textContent = 'Create Account';
        btn.disabled = false;
        return showToast('Passcode must be 4–8 digits.', 'error');
    }

    try {
        let signUpData, signUpError;
        try {
            const result = await sb.auth.signUp({
                email, password,
                options: { data: { full_name: name } }
            });
            signUpData = result.data;
            signUpError = result.error;
        } catch (networkErr) {
            throw new Error('Network error: Could not reach authentication server. Check your internet connection and try again.');
        }

        if (signUpError) throw new Error(signUpError.message);

        const user = signUpData?.user;
        const needsEmailConfirm = user && !signUpData?.session;

        if (!user && !needsEmailConfirm) {
            throw new Error('Signup failed. Please try again.');
        }

        if (user) {
            let regRes;
            try {
                regRes = await fetch(`${API_BASE}/auth/cr-signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uid: user.id, email, full_name: name, passcode, department }),
                });
            } catch (networkErr) {
                throw new Error('Network error: Could not reach local server. Make sure the app is running.');
            }
            const regData = await regRes.json();
            if (!regRes.ok) throw new Error(regData.error || 'Failed to register CR profile.');
        }

        if (needsEmailConfirm) {
            showToast('✅ Account created! Please check your email to confirm, then sign in.', 'success');
        } else {
            showToast('✅ Account created! You can now sign in.', 'success');
        }

        switchAuthTab('login');
        $('cr-email').value = email;
        $('cr-reg-name').value = '';
        $('cr-reg-email').value = '';
        $('cr-reg-department').value = '';
        $('cr-reg-password').value = '';
        $('cr-reg-passcode').value = '';

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.textContent = 'Create Account';
        btn.disabled = false;
    }
}

// ── Auth tab switcher ──────────────────────────────────────────
function switchAuthTab(mode) {
    const isLogin = mode === 'login';
    $('cr-login-form').style.display = isLogin ? 'block' : 'none';
    $('cr-signup-form').style.display = isLogin ? 'none' : 'block';
    $('tab-login').classList.toggle('active', isLogin);
    $('tab-signup').classList.toggle('active', !isLogin);
}
window.switchAuthTab = switchAuthTab;

async function handleLogout() {
    if (sb) await sb.auth.signOut();
    currentUser = null;
    _sessionHandled = false;
    if (staffListInterval) { clearInterval(staffListInterval); staffListInterval = null; }
    $('user-info').style.display = 'none';
    $('logout-btn').style.display = 'none';
    showSection('landing');
    location.reload();
}

// ============================================================
// NAVIGATION
// ============================================================
function showSection(key) {
    Object.keys(sections).forEach(k => {
        sections[k].style.display = 'none';
    });
    if (sections[key]) {
        sections[key].style.display =
            key === 'cr' || key === 'student' ? 'block' :
                key === 'landing' ? 'flex' : 'block';
    }
}

// ============================================================
// LISTENERS
// ============================================================
function registerListeners() {
    $('student-login-btn').addEventListener('click', loginWithGoogle);
    $('cr-login-trigger').addEventListener('click', () => showSection('crLogin'));
    $('cr-login-form').addEventListener('submit', handleCREmailLogin);
    $('cr-signup-form').addEventListener('submit', handleCRSignup);
    $('logout-btn').addEventListener('click', handleLogout);

    document.querySelectorAll('.back-btn').forEach(b =>
        b.addEventListener('click', () => showSection('landing'))
    );

    $('student-dept').addEventListener('change', loadSubjectsAndStaff);
    $('feedback-form').addEventListener('submit', handleFeedbackSubmit);
    $('feedback-text').addEventListener('input', e => {
        $('char-count').textContent = `${e.target.value.length} / 1000`;
    });

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    $('filter-sentiment').addEventListener('change', renderFeedbackList);
    $('filter-subject').addEventListener('change', renderFeedbackList);

    // Unified manage form
    $('unified-add-form').addEventListener('submit', handleUnifiedAdd);

    // Staff filter
    $('staff-filter-dept').addEventListener('change', renderStaffList);

    // Profile
    $('profile-edit-form').addEventListener('submit', handleProfileSave);
    $('profile-pic-input').addEventListener('change', handleProfilePicChange);
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
    $(`${tabName}-tab`).style.display = 'block';

    if (tabName === 'analytics') loadAnalytics();
    if (tabName === 'feedback') loadFeedbackTab();
    if (tabName === 'manage') loadManageTab();
    if (tabName === 'profile') loadProfileTab();
}

// ============================================================
// PUBLIC API CALLS (Students)
// ============================================================
async function loadDepartmentsPublic() {
    try {
        const res = await fetch(`${API_BASE}/departments`);
        if (res.status === 503) {
            showToast('⚠️ Database is unreachable. Your Supabase project may be paused — visit supabase.com to resume it.', 'error');
            return;
        }
        const depts = await apiFetch(res);

        const studentSelect = $('student-dept');
        studentSelect.innerHTML = '<option value="">Select Department</option>';
        depts.forEach(d => studentSelect.append(makeOption(d.id, d.name)));
    } catch (err) {
        console.warn('Could not load departments:', err);
        showToast('⚠️ Cannot connect to the server. Make sure python main.py is running.', 'error');
    }
}

async function loadSubjectsAndStaff(e) {
    const deptId = e.target.value;
    const subSel = $('student-subject');
    const staffSel = $('student-staff');

    subSel.innerHTML = '<option value="">Loading…</option>';
    staffSel.innerHTML = '<option value="">Loading…</option>';
    subSel.disabled = true;
    staffSel.disabled = true;

    if (!deptId) return;

    try {
        const [subjects, staff] = await Promise.all([
            fetch(`${API_BASE}/subjects/${deptId}`).then(apiFetch),
            fetch(`${API_BASE}/staff/${deptId}`).then(apiFetch),
        ]);

        subSel.innerHTML = '<option value="">Select Subject</option>';
        subjects.forEach(s => subSel.append(makeOption(s.id, s.name)));
        subSel.disabled = false;

        staffSel.innerHTML = '<option value="">Select Staff</option>';
        staff.forEach(s => staffSel.append(makeOption(s.id, s.name)));
        staffSel.disabled = false;
    } catch (err) {
        showToast('Could not load subjects / staff.', 'error');
    }
}

async function handleFeedbackSubmit(e) {
    e.preventDefault();

    if (!sb) return showToast('Supabase not configured. Please sign in.', 'error');
    if (!currentUser) return showToast('Please sign in with Google first.', 'error');

    const text = $('feedback-text').value.trim();
    if (text.length < 10) return showToast('Feedback must be at least 10 characters.', 'error');

    const payload = {
        student_uid: currentUser.id,
        subject_id: $('student-subject').value,
        staff_id: $('student-staff').value,
        feedback_text: text,
    };

    if (!payload.subject_id || !payload.staff_id)
        return showToast('Please select a subject and staff member.', 'error');

    const btn = $('submit-btn');
    btn.innerHTML = '<span class="loader"></span> Submitting…';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/submit-feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        await apiFetch(res);
        showToast('✅ Feedback submitted! Thank you.', 'success');
        $('feedback-form').reset();
        $('char-count').textContent = '0 / 1000';
        $('student-subject').disabled = true;
        $('student-staff').disabled = true;
    } catch (err) {
        showToast(err.message || 'Submission failed.', 'error');
    } finally {
        btn.innerHTML = 'Submit Feedback';
        btn.disabled = false;
    }
}

// ============================================================
// CR DASHBOARD LOAD
// ============================================================
async function loadCRDashboard() {
    await loadAnalytics();
}

// ── Analytics ─────────────────────────────────────────────────
async function loadAnalytics() {
    try {
        const data = await fetch(`${API_BASE}/admin/feedback`).then(apiFetch);
        allFeedbackCache = data;

        const counts = { Positive: 0, Neutral: 0, Negative: 0 };
        let totalScore = 0;
        data.forEach(f => {
            counts[f.sentiment_label] = (counts[f.sentiment_label] || 0) + 1;
            totalScore += f.sentiment_score || 0;
        });

        const total = data.length;
        $('stat-total').textContent = total;
        $('stat-pos').textContent = counts.Positive;
        $('stat-neu').textContent = counts.Neutral;
        $('stat-neg').textContent = counts.Negative;
        $('stat-avg').textContent = total ? (totalScore / total).toFixed(2) : '—';

        renderDonutChart(counts);
        renderKeywords(data);
        renderSubjectBreakdown(data);
    } catch (err) {
        showToast('Could not load analytics.', 'error');
    }
}

function renderDonutChart(counts) {
    const ctx = $('overallChart').getContext('2d');
    if (overallChart) overallChart.destroy();

    overallChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                data: [counts.Positive, counts.Neutral, counts.Negative],
                backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                borderWidth: 0,
                hoverOffset: 6,
            }]
        },
        options: {
            cutout: '65%',
            plugins: {
                legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } } }
            }
        }
    });
}

function renderKeywords(data) {
    const compliments = new Set();
    const complaints = new Set();
    const posWords = ['excellent', 'good', 'great', 'best', 'effective', 'friendly', 'supportive', 'clear', 'helpful', 'wonderful', 'amazing', 'fantastic'];
    const negWords = ['bad', 'poor', 'worst', 'confusing', 'boring', 'slow', 'unhelpful', 'rude', 'strict', 'unclear', 'lazy', 'difficult'];

    data.forEach(f => {
        const words = (f.feedback_text || '').toLowerCase().split(/\W+/);
        if (f.sentiment_label === 'Positive') words.forEach(w => posWords.includes(w) && compliments.add(w));
        if (f.sentiment_label === 'Negative') words.forEach(w => negWords.includes(w) && complaints.add(w));
    });

    const buildChips = (set, cls) => {
        const container = document.createElement('div');
        container.className = 'chip-list';
        if (set.size === 0) {
            const s = document.createElement('span');
            s.style.fontSize = '.8rem'; s.style.color = 'var(--text-muted)';
            s.textContent = 'None detected';
            container.append(s);
        } else {
            [...set].slice(0, 8).forEach(w => {
                const c = document.createElement('span');
                c.className = `chip ${cls}`;
                c.textContent = w;
                container.append(c);
            });
        }
        return container;
    };

    const cc = $('compliment-chips');
    const cp = $('complaint-chips');
    cc.replaceWith(buildChips(compliments, 'chip-positive'));
    cp.replaceWith(buildChips(complaints, 'chip-negative'));

    document.querySelectorAll('.chip-list')[0]?.setAttribute('id', 'compliment-chips');
    document.querySelectorAll('.chip-list')[1]?.setAttribute('id', 'complaint-chips');
}

function renderSubjectBreakdown(data) {
    const bySubject = {};
    data.forEach(f => {
        const name = f.subjects?.name || f.subject_id || 'Unknown';
        if (!bySubject[name]) bySubject[name] = { Positive: 0, Neutral: 0, Negative: 0, total: 0 };
        bySubject[name][f.sentiment_label] = (bySubject[name][f.sentiment_label] || 0) + 1;
        bySubject[name].total++;
    });

    const container = $('subject-breakdown');
    if (Object.keys(bySubject).length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📚</div><p>No data yet.</p></div>';
        return;
    }

    container.innerHTML = '';
    Object.entries(bySubject).forEach(([name, cnt]) => {
        const posPercent = Math.round((cnt.Positive / cnt.total) * 100);
        const negPercent = Math.round((cnt.Negative / cnt.total) * 100);

        const row = document.createElement('div');
        row.style.cssText = 'margin-bottom:1.25rem;';
        row.innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:.4rem;">
                <span style="font-weight:500;">${escHtml(name)}</span>
                <span style="font-size:.8rem;color:var(--text-dim);">${cnt.total} responses</span>
            </div>
            <div style="display:flex;gap:4px;height:8px;border-radius:4px;overflow:hidden;">
                <div style="width:${posPercent}%;background:#22c55e;transition:width .8s;"></div>
                <div style="width:${cnt.Neutral / cnt.total * 100}%;background:#f59e0b;transition:width .8s;"></div>
                <div style="width:${negPercent}%;background:#ef4444;transition:width .8s;"></div>
            </div>
            <div style="display:flex;gap:1rem;margin-top:.3rem;font-size:.75rem;color:var(--text-dim);">
                <span>✅ ${cnt.Positive}</span><span>⚪ ${cnt.Neutral}</span><span>❌ ${cnt.Negative}</span>
            </div>`;
        container.append(row);
    });
}

// ── Feedback Tab ───────────────────────────────────────────────
async function loadFeedbackTab() {
    try {
        const data = await fetch(`${API_BASE}/admin/feedback`).then(apiFetch);
        allFeedbackCache = data;

        const subFilter = $('filter-subject');
        const subNames = [...new Set(data.map(f => f.subjects?.name).filter(Boolean))];
        subFilter.innerHTML = '<option value="">All Subjects</option>';
        subNames.forEach(n => subFilter.append(makeOption(n, n)));

        renderFeedbackList();
    } catch (err) {
        showToast('Could not load feedback.', 'error');
    }
}

function renderFeedbackList() {
    const sentiment = $('filter-sentiment').value;
    const subject = $('filter-subject').value;

    let list = [...allFeedbackCache].reverse();
    if (sentiment) list = list.filter(f => f.sentiment_label === sentiment);
    if (subject) list = list.filter(f => f.subjects?.name === subject);

    const container = $('feedback-list');
    if (list.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><p>No feedback found.</p></div>';
        return;
    }

    container.innerHTML = '';
    list.forEach(f => {
        const item = document.createElement('div');
        item.className = 'feedback-item';
        const label = f.sentiment_label || 'Neutral';
        const badgeCls = `badge-${label.toLowerCase()}`;
        const dotCls = `dot-${label.toLowerCase()}`;
        const date = f.created_at ? new Date(f.created_at).toLocaleString() : '—';

        item.innerHTML = `
            <div class="feedback-header">
                <div class="feedback-meta">
                    <span class="sentiment-dot ${dotCls}"></span>
                    <strong>${escHtml(f.subjects?.name || 'Unknown Subject')}</strong>
                    &nbsp;·&nbsp;
                    <span style="color:var(--text-dim)">${escHtml(f.staff?.name || 'Unknown Staff')}</span>
                </div>
                <div style="display:flex;align-items:center;gap:.5rem;">
                    <span class="sentiment-badge ${badgeCls}">${label}</span>
                    <button class="btn btn-danger" onclick="deleteFeedback('${f.id}')">Delete</button>
                </div>
            </div>
            <p class="feedback-text">"${escHtml(f.feedback_text)}"</p>
            <div class="feedback-timestamp">
                Score: ${f.sentiment_score ?? '—'} &nbsp;·&nbsp; ${date}
            </div>`;
        container.append(item);
    });
}

async function deleteFeedback(id) {
    if (!confirm('Delete this feedback entry?')) return;
    try {
        await fetch(`${API_BASE}/admin/feedback/${id}`, { method: 'DELETE' }).then(apiFetch);
        showToast('Feedback deleted.', 'info');
        allFeedbackCache = allFeedbackCache.filter(f => f.id !== id);
        renderFeedbackList();
        loadAnalytics();
    } catch (err) {
        showToast('Could not delete feedback.', 'error');
    }
}
window.deleteFeedback = deleteFeedback;

// ============================================================
// MANAGE TAB — Unified Form + Live Staff List
// ============================================================
let allStaffCache = [];
let allDeptsCache = [];

async function loadManageTab() {
    try {
        const depts = await fetch(`${API_BASE}/departments`).then(apiFetch);
        allDeptsCache = depts;

        // Populate the dept selector in the unified form
        const sel = $('unified-dept-select');
        sel.innerHTML = '<option value="">— Select existing —</option>';
        depts.forEach(d => sel.append(makeOption(d.id, d.name)));

        // Populate the filter dept dropdown
        const filterSel = $('staff-filter-dept');
        filterSel.innerHTML = '<option value="">All Departments</option>';
        depts.forEach(d => filterSel.append(makeOption(d.id, d.name)));

        await refreshStaffList();

        // Start live polling every 5 seconds
        if (staffListInterval) clearInterval(staffListInterval);
        staffListInterval = setInterval(refreshStaffList, 5000);
    } catch (err) {
        showToast('Could not load manage data.', 'error');
    }
}

async function refreshStaffList() {
    try {
        // Fetch all staff with their department & subject info
        const res = await fetch(`${API_BASE}/admin/all-staff`).then(apiFetch);
        allStaffCache = res;
        renderStaffList();
    } catch (_) { }
}

function renderStaffList() {
    const filterDept = $('staff-filter-dept').value;
    const container = $('staff-list-container');

    let list = [...allStaffCache];
    if (filterDept) list = list.filter(s => s.department_id === filterDept);

    if (list.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>No staff added yet.</p></div>';
        return;
    }

    container.innerHTML = '';
    list.forEach(s => {
        const item = document.createElement('div');
        item.className = 'staff-item';
        const deptName = allDeptsCache.find(d => d.id === s.department_id)?.name || '—';
        item.innerHTML = `
            <div class="staff-item-info">
                <div class="staff-item-name">${escHtml(s.name)}</div>
                <div class="staff-item-meta">🏫 ${escHtml(deptName)} · 📖 ${escHtml(s.subject_name || '—')}</div>
            </div>
            <span class="staff-item-badge">${escHtml(deptName)}</span>
        `;
        container.append(item);
    });
}

async function handleUnifiedAdd(e) {
    e.preventDefault();
    const btn = $('unified-add-btn');
    btn.innerHTML = '<span class="loader"></span> Saving…';
    btn.disabled = true;

    const existingDeptId = $('unified-dept-select').value;
    const newDeptName = $('unified-dept-input').value.trim();
    const subjectName = $('unified-subject-input').value.trim();
    const staffName = $('unified-staff-input').value.trim();

    if (!subjectName || !staffName) {
        btn.textContent = 'Add Staff Member';
        btn.disabled = false;
        return showToast('Please fill in Subject Name and Staff Name.', 'error');
    }

    try {
        let deptId = existingDeptId;

        // If user typed a new department name, create it first
        if (newDeptName && !existingDeptId) {
            const deptRes = await fetch(`${API_BASE}/admin/departments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newDeptName }),
            }).then(apiFetch);
            deptId = deptRes.id;
            showToast(`✅ Department "${newDeptName}" created!`, 'success');
        } else if (!existingDeptId && !newDeptName) {
            btn.textContent = 'Add Staff Member';
            btn.disabled = false;
            return showToast('Please select or type a department.', 'error');
        }

        // Create the subject
        const subjRes = await fetch(`${API_BASE}/admin/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: subjectName, department_id: deptId }),
        }).then(apiFetch);

        // Create the staff linked to the subject
        await fetch(`${API_BASE}/admin/staff`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: staffName, department_id: deptId, subject_id: subjRes.id }),
        }).then(apiFetch);

        showToast(`✅ ${staffName} added successfully!`, 'success');
        $('unified-dept-input').value = '';
        $('unified-subject-input').value = '';
        $('unified-staff-input').value = '';

        // Reload the manage tab data + staff list immediately
        await loadManageTab();
        // Also refresh student dropdowns
        loadDepartmentsPublic();

    } catch (err) {
        showToast(err.message || 'Failed to add staff.', 'error');
    } finally {
        btn.textContent = 'Add Staff Member';
        btn.disabled = false;
    }
}

// ============================================================
// PROFILE TAB
// ============================================================
let profileData = {};

async function loadProfileTab() {
    if (!currentUser) return;
    try {
        const res = await fetch(`${API_BASE}/auth/cr-profile?uid=${currentUser.id}`).then(apiFetch);
        profileData = res;

        // Populate display
        const name = res.full_name || currentUser.user_metadata?.full_name || '—';
        const dept = res.department || '—';
        const email = res.email || currentUser.email || '—';
        const bio = res.bio || '';
        const avatarUrl = res.avatar_url || '';

        $('profile-name-display').textContent = name;
        $('profile-dept-display').textContent = dept;
        $('profile-email-display').textContent = email;

        // Avatar
        if (avatarUrl) {
            $('profile-avatar-img').src = avatarUrl;
            $('profile-avatar-img').style.display = 'block';
            $('profile-avatar-initials').style.display = 'none';
        } else {
            const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            $('profile-avatar-initials').textContent = initials || 'CR';
            $('profile-avatar-img').style.display = 'none';
            $('profile-avatar-initials').style.display = 'block';
        }

        // Populate form
        $('profile-name-input').value = name === '—' ? '' : name;
        $('profile-dept-input').value = dept === '—' ? '' : dept;
        $('profile-bio-input').value = bio;

        // Bio display
        if (bio) {
            $('profile-bio-text').textContent = bio;
            $('profile-bio-display').style.display = 'block';
        } else {
            $('profile-bio-display').style.display = 'none';
        }

        // Update header user info
        $('user-info').textContent = `👤 ${name}`;

    } catch (err) {
        console.warn('Could not load profile:', err);
    }
}

async function handleProfileSave(e) {
    e.preventDefault();
    if (!currentUser) return;

    const btn = $('profile-save-btn');
    btn.innerHTML = '<span class="loader"></span> Saving…';
    btn.disabled = true;

    const full_name = $('profile-name-input').value.trim();
    const department = $('profile-dept-input').value.trim();
    const bio = $('profile-bio-input').value.trim();

    try {
        await fetch(`${API_BASE}/auth/cr-profile`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: currentUser.id, full_name, department, bio }),
        }).then(apiFetch);

        showToast('✅ Profile updated!', 'success');
        await loadProfileTab();
    } catch (err) {
        showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
        btn.textContent = 'Save Changes';
        btn.disabled = false;
    }
}

async function handleProfilePicChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return showToast('Image must be less than 2MB.', 'error');

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = ev => {
        $('profile-avatar-img').src = ev.target.result;
        $('profile-avatar-img').style.display = 'block';
        $('profile-avatar-initials').style.display = 'none';
    };
    reader.readAsDataURL(file);

    // Upload to backend
    try {
        const formData = new FormData();
        formData.append('uid', currentUser.id);
        formData.append('avatar', file);

        const res = await fetch(`${API_BASE}/auth/cr-avatar`, {
            method: 'POST',
            body: formData,
        }).then(apiFetch);

        showToast('✅ Profile photo updated!', 'success');
    } catch (err) {
        showToast('Failed to upload photo. Preview shown locally.', 'error');
    }
}

// ============================================================
// UTILITIES
// ============================================================
async function apiFetch(res) {
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

function makeOption(value, text) {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = text;
    return o;
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function showToast(message, type = 'success') {
    const container = $('toast-container');
    const toast = document.createElement('div');
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type] || ''}</span> ${escHtml(message)}`;
    container.append(toast);
    setTimeout(() => toast.remove(), 3200);
}
