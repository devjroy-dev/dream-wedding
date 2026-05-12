// backend/agentic/wedding/vendor/loop.js
//
// runAgenticTurn() — the v3 vendor agentic loop. Behavior-identical to
// server.js lines 18753–18886 (Session 1, Session 1.2), plus:
//   - History fallback on read (Session 2): hydrate from vendor_dreamai_messages
//     when the caller passes empty history.
//   - Always-write on completion (Session 2): persist user+assistant turn.
//   - Per-turn usage telemetry (Session 2): write a dreamai_usage row.
//
// Returns { status, body } so the thin route wrapper in server.js can map to
// the correct HTTP status code. status defaults to 200; body matches the
// existing contract: { success, reply, toolsUsed: string[], iterations: number }.
//
// Cost cap, iteration cap, wall-time cap, and Haiku 4.5 pricing constants
// are preserved as in the inline implementation. Model is locked to
// claude-haiku-4-5-20251001 per WORKING_PROTOCOL.

const engine = require('./engine');
const { fetchContext } = require('./context');
const { buildSystemPrompt } = require('./systemPrompt');
const { TDW_VENDOR_CHAT_TOOLS } = require('./tools');
const { dispatchTool } = require('./dispatcher');
const { readHistory, writeHistory } = require('./history');
const { recordUsage } = require('./usage');

// Limits — identical to the inline implementation.
const MAX_ITERATIONS = 8;
const MAX_COST_USD = 0.50;
const MAX_WALL_MS = 45000;
// Haiku 4.5 pricing per million tokens (rough — update if pricing shifts).
const PRICE_INPUT_PER_MTOK = 1.0;
const PRICE_OUTPUT_PER_MTOK = 5.0;

// runAgenticTurn — one chat turn.
//
// Inputs:
//   vendorId : uuid string. Required.
//   message  : user's new message text. Required.
//   history  : [{ role, text }, ...] — optional. If empty, hydrates from DB.
//   surface  : 'native' | 'web' | 'whatsapp'. Defaults to 'native'.
//
// Output:
//   { status: number, body: { success, reply, toolsUsed, iterations } | { success: false, error, ... } }
async function runAgenticTurn({ vendorId, message, history = [], surface = 'native' }) {
  const startedAt = Date.now();
  const { anthropic } = engine.deps();

  if (!anthropic) {
    return {
      status: 503,
      body: { success: false, error: 'AI service not configured' },
    };
  }

  const ctx = await fetchContext(vendorId);
  if (!ctx) {
    return {
      status: 404,
      body: { success: false, error: 'Vendor not found' },
    };
  }

  const systemPrompt = buildSystemPrompt(ctx);
  const vendor = { id: ctx.vendor.id, name: ctx.vendor.name };

  // ── History resolution ────────────────────────────────────────────────────
  // Fallback-on-read (Session 2): if the caller didn't pass any history,
  // hydrate the last 10 turns from vendor_dreamai_messages. Hydration is
  // best-effort — failures fall through to "no history" silently.
  let effectiveHistory = Array.isArray(history) ? history : [];
  if (effectiveHistory.length === 0) {
    try {
      effectiveHistory = await readHistory(vendorId, 10);
    } catch (err) {
      console.error('[vendor-engine.loop] history hydration failed:', err.message);
      effectiveHistory = [];
    }
  }

  // History items follow the same { role, text } shape as /api/v2/dreamai/chat.
  const historyMessages = effectiveHistory.slice(-10).map(h => ({
    role: h.role === 'user' ? 'user' : 'assistant',
    content: h.text || h.content || '',
  })).filter(m => m.content);

  const messages = [
    ...historyMessages,
    { role: 'user', content: message },
  ];

  const toolsUsed = [];
  let iterations = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let finalReply = '';
  let stopReason = 'budget_or_limit';

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    if (Date.now() - startedAt > MAX_WALL_MS) {
      finalReply = finalReply || 'Took too long. Stopping here. Please try a shorter request.';
      stopReason = 'wall_time';
      break;
    }
    const costSoFar = (totalInputTokens / 1_000_000) * PRICE_INPUT_PER_MTOK
                    + (totalOutputTokens / 1_000_000) * PRICE_OUTPUT_PER_MTOK;
    if (costSoFar > MAX_COST_USD) {
      finalReply = finalReply || 'Hit the per-request budget cap. Stopping here.';
      stopReason = 'cost_cap';
      break;
    }

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      tools: TDW_VENDOR_CHAT_TOOLS,
      messages,
    });

    if (response.usage) {
      totalInputTokens += response.usage.input_tokens || 0;
      totalOutputTokens += response.usage.output_tokens || 0;
    }

    let textThisTurn = '';
    const toolUseBlocks = [];
    for (const block of response.content) {
      if (block.type === 'text') textThisTurn += block.text;
      else if (block.type === 'tool_use') toolUseBlocks.push(block);
    }
    if (textThisTurn) finalReply = textThisTurn;

    if (response.stop_reason !== 'tool_use' || toolUseBlocks.length === 0) {
      stopReason = response.stop_reason || 'end_turn';
      break;
    }

    // Echo assistant turn (must include the tool_use blocks the tool_result will reference).
    messages.push({ role: 'assistant', content: response.content });

    const toolResultBlocks = [];
    for (const tu of toolUseBlocks) {
      toolsUsed.push(tu.name);
      let resultText;
      try {
        resultText = await dispatchTool(tu.name, tu.input || {}, vendor);
      } catch (err) {
        console.error('[DreamAi v3 vendor-chat] tool error:', tu.name, err.message);
        resultText = 'Error: ' + err.message;
      }
      toolResultBlocks.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: typeof resultText === 'string' ? resultText : JSON.stringify(resultText),
      });
    }
    messages.push({ role: 'user', content: toolResultBlocks });
  }

  if (iterations >= MAX_ITERATIONS && stopReason === 'budget_or_limit') {
    stopReason = 'max_iterations';
    finalReply = finalReply || 'Hit the iteration cap. Pausing here — ask me to continue.';
  }

  if (!finalReply.trim()) {
    finalReply = toolsUsed.length ? 'Done.' : 'What would you like to do?';
  }

  const elapsedMs = Date.now() - startedAt;
  const finalCostUsd = (totalInputTokens / 1_000_000) * PRICE_INPUT_PER_MTOK
                    + (totalOutputTokens / 1_000_000) * PRICE_OUTPUT_PER_MTOK;
  console.log('[DreamAi v3 vendor-chat]', vendorId, '→', toolsUsed.join(',') || 'no-tools',
    '·', iterations, 'iter ·', elapsedMs + 'ms ·', stopReason,
    '·', totalInputTokens + 'in/' + totalOutputTokens + 'out tok');

  // ── Persistence (Session 2) ───────────────────────────────────────────────
  // Always-write: persist the user+assistant pair. Best-effort — failures
  // log but do not break the user-visible reply.
  try {
    await writeHistory(vendorId, surface, [
      { role: 'user', content: message },
      {
        role: 'assistant',
        content: finalReply,
        tool_calls: toolsUsed.length ? toolsUsed : null,
      },
    ]);
  } catch (err) {
    console.error('[vendor-engine.loop] writeHistory failed:', err.message);
  }

  try {
    await recordUsage(vendorId, surface, {
      iterations,
      tokens_in: totalInputTokens,
      tokens_out: totalOutputTokens,
      usd_cost: finalCostUsd,
      tools_used: toolsUsed,
      stop_reason: stopReason,
    });
  } catch (err) {
    console.error('[vendor-engine.loop] recordUsage failed:', err.message);
  }

  return {
    status: 200,
    body: {
      success: true,
      reply: finalReply,
      toolsUsed,
      iterations,
    },
  };
}

module.exports = { runAgenticTurn };
