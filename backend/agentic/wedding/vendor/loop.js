// backend/agentic/wedding/vendor/loop.js
//
// runAgenticTurn() — one chat turn against the v3 vendor agentic engine.
// resumeAgenticTurn() — Session 4 (2026-05-12): continue a paused tool call.
// cancelPending() — Session 4: cancel a paused tool call.
//
// Pause-and-resume contract (Session 4):
//   - Caller passes justDoIt: boolean. Defaults to true (backwards-compat).
//   - When justDoIt === false AND the model's first tool_use block arrives,
//     the loop pauses: it persists a row to pending_vendor_tool_calls (full
//     messages[] state + tool_use_id), writes a text-only assistant marker
//     to vendor_dreamai_messages so the chat thread stays coherent, and
//     returns { success, reply, pendingTool, awaitingConfirm: true }.
//   - When justDoIt === true or no tool_use appears, behavior is byte-identical
//     to pre-S4 (tools execute inline; standard envelope returned).
//   - resumeAgenticTurn loads the pending row, validates ownership, executes
//     the held tool via dispatchTool, appends the tool_result, and continues
//     the loop until end_turn / next pause / cap.
//
// Snapshot freshness on resume: context is re-fetched. A vendor pausing 5 min
// gets a turn driven by the system prompt that reflects state at resume time.
//
// Cost cap, iteration cap, wall-time cap, and Haiku 4.5 pricing constants
// are preserved from S1/S2. Model is locked to claude-haiku-4-5-20251001
// per WORKING_PROTOCOL.

const engine = require('./engine');
const { fetchContext } = require('./context');
const { buildSystemPrompt } = require('./systemPrompt');
const { TDW_VENDOR_CHAT_TOOLS } = require('./tools');
const { dispatchTool } = require('./dispatcher');
const { readHistory, writeHistory } = require('./history');
const { recordUsage } = require('./usage');
const { buildToolPreview } = require('./preview');
const { createPending, readPending, deletePending } = require('./pending');

// Limits — identical to the inline implementation.
const MAX_ITERATIONS = 8;
const MAX_COST_USD = 0.50;
const MAX_WALL_MS = 45000;
// Haiku 4.5 pricing per million tokens (rough — update if pricing shifts).
const PRICE_INPUT_PER_MTOK = 1.0;
const PRICE_OUTPUT_PER_MTOK = 5.0;

// ─────────────────────────────────────────────────────────────────────────────
// _iterateLoop — the inner agentic loop, shared by run and resume entry points.
//
// Takes a partially-constructed state (the messages array and accumulators may
// already contain a prior assistant turn + tool_result) and continues calling
// the model until end_turn, a pause (justDoIt=false + first new tool_use),
// or a cap.
//
// Returns one of:
//   { kind: 'paused', reply, pendingToolFields, totals }
//   { kind: 'done',   reply, toolsUsed, iterations, totals, stopReason }
// ─────────────────────────────────────────────────────────────────────────────
async function _iterateLoop(state) {
  const { anthropic } = engine.deps();
  const { systemPrompt, vendor, justDoIt } = state;
  const messages = state.messages;
  let iterations = state.iterations || 0;
  let totalInputTokens = state.totalInputTokens || 0;
  let totalOutputTokens = state.totalOutputTokens || 0;
  const toolsUsed = state.toolsUsed || [];
  let finalReply = '';
  let stopReason = 'budget_or_limit';

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    if (Date.now() - state.startedAt > MAX_WALL_MS) {
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

    // ── Pause-and-resume gate (Session 4) ────────────────────────────────────
    // If justDoIt is OFF, pause before executing the first tool of this turn.
    if (!justDoIt) {
      const tu = toolUseBlocks[0];

      // Echo the assistant turn so the pending row's stored conversation already
      // has the tool_use block attached. Resume can splice tool_result onto this
      // messages array without any reconstruction.
      messages.push({ role: 'assistant', content: response.content });

      const preview = buildToolPreview(tu.name, tu.input || {});
      return {
        kind: 'paused',
        reply: textThisTurn,
        pendingToolFields: {
          tool_name: tu.name,
          tool_input: tu.input || {},
          tool_preview: preview,
          tool_use_id: tu.id,
          conversation_messages: messages,
        },
        totals: {
          iterations,
          totalInputTokens,
          totalOutputTokens,
          toolsUsed,
        },
      };
    }

    // ── Just Do It path (legacy behavior) ────────────────────────────────────
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

  return {
    kind: 'done',
    reply: finalReply,
    toolsUsed,
    iterations,
    totals: { iterations, totalInputTokens, totalOutputTokens, toolsUsed },
    stopReason,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// runAgenticTurn — fresh chat turn (existing entry point, S4-extended with justDoIt).
// ─────────────────────────────────────────────────────────────────────────────
async function runAgenticTurn({ vendorId, message, history = [], surface = 'native', justDoIt = true }) {
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

  let effectiveHistory = Array.isArray(history) ? history : [];
  if (effectiveHistory.length === 0) {
    try {
      effectiveHistory = await readHistory(vendorId, 10);
    } catch (err) {
      console.error('[vendor-engine.loop] history hydration failed:', err.message);
      effectiveHistory = [];
    }
  }

  const historyMessages = effectiveHistory.slice(-10).map(h => ({
    role: h.role === 'user' ? 'user' : 'assistant',
    content: h.text || h.content || '',
  })).filter(m => m.content);

  const messages = [
    ...historyMessages,
    { role: 'user', content: message },
  ];

  const outcome = await _iterateLoop({
    messages,
    systemPrompt,
    vendor,
    vendorId,
    surface,
    justDoIt,
    toolsUsed: [],
    iterations: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    startedAt,
    firstUserMessage: message,
  });

  // ── Paused outcome — Session 4 entry ─────────────────────────────────────
  if (outcome.kind === 'paused') {
    const { pendingToolFields, reply, totals } = outcome;
    const previewText = pendingToolFields.tool_preview;
    // Model may have produced no pre-tool prose; fall back to a brisk vendor-voice line.
    const visibleReply = (reply && reply.trim()) ? reply.trim() : `Confirm: ${previewText}`;

    let pending_token;
    try {
      const created = await createPending({
        vendor_id: vendorId,
        tool_name: pendingToolFields.tool_name,
        tool_input: pendingToolFields.tool_input,
        tool_preview: pendingToolFields.tool_preview,
        tool_use_id: pendingToolFields.tool_use_id,
        conversation_messages: pendingToolFields.conversation_messages,
        surface,
      });
      pending_token = created.pending_token;
    } catch (err) {
      console.error('[vendor-engine.loop] createPending failed:', err.message);
      return {
        status: 500,
        body: { success: false, error: 'Could not save pending action', reply: 'Something went sideways. Try once more?' },
      };
    }

    // Persist a coherent chat-history pair at pause time. The full Anthropic
    // block array stays in pending_vendor_tool_calls.conversation_messages only.
    try {
      await writeHistory(vendorId, surface, [
        { role: 'user', content: message },
        {
          role: 'assistant',
          content: visibleReply,
          tool_calls: [pendingToolFields.tool_name],
        },
      ]);
    } catch (err) {
      console.error('[vendor-engine.loop] writeHistory (paused) failed:', err.message);
    }

    const finalCostUsd = (totals.totalInputTokens / 1_000_000) * PRICE_INPUT_PER_MTOK
                       + (totals.totalOutputTokens / 1_000_000) * PRICE_OUTPUT_PER_MTOK;
    try {
      await recordUsage(vendorId, surface, {
        iterations: totals.iterations,
        tokens_in: totals.totalInputTokens,
        tokens_out: totals.totalOutputTokens,
        usd_cost: finalCostUsd,
        tools_used: totals.toolsUsed,
        stop_reason: 'paused_awaiting_confirm',
      });
    } catch (err) {
      console.error('[vendor-engine.loop] recordUsage (paused) failed:', err.message);
    }

    const elapsedMs = Date.now() - startedAt;
    console.log('[DreamAi v3 vendor-chat]', vendorId, '→ PAUSED on', pendingToolFields.tool_name,
      '·', totals.iterations, 'iter ·', elapsedMs + 'ms ·', totals.totalInputTokens + 'in/' + totals.totalOutputTokens + 'out tok');

    return {
      status: 200,
      body: {
        success: true,
        reply: visibleReply,
        toolsUsed: totals.toolsUsed,
        iterations: totals.iterations,
        awaitingConfirm: true,
        pendingTool: {
          id: pending_token,
          name: pendingToolFields.tool_name,
          input: pendingToolFields.tool_input,
          preview: pendingToolFields.tool_preview,
        },
      },
    };
  }

  // ── Done outcome — same shape as pre-S4 ──────────────────────────────────
  return await _finalizeTurn({
    vendorId,
    surface,
    firstUserMessage: message,
    outcome,
    startedAt,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// resumeAgenticTurn — Session 4: continue a paused tool call.
// ─────────────────────────────────────────────────────────────────────────────
async function resumeAgenticTurn({ vendorId, pendingToken }) {
  const startedAt = Date.now();
  const { anthropic } = engine.deps();

  if (!anthropic) {
    return {
      status: 503,
      body: { success: false, error: 'AI service not configured' },
    };
  }

  let pending;
  try {
    pending = await readPending(pendingToken, vendorId);
  } catch (err) {
    return {
      status: 500,
      body: { success: false, error: err.message, reply: 'Something went sideways. Try once more?' },
    };
  }
  if (!pending) {
    return {
      status: 404,
      body: { success: false, error: 'Pending action not found or expired', reply: 'That action expired or was already handled. Send the request again?' },
    };
  }

  // Single-use: delete the pending row before running the tool.
  try {
    await deletePending(pendingToken, vendorId);
  } catch (err) {
    console.error('[vendor-engine.loop] deletePending (resume) failed:', err.message);
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

  const messages = Array.isArray(pending.conversation_messages)
    ? pending.conversation_messages
    : [];

  // Execute the held tool to produce a tool_result block.
  let resultText;
  try {
    resultText = await dispatchTool(pending.tool_name, pending.tool_input || {}, vendor);
  } catch (err) {
    console.error('[DreamAi v3 vendor-confirm] tool error:', pending.tool_name, err.message);
    resultText = 'Error: ' + err.message;
  }

  messages.push({
    role: 'user',
    content: [{
      type: 'tool_result',
      tool_use_id: pending.tool_use_id,
      content: typeof resultText === 'string' ? resultText : JSON.stringify(resultText),
    }],
  });

  const outcome = await _iterateLoop({
    messages,
    systemPrompt,
    vendor,
    vendorId,
    surface: pending.surface || 'native',
    justDoIt: true,                       // resume always runs follow-ups inline
    toolsUsed: [pending.tool_name],
    iterations: 1,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    startedAt,
    firstUserMessage: '',
  });

  // A resume cannot pause again in Session 4 (justDoIt=true on resume).
  if (outcome.kind === 'paused') {
    console.error('[vendor-engine.loop] resume produced paused outcome — unexpected');
    return {
      status: 500,
      body: { success: false, error: 'Unexpected pause on resume', reply: 'Something went sideways. Try once more?' },
    };
  }

  return await _finalizeTurn({
    vendorId,
    surface: pending.surface || 'native',
    firstUserMessage: '',
    outcome,
    startedAt,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// cancelPending — Session 4: cancel a paused tool call.
// ─────────────────────────────────────────────────────────────────────────────
async function cancelPending({ vendorId, pendingToken }) {
  let pending;
  try {
    pending = await readPending(pendingToken, vendorId);
  } catch (err) {
    return {
      status: 500,
      body: { success: false, error: err.message, reply: 'Something went sideways. Try once more?' },
    };
  }
  if (!pending) {
    return {
      status: 404,
      body: { success: false, error: 'Pending action not found or expired', reply: 'That action already expired or was handled.' },
    };
  }

  try {
    await deletePending(pendingToken, vendorId);
  } catch (err) {
    return {
      status: 500,
      body: { success: false, error: err.message, reply: 'Something went sideways. Try once more?' },
    };
  }

  const surface = pending.surface || 'native';

  try {
    await writeHistory(vendorId, surface, [
      {
        role: 'assistant',
        content: 'Cancelled.',
        tool_calls: null,
      },
    ]);
  } catch (err) {
    console.error('[vendor-engine.loop] writeHistory (cancelled) failed:', err.message);
  }

  return {
    status: 200,
    body: {
      success: true,
      reply: 'Cancelled.',
      toolsUsed: [],
      iterations: 0,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// _finalizeTurn — shared completion path: persist history + telemetry, return envelope.
// ─────────────────────────────────────────────────────────────────────────────
async function _finalizeTurn({ vendorId, surface, firstUserMessage, outcome, startedAt }) {
  const { reply, toolsUsed, iterations, totals, stopReason } = outcome;

  const elapsedMs = Date.now() - startedAt;
  const finalCostUsd = (totals.totalInputTokens / 1_000_000) * PRICE_INPUT_PER_MTOK
                    + (totals.totalOutputTokens / 1_000_000) * PRICE_OUTPUT_PER_MTOK;
  console.log('[DreamAi v3 vendor-chat]', vendorId, '→', toolsUsed.join(',') || 'no-tools',
    '·', iterations, 'iter ·', elapsedMs + 'ms ·', stopReason,
    '·', totals.totalInputTokens + 'in/' + totals.totalOutputTokens + 'out tok');

  const rowsToWrite = [];
  if (firstUserMessage) {
    rowsToWrite.push({ role: 'user', content: firstUserMessage });
  }
  rowsToWrite.push({
    role: 'assistant',
    content: reply,
    tool_calls: toolsUsed.length ? toolsUsed : null,
  });

  try {
    await writeHistory(vendorId, surface, rowsToWrite);
  } catch (err) {
    console.error('[vendor-engine.loop] writeHistory failed:', err.message);
  }

  try {
    await recordUsage(vendorId, surface, {
      iterations,
      tokens_in: totals.totalInputTokens,
      tokens_out: totals.totalOutputTokens,
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
      reply,
      toolsUsed,
      iterations,
    },
  };
}

module.exports = { runAgenticTurn, resumeAgenticTurn, cancelPending };
