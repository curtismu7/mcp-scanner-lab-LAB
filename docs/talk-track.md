# Talk track — MCP Scanner Lab

**Open (30s).** "This lab teaches the four Tool & Agent Safety categories that PingOne Privilege's AI Gateway guardrails classify on live agent traffic: tool poisoning, schema violation, tool abuse, and inter-agent abuse. The lab detects; the Privilege gateway enforces."

**Mock scan (1min).** Press "Scan the demo fixtures". Fourteen findings land in four cards:
- Tool Poisoning (8): a weather tool hiding a transfer instruction, a search tool with an off-box exfiltration default, a poisoned resource and prompt.
- Schema Violation (1): `amount: "one hundred dollars"` where a number is required.
- Tool Abuse (3): the same call, schema-valid arguments — a cross-owner account id, a limits-override flag, a smuggled `[SYSTEM: …]` directive.
- Inter-Agent Abuse (2): an Agent Card claiming orchestrator authority and telling the delegating agent to disable its safety checks.

**Key line.** "Nothing here blocks. The scanner is the detect half. Enforcement — DENY, hold-for-human-approval, 400, 401 — happens in the PingOne Privilege AI Gateway; the AI-DEMO2 Attack Lab shows those verdicts on the same attacks."

**Real mode (1min).** Flip the header toggle to Real. Paste your own tool metadata, an Agent Card, or a tool-call JSON. Same heuristics, your data, still in-process, still zero outbound calls.

**Diagram tab (optional, 1min).** "How it fits": hostile metadata reaches the agent, this lab scans at ingest, the Privilege gateway enforces the call, only a permitted call reaches the tool backend.

**Close.** "Detection informs; policy enforces. That split is the whole story."
