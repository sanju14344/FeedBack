import os
import json
import uuid
import base64
import bcrypt
import openai
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

# Admin credentials from env
ADMIN_EMAIL    = os.environ.get("ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

# In-memory set of valid admin session tokens
_admin_tokens: set = set()


# ── Helpers ────────────────────────────────────────────────────
def ok(data, status=200):
    return jsonify(data), status

def err(message, status=400):
    return jsonify({"error": message}), status

def db_err(e):
    msg = str(e)
    if "ConnectTimeout" in msg or "ConnectionError" in msg or "WinError" in msg:
        return err(
            "Cannot reach the database server. Your Supabase project may be paused "
            "(free tier pauses after inactivity). Visit supabase.com to resume it.",
            503,
        )
    return err(f"Database error: {msg}", 500)

def require_admin():
    """Returns the token if valid, else None."""
    token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if token and token in _admin_tokens:
        return token
    return None


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


@app.route('/api/departments-by-year/<year>', methods=['GET'])
def get_departments_by_year(year):
    """Return distinct departments that have at least one subject OR a registered CR for the given year."""
    try:
        # Get all departments first
        all_depts_res = supabase.table('departments').select('*').execute()
        all_depts = all_depts_res.data
        if not all_depts:
            return ok([])

        # Get department IDs from subjects that have this year
        subj_res = supabase.table('subjects').select('department_id').eq('year', year).execute()
        valid_dept_ids = set(row['department_id'] for row in subj_res.data if row.get('department_id'))

        # Get department names from CR profiles that have this year
        cr_res = supabase.table('cr_profiles').select('department').eq('year', str(year)).execute()
        valid_dept_names = set(row['department'] for row in cr_res.data if row.get('department'))

        # Filter the full list
        depts = []
        for d in all_depts:
            if d['id'] in valid_dept_ids or d['name'] in valid_dept_names:
                depts.append(d)

        depts.sort(key=lambda x: x['name'])
        return ok(depts)
    except Exception as e:
        return db_err(e)



@app.route('/api/submit-feedback', methods=['POST'])
def submit_feedback():
    data = request.get_json(silent=True) or {}
    student_uid   = data.get('student_uid', '').strip()
    subject_id    = data.get('subject_id', '').strip()
    staff_id      = data.get('staff_id', '').strip()
    comment       = data.get('feedback_text', '').strip()

    # Ratings q1..q6
    questions = [
        "Does the teacher explain the subject clearly",
        "Does the teacher finish the syllabus on time",
        "Do the teaching methods help you understand the subject",
        "Does the teacher encourage questions and participation",
        "Are the tests, marks, and feedback fair and helpful",
        "Overall satisfaction with the teacher's teaching",
    ]
    ratings = {}
    for i in range(1, 7):
        val = data.get(f'q{i}')
        if val is None:
            return err(f"Rating q{i} is required")
        try:
            val = int(val)
            if not (1 <= val <= 5):
                raise ValueError()
            ratings[f'q{i}'] = val
        except (ValueError, TypeError):
            return err(f"q{i} must be an integer between 1 and 5")

    if not all([student_uid, subject_id]):
        return err("Missing required fields: student_uid, subject_id")

    # staff_id is optional (subject may not have a linked staff yet)
    staff_id = staff_id if staff_id and staff_id != 'none' else None

    # Check for duplicate submission
    try:
        dup = supabase.table('feedback') \
            .select('id') \
            .eq('student_uid', student_uid) \
            .eq('subject_id', subject_id) \
            .execute()
        if dup.data:
            return err("You have already submitted feedback for this subject.", 409)
    except Exception as e:
        return db_err(e)

    # Build synthetic feedback_text from ratings + optional comment
    parts = [f"{q}: {ratings[f'q{i+1}']}/5" for i, q in enumerate(questions)]
    if comment:
        parts.append(f"Comment: {comment}")
    feedback_text = "; ".join(parts)

    label, score = analyze_sentiment(comment if comment else feedback_text)
    entry = {
        "student_uid":     student_uid,
        "subject_id":      subject_id,
        "staff_id":        staff_id,
        "feedback_text":   feedback_text,
        "sentiment_label": label,
        "sentiment_score": score,
        **ratings,
    }
    try:
        res = supabase.table('feedback').insert(entry).execute()
        if not res.data:
            return err("Failed to save feedback", 500)
        return ok({"message": "Feedback submitted successfully",
                   "id": res.data[0].get('id'), "sentiment": label}, 201)
    except Exception as e:
        msg = str(e)
        if 'unique' in msg.lower() or 'duplicate' in msg.lower():
            return err("You have already submitted feedback for this subject.", 409)
        return db_err(e)


@app.route('/api/check-submission', methods=['GET'])
def check_submission():
    """Check if a student already submitted feedback for a specific subject."""
    student_uid = request.args.get('student_uid', '').strip()
    subject_id  = request.args.get('subject_id', '').strip()
    if not student_uid or not subject_id:
        return err("student_uid and subject_id are required")
    try:
        res = supabase.table('feedback') \
            .select('id') \
            .eq('student_uid', student_uid) \
            .eq('subject_id', subject_id) \
            .execute()
        return ok({"submitted": len(res.data) > 0})
    except Exception as e:
        return db_err(e)


@app.route('/api/staff-for-subject/<subject_id>', methods=['GET'])
def staff_for_subject(subject_id):
    """Return the staff member(s) linked to a subject."""
    try:
        res = supabase.table('staff') \
            .select('id, name') \
            .eq('subject_id', subject_id) \
            .execute()
        return ok(res.data)
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
            return ok({"is_cr": False, "detail": "Database unreachable"})
        return ok({"is_cr": False, "detail": msg})


@app.route('/api/auth/cr-signup', methods=['POST'])
def cr_signup():
    data       = request.get_json(silent=True) or {}
    uid        = data.get('uid', '').strip()
    email      = data.get('email', '').strip()
    full_name  = data.get('full_name', '').strip()
    department = data.get('department', '').strip()
    year       = data.get('year', '').strip()

    if not uid or not email:
        return err("uid and email are required")

    row = {"id": uid, "email": email, "full_name": full_name or email}
    if department:
        row["department"] = department
    if year:
        row["year"] = year

    try:
        supabase.table('cr_profiles').upsert(row).execute()
        return ok({"message": "CR profile created", "id": uid}, 201)
    except Exception as e:
        msg = str(e)
        if "cr_profiles_id_fkey" in msg:
            return err("This email is already registered. If you signed up previously, please sign in. If you want to become a CR, please use a new email address.", 400)
        return db_err(e)





@app.route('/api/auth/cr-profile', methods=['GET'])
def get_cr_profile():
    uid = request.args.get('uid', '').strip()
    if not uid:
        return err("uid is required")
    try:
        res = supabase.table('cr_profiles').select('*').eq('id', uid).execute()
        if not res.data:
            return err("CR not found", 404)
        profile = res.data[0]
        profile.pop('passcode_hash', None)
        return ok(profile)
    except Exception as e:
        return db_err(e)


@app.route('/api/auth/cr-profile', methods=['PATCH'])
def update_cr_profile():
    data       = request.get_json(silent=True) or {}
    uid        = data.get('uid', '').strip()
    full_name  = data.get('full_name', '').strip()
    department = data.get('department', '').strip()
    year       = data.get('year', '').strip()
    bio        = data.get('bio', '').strip()

    if not uid:
        return err("uid is required")

    updates = {}
    if full_name:  updates['full_name']  = full_name
    if department is not None: updates['department'] = department
    if year       is not None: updates['year']       = year
    if bio        is not None: updates['bio']        = bio

    try:
        supabase.table('cr_profiles').update(updates).eq('id', uid).execute()
        return ok({"message": "Profile updated"})
    except Exception as e:
        return db_err(e)


@app.route('/api/auth/cr-avatar', methods=['POST'])
def upload_cr_avatar():
    uid  = request.form.get('uid', '').strip()
    file = request.files.get('avatar')
    if not uid or not file:
        return err("uid and avatar file are required")

    file_bytes = file.read()
    mime       = file.content_type or 'image/jpeg'
    b64        = base64.b64encode(file_bytes).decode()
    data_url   = f"data:{mime};base64,{b64}"

    try:
        supabase.table('cr_profiles').update({'avatar_url': data_url}).eq('id', uid).execute()
        return ok({"message": "Avatar updated", "avatar_url": data_url})
    except Exception as e:
        return db_err(e)


# ══════════════════════════════════════════════════════════════
# SUPER-ADMIN AUTH ENDPOINTS
# ══════════════════════════════════════════════════════════════

@app.route('/api/auth/admin-login', methods=['POST'])
def admin_login():
    """Verify admin credentials from .env and return a session token."""
    data     = request.get_json(silent=True) or {}
    email    = data.get('email', '').strip()
    password = data.get('password', '').strip()

    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        return err("Admin credentials not configured on the server.", 500)

    if email != ADMIN_EMAIL or password != ADMIN_PASSWORD:
        return err("Invalid admin credentials.", 401)

    token = str(uuid.uuid4())
    _admin_tokens.add(token)
    return ok({"token": token, "message": "Admin login successful"})


@app.route('/api/auth/admin-check', methods=['GET'])
def admin_check():
    """Check whether the provided Authorization token is a valid admin token."""
    if require_admin():
        return ok({"is_admin": True})
    return ok({"is_admin": False}, 401)


@app.route('/api/auth/admin-logout', methods=['POST'])
def admin_logout():
    token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    _admin_tokens.discard(token)
    return ok({"message": "Logged out"})


# ══════════════════════════════════════════════════════════════
# SUPER-ADMIN: CR MANAGEMENT
# ══════════════════════════════════════════════════════════════

@app.route('/api/admin/all-crs', methods=['GET'])
def get_all_crs():
    """Return all CR profiles (admin only)."""
    if not require_admin():
        return err("Unauthorized", 401)
    try:
        res = supabase.table('cr_profiles') \
            .select('id, email, full_name, department, bio, created_at') \
            .order('created_at', desc=True).execute()
        return ok(res.data)
    except Exception as e:
        return db_err(e)


@app.route('/api/admin/cr/<uid>', methods=['PATCH'])
def admin_edit_cr(uid):
    """Update a CR's name or department (admin only)."""
    if not require_admin():
        return err("Unauthorized", 401)
    data = request.get_json(silent=True) or {}
    updates = {}
    if 'full_name'  in data: updates['full_name']  = data['full_name'].strip()
    if 'department' in data: updates['department'] = data['department'].strip()
    if not updates:
        return err("Nothing to update")
    try:
        supabase.table('cr_profiles').update(updates).eq('id', uid).execute()
        return ok({"message": "CR updated"})
    except Exception as e:
        return db_err(e)


@app.route('/api/admin/cr/<uid>', methods=['DELETE'])
def admin_delete_cr(uid):
    """Delete a CR profile and revoke their Supabase auth (admin only)."""
    if not require_admin():
        return err("Unauthorized", 401)
    try:
        # Delete from our cr_profiles table
        supabase.table('cr_profiles').delete().eq('id', uid).execute()

        # Delete Supabase auth user via service-key client
        svc_key = os.environ.get("SUPABASE_SERVICE_KEY", "")
        svc_url = os.environ.get("SUPABASE_URL", "")
        if svc_key and svc_url:
            from supabase import create_client
            svc = create_client(svc_url, svc_key)
            try:
                svc.auth.admin.delete_user(uid)
            except Exception:
                pass  # Profile deleted even if auth removal fails

        return ok({"message": "CR deleted"})
    except Exception as e:
        return db_err(e)


# ══════════════════════════════════════════════════════════════
# ADMIN ENDPOINTS (CR Dashboard)
# ══════════════════════════════════════════════════════════════

@app.route('/api/admin/feedback', methods=['GET'])
def get_all_feedback():
    dept_name = request.args.get('dept', '').strip()
    try:
        if dept_name:
            dept_res = supabase.table('departments').select('id').eq('name', dept_name).execute()
            if not dept_res.data:
                return ok([])
            dept_id = dept_res.data[0]['id']

            subj_res = supabase.table('subjects').select('id').eq('department_id', dept_id).execute()
            subject_ids = [s['id'] for s in subj_res.data]
            
            if not subject_ids:
                return ok([])

            res = (supabase.table('feedback')
                   .select('*, subjects(name), staff(name)')
                   .in_('subject_id', subject_ids)
                   .order('created_at', desc=True)
                   .execute())
            return ok(res.data)

        # Default (no department filter)
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
        dist[f.get('sentiment_label', 'Neutral')] += 1
    compliments, complaints = extract_key_points(data)
    return ok({
        "count": len(data),
        "sentiment_dist": dist,
        "avg_score": round(sum(f.get('sentiment_score', 0) or 0 for f in data) / len(data), 2),
        "compliments": compliments, "complaints": complaints, "feedback": data,
    })


@app.route('/api/admin/analyze-ai', methods=['POST'])
def analyze_feedback_ai():
    """Uses OpenAI to analyze a batch of feedback and return structured insights."""
    if not openai:
        return err("OpenAI package not installed.", 500)
    
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return err("OpenAI API key is missing. Please set OPENAI_API_KEY.", 500)
    
    data = request.get_json(silent=True) or {}
    feedback_list = data.get('feedback', [])
    if not feedback_list:
        return err("No feedback provided to analyze.")
        
    # Extract only the text to save tokens
    texts = [f.get('feedback_text', '').strip() for f in feedback_list if f.get('feedback_text', '').strip()]
    if not texts:
        return err("Feedback list contains no text.")
        
    prompt = (
        "Analyze the following student feedback and provide a JSON response with exactly these fields:\n"
        "- Sentiment (string: Positive, Neutral, or Negative)\n"
        "- Summary (string: short summary, max 3 lines)\n"
        "- Strengths (array of 2-3 short strings)\n"
        "- AreasForImprovement (array of 2-3 short strings)\n"
        "- ActionableSuggestions (array of 2-3 short strings for the teacher)\n\n"
        "Make sure language is simple, output is concise, and you avoid repeating the same points.\n\n"
        "Feedback:\n" + "\n".join(texts)
    )
    
    client = openai.OpenAI(api_key=api_key)
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert educational analyst. Always respond in valid JSON format."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)
        return ok(result)
    except Exception as e:
        return err(f"OpenAI API error: {str(e)}", 500)


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
        dist[f.get('sentiment_label', 'Neutral')] += 1
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
    year = str(data.get('year', '')).strip()
    if year == 'None': year = ''
    if not name or not dept:
        return err("name and department_id are required")
    try:
        row = {"name": name, "department_id": dept}
        if year:
            row["year"] = int(year)
            
        res = supabase.table('subjects').upsert(
            row,
            on_conflict="name,department_id"
        ).execute()
        if not res.data:
            return err("Failed to create subject", 500)
        return ok(res.data[0], 201)
    except Exception as e:
        return db_err(e)


@app.route('/api/admin/subjects/<subject_id>', methods=['DELETE'])
def delete_subject(subject_id):
    try:
        supabase.table('subjects').delete().eq('id', subject_id).execute()
        return ok({"message": "Subject deleted"})
    except Exception as e:
        return db_err(e)


@app.route('/api/admin/all-subjects', methods=['GET'])
def get_all_subjects():
    try:
        res = supabase.table('subjects').select('*, departments(name)').order('name').execute()
        return ok(res.data)
    except Exception as e:
        return db_err(e)


# ── Manage: Staff ──────────────────────────────────────────────
@app.route('/api/admin/staff', methods=['POST'])
def add_staff():
    data       = request.get_json(silent=True) or {}
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
    try:
        try:
            res = supabase.table('staff').select('*, subjects(name)').order('name').execute()
            staff_list = []
            for s in res.data:
                item = {k: v for k, v in s.items() if k != 'subjects'}
                item['subject_name'] = (s.get('subjects') or {}).get('name', '')
                staff_list.append(item)
            return ok(staff_list)
        except Exception:
            res = supabase.table('staff').select('*').order('name').execute()
            for s in res.data:
                s['subject_name'] = ''
            return ok(res.data)
    except Exception as e:
        return db_err(e)


@app.route('/api/admin/staff/<staff_id>', methods=['DELETE'])
def delete_staff(staff_id):
    try:
        supabase.table('staff').delete().eq('id', staff_id).execute()
        return ok({"message": "Staff member deleted"})
    except Exception as e:
        return db_err(e)


# ── Frontend route ─────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')


if __name__ == '__main__':
    print("🚀 FeedbackPulse running at http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
