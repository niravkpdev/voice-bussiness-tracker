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

if (!url || !key) {
  console.log("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
  console.log("Testing Supabase connection with Service Role...");
  const { data, error } = await supabase.from('transactions').select('*').limit(1);
  if (error) {
    console.error("Error querying transactions:", error.message, error.code, error.details);
  } else {
    console.log("Transactions table exists! Rows:", data.length);
  }
  
  const { data: d2, error: e2 } = await supabase.from('customers').select('*').limit(1);
  if (e2) {
    console.error("Error querying customers:", e2.message);
  } else {
    console.log("Customers table exists! Rows:", d2.length);
  }
}

test();
