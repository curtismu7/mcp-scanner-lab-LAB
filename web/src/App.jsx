import React, { useCallback, useEffect, useState } from "react";
import { getInfo, getFixtures, requestModeSwitch, resetServer, runScan } from "./lib/api.js";
import ModeToggle from "./components/ModeToggle.jsx";
import ScanTab from "./tabs/ScanTab.jsx";
import DiagramTab from "./tabs/DiagramTab.jsx";
import AboutTab from "./tabs/AboutTab.jsx";

export const TABS = [["scan", "Scanner"], ["diagram", "How it fits"], ["about", "About"]];
export const FALLBACK_BANNER = "MOCK mode. SIMULATED: the scanner runs on the built-in demo fixtures. In-process, no tenant, no outbound network. The scanner reports — it never blocks.";
const read = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* not remembered */ } };
const tabFromHash = () => { const id = window.location.hash.replace(/^#\/?/, "").split("?")[0]; return TABS.some(([t]) => t === id) ? id : "scan"; };
const typing = (t) => !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);

export default function App() {
  const [info, setInfo] = useState(null);
  const [fixtures, setFixtures] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [tab, setTab] = useState(tabFromHash);
  const [theme, setTheme] = useState(() => (["light", "dark"].includes(read("scanlab.theme", "")) ? read("scanlab.theme", "") : "system"));
  const [present, setPresent] = useState(() => read("scanlab.present", "0") === "1");
  const [run, setRun] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [announce, setAnnounce] = useState("");

  const loadAll = useCallback(async () => {
    const [i, f] = await Promise.all([getInfo(), getFixtures()]);
    setInfo(i); setFixtures(f);
  }, []);
  useEffect(() => { loadAll().catch((e) => setLoadError(e.message)); }, [loadAll]);
  useEffect(() => { const on = () => setTab(tabFromHash()); window.addEventListener("hashchange", on); return () => window.removeEventListener("hashchange", on); }, []);
  useEffect(() => { if (theme === "system") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { if (present) document.documentElement.dataset.present = "1"; else delete document.documentElement.dataset.present; }, [present]);
  useEffect(() => {
    const on = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      if (e.key === "p" || e.key === "P") setPresent((v) => { write("scanlab.present", v ? "0" : "1"); return !v; });
      else if (e.key === "Escape") setPresent((v) => { if (v) { write("scanlab.present", "0"); return false; } return v; });
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  const onScan = useCallback(async (data) => {
    setBusy(true); setError(null); setRun(null);
    try {
      const r = await runScan(data);
      setRun(r);
      setAnnounce(r.total > 0 ? `${r.total} findings: ${Object.entries(r.counts).filter(([, n]) => n > 0).map(([k, n]) => `${k} ${n}`).join(", ")}.` : "Scan complete: no findings.");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }, []);

  const onMode = useCallback(async (next) => {
    setBusy(true); setError(null);
    try { setInfo(await requestModeSwitch(next)); setRun(null); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }, []);

  const onReset = useCallback(async () => {
    setBusy(true); setError(null); setRun(null);
    try { setInfo(await resetServer()); setAnnounce("Reset: run history cleared, mode back to Mock."); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }, []);

  const banner = info?.banner || loadError?.toString() || FALLBACK_BANNER;
  const themeNext = theme === "system" ? "light" : theme === "light" ? "dark" : "system";

  return (
    <div className="page">
      <a className="skip" href="#main">Skip to content</a>
      <header className="head">
        <h1 className="head__title"><span className="head__mark" aria-hidden="true">SCAN</span> MCP Scanner Lab</h1>
        <div className="head__tools">
          <span className="chip">{info ? `${info.source.toUpperCase()} mode` : "…"}</span>
          <ModeToggle info={info} onSelect={onMode} />
          <button type="button" className="btn small" onClick={() => setTheme(themeNext)} aria-label={`Theme: ${theme}. Switch to ${themeNext}.`} data-testid="theme">
            {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🌗"} {theme}
          </button>
          <button type="button" className="btn small" aria-pressed={present} onClick={() => { const v = !present; setPresent(v); write("scanlab.present", v ? "1" : "0"); }} data-testid="present">Present</button>
          <button type="button" className="btn small" onClick={onReset} disabled={busy} data-testid="reset">Reset</button>
        </div>
      </header>

      <p className="banner" role="note">{banner}</p>
      {loadError ? <p className="alert" role="alert">Server unreachable: {loadError}. Start it with <code>npm start -w server</code>.</p> : null}
      <p className="sr-only" role="status">{announce}</p>

      <nav className="tabs" aria-label="Tabs">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" className="btn" aria-current={tab === id ? "page" : undefined}
            onClick={() => { setTab(id); window.location.hash = `#/${id}`; }}>{label}</button>
        ))}
      </nav>

      <main id="main" tabIndex={-1}>
        {tab === "scan" ? <ScanTab info={info} fixtures={fixtures} run={run} onRun={onScan} busy={busy} error={error} /> : null}
        {tab === "diagram" ? <DiagramTab diagram={fixtures?.diagram} /> : null}
        {tab === "about" ? <AboutTab /> : null}
      </main>

      <footer className="muted small" style={{ marginTop: 16 }}>
        mcp-scanner-lab · Tester tier · categories from the PingOne Privilege AI Gateway guardrails · loopback only, zero outbound calls · the scanner reports, the Privilege gateway enforces (see the AI-DEMO2 Attack Lab)
      </footer>
    </div>
  );
}
