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
  console.log("Testing Supabase columns...");
  
  // We can query the information_schema using rpc or we can just select a row and see its keys
  const { data, error } = await supabase.from('transactions').select('*').limit(1);
  if (error) {
    console.error("Error querying transactions:", error.message);
  } else if (data.length > 0) {
    console.log("Transactions table columns:", Object.keys(data[0]));
  } else {
    console.log("No data in transactions, cannot infer columns.");
  }
}

test();
