import os
import base64
import bcrypt
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from supabase_client import get_supabase
from sentiment import analyze_sentiment, extract_key_points
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret-change-in-prod")
CORS(app, resources={r"/api/*": {"origins": "*"}})

supabase = get_supabase()


# ── Helpers ────────────────────────────────────────────────────
def ok(data, status=200):
    return jsonify(data), status

def err(message, status=400):
    return jsonify({"error": message}), status

def db_err(e):
    """Convert a Supabase / network exception into a clean 503 response."""
    msg = str(e)
    if "ConnectTimeout" in msg or "ConnectionError" in msg or "WinError" in msg:
        return err(
            "Cannot reach the database server. Your Supabase project may be paused "
            "(free tier pauses after inactivity). Please visit supabase.com, open your "
            "project, and wait for it to resume, then try again.",
            503,
        )
    return err(f"Database error: {msg}", 500)


# ══════════════════════════════════════════════════════════════
# PUBLIC ENDPOINTS (Students)
# ══════════════════════════════════════════════════════════════

@app.route('/api/departments', methods=['GET'])
def get_departments():
    try:
        res = supabase.table('departments').select('*').order('name').execute()
        return ok(res.data)
    except Exception as e:
        return db_err(e)


@app.route('/api/subjects/<dept_id>', methods=['GET'])
def get_subjects(dept_id):
    try:
        res = supabase.table('subjects').select('*').eq('department_id', dept_id).order('name').execute()
        return ok(res.data)
    except Exception as e:
        return db_err(e)


@app.route('/api/staff/<dept_id>', methods=['GET'])
def get_staff(dept_id):
    try:
        res = supabase.table('staff').select('*').eq('department_id', dept_id).order('name').execute()
        return ok(res.data)
    except Exception as e:
        return db_err(e)


@app.route('/api/submit-feedback', methods=['POST'])
def submit_feedback():
    data = request.get_json(silent=True) or {}
    student_uid   = data.get('student_uid', '').strip()
    subject_id    = data.get('subject_id', '').strip()
    staff_id      = data.get('staff_id', '').strip()
    feedback_text = data.get('feedback_text', '').strip()

    if not all([student_uid, subject_id, staff_id, feedback_text]):
        return err("Missing required fields: student_uid, subject_id, staff_id, feedback_text")

    if len(feedback_text) < 10:
        return err("Feedback must be at least 10 characters long")

    if len(feedback_text) > 2000:
        return err("Feedback must not exceed 2000 characters")

    label, score = analyze_sentiment(feedback_text)

    entry = {
        "student_uid":     student_uid,
        "subject_id":      subject_id,
        "staff_id":        staff_id,
        "feedback_text":   feedback_text,
        "sentiment_label": label,
        "sentiment_score": score,
    }

    try:
        res = supabase.table('feedback').insert(entry).execute()
        if not res.data:
            return err("Failed to save feedback", 500)
        new_id = res.data[0].get('id')
        return ok({"message": "Feedback submitted successfully", "id": new_id, "sentiment": label}, 201)
    except Exception as e:
        return db_err(e)


# ══════════════════════════════════════════════════════════════
# AUTH ENDPOINTS (CR)
# ══════════════════════════════════════════════════════════════

@app.route('/api/auth/check-cr', methods=['GET'])
def check_cr():
    uid = request.args.get('uid', '').strip()
    if not uid:
        return err("uid is required")
    try:
        res = supabase.table('cr_profiles').select('id').eq('id', uid).execute()
        return ok({"is_cr": len(res.data) > 0})
    except Exception as e:
        msg = str(e)
        if "ConnectTimeout" in msg or "WinError" in msg:
            return ok({"is_cr": False, "detail": "Database unreachable — project may be paused"})
        return ok({"is_cr": False, "detail": msg})


@app.route('/api/auth/cr-signup', methods=['POST'])
def cr_signup():
    """
    Register a new CR.  Called after Supabase creates the auth user.
    Body: { uid, email, full_name, passcode, department? }
    """
    data       = request.get_json(silent=True) or {}
    uid        = data.get('uid', '').strip()
    email      = data.get('email', '').strip()
    full_name  = data.get('full_name', '').strip()
    passcode   = data.get('passcode', '').strip()
    department = data.get('department', '').strip()

    if not uid or not email:
        return err("uid and email are required")

    if passcode:
        if not passcode.isdigit() or not (4 <= len(passcode) <= 8):
            return err("Passcode must be 4–8 digits")
        hashed = bcrypt.hashpw(passcode.encode(), bcrypt.gensalt()).decode()
    else:
        hashed = None

    row = {"id": uid, "email": email, "full_name": full_name or email}
    if hashed:
        row["passcode_hash"] = hashed
    if department:
        row["department"] = department

    try:
        res = supabase.table('cr_profiles').upsert(row).execute()
        return ok({"message": "CR profile created", "id": uid}, 201)
    except Exception as e:
        return db_err(e)


@app.route('/api/auth/verify-passcode', methods=['POST'])
def verify_passcode():
    """
    Verify the CR passcode on re-login.
    Body: { uid, passcode }
    """
    data     = request.get_json(silent=True) or {}
    uid      = data.get('uid', '').strip()
    passcode = data.get('passcode', '').strip()

    if not uid or not passcode:
        return err("uid and passcode are required")

    try:
        res = supabase.table('cr_profiles').select('passcode_hash').eq('id', uid).execute()
    except Exception as e:
        return db_err(e)

    if not res.data:
        return err("CR not found", 404)

    stored_hash = res.data[0].get('passcode_hash')
    if not stored_hash:
        return ok({"verified": True, "note": "No passcode set"})

    match = bcrypt.checkpw(passcode.encode(), stored_hash.encode())
    if match:
        return ok({"verified": True})
    else:
        return ok({"verified": False}, 401)


@app.route('/api/auth/cr-profile', methods=['GET'])
def get_cr_profile():
    """Get CR profile details for the profile tab."""
    uid = request.args.get('uid', '').strip()
    if not uid:
        return err("uid is required")
    try:
        res = supabase.table('cr_profiles').select('*').eq('id', uid).execute()
        if not res.data:
            return err("CR not found", 404)
        profile = res.data[0]
        # Remove sensitive fields
        profile.pop('passcode_hash', None)
        return ok(profile)
    except Exception as e:
        return db_err(e)


@app.route('/api/auth/cr-profile', methods=['PATCH'])
def update_cr_profile():
    """Update CR profile: full_name, department, bio."""
    data       = request.get_json(silent=True) or {}
    uid        = data.get('uid', '').strip()
    full_name  = data.get('full_name', '').strip()
    department = data.get('department', '').strip()
    bio        = data.get('bio', '').strip()

    if not uid:
        return err("uid is required")

    updates = {}
    if full_name:
        updates['full_name'] = full_name
    if department is not None:
        updates['department'] = department
    if bio is not None:
        updates['bio'] = bio

    try:
        supabase.table('cr_profiles').update(updates).eq('id', uid).execute()
        return ok({"message": "Profile updated"})
    except Exception as e:
        return db_err(e)


@app.route('/api/auth/cr-avatar', methods=['POST'])
def upload_cr_avatar():
    """Upload profile picture for CR. Stores as base64 data URL in cr_profiles.avatar_url."""
    uid = request.form.get('uid', '').strip()
    file = request.files.get('avatar')

    if not uid or not file:
        return err("uid and avatar file are required")

    # Read file and convert to base64 data URL
    file_bytes = file.read()
    mime = file.content_type or 'image/jpeg'
    b64 = base64.b64encode(file_bytes).decode()
    data_url = f"data:{mime};base64,{b64}"

    try:
        supabase.table('cr_profiles').update({'avatar_url': data_url}).eq('id', uid).execute()
        return ok({"message": "Avatar updated", "avatar_url": data_url})
    except Exception as e:
        return db_err(e)


# ══════════════════════════════════════════════════════════════
# ADMIN ENDPOINTS (CR)
# NOTE: In production, validate the Supabase JWT from
#       Authorization: Bearer <token> header in every admin route.
# ══════════════════════════════════════════════════════════════

@app.route('/api/admin/feedback', methods=['GET'])
def get_all_feedback():
    try:
        res = (supabase.table('feedback')
               .select('*, subjects(name), staff(name)')
               .order('created_at', desc=True)
               .execute())
        return ok(res.data)
    except Exception as e:
        return db_err(e)


@app.route('/api/admin/feedback/<feedback_id>', methods=['DELETE'])
def delete_feedback(feedback_id):
    try:
        supabase.table('feedback').delete().eq('id', feedback_id).execute()
        return ok({"message": "Feedback deleted"})
    except Exception as e:
        return db_err(e)


@app.route('/api/admin/reports/subject/<subject_id>', methods=['GET'])
def get_subject_report(subject_id):
    try:
        res = supabase.table('feedback').select('*').eq('subject_id', subject_id).execute()
    except Exception as e:
        return db_err(e)

    data = res.data

    if not data:
        return ok({"count": 0, "sentiment_dist": {}, "compliments": [], "complaints": []})

    dist = {"Positive": 0, "Neutral": 0, "Negative": 0}
    for f in data:
        lbl = f.get('sentiment_label', 'Neutral')
        dist[lbl] = dist.get(lbl, 0) + 1

    compliments, complaints = extract_key_points(data)

    return ok({
        "count": len(data),
        "sentiment_dist": dist,
        "avg_score": round(sum(f.get('sentiment_score', 0) or 0 for f in data) / len(data), 2),
        "compliments": compliments,
        "complaints": complaints,
        "feedback": data,
    })


@app.route('/api/admin/reports/staff/<staff_id>', methods=['GET'])
def get_staff_report(staff_id):
    try:
        res = supabase.table('feedback').select('*').eq('staff_id', staff_id).execute()
    except Exception as e:
        return db_err(e)

    data = res.data

    if not data:
        return ok({"count": 0, "sentiment_dist": {}})

    dist = {"Positive": 0, "Neutral": 0, "Negative": 0}
    for f in data:
        lbl = f.get('sentiment_label', 'Neutral')
        dist[lbl] = dist.get(lbl, 0) + 1

    return ok({
        "count": len(data),
        "sentiment_dist": dist,
        "avg_score": round(sum(f.get('sentiment_score', 0) or 0 for f in data) / len(data), 2),
    })


# ── Manage: Departments ────────────────────────────────────────
@app.route('/api/admin/departments', methods=['POST'])
def add_department():
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()
    if not name:
        return err("Department name is required")

    try:
        res = supabase.table('departments').insert({"name": name}).execute()
        if not res.data:
            return err("Failed to create department", 500)
        return ok(res.data[0], 201)
    except Exception as e:
        return db_err(e)


# ── Manage: Subjects ───────────────────────────────────────────
@app.route('/api/admin/subjects', methods=['POST'])
def add_subject():
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()
    dept = data.get('department_id', '').strip()
    if not name or not dept:
        return err("name and department_id are required")

    try:
        # Upsert to avoid duplicates (same name + dept combo)
        res = supabase.table('subjects').upsert(
            {"name": name, "department_id": dept},
            on_conflict="name,department_id"
        ).execute()
        if not res.data:
            return err("Failed to create subject", 500)
        return ok(res.data[0], 201)
    except Exception as e:
        return db_err(e)


# ── Manage: Staff ──────────────────────────────────────────────
@app.route('/api/admin/staff', methods=['POST'])
def add_staff():
    data = request.get_json(silent=True) or {}
    name       = data.get('name', '').strip()
    dept       = data.get('department_id', '').strip()
    subject_id = data.get('subject_id', '').strip()

    if not name or not dept:
        return err("name and department_id are required")

    row = {"name": name, "department_id": dept}
    if subject_id:
        row["subject_id"] = subject_id

    try:
        res = supabase.table('staff').insert(row).execute()
        if not res.data:
            return err("Failed to create staff member", 500)
        return ok(res.data[0], 201)
    except Exception as e:
        return db_err(e)


@app.route('/api/admin/all-staff', methods=['GET'])
def get_all_staff():
    """Return all staff with subject name for the live staff list."""
    try:
        res = supabase.table('staff').select('*, subjects(name)').order('name').execute()
        # Flatten subject name
        staff_list = []
        for s in res.data:
            item = {k: v for k, v in s.items() if k != 'subjects'}
            item['subject_name'] = s.get('subjects', {}).get('name', '') if s.get('subjects') else ''
            staff_list.append(item)
        return ok(staff_list)
    except Exception as e:
        return db_err(e)


# ── Frontend route ─────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')


if __name__ == '__main__':
    print("🚀 FeedbackPulse running at http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
