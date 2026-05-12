// backend/agentic/wedding/vendor/engine.js
//
// Dependency injection holder for the vendor agentic engine.
//
// server.js calls init() once at boot to wire in the shared singletons
// (supabase client, anthropic SDK instance) and the cross-module helpers
// (executeToolCall, sendWhatsApp, normalizePhone) that live in server.js.
//
// Other modules in this directory call require('./engine').deps() to read
// the current dependency bundle. They MUST NOT cache the result across
// requests — the deps reference is stable, but reading it lazily protects
// against import-order surprises.

let _deps = null;

function init(deps) {
  if (!deps || !deps.supabase || !deps.helpers) {
    throw new Error('[vendor-engine.init] deps.supabase and deps.helpers are required');
  }
  if (!deps.helpers.executeToolCall || !deps.helpers.sendWhatsApp || !deps.helpers.normalizePhone) {
    throw new Error('[vendor-engine.init] deps.helpers must include executeToolCall, sendWhatsApp, normalizePhone');
  }
  // anthropic may be null if ANTHROPIC_API_KEY is unset — loop.js handles that
  // and returns a 503 to the caller. We don't validate it here.
  _deps = deps;
}

function deps() {
  if (!_deps) {
    throw new Error('[vendor-engine] deps() called before init(). Wire engine.init({...}) at server boot.');
  }
  return _deps;
}

module.exports = { init, deps };
