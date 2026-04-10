-- ============================================================
-- FeedbackPulse Database Schema
-- Run this in Supabase → SQL Editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Departments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Subjects ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, department_id)
);

-- ── Staff ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    subject_id    UUID REFERENCES subjects(id) ON DELETE SET NULL,  -- NEW
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── CR Profiles ────────────────────────────────────────────────
-- id must match the Supabase auth user UID for the CR
CREATE TABLE IF NOT EXISTS cr_profiles (
    id            TEXT PRIMARY KEY,        -- Supabase auth UID
    email         TEXT NOT NULL UNIQUE,
    full_name     TEXT,
    passcode_hash TEXT,                    -- bcrypt hash of the 4–8 digit passcode
    department    TEXT,                    -- NEW: CR's department
    year          TEXT,                    -- NEW: CR's year (e.g., 1st, 2nd, 3rd, 4th)
    bio           TEXT,                    -- NEW: CR bio
    avatar_url    TEXT,                    -- NEW: profile picture (base64 data URL or external URL)
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Feedback ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_uid     TEXT NOT NULL,
    subject_id      UUID REFERENCES subjects(id) ON DELETE CASCADE,
    staff_id        UUID REFERENCES staff(id) ON DELETE CASCADE,
    feedback_text   TEXT NOT NULL,
    sentiment_label TEXT CHECK (sentiment_label IN ('Positive', 'Neutral', 'Negative')),
    sentiment_score FLOAT,
    -- 6 structured rating questions (1–5 stars)
    q1              SMALLINT CHECK (q1 BETWEEN 1 AND 5),  -- Teacher explains clearly
    q2              SMALLINT CHECK (q2 BETWEEN 1 AND 5),  -- Finishes syllabus on time
    q3              SMALLINT CHECK (q3 BETWEEN 1 AND 5),  -- Teaching methods helpful
    q4              SMALLINT CHECK (q4 BETWEEN 1 AND 5),  -- Encourages questions
    q5              SMALLINT CHECK (q5 BETWEEN 1 AND 5),  -- Tests/marks fair
    q6              SMALLINT CHECK (q6 BETWEEN 1 AND 5),  -- Overall satisfaction
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    -- Prevent duplicate submissions per student per subject
    UNIQUE (student_uid, subject_id)
);


-- ── Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_feedback_subject  ON feedback(subject_id);
CREATE INDEX IF NOT EXISTS idx_feedback_staff    ON feedback(staff_id);
CREATE INDEX IF NOT EXISTS idx_feedback_label    ON feedback(sentiment_label);
CREATE INDEX IF NOT EXISTS idx_cr_email          ON cr_profiles(email);

-- ── ALTER statements for existing databases ────────────────────
-- Run these if you already have the tables and need to add new columns:
-- ALTER TABLE cr_profiles ADD COLUMN IF NOT EXISTS department TEXT;
-- ALTER TABLE cr_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
-- ALTER TABLE cr_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
-- ALTER TABLE staff ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;

-- ── Row Level Security (enable for production) ─────────────────
-- ALTER TABLE feedback     ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cr_profiles  ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE departments  ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE subjects     ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE staff        ENABLE ROW LEVEL SECURITY;

-- Policy examples:
-- CREATE POLICY "Students can insert own feedback"
--     ON feedback FOR INSERT WITH CHECK (auth.uid()::text = student_uid);
-- CREATE POLICY "CRs can read all feedback"
--     ON feedback FOR SELECT USING (
--         EXISTS (SELECT 1 FROM cr_profiles WHERE id = auth.uid()::text)
--     );
