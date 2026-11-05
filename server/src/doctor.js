// Doctor checks: the same checks GET /api/health reports from. No network.
// Print-only in scripts/doctor.mjs; here, a check list for the health endpoint.

export async function runChecks(env = process.env) {
  const checks = [];
  const ok = (id, detail) => checks.push({ id, level: 'pass', detail });
  const fail = (id, detail) => checks.push({ id, level: 'fail', detail });

  // Node 26 only (rulebook).
  const major = Number(process.versions.node.split('.')[0]);
  if (major >= 26) ok('node-26', `Node ${process.versions.node}`);
  else fail('node-26', `Node ${process.versions.node}; this lab needs Node >= 26`);

  // No real credentials in the environment (this lab has none by design; a stray real-looking key fails).
  const envText = JSON.stringify({ PINGONE_CLIENT_SECRET: env.PINGONE_CLIENT_SECRET, PINGONE_WORKER_SECRET: env.PINGONE_WORKER_SECRET });
  if (!envText || !/(?!^)(sk-|secret)[A-Za-z0-9_-]{12,}/i.test(envText.replace(/sk-MOCK-/g, ''))) ok('no-real-credentials', 'no credential material in the environment');
  else fail('no-real-credentials', 'a real-looking credential is present in the environment; unset it');

  return checks;
}

export function allPassed(checks) { return checks.every((c) => c.level === 'pass'); }
