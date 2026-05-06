# TDW V5 — Backend Reference
# If patch_backend_v5.py fails on any patch, use the exact code below.
# All manual insertions go into backend/server.js in the dream-wedding repo.

# ══════════════════════════════════════════════════════
# PATCH 1+2: web_search tool
# In the POST /api/v2/dreamai/chat handler, find the tools array
# for BOTH couple and vendor. Add this as the FIRST element:
# ══════════════════════════════════════════════════════

{
  "type": "web_search_20250305",
  "name": "web_search"
},

# ══════════════════════════════════════════════════════
# PATCH 3: get_muse_saves tool definition
# In the couple tools array, after the last existing tool
# (general_reply), add:
# ══════════════════════════════════════════════════════

        {
          name: "get_muse_saves",
          description: "Fetch the bride's current Muse board — saved vendor cards, inspiration images, and links. Use this when the bride asks about her saved items or to power the SURPRISE ME aesthetic feature.",
          input_schema: {
            type: "object",
            properties: {
              limit: {
                type: "number",
                description: "Max saves to return. Defaults to 10."
              }
            },
            required: []
          }
        },

# ══════════════════════════════════════════════════════
# PATCH 4: get_muse_saves handler
# In the couple tool execution switch/if block,
# BEFORE the general_reply case, add:
# ══════════════════════════════════════════════════════

      case 'get_muse_saves': {
        const limit = toolInput.limit || 10;
        const { data: museData, error: museError } = await supabase
          .from('couple_muse')
          .select('id, image_url, source_url, vendor_id, function_tag, created_at')
          .eq('couple_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (museError) {
          toolResults.push({ tool: toolName, result: { success: false, error: museError.message } });
        } else {
          toolResults.push({ tool: toolName, result: { success: true, saves: museData || [], count: (museData || []).length } });
        }
        break;
      }

# ══════════════════════════════════════════════════════
# PATCH 5: image_base64 multimodal
# In the POST /api/v2/dreamai/chat handler:
# 1. Extend the req.body destructure to add image_base64 and image_media_type
# 2. Replace the user message content with multimodal-aware version
#
# Step 1 — find line like:
#   const { userId, userType, message, context } = req.body;
# Change to:
#   const { userId, userType, message, context, image_base64, image_media_type } = req.body;
#
# Step 2 — find where messages array is built, change:
#   { role: 'user', content: message }
# to:
#   { role: 'user', content: image_base64
#       ? [
#           { type: 'image', source: { type: 'base64', media_type: image_media_type || 'image/jpeg', data: image_base64 } },
#           { type: 'text', text: message }
#         ]
#       : message }
# ══════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════
# VERIFICATION CURLS — run from Codespace after deploy
# Check Railway logs after EACH one for SQL errors
# ══════════════════════════════════════════════════════

# 1. Couple context — must return rich data (tasks, vendors, expenses, events)
curl "https://dream-wedding-production-89ae.up.railway.app/api/v2/dreamai/couple-context/97f3f358-1130-449d-bb65-2863d006c79a"

# 2. Vendor context — must return data (invoices, calendar, enquiries)
curl "https://dream-wedding-production-89ae.up.railway.app/api/v2/dreamai/vendor-context/8c7ff7e8"

# 3. Couple DreamAi — web search test (should mention florists, Railway log should show web_search tool)
curl -X POST "https://dream-wedding-production-89ae.up.railway.app/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d '{"userId":"97f3f358-1130-449d-bb65-2863d006c79a","userType":"couple","message":"What are good florists in Lajpat Nagar?","context":null}'

# 4. Vendor DreamAi — web search test (Railway log should show web_search tool)
curl -X POST "https://dream-wedding-production-89ae.up.railway.app/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d '{"userId":"8c7ff7e8","userType":"vendor","message":"What are photographers charging in Delhi right now?","context":null}'

# 5. get_muse_saves tool test (Railway log should show get_muse_saves executing)
curl -X POST "https://dream-wedding-production-89ae.up.railway.app/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d '{"userId":"97f3f358-1130-449d-bb65-2863d006c79a","userType":"couple","message":"Show me what I have saved on my Muse board","context":null}'
