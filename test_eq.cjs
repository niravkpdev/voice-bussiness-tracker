const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) {
    env[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
  }
});

const url = env.PROJECT_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function test() {
  console.log("Testing select with user_id...");
  
  const { data: d1, error: e1 } = await supabase.from('transactions').select('*').limit(1);
  if (e1 || !d1 || d1.length === 0) {
      console.log("Cannot test without data.");
      return;
  }
  
  const uid = d1[0].user_id;

  const { data, error } = await supabase.from('transactions').select('*').eq('user_id', uid).order('updated_at', { ascending: false }).limit(1);
  if (error) {
    console.error("Error querying transactions:", error.message);
  } else {
    console.log("Transactions table OK with eq! Rows:", data.length);
  }
}

test();
