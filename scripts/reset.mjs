// Reset: clears server-side run history. For this stateless lab the only state is
// per-workspace in-memory run lists, which die with the process — so Reset is a
// client-side contract: clear localStorage, reload. This script verifies the API
// answers and returns ok, then reports what a browser Reset will do.
import { installNetguard } from '../server/src/netguard.js';
installNetguard();

const { createApp } = await import(new URL('../server/src/app.js', import.meta.url));
const { createHealth } = await import(new URL('../server/src/health.js', import.meta.url));
const health = createHealth({ intervalMs: 3_600_000 });
await health.ready;
const { app } = createApp({ health });
const server = app.listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const r = await (await fetch(`${base}/api/reset`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base, host: '127.0.0.1' }, body: '{}' })).json();
  if (r.ok) console.log('PASS  reset: POST /api/reset answered ok; a browser Reset clears localStorage and reloads');
  else { console.log(`FAIL  reset: ${JSON.stringify(r)}`); process.exit(1); }
} finally { server.close(); }
