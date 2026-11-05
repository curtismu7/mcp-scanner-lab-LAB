// Builds content-pack.json (demo-content-pack/1) from the scanner data.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES } from '../server/src/scanner.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

export function buildPack() {
  return {
    schema: 'demo-content-pack/1',
    id: 'mcp-scanner-lab',
    title: 'MCP Scanner Lab',
    version,
    demo: { id: 'mcp-scanner-lab', name: 'MCP Scanner Lab', catalog: "T1", baseUrl: 'http://localhost:7650', doctor: '/api/health', tags: ['mcp', 'tool-poisoning', 'schema-violation', 'tool-abuse', 'inter-agent-abuse', 'agent-security', 'scanner', 'mock', 'real'] },
    glossary: [
      { id: 'tool-poisoning', term: 'Tool poisoning', definition: 'A malicious MCP server hides instructions in tool descriptions, inputSchema defaults, resource content or prompt text. An agent ingests all of it as trusted context before calling anything.' },
      { id: 'schema-violation', term: 'Schema violation', definition: 'A tool call whose arguments do not match the tool\'s declared inputSchema: a string where a number is required, a missing required argument, an argument the schema does not define.' },
      { id: 'tool-abuse', term: 'Tool abuse', definition: 'A schema-VALID call used for a hostile purpose: a cross-owner account id, a limits-override flag, or a smuggled [SYSTEM: ...] directive in a free-text field. The metadata is clean; the intent is not.' },
      { id: 'inter-agent-abuse', term: 'Inter-agent abuse', definition: 'One agent impersonates or over-reaches against another: an Agent Card claiming orchestrator/admin authority, or instructing the delegating agent to disable its safety checks.' },
      { id: 'privilege-gateway', term: 'PingOne Privilege AI Gateway', definition: 'The enforcement point these four categories belong to: its guardrails classify exactly these on live agent traffic, and its policy denies, holds for human approval, or rejects malformed calls. This lab detects; the gateway enforces.' },
    ],
    cards: CATEGORIES.map((kind) => ({
      id: `cat-${kind}`,
      label: kind,
      description: `See the ${kind} category demonstrated on the demo fixtures.`,
      group: 'try-it',
      terms: [kind, 'privilege-gateway'],
      action: { type: 'route', href: '/#/scan' },
    })),
    sources: [
      { id: 'privilege-guardrails', title: 'PingOne Privilege AI Gateway guardrails (Tool & Agent Safety categories)', url: 'https://docs.pingidentity.com', kind: 'product', use: 'the four-category classification this lab teaches; measured live in the AI-DEMO2 privilege guardrails runbooks', status: 'read', checked: '2026-11-04' },
      { id: 'modelcontextprotocol', title: 'Model Context Protocol (MCP)', url: 'https://modelcontextprotocol.io', kind: 'standard', use: 'the tools/list, resources, prompts and tools/call surfaces the scanner checks', status: 'read', checked: '2026-11-04' },
      { id: 'a2a', title: 'Agent2Agent (A2A) protocol', url: 'https://a2a-protocol.org', kind: 'standard', use: 'the Agent Card that inter-agent abuse rides on', status: 'read', checked: '2026-11-04' },
    ],
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fs.writeFileSync(path.join(ROOT, 'content-pack.json'), JSON.stringify(buildPack(), null, 2) + '\n');
  console.log('content-pack.json written');
}
