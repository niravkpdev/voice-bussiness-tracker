import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = r"""        if \(failedLoads\.length\) \{
          const firstFailure = failedLoads\[0\];
          const message = Supabase table load failed for \$\{firstFailure\.tableName\}\. Run the latest supabase-schema\.sql and refresh\.;
          setSecureError\(message\);
          setStatus\(message\);
          setCloudCustomers\(\[\]\);
          setCloudSuppliers\(\[\]\);
          setCloudInventory\(\[\]\);
          setCloudStockTransactions\(\[\]\);
          setCloudInvoices\(\[\]\);
          setCloudOrders\(\[\]\);
          setCloudEmployees\(\[\]\);
          setCloudAttendance\(\[\]\);
          setCloudLeaveBalances\(\[\]\);
          setCloudLeaveRequests\(\[\]\);
          setCloudHolidays\(\[\]\);
          setCloudSalaryHistory\(\[\]\);
          setCloudPayslips\(\[\]\);
          setCloudEmployeeDocuments\(\[\]\);
          setCloudPayments\(\[\]\);
          setCloudAuditLogs\(\[\]\);
          setCloudSubscription\(null\);
          setCloudSecurity\(null\);
          setCloudDevices\(\[\]\);
          setCloudOfflineQueue\(\[\]\);
          setCloudBusinesses\(\[\]\);
          setCloudNotifications\(\[\]\);
        \}"""

replacement = """        if (failedLoads.length) {
          const failures = failedLoads.map(f => f.tableName).join(', ');
          const message = Warning: Failed to load some tables: . Other tables loaded successfully.;
          console.warn(message, failedLoads.map(f => f.error));
          setStatus(message);
        }"""

content = re.sub(target, replacement, content)

with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched VoiceExpenseTrackerPreview.jsx to not clear state on failure")
