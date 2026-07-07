import re

filepath = "src/Phase2ERP.jsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

legacy_fallback = """
  const resolveActiveBusinessId = () => {
    return (
      (typeof selectedBusiness !== 'undefined' ? selectedBusiness?.id : null) ||
      (typeof activeBusiness !== 'undefined' ? activeBusiness?.id : null) ||
      (typeof userProfile !== 'undefined' ? userProfile?.active_business_id : null) ||
      (typeof authUser !== 'undefined' ? (authUser?.businessId || authUser?.active_business_id) : null) ||
      (typeof profile !== 'undefined' ? profile?.active_business_id : null) ||
      (typeof cloudBusinesses !== 'undefined' && cloudBusinesses?.length > 0 ? cloudBusinesses[0]?.id : null) ||
      (typeof readScopedString === 'function' ? readScopedString('activeBusinessId') : null) ||
      'default'
    );
  };
  const [activeBusinessId, setActiveBusinessId] = useState(() => resolveActiveBusinessId());
"""

old_pattern = r"const \[activeBusinessId, setActiveBusinessId\] = useState\(\(\) => readScopedString\('activeBusinessId'\)\);"

content = re.sub(old_pattern, legacy_fallback.strip(), content)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched Phase2ERP.jsx")
