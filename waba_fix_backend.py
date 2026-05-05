import os

# ── File 1: web/app/vendor/dashboard/page.tsx ──
path1 = '/workspaces/dream-wedding/web/app/vendor/dashboard/page.tsx'
with open(path1, 'r') as f:
    c = f.read()

assert c.count("const joinCode = 'join acres-eventually';") == 1, "anchor 1 not found"
c = c.replace(
    "const joinCode = 'join acres-eventually';",
    ""
)
c = c.replace(
    "window.open('https://wa.me/14155238886?text=' + encodeURIComponent(joinCode), '_blank');",
    "window.open('https://wa.me/14787788550', '_blank');"
)

with open(path1, 'w') as f:
    f.write(c)
print("✅ vendor/dashboard/page.tsx — done")

# ── File 2: web/app/couple/page.tsx ──
path2 = '/workspaces/dream-wedding/web/app/couple/page.tsx'
with open(path2, 'r') as f:
    c = f.read()

# Fix direct href
c = c.replace(
    'href="https://api.whatsapp.com/send?phone=14155238886&text=Hi%20DreamAi%2C%20I%20need%20help%20with%20my%20wedding%20planning&lang=en"',
    'href="https://wa.me/14787788550"'
)
# Fix TWILIO_NUMBER constant (appears twice)
c = c.replace("const TWILIO_NUMBER = '14155238886';", "const TWILIO_NUMBER = '14787788550';")
# Remove SANDBOX_JOIN_CODE lines (appears twice)
c = c.replace("  const SANDBOX_JOIN_CODE = 'join acres-eventually';\n", "")
# Fix join code instruction copy
c = c.replace(
    "You'll need to connect once. Send <span style={{ fontWeight: 500, color: C.dark }}>{SANDBOX_JOIN_CODE}</span> to <span style={{ fontWeight: 500, color: C.dark }}>+1 {TWILIO_NUMBER.slice(0, 3)}-{TWILIO_NUMBER.slice(3, 6)}-{TWILIO_NUMBER.slice(6)}</span> from your WhatsApp.",
    "Save our number and say hi. DreamAi is ready on WhatsApp."
)
c = c.replace(
    "Send <span style={{ fontWeight: 500, color: C.dark }}>{SANDBOX_JOIN_CODE}</span> to <span style={{ fontWeight: 500, color: C.dark }}>+1 {TWILIO_NUMBER.slice(0, 3)}-{TWILIO_NUMBER.slice(3, 6)}-{TWILIO_NUMBER.slice(6)}</span> from WhatsApp to connect.",
    "Save our number and send us a message to get started."
)

with open(path2, 'w') as f:
    f.write(c)
print("✅ couple/page.tsx — done")

# ── Verify no sandbox refs remain ──
for p in [path1, path2]:
    with open(p, 'r') as f:
        content = f.read()
    hits = [l for l in content.split('\n') if 'acres-eventually' in l or '14155238886' in l]
    if hits:
        print(f"❌ REMAINING in {p}: {hits}")
    else:
        print(f"✅ Clean: {p}")

print("\nAll done. Run: node --check backend/server.js && echo SYNTAX OK")
