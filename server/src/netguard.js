// Runtime netguard: zero real outbound. Vendored by copy from ciba-hitl-lab (keep this header).
// Every non-loopback socket, DNS lookup, fetch and UDP send is refused and recorded.
// The scanner is in-process, so nothing in this app has a reason to leave the machine.
import dns from 'node:dns';
import net from 'node:net';
import dgram from 'node:dgram';
import { isLoopbackHost } from './safety.js';

// The container must listen on 0.0.0.0 inside (Docker publishes it on 127.0.0.1 only);
// a wildcard LISTEN is not an outbound call, so the netguard allows binding to it.
const BINDABLE = (h) => isLoopbackHost(h) || h === '0.0.0.0' || h === '::' || h === '';

let active = null;

export function installNetguard() {
  if (active) return active;
  const attempts = [];
  const real = {
    connect: net.Socket.prototype.connect, lookup: dns.lookup, fetch: globalThis.fetch, send: dgram.Socket.prototype.send, udpConnect: dgram.Socket.prototype.connect,
    plookup: dns.promises.lookup,
  };
  const RESOLVERS = ['resolve', 'resolve4', 'resolve6', 'resolveAny', 'resolveCaa', 'resolveCname', 'resolveMx', 'resolveNaptr', 'resolveNs', 'resolvePtr', 'resolveSoa', 'resolveSrv', 'resolveTxt', 'reverse'];
  const savedResolvers = [];
  const blockedResolver = (label, name, target) => function guardedResolve(host, ...rest) {
    const h = String(host);
    if (BINDABLE(h)) return target.apply(this, [host, ...rest]);
    attempts.push(`dns:${h}`);
    const err = new Error(`network blocked: ${h}`);
    const cb = rest.find((r) => typeof r === 'function');
    if (label === 'cb') { if (cb) return cb(err); throw err; }
    return Promise.reject(err);
  };
  for (const [label, holder] of [['cb', dns], ['promise', dns.promises], ['cb', dns.Resolver.prototype], ['promise', dns.promises.Resolver.prototype]]) {
    for (const name of RESOLVERS) {
      if (typeof holder[name] !== 'function') continue;
      const orig = holder[name];
      savedResolvers.push([holder, name, orig]);
      holder[name] = blockedResolver(label, name, orig);
    }
  }
  const hostOf = (rawArgs) => {
    const args = Array.isArray(rawArgs[0]) ? rawArgs[0] : rawArgs;
    const a = args[0];
    if (a && typeof a === 'object' && !Array.isArray(a)) return a.path ? 'unix-socket' : (a.host || 'localhost');
    if (typeof a === 'string' && Number.isNaN(Number(a))) return 'unix-socket';
    return typeof args[1] === 'string' ? args[1] : 'localhost';
  };
  net.Socket.prototype.connect = function guardedConnect(...args) {
    const host = hostOf(args);
    if (!BINDABLE(host)) { attempts.push(`socket:${host}`); throw new Error(`network blocked: ${host}`); }
    return real.connect.apply(this, args);
  };
  dns.lookup = function guardedLookup(host, ...rest) {
    const h = String(host);
    if (BINDABLE(h)) return real.lookup.call(dns, host, ...rest);
    attempts.push(`lookup:${h}`);
    const err = new Error(`network blocked: ${h}`);
    const cb = rest.find((r) => typeof r === 'function');
    if (cb) return cb(err);
    throw err;
  };
  dns.promises.lookup = async function guardedPLookup(host, ...rest) {
    const h = String(host);
    if (BINDABLE(h)) return real.plookup.call(dns.promises, host, ...rest);
    attempts.push(`lookup:${h}`);
    throw new Error(`network blocked: ${h}`);
  };
  globalThis.fetch = function guardedFetch(input, init) {
    let url = input;
    try { url = input instanceof URL ? input : new URL(String(input?.url ?? input)); } catch { url = null; }
    const h = url?.hostname || '';
    if (url && (BINDABLE(h) || h === 'unix')) return real.fetch.call(globalThis, input, init);
    attempts.push(`fetch:${h || String(input).slice(0, 40)}`);
    return Promise.reject(new Error(`network blocked: ${h || 'non-loopback fetch'}`));
  };
  dgram.Socket.prototype.send = function guardedSend(...args) {
    const cb = args.find((a) => typeof a === 'function');
    const hostArg = args.find((a) => typeof a === 'string');
    if (hostArg && !isLoopbackHost(hostArg)) {
      attempts.push(`udp:${hostArg}`);
      const err = new Error(`network blocked: ${hostArg}`);
      if (cb) return cb(err);
      throw err;
    }
    return real.send.apply(this, args);
  };
  active = { attempts, uninstall: () => {
    net.Socket.prototype.connect = real.connect;
    dns.lookup = real.lookup;
    dns.promises.lookup = real.plookup;
    globalThis.fetch = real.fetch;
    dgram.Socket.prototype.send = real.send;
    for (const [holder, name, orig] of savedResolvers) holder[name] = orig;
    active = null;
  } };
  return active;
}

export function attempts() { return active ? [...active.attempts] : []; }
