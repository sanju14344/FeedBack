const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../.env' }); // Adjusted path to root .env from utils/

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('Missing Supabase credentials (URL or Service Key) in .env');
} else if (!supabaseServiceKey.startsWith('eyJ')) {
  console.warn('WARNING: Your SUPABASE_SERVICE_KEY does not look like a valid JWT. It should start with "eyJ".');
  console.warn('Current key starts with:', supabaseServiceKey.substring(0, 10));
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = { supabase };
