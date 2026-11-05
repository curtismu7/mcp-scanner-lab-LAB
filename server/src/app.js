// One Express app. /api = the scanner lab: scan the built-in fixtures or pasted data,
// validate a tools/call request, decode nothing sensitive. Loopback Host check and
// same-origin writes everywhere.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { hostCheck, sameOriginWrites, cleanText } from './safety.js';
import { createHealth } from './health.js';
import { createMode, MODES } from './mode.js';
import { workspaceId, newWorkspaceId } from './workspace.js';
import { scanTools, scanContent, validateToolCall, scanAgentCard, CATEGORIES } from './scanner.js';
import { POISONED_MCP, POISONED_CARD, TRANSFER_TOOL, ABUSE_ARGS, CLEAN_ARGS, CLEAN_MCP, CLEAN_CARD } from './fixtures.js';

const WEB_DIST = process.env.WEB_DIST || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
const bad = (res, message, status = 400) => res.status(status).json({ error: status === 404 ? 'not_found' : 'bad_request', message });
export const BANNER = (source) => source === 'real'
  ? 'REAL mode: the scanner runs on the tool metadata, Agent Card and tool-call JSON YOU paste into the page. Still in-process, zero outbound calls. The scanner REPORTS — it never blocks. Enforcement of these categories is the PingOne Privilege AI Gateway\'s job; the AI-DEMO2 Attack Lab shows its live verdicts.'
  : 'MOCK mode. SIMULATED: the scanner runs on the built-in demo fixtures (a poisoned MCP server, a hostile Agent Card, an abusive create_transfer call). In-process, no tenant, no outbound network. Categories follow the PingOne Privilege AI Gateway guardrails (tool_abuse / tool_poisoning / schema_violation / inter_agent_abuse). The scanner REPORTS — it never blocks; the Privilege gateway enforces.';

// A run record, capped per workspace so Reset and cap go together.
const MAX_RUNS = 40;

export function createApp({ health = createHealth(), mode = createMode(), fixtures = { POISONED_MCP, POISONED_CARD, TRANSFER_TOOL, ABUSE_ARGS, CLEAN_ARGS, CLEAN_MCP, CLEAN_CARD } } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(hostCheck);
  app.use(sameOriginWrites);
  app.use((_req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); next(); });

  const runs = new Map(); // workspaceId -> [{ at, source, inputs, findings }]

  const api = express.Router();
  api.use(express.json({ limit: '256kb' }));
  // eslint-disable-next-line no-unused-vars
  api.use((err, _req, res, _next) => {
    if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large' || err instanceof SyntaxError) {
      return res.status(err.type === 'entity.too.large' ? 413 : 400).json({ error: 'bad_request', message: err.type === 'entity.too.large' ? 'request body over 256kb' : 'request body is not valid JSON' });
    }
    return res.status(400).json({ error: 'bad_request', message: 'bad request' });
  });
  api.use('/health', health.router);

  api.get('/info', (_req, res) => { res.set('Cache-Control', 'no-store'); res.json({ ...mode.info(), banner: BANNER(mode.source()), categories: CATEGORIES }); });

  // Rule 19: POST /api/mode with exactly {"source": "mock"|"real"}.
  api.post('/mode', (req, res) => {
    const b = req.body;
    if (!b || typeof b !== 'object' || Array.isArray(b) || Object.keys(b).length !== 1 || !MODES.includes(b.source)) return bad(res, 'body must be exactly {"source": "mock" or "real"}');
    if (b.source === 'real' && mode.info().realAvailable !== true) return res.status(409).json({ error: 'conflict', message: mode.info().realReason });
    mode.set(b.source);
    return res.json({ ...mode.info(), banner: BANNER(mode.source()) });
  });

  api.get('/fixtures', (_req, res) => res.json({
    banner: BANNER(mode.source()), source: mode.source(), workspaceId: workspaceId(_req),
    poisoned: { mcp: fixtures.POISONED_MCP, card: fixtures.POISONED_CARD },
    clean: { mcp: fixtures.CLEAN_MCP, card: fixtures.CLEAN_CARD },
    transferTool: fixtures.TRANSFER_TOOL, abuseArgs: fixtures.ABUSE_ARGS, cleanArgs: fixtures.CLEAN_ARGS,
  }));

  // The scan. Body: { data?: { mcp?: {...}, card?: {...}, call?: { tool?, args } } }.
  // Absent data in mock mode = the built-in poisoned fixtures; in real mode = 400 (you must paste).
  api.post('/scan', (req, res) => {
    const body = req.body || {};
    if (body.data !== undefined && (typeof body.data !== 'object' || Array.isArray(body.data))) return bad(res, 'data must be an object');
    const data = body.data;
    const source = mode.source();
    if (source === 'real' && (!data || typeof data !== 'object')) return bad(res, 'real mode scans YOUR data: paste tool metadata, an Agent Card, or a tool call first');
    const inputs = data ?? { mcp: fixtures.POISONED_MCP, card: fixtures.POISONED_CARD, call: { tool: fixtures.TRANSFER_TOOL, args: fixtures.ABUSE_ARGS } };

    const mcp = inputs.mcp || {};
    const findings = [
      ...scanTools(mcp.tools),
      ...(mcp.resources || []).flatMap((r) => scanContent(`resource:${r.name || r.uri || '(unnamed)'}`, [r.description, ...(r.contents || []).map((c) => c.text || '')].filter(Boolean).join('\n'))),
      ...(mcp.prompts || []).flatMap((p) => scanContent(`prompt:${p.name || '(unnamed)'}`, [p.description, ...(p.messages || []).map((m) => m.content?.text || '')].filter(Boolean).join('\n'))),
      ...scanAgentCard(inputs.card),
      ...validateToolCall(inputs.call?.tool ?? null, inputs.call?.args ?? {}),
    ];

    const run = { at: new Date().toISOString(), source, counts: countByKind(findings), total: findings.length, findings };
    const ws = workspaceId(req);
    const list = runs.get(ws) || [];
    list.push(run);
    runs.set(ws, list.slice(-MAX_RUNS));
    return res.json({ banner: BANNER(source), ...run, runs: list.length, workspaceId: ws, workspaceCookie: ws === 'default' ? newWorkspaceId() : undefined });
  });

  api.get('/runs', (req, res) => res.json({ banner: BANNER(mode.source()), runs: runs.get(workspaceId(req)) || [] }));

  // Reset (rule 3): clears the workspace's run history.
  api.post('/reset', (req, res) => {
    runs.delete(workspaceId(req));
    return res.json({ ok: true, banner: BANNER(mode.source()), source: mode.source() });
  });

  app.use('/api', api);
  app.use(express.static(WEB_DIST));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(WEB_DIST, 'index.html')));
  return { app, runsFor: (ws) => runs.get(ws) || [] };
}

function countByKind(findings) {
  const counts = Object.fromEntries(CATEGORIES.map((k) => [k, 0]));
  for (const f of findings) if (counts[f.kind] !== undefined) counts[f.kind] += 1;
  return counts;
}
