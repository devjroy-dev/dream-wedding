// backend/agentic/wedding/vendor/toolHandlers/editTask.js
//
// Tool handler for wedding_edit_task (Session 8.5e, 2026-05-13).
//
// Behavior:
//   1. Resolve target task: prefer task_id; otherwise use title_match to find
//      a single task for this vendor (refuse on zero or ambiguous match).
//   2. Apply allow-listed updates: title, due_date, done, priority, assigned_to.
//      assigned_to is stored as jsonb array — a string input is wrapped to [string].
//   3. Return a short vendor-voice status string.
//
// Allowed priority values mirror DB default: 'low', 'med', 'high'.
// Schema reference: vendor_todos(id, vendor_id, title, due_date, priority,
//   done, client_id, event_id, created_at, assigned_to, client_name).
// Note: 'notes' column does NOT exist on vendor_todos — do not write it.

const engine = require('../engine');

const ALLOWED_PRIORITIES = ['low', 'med', 'high'];

async function editTask(vendorId, { task_id, title_match, title, due_date, done, priority, assigned_to }) {
  const { supabase } = engine.deps();

  let target = null;
  if (task_id) {
    const { data } = await supabase
      .from('vendor_todos')
      .select('id, vendor_id, title')
      .eq('id', task_id)
      .maybeSingle();
    if (!data) return 'Task not found.';
    if (data.vendor_id !== vendorId) return 'Task does not belong to this vendor.';
    target = data;
  } else if (title_match) {
    const { data } = await supabase
      .from('vendor_todos')
      .select('id, vendor_id, title')
      .eq('vendor_id', vendorId)
      .ilike('title', '%' + title_match + '%')
      .limit(2);
    if (!data || data.length === 0) return 'No task matching "' + title_match + '" found.';
    if (data.length > 1) return 'More than one task matches "' + title_match + '". Specify the task_id.';
    target = data[0];
  } else {
    return 'task_id or title_match required.';
  }

  const patch = {};
  if (title !== undefined && title !== null) patch.title = title;
  if (due_date !== undefined) patch.due_date = due_date || null;
  if (done !== undefined && done !== null) patch.done = Boolean(done);
  if (priority !== undefined) {
    if (!ALLOWED_PRIORITIES.includes(priority)) {
      return 'priority must be one of: ' + ALLOWED_PRIORITIES.join(', ') + '.';
    }
    patch.priority = priority;
  }
  if (assigned_to !== undefined && assigned_to !== null) {
    patch.assigned_to = Array.isArray(assigned_to) ? assigned_to : [assigned_to];
  }

  if (Object.keys(patch).length === 0) return 'Nothing to update.';

  const { error } = await supabase
    .from('vendor_todos')
    .update(patch)
    .eq('id', target.id)
    .eq('vendor_id', vendorId);
  if (error) throw error;

  const parts = [];
  if (patch.title) parts.push('title → ' + patch.title);
  if (patch.due_date !== undefined) parts.push('due ' + (patch.due_date || 'cleared'));
  if (patch.done !== undefined) parts.push(patch.done ? 'marked done' : 'marked not done');
  if (patch.priority) parts.push('priority ' + patch.priority);
  if (patch.assigned_to !== undefined) parts.push('assigned to ' + patch.assigned_to.join(', '));
  return 'Updated task "' + target.title + '" — ' + parts.join(', ') + '.';
}

module.exports = { editTask };
