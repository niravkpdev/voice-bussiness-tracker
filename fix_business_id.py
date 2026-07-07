import re
import sys

def inject_definition_voice(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    safe_pattern = """
  const activeBusinessId =
    (typeof authUser !== 'undefined' ? (authUser?.businessId || authUser?.active_business_id) : null) ||
    (typeof profile !== 'undefined' ? profile?.active_business_id : null) ||
    (typeof readScopedString === 'function' ? readScopedString('activeBusinessId') : null) ||
    null;
"""

    if "const activeBusinessId =" in content:
        print(f"activeBusinessId already defined in {filepath}")
        return

    # Insert after `const [profile, setProfile] = useState(DEFAULT_PROFILE);`
    target = "const [profile, setProfile] = useState(DEFAULT_PROFILE);"
    if target in content:
        content = content.replace(target, target + safe_pattern, 1)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Fixed {filepath}")
    else:
        print(f"Target not found in {filepath}")

def inject_definition_phase3(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    safe_pattern = """
  const activeBusinessId =
    (typeof authUser !== 'undefined' ? (authUser?.businessId || authUser?.active_business_id) : null) ||
    (typeof profile !== 'undefined' ? profile?.active_business_id : null) ||
    (typeof readScopedString === 'function' ? readScopedString('activeBusinessId') : null) ||
    null;
"""

    if "const activeBusinessId =" in content:
        print(f"activeBusinessId already defined in {filepath}")
        return

    # Insert after `const [employeePage, setEmployeePage] = useState(1);`
    target = "const [employeePage, setEmployeePage] = useState(1);"
    if target in content:
        content = content.replace(target, target + safe_pattern, 1)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Fixed {filepath}")
    else:
        print(f"Target not found in {filepath}")

inject_definition_voice("src/VoiceExpenseTrackerPreview.jsx")
inject_definition_phase3("src/Phase3Ops.jsx")
