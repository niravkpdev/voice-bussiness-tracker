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
  console.log("Counting transactions...");
  
  const { count, error } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
  if (error) {
    console.error("Error querying transactions:", error.message);
  } else {
    console.log("Total transactions:", count);
  }
}

test();
