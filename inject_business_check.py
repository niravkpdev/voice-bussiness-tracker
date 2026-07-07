import sys

filepath = "src/VoiceExpenseTrackerPreview.jsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# I want to inject the empty state check before rendering activeTab contents.
# Finding `<main className="page-shell">`
if '<main className="page-shell">' in content:
    replacement = """<main className="page-shell">
          {!activeBusinessId && !['profile-settings', 'company-setup'].includes(activeTab) ? (
            <section className="panel fade-in" style={{ textAlign: 'center', padding: '64px 24px', gridColumn: '1 / -1', marginTop: '32px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
              <h2 style={{ marginBottom: '8px' }}>Welcome to Trinetr Business Suite</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Please set up or select a business profile to start managing your operations.</p>
              <button 
                type="button" 
                className="primary-btn" 
                onClick={() => { window.location.hash = 'profile-settings'; setActiveTab('profile-settings'); }}
              >
                Go to Profile Settings
              </button>
            </section>
          ) : (
            <>"""
    
    content = content.replace('<main className="page-shell">', replacement, 1)
    
    # The corresponding </main> for `page-shell` is near the end, just before `</div>` and `{/* High-Performance Voice Manager Widget */}`
    # Wait, the closing tag is just `</main>`
    # I can replace `        </main>\n      </div>` with `        </>\n          )}\n        </main>\n      </div>`
    
    if '</main>\n      </div>\n\n      {/* High-Performance Voice Manager Widget */}' in content:
         closing_replacement = """        </>
          )}
        </main>
      </div>

      {/* High-Performance Voice Manager Widget */}"""
         content = content.replace('</main>\n      </div>\n\n      {/* High-Performance Voice Manager Widget */}', closing_replacement)
    elif '</main>\n      </div>' in content:
        # Fallback
        closing_replacement = """        </>
          )}
        </main>
      </div>"""
        # We only want to replace the last occurrence or the one corresponding to page-shell
        # Since it's near the end, let's rsplit and join
        parts = content.rsplit('</main>\n      </div>', 1)
        if len(parts) == 2:
            content = parts[0] + closing_replacement + parts[1]

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Injected empty state successfully.")
else:
    print("Could not find <main className=\"page-shell\">")
