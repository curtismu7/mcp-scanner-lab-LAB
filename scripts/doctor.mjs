// Preflight: the same checks GET /api/health reports from, plus whether the port is free.
// Prints only pass/fail lines. Exit 1 on any failure. Needs no network.
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { installNetguard } from '../server/src/netguard.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
installNetguard(); // the doctor makes no outbound call either

const { runChecks } = await import(pathToFileURL(path.join(root, 'server/src/doctor.js')));
let failed = 0;
const report = (level, name, detail) => { if (level === 'fail') failed++; console.log(`${level.toUpperCase().padEnd(4)}  ${name}: ${detail}`); };
for (const c of await runChecks()) report(c.level, c.id, c.detail);

// A real cycle through the HTTP layer, in this process, on an ephemeral loopback port.
try {
  const { createApp } = await import(pathToFileURL(path.join(root, 'server/src/app.js')));
  const { createHealth } = await import(pathToFileURL(path.join(root, 'server/src/health.js')));
  const health = createHealth({ intervalMs: 3_600_000 });
  await health.ready;
  const { app } = createApp({ health });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const h = { 'content-type': 'application/json', origin: base, host: '127.0.0.1' };
    const hj = await (await fetch(`${base}/api/health`)).json();
    if (hj.schema === 'demo-health/1' && hj.state === 'ready') report('pass', 'http-cycle', `health ${hj.schema} ${hj.state}`);
    else report('fail', 'http-cycle', `health answered ${JSON.stringify(hj)}`);
    const scan = await (await fetch(`${base}/api/scan`, { method: 'POST', headers: h, body: '{}' })).json();
    const kinds = ['tool-poisoning', 'schema-violation', 'tool-abuse', 'inter-agent-abuse'];
    if (kinds.every((k) => scan.counts[k] > 0)) report('pass', 'scan-cycle', `all four categories found (total ${scan.total})`);
    else report('fail', 'scan-cycle', `counts ${JSON.stringify(scan.counts)}`);
  } finally { server.close(); }
} catch (e) {
  report('fail', 'http-cycle', String(e.message || e));
}

// Port free (only when a PORT is actually set — the ephemeral cycle above already proved the app serves).
if (process.env.PORT) {
  const port = Number(process.env.PORT);
  const free = await new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port, '127.0.0.1');
  });
  if (free) report('pass', 'port-free', `port ${port} is free`);
  else report('fail', 'port-free', `port ${port} is already in use`);
}

process.exit(failed ? 1 : 0);
