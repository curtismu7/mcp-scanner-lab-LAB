// Repo-level checks: content pack, shelf entry, README truth, hygiene, CI shape.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePack } from './validate-content-pack.mjs';
import { buildPack } from './build-content-pack.mjs';
import { portProblem } from '../server/src/safety.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('content pack validates and is in sync with the builder', () => {
  const pack = JSON.parse(read('content-pack.json'));
  assert.deepEqual(validatePack(pack), []);
  assert.deepEqual(pack, buildPack(), 'run: node scripts/build-content-pack.mjs');
  assert.equal(pack.demo.doctor, '/api/health');
});

test('content pack validation rejects a broken pack', () => {
  const pack = buildPack();
  pack.cards[0].terms = ['no-such-term'];
  assert.ok(validatePack(pack).some((e) => /unknown term/.test(e)));
  delete pack.glossary;
  assert.ok(validatePack(pack).length > 0);
});

test('shelf entry matches the demo: id, kind Tester, port, health path, loopback url, portable composeFile', () => {
  const [d] = JSON.parse(read('docs/shelf-entry.json')).demos;
  assert.equal(d.id, 'mcp-scanner-lab');
  assert.equal(d.kind, 'Tester');
  assert.match(d.url, /^http:\/\/localhost:\d+$/);
  assert.equal(d.healthPath, '/api/health');
  assert.match(d.composeFile, /^mcp-scanner-lab\/docker-compose\.yml$/);
  assert.ok(d.notes.includes('7650'));
});

test('shelf url and compose port agree and are allowed ports', () => {
  const [d] = JSON.parse(read('docs/shelf-entry.json')).demos;
  const urlPort = Number(new URL(d.url).port);
  assert.equal(portProblem(urlPort), null);
  const composePort = Number(/HOST_PORT:-(\d+)/.exec(read('docker-compose.yml'))[1]);
  assert.equal(urlPort, composePort);
});

test('README names the four categories and the Ping product, and stays honest about detection vs enforcement', () => {
  const readme = read('README.md');
  for (const c of ['tool poisoning', 'schema violation', 'tool abuse', 'inter-agent abuse']) {
    assert.ok(readme.toLowerCase().includes(c), `README names ${c}`);
  }
  assert.match(readme, /PingOne Privilege/);
  assert.match(readme, /never blocks|reports/);
});

test('no loopback-universal URLs: 127.0.0.1 never appears in the README as the hand-off URL', () => {
  assert.doesNotMatch(read('README.md'), /127\.0\.0\.1:\d+\s*\(.*hand/);
});

test('CI workflow exists and covers build, test, doctor, forbidden strings, gitleaks', () => {
  const ci = read('.github/workflows/ci.yml');
  for (const job of ['build', 'test', 'doctor', 'forbidden-strings', 'gitleaks']) assert.ok(ci.includes(job), `ci.yml has ${job}`);
});

test('no real-looking secrets in tracked text', () => {
  const files = ['README.md', 'docs/shelf-entry.json', 'content-pack.json', 'package.json', 'server/src/app.js', 'web/src/App.jsx'];
  for (const f of files) assert.doesNotMatch(read(f), /\bsk-[A-Za-z0-9]{20,}/);
});
