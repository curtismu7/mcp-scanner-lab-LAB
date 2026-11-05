import { installNetguard } from './netguard.js';
import { createApp } from './app.js';
import { allPassed, runChecks } from './doctor.js';
import { assertBindAllowed, bindHost, resolvePort } from './safety.js';

installNetguard(); // before anything else can open a socket

const checks = await runChecks();
if (!allPassed(checks)) {
  for (const c of checks.filter((x) => x.level === 'fail')) console.error(`[mcp-scanner-lab] refusing to start: ${c.id}: ${c.detail}`);
  process.exit(1);
}
const host = assertBindAllowed(bindHost(), process.env);
const port = resolvePort();
const server = createApp().app.listen(port, host, () => {
  console.log(`[mcp-scanner-lab] MCP Scanner Lab at http://${host}:${port} (Mock mode by default: built-in poisoned fixtures; loopback; Real mode scans the data you paste. The scanner reports — it never blocks.)`);
  console.log(`[mcp-scanner-lab] health: /api/health | fixtures: /api/fixtures | scan: POST /api/scan | runs: /api/runs`);
});
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)));
