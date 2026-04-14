const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const departments = [
  { name: 'CSE' },
  { name: 'IT' },
  { name: 'ECE' },
  { name: 'EEE' },
  { name: 'MECH' },
  { name: 'CIVIL' }
];

async function seed() {
  console.log('Seeding departments...');
  const { data, error } = await supabase.from('departments').upsert(departments, { onConflict: 'name' }).select();
  
  if (error) {
    console.error('Error seeding departments:', error.message);
  } else {
    console.log('Successfully seeded departments:', data.map(d => d.name));
  }
}

seed();
