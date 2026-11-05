// Workspace id (rule 13): one workspace per browser, so one visitor's scan history
// never merges with another's. Stateless server: the id is a cookie the client sends.
import crypto from 'node:crypto';

const COOKIE = 'scanlab_ws';

export function workspaceId(req) {
  const raw = String(req.headers.cookie || '');
  const m = raw.match(new RegExp(`${COOKIE}=([A-Za-z0-9-]{1,64})`));
  return m ? m[1] : 'default';
}

export function newWorkspaceId() {
  return crypto.randomUUID();
}
