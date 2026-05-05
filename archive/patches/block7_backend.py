import sys
path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

if '/api/v2/couple/receipt-scan' in content:
    print("Already applied"); sys.exit(0)

anchor = "// POST /api/v2/dreamai/chat\napp.post('/api/v2/dreamai/chat',"

new_endpoint = '''// POST /api/v2/couple/receipt-scan — OCR a receipt image via Claude Haiku vision
app.post('/api/v2/couple/receipt-scan', async (req, res) => {
  try {
    const { image_url, image_base64, media_type } = req.body || {};
    if (!image_url && !image_base64) {
      return res.status(400).json({ success: false, error: 'image_url or image_base64 required' });
    }
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) return res.status(500).json({ success: false, error: 'AI not configured' });

    let imageSource;
    if (image_base64) {
      imageSource = { type: 'base64', media_type: media_type || 'image/jpeg', data: image_base64 };
    } else {
      imageSource = { type: 'url', url: image_url };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: [
          { type: 'image', source: imageSource },
          { type: 'text', text: `Extract from this receipt and return ONLY valid JSON, no markdown:\\n{"vendor_name":"name of business","total_amount":numeric_rupees,"date":"YYYY-MM-DD or null","category":"one of Photography/Decor/Catering/MUA/Attire/Venue/Entertainment/Other","notes":"brief description"}` }
        ]}]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    try {
      const parsed = JSON.parse(text.replace(/\`\`\`json|\`\`\`/g, '').trim());
      res.json({ success: true, data: parsed });
    } catch {
      res.status(422).json({ success: false, error: 'Could not parse receipt', raw: text });
    }
  } catch (error) {
    console.error('[receipt-scan] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

'''

assert content.count(anchor) == 1
content = content.replace(anchor, new_endpoint + anchor, 1)
with open(path, 'w') as f:
    f.write(content)
print("Done ✅")
