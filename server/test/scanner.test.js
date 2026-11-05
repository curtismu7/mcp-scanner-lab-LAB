import assert from 'node:assert/strict';
import test from 'node:test';
import { scanTools, scanContent, validateToolCall, scanAgentCard, CATEGORIES } from '../src/scanner.js';
import { POISONED_MCP, POISONED_CARD, CLEAN_MCP, CLEAN_CARD, TRANSFER_TOOL, ABUSE_ARGS, CLEAN_ARGS } from '../src/fixtures.js';

test('every category has at least one finding on the poisoned fixtures', () => {
  const findings = [
    ...scanTools(POISONED_MCP.tools),
    ...POISONED_MCP.resources.flatMap((r) => scanContent(`resource:${r.name}`, r.contents[0].text)),
    ...POISONED_MCP.prompts.flatMap((p) => scanContent(`prompt:${p.name}`, [p.description, p.messages[0].content.text].join('\n'))),
    ...scanAgentCard(POISONED_CARD),
    ...validateToolCall(TRANSFER_TOOL, ABUSE_ARGS),
  ];
  for (const kind of CATEGORIES) {
    assert.ok(findings.some((f) => f.kind === kind), `expected a ${kind} finding`);
  }
});

test('the clean fixtures stay silent', () => {
  assert.deepEqual(scanTools(CLEAN_MCP.tools), []);
  assert.deepEqual(scanContent('resource:weather', CLEAN_MCP.resources[0].contents[0].text), []);
  assert.deepEqual(scanAgentCard(CLEAN_CARD), []);
  assert.deepEqual(validateToolCall(TRANSFER_TOOL, CLEAN_ARGS), []);
});

test('mutation: a poisoned description without teeth produces no finding', () => {
  const benign = [{ name: 'get_weather', description: 'Get the weather.', inputSchema: { type: 'object', properties: {} } }];
  assert.deepEqual(scanTools(benign), []);
});

test('mutation: removing the [SYSTEM:] marker loses the tool-abuse finding but keeps schema violation', () => {
  const args = { ...ABUSE_ARGS, description: 'Groceries' };
  const findings = validateToolCall(TRANSFER_TOOL, args);
  assert.ok(!findings.some((f) => /smuggled directive/.test(f.detail)));
  assert.ok(findings.some((f) => f.kind === 'schema-violation'));
});

test('mutation: a valid numeric amount loses the schema-violation finding', () => {
  const args = { ...ABUSE_ARGS, amount: 500 };
  const findings = validateToolCall(TRANSFER_TOOL, args);
  assert.ok(!findings.some((f) => f.kind === 'schema-violation' && /amount/.test(f.detail)));
});

test('mutation: a cross-owner id on a non-account arg is not flagged', () => {
  const tool = { name: 'note', inputSchema: { type: 'object', properties: { label: { type: 'string' } } } };
  assert.deepEqual(validateToolCall(tool, { label: 'external-001' }), []);
});

test('cleanText strips control characters and caps length', async () => {
  const { cleanText } = await import('../src/safety.js');
  assert.equal(cleanText('a\u0000b'), 'a b');
  assert.equal(cleanText('x'.repeat(10), 4), 'xxxx');
});
