
path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

old_anchor = "// POST /api/v2/dreamai/whatsapp-extract"

new_ical = """// GET /api/v2/vendor/calendar.ics/:vendorId — iCal feed for Apple/Google Calendar
app.get('/api/v2/vendor/calendar.ics/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;

    const [
      { data: vendor },
      { data: bookings },
      { data: blocks },
    ] = await Promise.all([
      supabase.from('vendors').select('name, business_name').eq('id', vendorId).maybeSingle(),
      supabase.from('bookings').select('id, client_name, event_date, event_type, venue, status, notes').eq('vendor_id', vendorId),
      supabase.from('vendor_availability_blocks').select('id, blocked_date, note').eq('vendor_id', vendorId),
    ]);

    const calName = (vendor && (vendor.business_name || vendor.name))
      ? (vendor.business_name || vendor.name) + " — TDW Calendar"
      : "TDW Vendor Calendar";

    function toIcsDateEnd(dateStr) {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return y + m + day;
    }

    function sanitize(str) {
      if (!str) return '';
      return String(str)
        .split('\\n').join('\\\\n')
        .split(',').join('\\\\,')
        .split(';').join('\\\\;');
    }

    const now = new Date().toISOString().replace(/-/g, '').replace(/:/g, '').split('.')[0] + 'Z';
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//The Dream Wedding//DreamAi Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:' + sanitize(calName),
      'X-WR-TIMEZONE:Asia/Kolkata',
    ];

    for (const b of (bookings || [])) {
      if (!b.event_date) continue;
      const dateStr = b.event_date.slice(0, 10);
      const dtStart = dateStr.replace(/-/g, '');
      const dtEnd = toIcsDateEnd(dateStr);
      const summary = b.event_type
        ? sanitize(b.event_type) + ' - ' + sanitize(b.client_name)
        : sanitize(b.client_name || 'Booking');
      const descParts = [];
      if (b.status) descParts.push('Status: ' + b.status);
      if (b.venue) descParts.push('Venue: ' + b.venue);
      if (b.notes) descParts.push('Notes: ' + b.notes);
      const desc = descParts.join(' | ');

      lines.push('BEGIN:VEVENT');
      lines.push('UID:tdw-booking-' + b.id + '@thedreamwedding.in');
      lines.push('DTSTAMP:' + now);
      lines.push('DTSTART;VALUE=DATE:' + dtStart);
      lines.push('DTEND;VALUE=DATE:' + dtEnd);
      lines.push('SUMMARY:' + summary);
      if (desc) lines.push('DESCRIPTION:' + sanitize(desc));
      if (b.venue) lines.push('LOCATION:' + sanitize(b.venue));
      lines.push('STATUS:' + (b.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'));
      lines.push('END:VEVENT');
    }

    for (const bl of (blocks || [])) {
      if (!bl.blocked_date) continue;
      const dateStr = bl.blocked_date.slice(0, 10);
      const dtStart = dateStr.replace(/-/g, '');
      const dtEnd = toIcsDateEnd(dateStr);
      lines.push('BEGIN:VEVENT');
      lines.push('UID:tdw-block-' + bl.id + '@thedreamwedding.in');
      lines.push('DTSTAMP:' + now);
      lines.push('DTSTART;VALUE=DATE:' + dtStart);
      lines.push('DTEND;VALUE=DATE:' + dtEnd);
      lines.push('SUMMARY:Unavailable - ' + sanitize(bl.note || 'Blocked'));
      lines.push('STATUS:CONFIRMED');
      lines.push('TRANSP:OPAQUE');
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="tdw-calendar.ics"');
    res.set('Access-Control-Allow-Origin', '*');
    res.send(lines.join('\\r\\n'));

  } catch (err) {
    console.error('[iCal export]', err.message);
    res.status(500).send('Error generating calendar feed.');
  }
});

// POST /api/v2/dreamai/whatsapp-extract"""

assert content.count(old_anchor) == 1, "anchor not found exactly once"
content = content.replace(old_anchor, new_ical, 1)
print("✅ iCal endpoint added")

with open(path, 'w') as f:
    f.write(content)
print("✅ server.js written")
