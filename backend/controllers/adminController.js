const { supabase } = require('../utils/supabaseClient');
const { generateClassInsights } = require('../services/aiService');

exports.getFeedback = async (req, res) => {
  const { dept } = req.query;
  try {
    let query = supabase.from('feedback').select('*, subjects(name), staff(name)').order('created_at', { ascending: false });

    if (dept) {
      const { data: deptData } = await supabase.from('departments').select('id').eq('name', dept);
      if (!deptData || deptData.length === 0) return res.json([]);
      const deptId = deptData[0].id;
      
      const { data: subjData } = await supabase.from('subjects').select('id').eq('department_id', deptId);
      const subjectIds = (subjData || []).map(s => s.id);
      if (subjectIds.length === 0) return res.json([]);
      
      query = query.in('subject_id', subjectIds);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getInsights = async (req, res) => {
  const { dept } = req.query;
  try {
    let query = supabase.from('feedback').select('*');
    if (dept) {
      const { data: deptData } = await supabase.from('departments').select('id').eq('name', dept);
      if (deptData && deptData.length > 0) {
        const { data: subjData } = await supabase.from('subjects').select('id').eq('department_id', deptData[0].id);
        const subjIds = (subjData || []).map(s => s.id);
        if (subjIds.length > 0) {
          query = query.in('subject_id', subjIds);
        }
      }
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
    const { data, error } = await supabase.from('cr_profiles').select('id, email, full_name, department, year, is_approved').order('created_at', { ascending: false });
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
    const { error } = await supabase.from('cr_profiles').delete().eq('id', id);
    if (error) throw error;
    res.json({ message: "CR rejected and deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
