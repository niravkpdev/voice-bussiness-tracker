const fs = require('fs');
let content = fs.readFileSync('src/Phase3Ops.jsx', 'utf-8');

content = content.replace(
  "  const [loginEmail, setLoginEmail] = useState('');\n  const [loginPassword, setLoginPassword] = useState('');\n  const [loginStatusMsg, setLoginStatusMsg] = useState({ text: '', type: '' });",
  "  const [loginManageModal, setLoginManageModal] = useState(null);\n  const [loginEmail, setLoginEmail] = useState('');\n  const [loginPassword, setLoginPassword] = useState('');\n  const [loginStatusMsg, setLoginStatusMsg] = useState({ text: '', type: '' });"
);

content = content.replace(
  "const EMPLOYEE_PROFILE_TABS = [\n  'Personal Information',\n  'Work Information',\n  'Salary Information',\n  'Leave Information',\n  'Attendance',\n  'Documents',\n  'Notes / Description',\n  'Login & Access',\n];",
  "const EMPLOYEE_PROFILE_TABS = [\n  'Personal Information',\n  'Work Information',\n  'Salary Information',\n  'Leave Information',\n  'Attendance',\n  'Documents',\n  'Notes / Description',\n];"
);

content = content.replace(
  "{canManageEmployees && <button className=\"share-entry-button\" type=\"button\" onClick={() => setEditingEmployee(employee)}>Edit</button>}\n                      {canManageEmployees && <button className=\"share-entry-button\" type=\"button\" onClick={() => markAttendance(employee, 'Present')}>Present</button>}",
  "{canManageEmployees && <button className=\"share-entry-button\" type=\"button\" onClick={() => setEditingEmployee(employee)}>Edit</button>}\n                      {canManageEmployees && <button className=\"share-entry-button\" type=\"button\" onClick={() => { setLoginManageModal(employee); setLoginEmail(employee?.email || ''); setLoginPassword(''); setLoginStatusMsg({ text: '', type: '' }); }}>Manage Login</button>}\n                      {canManageEmployees && <button className=\"share-entry-button\" type=\"button\" onClick={() => markAttendance(employee, 'Present')}>Present</button>}"
);

const regex = /\{\s*employeeProfileTab === 'Login & Access' && canManageEmployees && \([\s\S]*?\}\s*<\/article>\s*\)\s*\}/;
content = content.replace(regex, "");

const modalCode = `
      {loginManageModal && (
        <div className="hrms-modal-overlay">
          <div className="hrms-modal-content" style={{ maxWidth: '600px' }}>
            <div className="hrms-modal-header">
              <h2>Manage Login Access: {loginManageModal.name}</h2>
              <button className="close-button" type="button" onClick={() => setLoginManageModal(null)}>×</button>
            </div>
            <div className="hrms-modal-body">
              <p className="panel-hint" style={{ marginBottom: '1rem' }}>Manage self-service login credentials for this employee. No email invitation required.</p>
              
              {loginStatusMsg.text && (
                <div className={\`toast-message \${loginStatusMsg.type}\`} style={{ marginBottom: '1rem' }}>
                  {loginStatusMsg.text}
                </div>
              )}

              <div className="hrms-grid">
                <div className="hrms-form-group">
                  <label>Employee Login Email</label>
                  <input 
                    type="email" 
                    value={loginEmail} 
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. emp@company.com" 
                    autoComplete="off"
                  />
                </div>
                <div className="hrms-form-group">
                  <label>Temporary Password</label>
                  <input 
                    type="text" 
                    value={loginPassword} 
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Min 6 characters" 
                    autoComplete="off"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <button className="manual-button" type="button" onClick={async () => {
                  if (!loginEmail || !loginPassword || loginPassword.length < 6) {
                    setLoginStatusMsg({ text: 'Please provide valid email and at least 6 char password.', type: 'error' });
                    return;
                  }
                  setLoginStatusMsg({ text: 'Creating login...', type: 'info' });
                  const { error } = await createEmployeeLogin(loginEmail, loginPassword, loginManageModal.id, profile?.businessId);
                  if (error) {
                    setLoginStatusMsg({ text: 'Error: ' + error.message, type: 'error' });
                  } else {
                    setLoginStatusMsg({ text: 'Login created successfully!', type: 'success' });
                    setLoginPassword('');
                  }
                }}>Create Login</button>
                
                <button className="secondary-button" type="button" onClick={async () => {
                  if (!loginPassword || loginPassword.length < 6) {
                    setLoginStatusMsg({ text: 'Please provide at least 6 char new password to reset.', type: 'error' });
                    return;
                  }
                  setLoginStatusMsg({ text: 'Resetting password...', type: 'info' });
                  const { error } = await resetEmployeePassword(loginManageModal.id, profile?.businessId, loginPassword);
                  if (error) {
                    setLoginStatusMsg({ text: 'Error: ' + error.message, type: 'error' });
                  } else {
                    setLoginStatusMsg({ text: 'Password reset successfully!', type: 'success' });
                    setLoginPassword('');
                  }
                }}>Reset Password</button>

                <button className="secondary-button" type="button" style={{ color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={async () => {
                  if (confirm('Are you sure you want to disable login access for this employee?')) {
                    setLoginStatusMsg({ text: 'Disabling login...', type: 'info' });
                    const { error } = await disableEmployeeLogin(loginManageModal.id, profile?.businessId);
                    if (error) {
                      setLoginStatusMsg({ text: 'Error: ' + error.message, type: 'error' });
                    } else {
                      setLoginStatusMsg({ text: 'Login disabled.', type: 'success' });
                    }
                  }
                }}>Disable Login</button>
              </div>
            </div>
          </div>
        </div>
      )}
      </section>
    );
  }

  if (activeTab === 'subscriptions') {`;

content = content.replace("      </section>\n    );\n  }\n\n  if (activeTab === 'subscriptions') {", modalCode);

fs.writeFileSync('src/Phase3Ops.jsx', content, 'utf-8');
console.log('done');
