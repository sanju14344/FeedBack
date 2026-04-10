// ============================================================
// FeedbackPulse — app.js
// ============================================================

const SUPABASE_URL = "https://wesspzkvpzzvcrrxephf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlc3Nwemt2cHp6dmNycnhlcGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDQ4NTIsImV4cCI6MjA5MDAyMDg1Mn0.Gd3Qn3NvHd1p9qhuBt11Dc6fbH5c54bgm_pevNczf2I";
const API_BASE = "http://127.0.0.1:5000/api";

let sb = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const $ = id => document.getElementById(id);

const sections = {
    landing: $('landing-section'),
    studentLogin: $('student-login-section'),
    crLogin: $('cr-login-section'),
    student: $('student-dashboard'),
    studentFeedback: $('student-feedback-section'),
    cr: $('cr-dashboard'),
    adminLogin: $('admin-login-section'),
    adminDash: $('admin-dashboard'),
};

let allFeedbackCache = [];
let overallChart = null;
let currentUser = null;
let staffListInterval = null;
let allStaffCache = [];
let allSubjectsCache = [];
let allDeptsCache = [];
let crProfileCache = {};

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Check for existing admin session first
    const adminToken = sessionStorage.getItem('adminToken');
    if (adminToken) {
        const res = await fetch(`${API_BASE}/auth/admin-check`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        }).catch(() => null);
        if (res && res.ok) {
            showSection('adminDash');
            loadAdminDashboard();
            return;
        } else {
            sessionStorage.removeItem('adminToken');
        }
    }

    await initAuth();
    registerListeners();
    loadDepartmentsPublic();
});

// ============================================================
// AUTH — Supabase (Students & CRs)
// ============================================================
let _sessionHandled = false;

async function initAuth() {
    if (!sb) return;
    const { data: { session } } = await sb.auth.getSession();
    if (session && !_sessionHandled) {
        _sessionHandled = true;
        if (window.location.hash.includes('access_token'))
            history.replaceState(null, '', window.location.pathname);
        await handleSessionUser(session.user);
        return;
    }
    sb.auth.onAuthStateChange(async (_event, session) => {
        if (window.isRegisteringCR) return;
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

    // Hide the CR header button once someone is logged in
    const crBtn = $('cr-login-trigger');
    if (crBtn) crBtn.style.display = 'none';

    if (isCR) {
        try {
            const res = await fetch(`${API_BASE}/auth/cr-profile?uid=${user.id}`).then(apiFetch);
            crProfileCache = res;
            
            // Add year and department to the profile pill
            const suffixes = { '1': '1st', '2': '2nd', '3': '3rd', '4': '4th' };
            const yearStr = res.year && suffixes[res.year] ? `${suffixes[res.year]} Year` : '';
            const deptStr = res.department || '';
            
            if (yearStr || deptStr) {
                const details = [yearStr, deptStr].filter(Boolean).join(', ');
                $('user-info').textContent = `👤 ${name} (${details})`;
            }    
        } catch (e) {
            console.warn('Could not load CR profile cache', e);
        }
        showSection('cr'); loadCRDashboard(); 
    }
    else { showSection('student'); }
}

async function checkIfCR(user) {
    if (user.user_metadata?.role === 'cr') return true;
    try {
        const r = await fetch(`${API_BASE}/auth/check-cr?uid=${user.id}`);
        if (r.ok) return (await r.json()).is_cr === true;
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

async function handleCREmailLogin(e) {
    e.preventDefault();
    if (!sb) return showToast('Supabase not configured.', 'error');
    const btn = $('cr-submit-btn');
    btn.innerHTML = '<span class="loader"></span> Signing in…';
    btn.disabled = true;

    const email = $('cr-email').value.trim();
    const password = $('cr-password').value;

    try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        const user = data.user;

        const crCheck = await fetch(`${API_BASE}/auth/check-cr?uid=${user.id}`).then(r => r.json());
        if (!crCheck.is_cr) {
            await sb.auth.signOut();
            throw new Error('This account is not registered as a CR. Please sign up first.');
        }

        showToast('Welcome back! 🎉', 'success');
        _sessionHandled = true;
        await handleSessionUser(user);
    } catch (err) {
        if (err.message.includes('Failed to fetch')) {
            showToast('Network error: Supabase project might be paused or deleted. Check supabase.com', 'error');
        } else {
            showToast(err.message, 'error');
        }
    } finally {
        btn.textContent = 'Sign In'; btn.disabled = false;
    }
}

async function handleCRSignup(e) {
    e.preventDefault();
    if (!sb) return showToast('Supabase not configured.', 'error');
    
    window.isRegisteringCR = true;
    const btn = $('cr-reg-btn');
    btn.innerHTML = '<span class="loader"></span> Creating account…';
    btn.disabled = true;

    const name = $('cr-reg-name').value.trim();
    const email = $('cr-reg-email').value.trim();
    const password = $('cr-reg-password').value;

    // Department: selected value OR "Other" text
    const deptSel = $('cr-reg-department');
    const deptOther = $('cr-reg-department-other');
    let department = deptSel.value === 'other' ? deptOther.value.trim() : deptSel.value;
    
    // Year
    const yearSelect = $('cr-reg-year');
    const year = yearSelect ? yearSelect.value : '';

    try {
        const { data: signUpData, error: signUpError } = await sb.auth.signUp({
            email, password, options: { data: { full_name: name } }
        });
        if (signUpError) throw new Error(signUpError.message);

        const user = signUpData?.user;
        const needsEmailConfirm = user && !signUpData?.session;
        if (!user && !needsEmailConfirm) throw new Error('Signup failed. Please try again.');

        if (user) {
            const regRes = await fetch(`${API_BASE}/auth/cr-signup`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user.id, email, full_name: name, department, year }),
            });
            const regData = await regRes.json();
            if (!regRes.ok) throw new Error(regData.error || 'Failed to register CR profile.');
        }

        if (!needsEmailConfirm) {
            await sb.auth.signOut();
        }

        showToast(needsEmailConfirm ?
            '✅ Account created! Check your email to confirm, then sign in.' :
            '✅ Account created! You can now sign in.', 'success');

        switchAuthTab('login');
        $('cr-email').value = email;
        $('cr-reg-name').value = '';
        $('cr-reg-email').value = '';
        $('cr-reg-department').value = '';
        $('cr-reg-department-other').value = '';
        $('cr-reg-year').value = '';
        $('cr-reg-password').value = '';
    } catch (err) {
        if (err.message.includes('Failed to fetch')) {
            showToast('Network error: Supabase project might be paused or deleted. Check supabase.com', 'error');
        } else {
            showToast(err.message, 'error');
        }
    } finally {
        btn.textContent = 'Create Account'; btn.disabled = false;
        setTimeout(() => { window.isRegisteringCR = false; }, 1000);
    }
}

function switchAuthTab(mode) {
    const isLogin = mode === 'login';
    $('cr-login-form').style.display = isLogin ? 'block' : 'none';
    $('cr-signup-form').style.display = isLogin ? 'none' : 'block';
    $('tab-login').classList.toggle('active', isLogin);
    $('tab-signup').classList.toggle('active', !isLogin);
    if (!isLogin) loadRegisterDepts();
}
window.switchAuthTab = switchAuthTab;

async function handleLogout() {
    if (sb) await sb.auth.signOut();
    currentUser = null; _sessionHandled = false;
    if (staffListInterval) { clearInterval(staffListInterval); staffListInterval = null; }
    $('user-info').style.display = 'none';
    $('logout-btn').style.display = 'none';
    // Show CR button in header again
    const crBtn = $('cr-login-trigger');
    if (crBtn) crBtn.style.display = 'inline-flex';
    showSection('landing'); location.reload();
}

// ── Load departments into CR signup dropdown ───────────────────
async function loadRegisterDepts() {
    try {
        const depts = await fetch(`${API_BASE}/departments`).then(apiFetch);
        const sel = $('cr-reg-department');
        sel.innerHTML = '<option value="">Select your department</option>';
        depts.forEach(d => sel.append(makeOption(d.name, d.name)));
        sel.append(makeOption('other', '📝 Other…'));
    } catch (_) { }
}

// Show/hide "Other" text box
function onDeptSelectChange() {
    const sel = $('cr-reg-department');
    const other = $('cr-reg-department-other');
    other.style.display = sel.value === 'other' ? 'block' : 'none';
    other.required = sel.value === 'other';
}

// ============================================================
// ADMIN AUTH
// ============================================================
async function handleAdminLogin(e) {
    e.preventDefault();
    const btn = $('admin-submit-btn');
    btn.innerHTML = '<span class="loader"></span> Signing in…';
    btn.disabled = true;

    const email = $('admin-email').value.trim();
    const password = $('admin-password').value;

    try {
        const res = await fetch(`${API_BASE}/auth/admin-login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed.');

        sessionStorage.setItem('adminToken', data.token);
        $('user-info').textContent = '🛡️ Admin';
        $('user-info').style.display = 'inline-block';
        $('logout-btn').style.display = 'none'; // admin has its own Sign Out
        showSection('adminDash');
        loadAdminDashboard();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.textContent = 'Sign In as Admin'; btn.disabled = false;
    }
}

function adminAuthHeader() {
    return { Authorization: `Bearer ${sessionStorage.getItem('adminToken') || ''}` };
}

async function handleAdminLogout() {
    const token = sessionStorage.getItem('adminToken');
    sessionStorage.removeItem('adminToken');
    if (token) {
        await fetch(`${API_BASE}/auth/admin-logout`, {
            method: 'POST', headers: adminAuthHeader()
        }).catch(() => { });
    }
    $('user-info').style.display = 'none';
    showSection('landing'); location.reload();
}

// ── Admin Dashboard ────────────────────────────────────────────
let allCRsCache = [];

async function loadAdminDashboard() {
    try {
        const [crs, depts] = await Promise.all([
            fetch(`${API_BASE}/admin/all-crs`, { headers: adminAuthHeader() }).then(apiFetch),
            fetch(`${API_BASE}/departments`).then(apiFetch),
        ]);
        allCRsCache = crs;

        // Stats
        $('admin-stat-crs').textContent = crs.length;
        $('admin-stat-depts').textContent = depts.length;
        if (crs.length) {
            const oldest = new Date(crs[crs.length - 1].created_at);
            $('admin-stat-oldest').textContent = oldest.toLocaleDateString('en-IN',
                { day: 'numeric', month: 'short', year: 'numeric' });
        }

        const badge = $('admin-cr-count');
        if (badge) badge.textContent = `${crs.length} CR${crs.length !== 1 ? 's' : ''}`;

        // Filter dropdown
        const filterSel = $('admin-filter-dept');
        filterSel.innerHTML = '<option value="">All Departments</option>';
        const deptNames = [...new Set(crs.map(c => c.department).filter(Boolean))].sort();
        deptNames.forEach(n => filterSel.append(makeOption(n, n)));

        renderCRList(crs);
    } catch (err) {
        $('admin-cr-list').innerHTML =
            `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${escHtml(err.message)}</p></div>`;
    }
}

function renderCRList(crs) {
    const filter = $('admin-filter-dept').value;
    const container = $('admin-cr-list');
    let list = [...crs];
    if (filter) list = list.filter(c => c.department === filter);

    if (!list.length) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>No CRs found.</p></div>';
        return;
    }
    container.innerHTML = '';
    list.forEach(cr => {
        const joined = cr.created_at
            ? new Date(cr.created_at).toLocaleDateString('en-IN',
                { day: 'numeric', month: 'short', year: 'numeric' })
            : '—';
        const card = document.createElement('div');
        card.className = 'cr-admin-card';
        card.innerHTML = `
            <div class="cr-admin-info">
                <div class="cr-admin-avatar">${escHtml((cr.full_name || 'CR')[0].toUpperCase())}</div>
                <div>
                    <div class="cr-admin-name">${escHtml(cr.full_name || '—')}</div>
                    <div class="cr-admin-email">${escHtml(cr.email)}</div>
                    <div class="cr-admin-meta">
                        <span class="staff-item-badge">${escHtml(cr.department || 'No dept')}</span>
                        <span style="font-size:.72rem;color:var(--text-muted);">Joined ${joined}</span>
                    </div>
                </div>
            </div>
            <div class="cr-admin-actions">
                <button class="btn btn-outline" style="font-size:.78rem;padding:.4rem .8rem;"
                    onclick="adminEditCR('${cr.id}', '${escHtml(cr.full_name || '')}', '${escHtml(cr.department || '')}')">
                    ✏️ Edit
                </button>
                <button class="btn btn-danger" style="font-size:.78rem;"
                    onclick="adminDeleteCR('${cr.id}', '${escHtml(cr.full_name || cr.email)}')">
                    🗑️ Remove
                </button>
            </div>`;
        container.append(card);
    });
}
window.adminEditCR = adminEditCR;
window.adminDeleteCR = adminDeleteCR;

async function adminEditCR(uid, currentName, currentDept) {
    const newName = prompt(`Edit name for CR:\n(current: "${currentName}")`, currentName);
    if (newName === null) return;
    const newDept = prompt(`Edit department:\n(current: "${currentDept}")`, currentDept);
    if (newDept === null) return;
    try {
        await fetch(`${API_BASE}/admin/cr/${uid}`, {
            method: 'PATCH', headers: { ...adminAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: newName.trim(), department: newDept.trim() }),
        }).then(apiFetch);
        showToast('✅ CR updated.', 'success');
        loadAdminDashboard();
    } catch (err) { showToast(err.message, 'error'); }
}

async function adminDeleteCR(uid, name) {
    if (!confirm(`Remove CR "${name}"?\n\nThis will permanently delete their account.`)) return;
    try {
        await fetch(`${API_BASE}/admin/cr/${uid}`, {
            method: 'DELETE', headers: adminAuthHeader(),
        }).then(apiFetch);
        showToast(`✅ CR "${name}" removed.`, 'success');
        loadAdminDashboard();
    } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
// NAVIGATION
// ============================================================
function showSection(key) {
    Object.values(sections).forEach(s => { if (s) s.style.display = 'none'; });
    if (sections[key]) {
        sections[key].style.display = key === 'landing' ? 'flex' : 'block';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// LISTENERS
// ============================================================
function registerListeners() {
    // Landing page
    $('get-started-btn').addEventListener('click', () => showSection('studentLogin'));
    $('student-login-btn').addEventListener('click', loginWithGoogle);
    $('student-login-back-btn').addEventListener('click', () => showSection('landing'));

    // Header CR button + admin trigger
    $('cr-login-trigger').addEventListener('click', () => showSection('crLogin'));
    $('admin-login-trigger').addEventListener('click', () => showSection('adminLogin'));

    $('cr-login-form').addEventListener('submit', handleCREmailLogin);
    $('cr-signup-form').addEventListener('submit', handleCRSignup);
    $('admin-login-form').addEventListener('submit', handleAdminLogin);
    $('logout-btn').addEventListener('click', handleLogout);
    $('admin-logout-btn').addEventListener('click', handleAdminLogout);
    $('admin-filter-dept').addEventListener('change', () => renderCRList(allCRsCache));
    $('cr-reg-department').addEventListener('change', onDeptSelectChange);

    document.querySelectorAll('.back-btn').forEach(b =>
        b.addEventListener('click', () => showSection('landing'))
    );

    // Student: year first, then dept
    $('student-year').addEventListener('change', onYearChange);
    $('student-dept').addEventListener('change', onStudentFilterChange);

    // Rating panel close
    $('rp-close-btn').addEventListener('click', closeRatingPanel);

    // Rating form submit
    $('rating-form').addEventListener('submit', handleRatingSubmit);

    document.querySelectorAll('.tab').forEach(tab =>
        tab.addEventListener('click', () => switchTab(tab.dataset.tab))
    );
    $('filter-sentiment').addEventListener('change', renderFeedbackList);
    $('filter-subject').addEventListener('change', renderFeedbackList);
    $('unified-add-form').addEventListener('submit', handleUnifiedAdd);

    // Subject confirmation modal buttons
    $('scm-proceed-btn').addEventListener('click', loadSubjectsForCurrentSelection);
    $('scm-cancel-btn').addEventListener('click', () => {
        closeSubjectConfirmModal();
        $('student-dept').value = '';
    });
    // Close modal if backdrop clicked
    $('subject-confirm-modal').addEventListener('click', (e) => {
        if (e.target === $('subject-confirm-modal')) {
            closeSubjectConfirmModal();
            $('student-dept').value = '';
        }
    });

    // Back button on the feedback section → return to selection
    $('sfb-back-btn').addEventListener('click', () => {
        closeRatingPanel();
        showSection('student');
        // Reset dropdowns so user can pick again
        $('student-dept').value = '';
        $('student-year').value = '';
        const deptSel = $('student-dept');
        deptSel.innerHTML = '<option value="">— Select year first —</option>';
        deptSel.disabled = true;
        deptSel.style.opacity = '0.4';
        deptSel.style.cursor = 'not-allowed';
        $('filter-hint').style.display = 'block';
        $('subject-cards-grid').style.display = 'none';
        $('subject-cards-grid').innerHTML = '';
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
    $(`${tabName}-tab`).style.display = 'block';

    if (tabName === 'analytics') loadAnalytics();
    if (tabName === 'feedback') loadFeedbackTab();
    if (tabName === 'manage') loadManageTab();
}

// ============================================================
// PUBLIC API (Students) — Department loader
// ============================================================
async function loadDepartmentsPublic() {
    try {
        const res = await fetch(`${API_BASE}/departments`);
        if (res.status === 503) {
            showToast('⚠️ Database unreachable. Check Supabase project status.', 'error'); return;
        }
        const depts = await apiFetch(res);
        const sel = $('student-dept');
        sel.innerHTML = '<option value="">Select Department</option>';
        depts.forEach(d => sel.append(makeOption(d.id, d.name)));
    } catch (_) {
        showToast('⚠️ Cannot connect to server. Make sure python main.py is running.', 'error');
    }
}

// ── Called when dept or year changes ──────────────────────────
async function onStudentFilterChange() {
    const deptId = $('student-dept').value;
    const year   = $('student-year').value;

    closeRatingPanel();

    // Reset subject grid while waiting
    $('filter-hint').style.display = 'block';
    $('subject-cards-grid').style.display = 'none';
    $('subject-cards-grid').innerHTML = '';

    if (!deptId || !year) return;

    // Show the intermediate confirmation modal
    openSubjectConfirmModal(year, deptId);
}

// ── Opens the intermediate "Ready to Give Feedback?" modal ────
function openSubjectConfirmModal(year, deptId) {
    const yearLabels = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year' };
    const deptText = $('student-dept').options[$('student-dept').selectedIndex]?.text || deptId;

    $('scm-year-value').textContent = yearLabels[year] || year;
    $('scm-dept-value').textContent = deptText;

    const modal = $('subject-confirm-modal');
    modal.style.display = 'flex';
    // Re-trigger animation each time
    const card = modal.querySelector('.subject-confirm-card');
    card.style.animation = 'none';
    requestAnimationFrame(() => {
        card.style.animation = '';
    });
}

// ── Closes the confirmation modal ──────────────────────────────
function closeSubjectConfirmModal() {
    $('subject-confirm-modal').style.display = 'none';
}

// ── Actually loads subjects after the user confirms ───────────
async function loadSubjectsForCurrentSelection() {
    const deptId  = $('student-dept').value;
    const year    = $('student-year').value;
    const grid    = $('subject-cards-grid');

    if (!deptId || !year) return;

    closeSubjectConfirmModal();

    // Populate year/dept badge on the feedback section
    const yearLabels = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year' };
    const deptText = $('student-dept').options[$('student-dept').selectedIndex]?.text || deptId;
    $('sfb-year-label').textContent  = yearLabels[year] || year;
    $('sfb-dept-label').textContent  = deptText;

    // Navigate to the new feedback section
    showSection('studentFeedback');
    closeRatingPanel();

    grid.style.display = 'grid';
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading subjects…</p></div>';

    try {
        const subjects = await fetch(`${API_BASE}/subjects/${deptId}`).then(apiFetch);
        if (!subjects.length) {
            grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📚</div><p>No subjects found for this department.</p></div>';
            return;
        }

        // For each subject, get linked staff + check if already submitted
        const cards = await Promise.all(subjects.map(async sub => {
            const [staffList, submissionCheck] = await Promise.all([
                fetch(`${API_BASE}/staff-for-subject/${sub.id}`).then(apiFetch).catch(() => []),
                currentUser
                    ? fetch(`${API_BASE}/check-submission?student_uid=${currentUser.id}&subject_id=${sub.id}`).then(r => r.json()).catch(() => ({ submitted: false }))
                    : { submitted: false },
            ]);
            const staff = staffList[0] || null;
            return { sub, staff, submitted: submissionCheck.submitted };
        }));

        renderSubjectCards(cards);
    } catch (err) {
        grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${escHtml(err.message)}</p></div>`;
    }
}


// ── Called only when year changes — populates dept dropdown ────
async function onYearChange() {
    const year    = $('student-year').value;
    const deptSel = $('student-dept');
    const grid    = $('subject-cards-grid');

    closeRatingPanel();

    // Reset subject grid
    grid.style.display = 'none';
    grid.innerHTML = '';
    $('filter-hint').style.display = 'block';

    if (!year) {
        // No year — disable and reset dept dropdown
        deptSel.innerHTML = '<option value="">— Select year first —</option>';
        deptSel.disabled = true;
        deptSel.style.opacity = '0.4';
        deptSel.style.cursor = 'not-allowed';
        return;
    }

    // Show loading state in dept dropdown
    deptSel.innerHTML = '<option value="">Loading departments…</option>';
    deptSel.disabled = true;
    deptSel.style.opacity = '0.7';
    deptSel.style.cursor = 'wait';

    try {
        const depts = await fetch(`${API_BASE}/departments-by-year/${year}`).then(apiFetch);
        deptSel.innerHTML = '<option value="">Select Department</option>';
        depts.forEach(d => deptSel.append(makeOption(d.id, d.name)));
        deptSel.disabled = false;
        deptSel.style.opacity = '1';
        deptSel.style.cursor = '';
    } catch (_) {
        deptSel.innerHTML = '<option value="">Could not load departments</option>';
        deptSel.disabled = true;
        deptSel.style.opacity = '0.4';
        deptSel.style.cursor = 'not-allowed';
    }
}

function renderSubjectCards(cards) {
    const grid = $('subject-cards-grid');
    grid.innerHTML = '';
    cards.forEach(({ sub, staff, submitted }) => {
        const card = document.createElement('div');
        card.className = 'subject-card' + (submitted ? ' subject-card--done' : '');
        card.dataset.subjectId  = sub.id;
        card.dataset.staffId    = staff ? staff.id : '';
        card.dataset.staffName  = staff ? staff.name : 'Not assigned';
        card.dataset.submitted  = submitted ? '1' : '0';
        card.innerHTML = `
            <div class="subject-card__name">📚 ${escHtml(sub.name)}</div>
            <div class="subject-card__staff">👤 ${escHtml(staff ? staff.name : 'Staff not assigned')}</div>
            <div class="subject-card__status ${submitted ? 'status-done' : 'status-pending'}">
                ${submitted ? '✅ Already Submitted' : '⭐ Rate Now'}
            </div>`;
        if (!submitted) {
            card.addEventListener('click', () =>
                openRatingPanel(sub.id, sub.name, staff ? staff.name : '—', staff ? staff.id : '')
            );
        } else {
            card.addEventListener('click', () =>
                showToast('You have already submitted feedback for this subject.', 'info')
            );
        }
        grid.append(card);
    });
}

// ── Rating Panel ───────────────────────────────────────────────
function openRatingPanel(subjectId, subjectName, staffName, staffId) {
    $('rp-subject-id').value = subjectId;
    $('rp-staff-id').value   = staffId;
    $('rp-subject-name').textContent = subjectName;
    $('rp-staff-name').textContent   = '👤 ' + staffName;
    $('rating-form').reset();
    $('rating-comment-text').value = '';
    const panel = $('rating-panel');
    panel.classList.add('visible');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeRatingPanel() {
    $('rating-panel').classList.remove('visible');
}

async function handleRatingSubmit(e) {
    e.preventDefault();
    if (!currentUser) return showToast('Please sign in with Google first.', 'error');

    const subjectId = $('rp-subject-id').value;
    const staffId   = $('rp-staff-id').value;

    // Collect star ratings
    const ratings = {};
    for (let i = 1; i <= 6; i++) {
        const sel = document.querySelector(`input[name="q${i}"]:checked`);
        if (!sel) return showToast(`Please rate question ${i}.`, 'error');
        ratings[`q${i}`] = parseInt(sel.value);
    }

    const payload = {
        student_uid:  currentUser.id,
        subject_id:   subjectId,
        staff_id:     staffId || 'none',
        feedback_text: $('rating-comment-text').value.trim(),
        ...ratings,
    };

    const btn = $('rating-submit-btn');
    btn.innerHTML = '<span class="loader"></span> Submitting…'; btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/submit-feedback`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (res.status === 409) {
            showToast('You have already submitted feedback for this subject.', 'info');
            closeRatingPanel();
            return;
        }
        await apiFetch(res);
        showToast('✅ Feedback submitted! Thank you.', 'success');
        closeRatingPanel();

        // Mark the card as done in the grid
        const card = document.querySelector(`.subject-card[data-subject-id="${subjectId}"]`);
        if (card) {
            card.classList.add('subject-card--done');
            card.dataset.submitted = '1';
            card.querySelector('.subject-card__status').className = 'subject-card__status status-done';
            card.querySelector('.subject-card__status').textContent = '✅ Already Submitted';
            card.replaceWith(card.cloneNode(true)); // remove click handler
            // re-attach info-only click
            document.querySelector(`.subject-card[data-subject-id="${subjectId}"]`)
                .addEventListener('click', () => showToast('You have already submitted feedback for this subject.', 'info'));
        }
    } catch (err) {
        showToast(err.message || 'Submission failed.', 'error');
    } finally {
        btn.innerHTML = 'Submit Feedback'; btn.disabled = false;
    }
}

// ============================================================
// CR DASHBOARD
// ============================================================
async function loadCRDashboard() { await loadAnalytics(); }

async function loadAnalytics() {
    try {
        const query = crProfileCache?.department ? `?dept=${encodeURIComponent(crProfileCache.department)}` : '';
        const data = await fetch(`${API_BASE}/admin/feedback${query}`).then(apiFetch);
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
        populateReportSubjectSelect(data);
    } catch (_) {
        showToast('Could not load analytics.', 'error');
    }
}

function populateReportSubjectSelect(data) {
    const subjects = [...new Map(data.map(f => [f.subjects?.name, f.subjects?.name])).entries()]
        .filter(([k]) => k).map(([k]) => k).sort();
    const sel = $('report-subject-select');
    sel.innerHTML = '<option value="">— Pick a subject —</option>';
    subjects.forEach(name => sel.append(makeOption(name, name)));
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
                borderWidth: 0, hoverOffset: 6
            }]
        },
        options: {
            cutout: '65%', plugins: {
                legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } } }
            }
        }
    });
}

function renderKeywords(data) {
    const compliments = new Set(), complaints = new Set();
    const posWords = ['excellent', 'good', 'great', 'best', 'effective', 'friendly', 'supportive', 'clear', 'helpful', 'wonderful', 'amazing', 'fantastic'];
    const negWords = ['bad', 'poor', 'worst', 'confusing', 'boring', 'slow', 'unhelpful', 'rude', 'strict', 'unclear', 'lazy', 'difficult'];
    data.forEach(f => {
        const words = (f.feedback_text || '').toLowerCase().split(/\W+/);
        if (f.sentiment_label === 'Positive') words.forEach(w => posWords.includes(w) && compliments.add(w));
        if (f.sentiment_label === 'Negative') words.forEach(w => negWords.includes(w) && complaints.add(w));
    });
    const buildChips = (set, cls) => {
        const c = document.createElement('div'); c.className = 'chip-list';
        if (!set.size) {
            const s = document.createElement('span');
            s.style.cssText = 'font-size:.8rem;color:var(--text-muted)'; s.textContent = 'None detected'; c.append(s);
        }
        else[...set].slice(0, 8).forEach(w => {
            const s = document.createElement('span');
            s.className = `chip ${cls}`; s.textContent = w; c.append(s);
        });
        return c;
    };
    $('compliment-chips').replaceWith(buildChips(compliments, 'chip-positive'));
    $('complaint-chips').replaceWith(buildChips(complaints, 'chip-negative'));
    document.querySelectorAll('.chip-list')[0]?.setAttribute('id', 'compliment-chips');
    document.querySelectorAll('.chip-list')[1]?.setAttribute('id', 'complaint-chips');
}

function renderSubjectBreakdown(data) {
    const bySubject = {};
    data.forEach(f => {
        const name = f.subjects?.name || 'Unknown';
        if (!bySubject[name]) bySubject[name] = { Positive: 0, Neutral: 0, Negative: 0, total: 0 };
        bySubject[name][f.sentiment_label] = (bySubject[name][f.sentiment_label] || 0) + 1;
        bySubject[name].total++;
    });
    const container = $('subject-breakdown');
    if (!Object.keys(bySubject).length) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📚</div><p>No data yet.</p></div>'; return;
    }
    container.innerHTML = '';
    Object.entries(bySubject).forEach(([name, cnt]) => {
        const pos = Math.round(cnt.Positive / cnt.total * 100);
        const row = document.createElement('div'); row.style.marginBottom = '1.25rem';
        row.innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:.4rem;">
                <span style="font-weight:500;">${escHtml(name)}</span>
                <span style="font-size:.8rem;color:var(--text-dim);">${cnt.total} responses</span>
            </div>
            <div style="display:flex;gap:4px;height:8px;border-radius:4px;overflow:hidden;">
                <div style="width:${pos}%;background:#22c55e;transition:width .8s;"></div>
                <div style="width:${Math.round(cnt.Neutral / cnt.total * 100)}%;background:#f59e0b;transition:width .8s;"></div>
                <div style="width:${Math.round(cnt.Negative / cnt.total * 100)}%;background:#ef4444;transition:width .8s;"></div>
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
        const query = crProfileCache?.department ? `?dept=${encodeURIComponent(crProfileCache.department)}` : '';
        const data = await fetch(`${API_BASE}/admin/feedback${query}`).then(apiFetch);
        allFeedbackCache = data;
        const subFilter = $('filter-subject');
        const subNames = [...new Set(data.map(f => f.subjects?.name).filter(Boolean))];
        subFilter.innerHTML = '<option value="">All Subjects</option>';
        subNames.forEach(n => subFilter.append(makeOption(n, n)));
        renderFeedbackList();
    } catch (_) { showToast('Could not load feedback.', 'error'); }
}

function renderFeedbackList() {
    const sentiment = $('filter-sentiment').value;
    const subject = $('filter-subject').value;
    let list = [...allFeedbackCache].reverse();
    if (sentiment) list = list.filter(f => f.sentiment_label === sentiment);
    if (subject) list = list.filter(f => f.subjects?.name === subject);
    const container = $('feedback-list');
    if (!list.length) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><p>No feedback found.</p></div>'; return;
    }
    container.innerHTML = '';
    list.forEach(f => {
        const item = document.createElement('div'); item.className = 'feedback-item';
        const label = f.sentiment_label || 'Neutral';
        const date = f.created_at ? new Date(f.created_at).toLocaleString() : '—';
        item.innerHTML = `
            <div class="feedback-header">
                <div class="feedback-meta">
                    <span class="sentiment-dot dot-${label.toLowerCase()}"></span>
                    <strong>${escHtml(f.subjects?.name || 'Unknown Subject')}</strong>
                    &nbsp;·&nbsp;
                    <span style="color:var(--text-dim)">${escHtml(f.staff?.name || 'Unknown Staff')}</span>
                </div>
                <div style="display:flex;align-items:center;gap:.5rem;">
                    <span class="sentiment-badge badge-${label.toLowerCase()}">${label}</span>
                    <button class="btn btn-danger" onclick="deleteFeedback('${f.id}')">Delete</button>
                </div>
            </div>
            <p class="feedback-text">"${escHtml(f.feedback_text)}"</p>
            <div class="feedback-timestamp">Score: ${f.sentiment_score ?? '—'} &nbsp;·&nbsp; ${date}</div>`;
        container.append(item);
    });
}

async function deleteFeedback(id) {
    if (!confirm('Delete this feedback entry?')) return;
    try {
        await fetch(`${API_BASE}/admin/feedback/${id}`, { method: 'DELETE' }).then(apiFetch);
        showToast('Feedback deleted.', 'info');
        allFeedbackCache = allFeedbackCache.filter(f => f.id !== id);
        renderFeedbackList(); loadAnalytics();
    } catch (_) { showToast('Could not delete feedback.', 'error'); }
}
window.deleteFeedback = deleteFeedback;

// ── Manage Tab ─────────────────────────────────────────────────
async function loadManageTab() {
    try {
        const depts = await fetch(`${API_BASE}/departments`).then(apiFetch);
        allDeptsCache = depts;

        await refreshStaffList();
        if (staffListInterval) clearInterval(staffListInterval);
        staffListInterval = setInterval(refreshStaffList, 5000);
    } catch (_) { showToast('Could not load manage data.', 'error'); }
}

async function refreshStaffList() {
    try {
        allStaffCache = await fetch(`${API_BASE}/admin/all-staff`).then(apiFetch);
        allSubjectsCache = await fetch(`${API_BASE}/admin/all-subjects`).then(apiFetch);
        renderStaffList();
    } catch (_) { }
}

function renderStaffList() {
    const container = $('staff-list-container');
    let staffList = [...allStaffCache];
    let subjList = [...allSubjectsCache];
    
    if (crProfileCache?.department) {
        staffList = staffList.filter(s => {
            const deptName = allDeptsCache.find(d => d.id === s.department_id)?.name;
            return deptName === crProfileCache.department;
        });
        subjList = subjList.filter(s => {
            const deptName = (s.departments && s.departments.name) ? s.departments.name : allDeptsCache.find(d => d.id === s.department_id)?.name;
            return deptName === crProfileCache.department;
        });
    }

    if (!subjList.length && !staffList.length) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>No staff or subjects added yet.</p></div>'; 
        return;
    }

    container.innerHTML = '';
    
    const grouped = {};
    subjList.forEach(sub => {
        grouped[sub.id] = { subject: sub, staff: [] };
    });
    
    staffList.forEach(s => {
        const sid = s.subject_id;
        if (sid && grouped[sid]) {
            grouped[sid].staff.push(s);
        } else {
            if (!grouped['unassigned']) grouped['unassigned'] = { subject: {name: 'Unassigned Staff'}, staff: [] };
            grouped['unassigned'].staff.push(s);
        }
    });

    Object.values(grouped).forEach(group => {
        const box = document.createElement('div');
        box.style.marginBottom = '1.5rem';
        
        const subHeader = document.createElement('div');
        subHeader.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;background:var(--glass-bg, rgba(255,255,255,0.05));padding:0.5rem 0.75rem;border-radius:6px;border:1px solid var(--glass-border);margin-bottom:0.5rem;">
            <strong style="color:var(--text-main); font-size:0.9rem;">📚 ${escHtml(group.subject.name)}</strong>
            ${group.subject.id ? `<button class="btn btn-outline" style="font-size:0.7rem;padding:0.15rem 0.4rem;border:none;color:var(--danger, #ef4444);" onclick="deleteSubject('${group.subject.id}')">Delete Subject</button>` : ''}
        </div>`;
        box.append(subHeader);

        if (!group.staff.length) {
            const item = document.createElement('div');
            item.className = 'staff-item';
            item.innerHTML = `<span style="font-size:0.85rem;color:var(--text-muted);margin-left:1rem;">No staff assigned.</span>`;
            box.append(item);
        } else {
            group.staff.forEach(s => {
                const item = document.createElement('div');
                item.className = 'staff-item';
                item.innerHTML = `
                    <div class="staff-item-info" style="margin-left: 1rem;">
                        <div class="staff-item-name">🧑‍🏫 ${escHtml(s.name)}</div>
                    </div>
                    <div>
                        <button class="btn btn-danger" style="font-size:0.7rem;padding:0.25rem 0.5rem;" onclick="deleteStaff('${s.id}')">Remove Staff</button>
                    </div>`;
                box.append(item);
            });
        }
        container.append(box);
    });
}

async function handleUnifiedAdd(e) {
    e.preventDefault();
    const btn = $('unified-add-btn');
    btn.innerHTML = '<span class="loader"></span> Saving…'; btn.disabled = true;

    // Auto-detect CR's department ID
    const crDeptName = crProfileCache?.department;
    if (!crDeptName) {
        btn.textContent = 'Add Entry'; btn.disabled = false;
        return showToast('CR department not found. Please update your profile.', 'error');
    }

    let deptId = allDeptsCache.find(d => d.name === crDeptName)?.id;

    const subjectName = $('unified-subject-input').value.trim();
    const staffName = $('unified-staff-input').value.trim();
    if (!subjectName) {
        btn.textContent = 'Add Entry'; btn.disabled = false;
        return showToast('Please provide a Subject Name.', 'error');
    }

    try {
        if (!deptId) {
            const r = await fetch(`${API_BASE}/admin/departments`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: crDeptName }),
            }).then(apiFetch);
            deptId = r.id;
            allDeptsCache.push(r);
        }

        const crYear = crProfileCache?.year;

        const subjRes = await fetch(`${API_BASE}/admin/subjects`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: subjectName, department_id: deptId, year: crYear }),
        }).then(apiFetch);

        if (staffName) {
            await fetch(`${API_BASE}/admin/staff`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: staffName, department_id: deptId, subject_id: subjRes.id }),
            }).then(apiFetch);
            showToast(`✅ ${staffName} and ${subjectName} added!`, 'success');
        } else {
            showToast(`✅ Subject ${subjectName} added!`, 'success');
        }

        $('unified-subject-input').value = $('unified-staff-input').value = '';
        await loadManageTab(); loadDepartmentsPublic();
    } catch (err) { showToast(err.message || 'Failed to add entry.', 'error'); }
    finally { btn.textContent = 'Add Entry'; btn.disabled = false; }
}

async function deleteStaff(id) {
    if (!confirm('Delete this staff member?')) return;
    try {
        await fetch(`${API_BASE}/admin/staff/${id}`, { method: 'DELETE' }).then(apiFetch);
        showToast('Staff member deleted.', 'info');
        await refreshStaffList();
    } catch (_) { showToast('Could not delete staff.', 'error'); }
}
window.deleteStaff = deleteStaff;

async function deleteSubject(id) {
    if (!confirm('Delete this subject? This might also remove associated feedback.')) return;
    try {
        await fetch(`${API_BASE}/admin/subjects/${id}`, { method: 'DELETE' }).then(apiFetch);
        showToast('Subject deleted.', 'info');
        await refreshStaffList();
    } catch (_) { showToast('Could not delete subject.', 'error'); }
}
window.deleteSubject = deleteSubject;


// ============================================================
// PDF REPORT GENERATION
// ============================================================
function pdfHeader(doc, title, subtitle) {
    const pw = doc.internal.pageSize.getWidth();
    // Background header band
    doc.setFillColor(36, 37, 60);
    doc.rect(0, 0, pw, 38, 'F');
    // Logo text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(130, 140, 255);
    doc.text('FeedbackPulse', 14, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(160, 170, 200);
    doc.text('Student Feedback Analytics System', 14, 22);
    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(title, 14, 32);
    // Date on the right
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(160, 170, 200);
    const now = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.text(`Generated: ${now}`, pw - 14, 22, { align: 'right' });
    // CR name
    const crName = crProfileCache?.full_name || currentUser?.email || 'CR';
    const crDept = crProfileCache?.department || '';
    doc.text(`CR: ${crName}${crDept ? '  |  ' + crDept : ''}`, pw - 14, 32, { align: 'right' });
    if (subtitle) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(190, 195, 220);
        doc.text(subtitle, 14, 44);
        return 50;
    }
    return 44;
}

function sentimentTable(doc, startY, counts, total, avgScore) {
    const pos = counts.Positive || 0, neu = counts.Neutral || 0, neg = counts.Negative || 0;
    const pct = v => total ? `${Math.round(v / total * 100)}%` : '0%';
    doc.autoTable({
        startY,
        head: [['Metric', 'Count', 'Percentage']],
        body: [
            ['✅ Positive', pos, pct(pos)],
            ['⚪ Neutral', neu, pct(neu)],
            ['❌ Negative', neg, pct(neg)],
            ['📊 Total', total, '100%'],
            ['📈 Avg Score', avgScore !== undefined ? avgScore.toFixed(2) : '—', ''],
        ],
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [30, 30, 50] },
        alternateRowStyles: { fillColor: [240, 241, 255] },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'center' }, 2: { halign: 'center' } },
        margin: { left: 14, right: 14 },
    });
    return doc.lastAutoTable.finalY + 8;
}

function feedbackTable(doc, startY, feedbackRows) {
    const rows = feedbackRows.map(f => [
        f.feedback_text?.slice(0, 120) + (f.feedback_text?.length > 120 ? '…' : ''),
        f.sentiment_label || '—',
        f.sentiment_score !== undefined ? Number(f.sentiment_score).toFixed(2) : '—',
        f.created_at ? new Date(f.created_at).toLocaleDateString('en-IN') : '—',
    ]);
    doc.autoTable({
        startY,
        head: [['Feedback (Anonymised)', 'Sentiment', 'Score', 'Date']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: [30, 30, 50] },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'center', cellWidth: 26 },
            2: { halign: 'center', cellWidth: 18 },
            3: { halign: 'center', cellWidth: 26 },
        },
        margin: { left: 14, right: 14 },
        didParseCell(data) {
            if (data.section === 'body' && data.column.index === 1) {
                const lbl = data.cell.raw;
                if (lbl === 'Positive') data.cell.styles.textColor = [22, 163, 74];
                else if (lbl === 'Negative') data.cell.styles.textColor = [220, 38, 38];
                else data.cell.styles.textColor = [180, 120, 10];
            }
        },
    });
    return doc.lastAutoTable.finalY + 8;
}

window.generateSubjectReport = async function () {
    const subjectName = $('report-subject-select').value;
    if (!subjectName) return showToast('Please select a subject first.', 'error');

    const btn = $('gen-subject-report-btn');
    btn.innerHTML = '<span class="loader"></span>'; btn.disabled = true;

    try {
        const data = allFeedbackCache.filter(f => f.subjects?.name === subjectName);
        if (!data.length) { showToast('No feedback found for this subject.', 'error'); return; }

        const counts = { Positive: 0, Neutral: 0, Negative: 0 };
        let totalScore = 0;
        data.forEach(f => { counts[f.sentiment_label] = (counts[f.sentiment_label] || 0) + 1; totalScore += f.sentiment_score || 0; });
        const avgScore = data.length ? totalScore / data.length : 0;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        let y = pdfHeader(doc, `Subject Report: ${subjectName}`,
            `Total Responses: ${data.length}  |  Avg Sentiment Score: ${avgScore.toFixed(2)}`);

        doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        doc.setTextColor(50, 50, 100); doc.text('Sentiment Summary', 14, y); y += 5;
        y = sentimentTable(doc, y, counts, data.length, avgScore);

        doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        doc.setTextColor(50, 50, 100); doc.text('Feedback Entries', 14, y); y += 4;
        feedbackTable(doc, y, data);

        doc.save(`${subjectName.replace(/\s+/g, '_')}_Report.pdf`);
        showToast('✅ Subject report downloaded!', 'success');
    } catch (err) {
        showToast('PDF generation failed: ' + err.message, 'error');
    } finally {
        btn.textContent = 'Generate PDF'; btn.disabled = false;
    }
};

window.generateFullClassReport = async function () {
    if (!allFeedbackCache.length) return showToast('No feedback data available.', 'error');
    const btn = $('gen-full-report-btn');
    btn.innerHTML = '<span class="loader"></span>'; btn.disabled = true;

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pw = doc.internal.pageSize.getWidth();

        // ── Summary page ──────────────────────────────────────────
        let y = pdfHeader(doc, 'Full Class Report', `All Subjects  |  Total Responses: ${allFeedbackCache.length}`);

        // Overall sentiment counts
        const overallCounts = { Positive: 0, Neutral: 0, Negative: 0 };
        let overallScore = 0;
        allFeedbackCache.forEach(f => {
            overallCounts[f.sentiment_label] = (overallCounts[f.sentiment_label] || 0) + 1;
            overallScore += f.sentiment_score || 0;
        });
        const overallAvg = allFeedbackCache.length ? overallScore / allFeedbackCache.length : 0;

        doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        doc.setTextColor(50, 50, 100); doc.text('Overall Class Sentiment Summary', 14, y); y += 5;
        y = sentimentTable(doc, y, overallCounts, allFeedbackCache.length, overallAvg);

        // Per-subject mini summary table
        const bySubject = {};
        allFeedbackCache.forEach(f => {
            const name = f.subjects?.name || 'Unknown';
            if (!bySubject[name]) bySubject[name] = { Positive: 0, Neutral: 0, Negative: 0, total: 0, score: 0 };
            bySubject[name][f.sentiment_label] = (bySubject[name][f.sentiment_label] || 0) + 1;
            bySubject[name].total++;
            bySubject[name].score += f.sentiment_score || 0;
        });

        doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        doc.setTextColor(50, 50, 100); doc.text('Per-Subject Overview', 14, y); y += 5;
        doc.autoTable({
            startY: y,
            head: [['Subject', 'Responses', 'Positive', 'Neutral', 'Negative', 'Avg Score']],
            body: Object.entries(bySubject).map(([name, cnt]) => [
                name, cnt.total,
                `${cnt.Positive} (${Math.round(cnt.Positive / cnt.total * 100)}%)`,
                `${cnt.Neutral} (${Math.round(cnt.Neutral / cnt.total * 100)}%)`,
                `${cnt.Negative} (${Math.round(cnt.Negative / cnt.total * 100)}%)`,
                (cnt.score / cnt.total).toFixed(2),
            ]),
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
            bodyStyles: { fontSize: 8, textColor: [30, 30, 50] },
            alternateRowStyles: { fillColor: [240, 241, 255] },
            columnStyles: { 0: { fontStyle: 'bold' } },
            margin: { left: 14, right: 14 },
        });

        // ── Per-subject detail pages ───────────────────────────────
        const subjectNames = Object.keys(bySubject);
        subjectNames.forEach(subjectName => {
            doc.addPage();
            const subData = allFeedbackCache.filter(f => (f.subjects?.name || 'Unknown') === subjectName);
            const counts = bySubject[subjectName];
            const avg = counts.score / counts.total;
            let py = pdfHeader(doc, `Subject: ${subjectName}`,
                `Responses: ${counts.total}  |  Avg Score: ${avg.toFixed(2)}`);

            doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
            doc.setTextColor(50, 50, 100); doc.text('Sentiment Summary', 14, py); py += 5;
            py = sentimentTable(doc, py, counts, counts.total, avg);

            doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
            doc.setTextColor(50, 50, 100); doc.text('Feedback Entries', 14, py); py += 4;
            feedbackTable(doc, py, subData);
        });

        // Page numbers
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
            doc.setTextColor(160); doc.text(`Page ${i} of ${pageCount}`, pw - 14, 290, { align: 'right' });
        }

        const now = new Date().toISOString().slice(0, 10);
        doc.save(`FullClass_Report_${now}.pdf`);
        showToast('✅ Full class report downloaded!', 'success');
    } catch (err) {
        showToast('PDF generation failed: ' + err.message, 'error');
    } finally {
        btn.textContent = 'Full Report PDF'; btn.disabled = false;
    }
};

window.exportFeedbackPDF = function () {
    const sentiment = $('filter-sentiment').value;
    const subject = $('filter-subject').value;
    let list = [...allFeedbackCache].reverse();
    if (sentiment) list = list.filter(f => f.sentiment_label === sentiment);
    if (subject) list = list.filter(f => f.subjects?.name === subject);
    if (!list.length) return showToast('No feedback to export.', 'error');

    const counts = { Positive: 0, Neutral: 0, Negative: 0 };
    let totalScore = 0;
    list.forEach(f => { counts[f.sentiment_label] = (counts[f.sentiment_label] || 0) + 1; totalScore += f.sentiment_score || 0; });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const subtitle = [sentiment && `Sentiment: ${sentiment}`, subject && `Subject: ${subject}`].filter(Boolean).join('  |  ')
        || `All feedback — ${list.length} entries`;
    let y = pdfHeader(doc, 'Feedback Export', subtitle);
    y = sentimentTable(doc, y, counts, list.length, list.length ? totalScore / list.length : 0);
    feedbackTable(doc, y, list);
    doc.save(`Feedback_Export_${new Date().toISOString().slice(0, 10)}.pdf`);
    showToast('✅ Feedback exported!', 'success');
};

// ============================================================
// UTILITIES
// ============================================================
async function apiFetch(res) {
    if (!res.ok) {
        const e = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(e.error || `HTTP ${res.status}`);
    }
    return res.json();
}

function makeOption(value, text) {
    const o = document.createElement('option'); o.value = value; o.textContent = text; return o;
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

// ── AI Insights Integration ───────────────────────────────────────
$('ai-close-btn').addEventListener('click', () => {
    $('ai-modal').classList.remove('visible');
});

async function generateAIReport() {
    // Collect the feedback currently showing in the list, or all if no subject filter
    const subject = $('filter-subject').value;
    let listToAnalyze = [...allFeedbackCache];
    
    // Make sure we have the sentiment label filter factored in too 
    const sentiment = $('filter-sentiment').value;
    if (sentiment) listToAnalyze = listToAnalyze.filter(f => f.sentiment_label === sentiment);
    if (subject) listToAnalyze = listToAnalyze.filter(f => f.subjects?.name === subject);
    
    if (listToAnalyze.length === 0) {
        return showToast("No feedback to analyze in this view.", "error");
    }

    const btn = $('ai-analyze-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="loader" style="width: 14px; height: 14px;"></span> Analyzing...';
    btn.disabled = true;

    try {
        const payload = { feedback: listToAnalyze };
        const res = await fetch(`${API_BASE}/admin/analyze-ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        let data;
        try {
            data = await apiFetch(res);
        } catch (e) {
            console.error(e);
            const errText = e.message || "Failed to generate AI report.";
            showToast(errText, "error");
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }

        const modal = $('ai-modal');
        const content = $('ai-modal-content');
        
        let sentimentColor = 'var(--text-dim)';
        if (data.Sentiment === 'Positive') sentimentColor = '#22c55e';
        if (data.Sentiment === 'Negative') sentimentColor = '#ef4444';
        if (data.Sentiment === 'Neutral') sentimentColor = '#f59e0b';

        // Render structured DOM 
        content.innerHTML = `
            <div>
                <h4 style="margin:0 0 .5rem 0; color:var(--text-dim); text-transform:uppercase; font-size:0.75rem; letter-spacing:1px;">Class Sentiment</h4>
                <div style="font-weight:600; font-size:1.2rem; color:${sentimentColor};">${escHtml(data.Sentiment || 'Unknown')}</div>
            </div>
            
            <div>
                <h4 style="margin:0 0 .5rem 0; color:var(--text-dim); text-transform:uppercase; font-size:0.75rem; letter-spacing:1px;">Summary</h4>
                <p style="margin:0; font-size:.9rem; line-height:1.5;">${escHtml(data.Summary || 'No summary provided.')}</p>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start;">
                <div style="background: rgba(34, 197, 94, 0.05); border: 1px solid rgba(34, 197, 94, 0.2); padding: 1rem; border-radius: 8px;">
                    <h4 style="margin:0 0 .75rem 0; color:#22c55e;">💪 Strengths</h4>
                    <ul style="margin:0; padding-left:1.2rem; display:flex; flex-direction:column; gap:.4rem; font-size:.85rem;">
                        ${(data.Strengths || ['None detected']).map(i => `<li>${escHtml(i)}</li>`).join('')}
                    </ul>
                </div>
                <div style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); padding: 1rem; border-radius: 8px;">
                    <h4 style="margin:0 0 .75rem 0; color:#ef4444;">🎯 Areas for Improvement</h4>
                    <ul style="margin:0; padding-left:1.2rem; display:flex; flex-direction:column; gap:.4rem; font-size:.85rem;">
                        ${(data.AreasForImprovement || ['None detected']).map(i => `<li>${escHtml(i)}</li>`).join('')}
                    </ul>
                </div>
            </div>
            
            <div style="background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.2); padding: 1rem; border-radius: 8px;">
                <h4 style="margin:0 0 .75rem 0; color:var(--accent-color);">💡 Actionable Suggestions</h4>
                <ol style="margin:0; padding-left:1.2rem; display:flex; flex-direction:column; gap:.5rem; font-size:.85rem;">
                    ${(data.ActionableSuggestions || ['None provided']).map(i => `<li>${escHtml(i)}</li>`).join('')}
                </ol>
            </div>
        `;
        
        modal.classList.add('visible');

    } catch (err) {
        showToast(err.message || 'Something went wrong.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

