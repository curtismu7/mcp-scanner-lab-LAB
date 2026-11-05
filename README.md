# mcp-scanner-lab

A **Tester-tier lab** for the four **Tool & Agent Safety** categories — the guardrail
classification of the **PingOne Privilege AI Gateway**:

| Category | The attack | Where Ping enforces |
|---|---|---|
| Tool poisoning (`tool_poisoning`) | Malicious instructions hidden in tool descriptions, `inputSchema` defaults, resource or prompt content | The Privilege gateway polices the induced tool *call* (HITL/deny); metadata scanning sits in front of the agent |
| Schema violation (`schema_violation`) | Arguments that do not match the tool's declared input schema | Rejected at the gateway / MCP input-schema boundary (400) |
| Tool abuse (`tool_abuse`) | A schema-valid call with hostile intent: cross-owner account ids, limits-override flags, smuggled `[SYSTEM: …]` directives | Privilege policy denies on tool + arguments (403 DENY) |
| Inter-agent abuse (`inter_agent_abuse`) | An Agent Card claiming orchestrator/admin authority or instructing the delegating agent to disable its safety checks | The A2A wire gate (401) + card scanning at ingest |

**The lab detects; the Privilege gateway enforces.** This app runs the scanner heuristics
in-process (mock fixtures or data you paste) and shows what *could* be caught before a call
leaves the agent. It never blocks anything and makes zero outbound calls. To see the same
attacks enforced live, use the AI-DEMO2 Attack Lab, where the Privilege gateway returns
DENY / 428 HITL / 400 / 401 for exactly these categories.

## Run it

```bash
npm install
npm start            # http://127.0.0.1:7650 (loopback only)
npm test             # server + web + scripts
```

- **Mock** (default): the built-in poisoned demo fixtures — a hostile MCP server, an
  orchestrator-impersonating Agent Card, an abusive `create_transfer` call.
- **Real**: paste your own tool metadata / Agent Card / tool-call JSON; the same heuristics
  run on it. Still in-process, still zero outbound.

## What is simulated

Everything is in-process. There is no tenant, no credentials, no network. The scanner is
heuristic (keyword and shape based): it catches the known poisoning shapes, obvious schema
mismatches and authority-claim phrasings; a novel phrasing can slip past, and an unusually
worded legitimate tool could trip a flag. It is a tripwire, not a proof of safety, and no
finding here is a policy decision.
