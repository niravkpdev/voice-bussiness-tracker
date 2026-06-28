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

const tables = [
  'transactions', 'customers', 'suppliers', 'inventory',
  'stock_transactions', 'invoices', 'orders', 'employees',
  'attendance', 'leave_balances', 'leave_requests', 'holidays',
  'salary_history', 'payslips', 'employee_documents', 'payments',
  'audit_logs', 'subscriptions', 'security_settings', 'devices',
  'offline_queue', 'businesses', 'notifications', 'profile_settings'
];

async function test() {
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.error(`Error in table ${table}:`, error.message);
    } else {
      console.log(`Table ${table} is OK.`);
    }
  }
}

test();
