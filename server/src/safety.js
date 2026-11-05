// Safety rules. Pure functions plus two tiny middlewares. No I/O.
// Vendored by copy from ciba-hitl-lab (keep this header). Adapted: ports 7650-7659, lab id mcp-scanner-lab.
//  1. Loopback bind only unless SCANLAB_BIND is set on purpose.
//  2. Host header must be a loopback name or LAB_ALLOWED_HOSTS (DNS-rebinding defence).
//  3. A write must be same-origin: a cross-origin Origin, or a cross-site Sec-Fetch-Site, is refused.
//  4. Ports are 7650-7659 and never one of the forbidden ones.

export function isLoopbackHost(host) {
  const h = String(host).toLowerCase().replace(/^\[|\]$/g, '');
  return h === 'localhost' || h === '::1' || /^127(\.\d{1,3}){3}$/.test(h);
}

export function bindHost(env = process.env) { return env.SCANLAB_BIND || '127.0.0.1'; }

export function assertBindAllowed(host, env = process.env) {
  if (isLoopbackHost(host) || env.SCANLAB_BIND) return host;
  throw new Error(`refusing to bind ${host}: loopback only. Set SCANLAB_BIND to opt in.`);
}

export const PORT_MIN = 7650;
export const PORT_MAX = 7659;
export const DEFAULT_PORT = 7650;
const FORBIDDEN_PORTS = new Set([5000, 8080, 5173, 3900, 4000, 4400, 4510, 4600, 4601, 4840, 18080, 19080, 19090]);
export function portProblem(port) {
  if (!Number.isInteger(port)) return 'PORT is not an integer';
  if (FORBIDDEN_PORTS.has(port)) return `port ${port} is reserved for something else`;
  if (port < PORT_MIN || port > PORT_MAX) return `port ${port} is outside ${PORT_MIN}-${PORT_MAX}`;
  return null;
}
export function resolvePort(env = process.env) {
  const port = env.PORT === undefined || env.PORT === '' ? DEFAULT_PORT : Number(env.PORT);
  const problem = portProblem(port);
  if (problem) throw new Error(problem);
  return port;
}

const HOSTNAME = /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
export function allowedExtraHosts(env = process.env) {
  const extra = String(env.LAB_ALLOWED_HOSTS || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
  for (const h of extra) if (!HOSTNAME.test(h)) throw new Error(`LAB_ALLOWED_HOSTS: not a host name: ${h}`);
  return new Set(extra);
}
export function hostCheck(req, res, next) {
  const raw = String(req.headers.host || '');
  const host = raw.startsWith('[') ? raw.slice(0, raw.indexOf(']') + 1) : raw.replace(/:\d+$/, '');
  if (!isLoopbackHost(host) && !allowedExtraHosts().has(host.toLowerCase())) {
    return res.status(403).json({ error: 'bad_host', message: 'Host must be loopback or on LAB_ALLOWED_HOSTS' });
  }
  next();
}

const WRITE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
export function sameOriginWrites(req, res, next) {
  if (!WRITE.has(req.method)) return next();
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') return res.status(403).json({ error: 'cross_origin', message: 'writes must be same-origin' });
  const origin = req.headers.origin;
  if (origin) {
    let ok = false;
    try { ok = new URL(origin).host === req.headers.host; } catch { /* malformed */ }
    if (!ok) return res.status(403).json({ error: 'cross_origin', message: 'writes must be same-origin' });
  }
  next();
}

// Free text from a caller (tool descriptions, card text): control characters stripped, length capped.
export function cleanText(value, max = 4000) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/g, ' ').slice(0, max);
}
