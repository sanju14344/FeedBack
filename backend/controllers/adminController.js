const { supabase } = require('../utils/supabaseClient');
const { generateClassInsights, chatWithAssistant } = require('../services/aiService');

exports.getFeedback = async (req, res) => {
  const { dept_id, session_id, year } = req.query;
  try {
    let query = supabase.from('feedback').select('*, subjects(name), staff(name)').order('created_at', { ascending: false });

    if (dept_id) {
      let subjQuery = supabase.from('subjects').select('id').eq('department_id', dept_id);
      if (year) subjQuery = subjQuery.eq('year', year);
      const { data: subjData } = await subjQuery;
      
      const subjectIds = (subjData || []).map(s => s.id);
      if (subjectIds.length === 0) return res.json([]);
      
      query = query.in('subject_id', subjectIds);
    }

    if (session_id) {
      query = query.eq('session_id', session_id);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getInsights = async (req, res) => {
  const { dept_id, session_id, year } = req.query;
  try {
    let query = supabase.from('feedback').select('*');
    if (dept_id) {
      let subjQuery = supabase.from('subjects').select('id').eq('department_id', dept_id);
      if (year) subjQuery = subjQuery.eq('year', year);
      const { data: subjData } = await subjQuery;
      
      const subjIds = (subjData || []).map(s => s.id);
      if (subjIds.length > 0) {
        query = query.in('subject_id', subjIds);
      } else {
        return res.json(null);
      }
    }

    if (session_id) {
      query = query.eq('session_id', session_id);
    }
    
    const { data: feedbackData, error } = await query;
    if (error) throw error;
    
    const insights = await generateClassInsights(feedbackData || []);
    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCRs = async (req, res) => {
  try {
    const { data, error } = await supabase.from('cr_profiles').select('id, email, full_name, department, year, phone, is_approved').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.approveCR = async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "id required" });
  try {
    const { error } = await supabase.from('cr_profiles').update({ is_approved: true }).eq('id', id);
    if (error) throw error;
    res.json({ message: "CR approved successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.rejectCR = async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "id required" });
  try {
    // Nullify references in feedback_sessions to prevent foreign key constraint violations
    await supabase.from('feedback_sessions').update({ cr_id: null }).eq('cr_id', id);

    const { error } = await supabase.from('cr_profiles').delete().eq('id', id);
    if (error) throw error;
    res.json({ message: "CR rejected and deleted successfully" });
  } catch (error) {
    console.error("Error in rejectCR:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.createStaff = async (req, res) => {
  const { name, department_id, subject_id } = req.body;
  if (!name || !department_id) return res.status(400).json({ error: "Name and department_id are required" });
  try {
    const { data, error } = await supabase.from('staff').insert([{ name, department_id, subject_id }]).select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createSubject = async (req, res) => {
  const { name, department_id, year } = req.body;
  if (!name || !department_id) return res.status(400).json({ error: "Name and department_id are required" });
  try {
    const { data, error } = await supabase.from('subjects').insert([{ name, department_id, year }]).select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteStaff = async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) throw error;
    res.json({ message: "Staff deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteSubject = async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) throw error;
    res.json({ message: "Subject deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateStaff = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });
  try {
    const { data, error } = await supabase.from('staff').update({ name }).eq('id', id).select();
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSubject = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });
  try {
    const { data, error } = await supabase.from('subjects').update({ name }).eq('id', id).select();
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.chat = async (req, res) => {
  const { dept_id, session_id, message, year } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    let query = supabase.from('feedback').select('*, subjects(name)').order('created_at', { ascending: false }).limit(200);

    if (dept_id) {
      let subjQuery = supabase.from('subjects').select('id').eq('department_id', dept_id);
      if (year) subjQuery = subjQuery.eq('year', year);
      const { data: subjData } = await subjQuery;
      
      const subjIds = (subjData || []).map(s => s.id);
      if (subjIds.length > 0) {
        query = query.in('subject_id', subjIds);
      } else {
        return res.json({ response: "I don't see any feedback for your department and year yet." });
      }
    }

    if (session_id) {
      query = query.eq('session_id', session_id);
    }

    const { data: feedbackData, error } = await query;
    if (error) throw error;

    const chatResponse = await chatWithAssistant(message, feedbackData || []);
    res.json(chatResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
