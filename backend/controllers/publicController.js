const { supabase } = require('../utils/supabaseClient');
const { analyzeSingleFeedback } = require('../services/aiService');

exports.getDepartments = async (req, res) => {
  const { data, error } = await supabase.from('departments').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

exports.getSubjects = async (req, res) => {
  const { dept_id } = req.params;
  const { data, error } = await supabase.from('subjects').select('*').eq('department_id', dept_id).order('name');
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
    const { data: dup } = await supabase.from('feedback').select('id')
      .eq('student_uid', student_uid).eq('subject_id', subject_id);
    if (dup && dup.length > 0) return res.status(409).json({ error: "Already submitted" });

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
      parts.push(`${questions[i-1]}: ${q}/5`);
    }
    if (feedback_text) parts.push(`Comment: ${feedback_text}`);
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
      q4: starValues[3], q5: starValues[4], q6: starValues[5]
    };

    const { data, error } = await supabase.from('feedback').insert(entry).select();
    if (error) return res.status(500).json({ error: error.message });
    
    res.status(201).json({ message: "Success", id: data[0].id, sentiment: aiResult.label });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
