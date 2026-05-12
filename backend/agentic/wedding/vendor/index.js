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
// Then in the route handler:
//
//   const result = await vendorChatEngine.runAgenticTurn({
//     vendorId, message, history, surface
//   });

const { init } = require('./engine');
const { runAgenticTurn } = require('./loop');

module.exports = { init, runAgenticTurn };
