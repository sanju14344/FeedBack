const { supabase } = require('../utils/supabaseClient');

// Start a new feedback session for a department
exports.startSession = async (req, res) => {
  const { dept_id, cr_id } = req.body;
  if (!dept_id || !cr_id) return res.status(400).json({ error: 'dept_id and cr_id required' });
  try {
    // Close any existing active sessions for this dept
    await supabase
      .from('feedback_sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('dept_id', dept_id)
      .eq('is_active', true);

    // Create new session
    const { data, error } = await supabase
      .from('feedback_sessions')
      .insert([{ dept_id, cr_id, is_active: true }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// End the active session for a department
exports.endSession = async (req, res) => {
  const { dept_id, cr_id } = req.body;
  if (!dept_id) return res.status(400).json({ error: 'dept_id required' });
  try {
    const { data, error } = await supabase
      .from('feedback_sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('dept_id', dept_id)
      .eq('is_active', true)
      .select()
      .single();

    if (error) throw error;
    res.json(data || { message: 'No active session found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get session status for a department (used by CR dashboard)
exports.getSessionStatus = async (req, res) => {
  const { dept_id } = req.query;
  if (!dept_id) return res.status(400).json({ error: 'dept_id required' });
  try {
    const { data, error } = await supabase
      .from('feedback_sessions')
      .select('*')
      .eq('dept_id', dept_id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    res.json(data || { is_active: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all past and current sessions for a department with student participation count
exports.getSessionHistory = async (req, res) => {
  const { dept_id } = req.query;
  if (!dept_id) return res.status(400).json({ error: 'dept_id required' });
  
  try {
    // 1. Fetch all sessions for the dept
    const { data: sessions, error: sessionErr } = await supabase
      .from('feedback_sessions')
      .select('*')
      .eq('dept_id', dept_id)
      .order('started_at', { ascending: false });

    if (sessionErr) throw sessionErr;
    if (!sessions || sessions.length === 0) return res.json([]);

    // 2. Fetch all subjects for the dept
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id')
      .eq('department_id', dept_id);
    
    const subjectIds = (subjects || []).map(s => s.id);

    // 3. Fetch all feedback for these subjects (only need student_uid and created_at)
    let feedbackList = [];
    if (subjectIds.length > 0) {
      const { data: feedback } = await supabase
        .from('feedback')
        .select('student_uid, created_at')
        .in('subject_id', subjectIds);
      feedbackList = feedback || [];
    }

    // 4. Calculate unique students per session
    const history = sessions.map(session => {
      const start = new Date(session.started_at);
      const end = session.ended_at ? new Date(session.ended_at) : new Date();

      // Filter feedback within this timeframe
      const sessionFeedback = feedbackList.filter(fb => {
        const fbTime = new Date(fb.created_at);
        return fbTime >= start && fbTime <= end;
      });

      // Count unique students
      const uniqueStudents = new Set(sessionFeedback.map(fb => fb.student_uid)).size;

      return {
        ...session,
        student_count: uniqueStudents
      };
    });

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
