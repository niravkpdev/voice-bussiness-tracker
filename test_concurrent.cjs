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
  'offline_queue', 'businesses', 'notifications'
];

async function test() {
  console.log("Testing concurrent requests...");
  
  const promises = tables.map(table => 
    supabase.from(table).select('id').limit(1).then(({ error }) => {
      if (error) return { table, ok: false, error };
      return { table, ok: true };
    })
  );

  const results = await Promise.all(promises);
  const failures = results.filter(r => !r.ok);
  if (failures.length > 0) {
    console.error("Concurrent test failed for:", failures.map(f => f.table).join(', '));
    console.error("Errors:", failures.map(f => f.error.message).join(', '));
  } else {
    console.log("All concurrent requests succeeded!");
  }
}

test();
