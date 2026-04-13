const { supabase } = require('../utils/supabaseClient');

exports.checkCr = async (req, res) => {
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ error: "uid is required" });
  try {
    const { data } = await supabase.from('cr_profiles').select('id').eq('id', uid);
    res.json({ is_cr: data && data.length > 0 });
  } catch (e) {
    res.json({ is_cr: false, detail: e.message });
  }
};

exports.crSignup = async (req, res) => {
  const { uid, email, full_name, department, year } = req.body;
  if (!uid || !email) return res.status(400).json({ error: "uid and email required" });
  try {
    const row = { id: uid, email, full_name: full_name || email, department, year };
    const { error } = await supabase.from('cr_profiles').upsert(row);
    if (error) throw error;
    res.status(201).json({ message: "CR profile created", id: uid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getCrProfile = async (req, res) => {
  const { uid } = req.query;
  try {
    const { data } = await supabase.from('cr_profiles').select('*').eq('id', uid);
    if (!data || data.length === 0) return res.status(404).json({ error: "Not found" });
    const profile = data[0];
    delete profile.passcode_hash;
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Simplified Admin Auth matching Python backend's logic
const _admin_tokens = new Set();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "password";

exports.adminLogin = (req, res) => {
  const { email, password } = req.body;
  if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid admin credentials" });
  }
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  _admin_tokens.add(token);
  res.json({ token, message: "Admin login successful" });
};

exports.adminCheck = (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (token && _admin_tokens.has(token)) return res.json({ is_admin: true });
  res.status(401).json({ is_admin: false });
};
