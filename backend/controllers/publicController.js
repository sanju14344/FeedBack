const { supabase } = require('../utils/supabaseClient');
const { analyzeSingleFeedback } = require('../services/aiService');

exports.getDepartments = async (req, res) => {
  const { data, error } = await supabase.from('departments').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

exports.getSubjects = async (req, res) => {
  const { dept_id } = req.params;
  const { year } = req.query;
  let query = supabase.from('subjects').select('*').eq('department_id', dept_id);
  if (year) {
    query = query.eq('year', year);
  }
  const { data, error } = await query.order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};


exports.getStaff = async (req, res) => {
  const { dept_id } = req.params;
  const { data, error } = await supabase.from('staff').select('*').eq('department_id', dept_id).order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

exports.getDepartmentsByYear = async (req, res) => {
  const { year } = req.params;
  try {
    const { data: allDepts } = await supabase.from('departments').select('*');
    const { data: subjData } = await supabase.from('subjects').select('department_id').eq('year', year);
    const { data: crData } = await supabase.from('cr_profiles').select('department').eq('year', String(year));
    
    const validIds = new Set((subjData || []).map(s => s.department_id));
    const validNames = new Set((crData || []).map(c => c.department));
    
    const validDepts = (allDepts || []).filter(d => validIds.has(d.id) || validNames.has(d.name));
    validDepts.sort((a,b) => a.name.localeCompare(b.name));
    res.json(validDepts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.submitFeedback = async (req, res) => {
  const { student_uid, subject_id, staff_id, feedback_text, ...ratings } = req.body;
  if (!student_uid || !subject_id) return res.status(400).json({ error: "Missing required fields" });

  try {
    // 1. Find department_id for this subject
    const { data: subjectInfo } = await supabase.from('subjects').select('department_id').eq('id', subject_id).single();
    if (!subjectInfo) return res.status(400).json({ error: "Invalid subject" });

    // 2. Find active session for this department
    const { data: activeSession } = await supabase.from('feedback_sessions')
      .select('id')
      .eq('dept_id', subjectInfo.department_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!activeSession) return res.status(403).json({ error: "No active session for this department" });

    // 3. Check for duplicates in the current session
    const { data: dup } = await supabase.from('feedback').select('id')
      .eq('student_uid', student_uid)
      .eq('subject_id', subject_id)
      .eq('session_id', activeSession.id);
    if (dup && dup.length > 0) return res.status(409).json({ error: "Already submitted for this session" });

    // Build feedback string and values
    const questions = [
      "Teacher explains clearly", "Finishes syllabus on time", "Methods help understand",
      "Encourages questions", "Tests/marks fair", "Overall satisfaction"
    ];
    let parts = [];
    let starValues = [];
    for (let i = 1; i <= 6; i++) {
      const q = ratings[`q${i}`];
      if (!q || q < 1 || q > 5) return res.status(400).json({ error: `Invalid rating for q${i}` });
      starValues.push(Number(q));
      
      let part = `${questions[i-1]}: ${q}/5`;
      if (req.body.question_comments && req.body.question_comments[`q${i}`]) {
        part += ` (Comment: ${req.body.question_comments[`q${i}`]})`;
      }
      parts.push(part);
    }
    if (feedback_text) parts.push(`General Comment: ${feedback_text}`);
    const fullText = parts.join("; ");

    // Analyze using AI
    const aiResult = await analyzeSingleFeedback(fullText, starValues);

    const entry = {
      student_uid, subject_id,
      staff_id: staff_id && staff_id !== 'none' ? staff_id : null,
      feedback_text: fullText,
      sentiment_label: aiResult.label,
      sentiment_score: aiResult.score,
      q1: starValues[0], q2: starValues[1], q3: starValues[2],
      q4: starValues[3], q5: starValues[4], q6: starValues[5],
      session_id: activeSession.id
    };

    const { data, error } = await supabase.from('feedback').insert(entry).select();
    if (error) return res.status(500).json({ error: error.message });
    
    res.status(201).json({ message: "Success", id: data[0].id, sentiment: aiResult.label });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getSubmittedSubjects = async (req, res) => {
  const { student_uid, dept_id } = req.query;
  if (!student_uid || !dept_id) return res.status(400).json({ error: 'Missing student_uid or dept_id' });
  try {
    // 1. Get active session for this department
    const { data: activeSession } = await supabase.from('feedback_sessions')
      .select('id')
      .eq('dept_id', dept_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!activeSession) return res.json([]); // No active session means no feedback to show for current session

    // 2. Get all subject IDs for this department
    const { data: subjects } = await supabase.from('subjects').select('id').eq('department_id', dept_id);
    const subjectIds = (subjects || []).map(s => s.id);
    if (subjectIds.length === 0) return res.json([]);

    // 3. Get feedback rows for this student in those subjects FOR THE ACTIVE SESSION
    const { data: fb } = await supabase.from('feedback')
      .select('subject_id')
      .eq('student_uid', student_uid)
      .eq('session_id', activeSession.id)
      .in('subject_id', subjectIds);
    res.json((fb || []).map(f => f.subject_id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
