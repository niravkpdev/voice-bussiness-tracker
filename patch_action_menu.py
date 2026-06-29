import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'<button className="icon-button" onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*\}\} title="Quick Actions">\s*<MoreHorizontal size=\{18\} />\s*</button>'
replacement = '''<div style={{ position: 'relative' }}>
                                    <button className="icon-button" onClick={(e) => { e.stopPropagation(); setActiveActionMenuId(activeActionMenuId === party.id ? null : party.id); }} title="Quick Actions">
                                      <MoreHorizontal size={18} />
                                    </button>
                                    {activeActionMenuId === party.id && (
                                      <div className="dropdown-menu fade-in" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 100, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '4px', minWidth: '160px', textAlign: 'left' }}>
                                        <button type="button" className="saas-dropdown-item" onClick={(e) => { e.stopPropagation(); setSelectedCrmCustomer(party); setActiveActionMenuId(null); }} style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}>View Profile</button>
                                        <button type="button" className="saas-dropdown-item" onClick={(e) => { e.stopPropagation(); setStatus('Coming soon'); setActiveActionMenuId(null); }} style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}>Edit Profile</button>
                                        <button type="button" className="saas-dropdown-item" onClick={(e) => { e.stopPropagation(); setStatus('Coming soon'); setActiveActionMenuId(null); }} style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}>Create Invoice</button>
                                        <button type="button" className="saas-dropdown-item" onClick={(e) => { e.stopPropagation(); setActiveTab('vouchers'); setVoucherPartyId(party.id); setActiveActionMenuId(null); }} style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}>Add Voucher</button>
                                        <button type="button" className="saas-dropdown-item" onClick={(e) => { e.stopPropagation(); setStatus('Coming soon'); setActiveActionMenuId(null); }} style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}>View Ledger</button>
                                        <button type="button" className="saas-dropdown-item" onClick={(e) => { e.stopPropagation(); setStatus('Coming soon'); setActiveActionMenuId(null); }} style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--danger)' }}>Delete Party</button>
                                      </div>
                                    )}
                                  </div>'''

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
    with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched CRM action menu successfully.")
else:
    print("CRM action menu target not found.")
