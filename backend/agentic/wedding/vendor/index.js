// backend/agentic/wedding/vendor/index.js
//
// Single import surface for the v3 vendor agentic engine.
//
// In server.js (post-Session-2):
//
//   const vendorChatEngine = require('./agentic/wedding/vendor');
//   vendorChatEngine.init({
//     supabase,
//     anthropic,
//     helpers: { executeToolCall, sendWhatsApp, normalizePhone },
//   });
//
// Then in the route handlers:
//
//   const result = await vendorChatEngine.runAgenticTurn({
//     vendorId, message, history, surface, justDoIt
//   });
//
//   const result = await vendorChatEngine.resumeAgenticTurn({
//     vendorId, pendingToken
//   });
//
//   const result = await vendorChatEngine.cancelPending({
//     vendorId, pendingToken
//   });

const { init } = require('./engine');
const { runAgenticTurn, resumeAgenticTurn, cancelPending } = require('./loop');

module.exports = { init, runAgenticTurn, resumeAgenticTurn, cancelPending };
