path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

old = """// Block v1 domain - only allow v2 and local
app.use((req, res, next) => {
  const origin = req.headers.origin || req.headers.referer || '';
  const isV1 = origin.includes('vendor.thedreamwedding.in') && !origin.includes('app.thedreamwedding.in') && !origin.includes('tdw-2');
  if (isV1) return res.status(403).json({ error: 'v1 is retired. Please use app.thedreamwedding.in' });
  next();
});"""

new = """// v1 desktop portal (vendor.thedreamwedding.in) is now active — block removed"""

assert content.count(old) == 1, "block not found exactly once"
content = content.replace(old, new, 1)
print("OK: v1 block removed")

with open(path, 'w') as f:
    f.write(content)
print("OK: server.js written")
