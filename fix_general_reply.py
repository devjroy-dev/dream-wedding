path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

old = "      const QUERY_TOOLS = ['query_schedule', 'query_revenue', 'query_clients', 'general_reply', 'save_to_muse', 'complete_task', 'add_expense'];"
new = "      const QUERY_TOOLS = ['query_schedule', 'query_revenue', 'query_clients', 'save_to_muse', 'complete_task', 'add_expense'];"

assert content.count(old) == 1, f'ABORT: {content.count(old)}'
content = content.replace(old, new, 1)

with open(path, 'w') as f:
    f.write(content)
print("Done ✅ — general_reply removed from QUERY_TOOLS, Haiku will now answer directly")
