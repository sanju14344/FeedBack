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

const bcrypt = require('bcrypt');
const crypto = require('crypto');

exports.crSignup = async (req, res) => {
  const { email, full_name, department, year, phone, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  
  try {
    const passcode_hash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    const row = { id, email, full_name, department, year, phone, passcode_hash, is_approved: false };
    
    const { error } = await supabase.from('cr_profiles').insert([row]);
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: "User already exists" });
      throw error;
    }
    
    res.status(201).json({ message: "Registration successful. Pending admin approval.", id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.crLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  try {
    const { data: profiles, error } = await supabase.from('cr_profiles').select('*').eq('email', email);
    if (error) throw error;
    if (!profiles || profiles.length === 0) return res.status(401).json({ error: "Invalid credentials" });
    
    const profile = profiles[0];
    
    if (!profile.passcode_hash) {
      console.error('crLogin: Critical error - passcode_hash is missing for user:', email);
      return res.status(500).json({ 
        error: "Account data is incomplete (missing password hash). Please contact Admin or re-register your account." 
      });
    }

    const match = await bcrypt.compare(password, profile.passcode_hash);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });
    
    if (!profile.is_approved) {
      return res.status(403).json({ error: "Your account is still pending Admin approval." });
    }

    res.json({ message: "Login successful", uid: profile.id, profile: { email: profile.email, full_name: profile.full_name, department: profile.department, year: profile.year } });
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

    // Resolve dept_id: look up or auto-create the department row
    if (profile.department) {
      let { data: deptData, error: deptErr } = await supabase
        .from('departments')
        .select('id')
        .eq('name', profile.department)
        .maybeSingle();

      // If department doesn't exist yet, create it automatically
      if (!deptData && !deptErr) {
        const { data: newDept } = await supabase
          .from('departments')
          .insert([{ name: profile.department }])
          .select()
          .single();
        deptData = newDept;
      }

      if (deptData?.id) {
        profile.dept_id = deptData.id;
      }
    }

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
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
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
