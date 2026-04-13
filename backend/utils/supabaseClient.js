const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' }); // Load from root

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('Missing Supabase credentials in .env');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = { supabase };
