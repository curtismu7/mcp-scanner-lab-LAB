# mcp-scanner-lab — MCP Scanner Lab (Tester tier)

The four **Tool & Agent Safety** categories of the **PingOne Privilege AI Gateway** guardrails
(`tool_poisoning`, `schema_violation`, `tool_abuse`, `inter_agent_abuse`), demonstrated on demo
fixtures or your own pasted metadata / Agent Card / tool-call JSON. **The lab detects; the
Privilege gateway enforces** — nothing here is a policy decision, nothing here blocks, and no
call ever leaves the machine.

Follow the rulebook at `~/Development/STANDALONE-RULES.md`.

## Mock and Real (rule 19)

- **Mock** (default): the built-in poisoned demo fixtures — a hostile MCP server, an
  orchestrator-impersonating Agent Card, an abusive `create_transfer` call. Fully offline.
- **Real**: the same heuristics run on the JSON you paste into the page (tool metadata, an
  Agent Card, a `tools/call` request). Still in-process, still zero outbound; there is no
  tenant credential anywhere in this lab.
- The header toggle POSTs `/api/mode {source}`; Real is always available here (it needs only
  pasted data). A scan in Real mode with nothing pasted answers 400.

## Non-negotiables

- Loopback bind only (`SCANLAB_BIND` opt-in; Docker publishes `127.0.0.1:` only), Host check,
  same-origin writes.
- Zero outbound calls: netguard on every socket/DNS/fetch/UDP path, with self-tests.
- The scanner REPORTS; it never blocks, and it says so on every surface (banner, About, README).
- Hostile pasted text is rendered inert (text nodes only).
- Ports 7650-7659. Node 26 only.

## Module map

- `server/src/scanner.js` — the four-category heuristics (vendored by copy from the AI-DEMO2
  standalone mcp-scanner; keep the header).
- `server/src/fixtures.js` — the poisoned and clean demo fixtures; the tests assert teeth.
- `server/src/app.js` — `/api/scan`, `/api/fixtures`, `/api/runs`, `/api/mode`, `/api/reset`, `/api/health`.
- `server/src/netguard.js`, `server/src/safety.js` — outbound guard, bind/Host/same-origin rules.
- `web/src/tabs/ScanTab.jsx` — one scan button, the four-category findings grid, paste box for Real.
- `web/src/tabs/AboutTab.jsx` — each category's threat and where a defense (and Ping) sits.

## Verify before claiming done

```bash
npm ci && npm test && npm run doctor && npm run build -w web
```

Then drive the real page (port 7650): Mock scan shows findings in all four categories; switch
to Real, paste the README's template, scan again; Reset clears the run. Docker: `HOST_PORT=7650 docker compose up --build -d`.
