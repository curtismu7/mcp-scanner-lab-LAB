// Same origin only: every URL is a path.
export async function getJson(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
export async function postJson(path, body = {}) {
  const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || `HTTP ${r.status}`);
  return data;
}
export const getInfo = () => getJson("/api/info");
export const getFixtures = () => getJson("/api/fixtures");
export const getRuns = () => getJson("/api/runs");
export const runScan = (data) => postJson("/api/scan", data && Object.keys(data).length ? { data } : {});
export const requestModeSwitch = (source) => postJson("/api/mode", { source });
export const resetServer = () => postJson("/api/reset");
