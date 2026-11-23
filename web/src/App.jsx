import React, { useCallback, useEffect, useState } from "react";
import { getInfo, getFixtures, requestModeSwitch, resetServer, runScan } from "./lib/api.js";
import TopMenu, { applyFontSize } from "./top-menu/TopMenu.jsx";
import ScanTab from "./tabs/ScanTab.jsx";
import DiagramTab from "./tabs/DiagramTab.jsx";
import AboutTab from "./tabs/AboutTab.jsx";
import TalkTrackTab from "./tabs/TalkTrackTab.jsx";

export const TABS = [["scan", "Scanner"], ["diagram", "How it fits"], ["about", "About"], ["talk", "Talk track"]];
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
  const [fontStep, setFontStep] = useState(() => (["S", "M", "L"].includes(read("mcpscan.font", "")) ? read("mcpscan.font", "") : "M"));
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
  useEffect(() => { applyFontSize(fontStep); write("mcpscan.font", fontStep); }, [fontStep]);
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

  return (
    <div className="app">
      <a className="skip" href="#main">Skip to content</a>
      <header className="shell-bar">
        <span className="shell-brand">
          <span className="shell-logo" aria-hidden="true">SCAN</span>
          <h1>MCP Scanner Lab</h1>
          {info?.source === "real"
            ? <span className="shell-badge shell-badge--real" data-testid="mode-badge">Real</span>
            : <span className="shell-badge" data-testid="mode-badge">Mock</span>}
        </span>
        <nav className="shell-nav" aria-label="Lab sections">
          {TABS.map(([id, label]) => (
            <a key={id} href={`#/${id}`} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>{label}</a>
          ))}
        </nav>
        <TopMenu
          mode={{
            value: info?.source === "real" ? "real" : "mock",
            onChange: onMode,
            realAvailable: info ? info.realAvailable === true : false,
            realHint: info?.realReason,
          }}
          theme={{ value: theme === "system" ? "auto" : theme, onChange: (v) => setTheme(v === "auto" ? "system" : v) }}
          fontSize={{ value: fontStep, onChange: setFontStep }}
          present={{ active: present, onToggle: () => { const v = !present; setPresent(v); write("scanlab.present", v ? "1" : "0"); } }}
          talkTrack={{ active: tab === "talk", onToggle: () => { setTab("talk"); window.location.hash = "#/talk"; } }}
          help={{ href: "https://github.com/curtismu7/mcp-scanner-lab-LAB#readme" }}
          version={info?.version || null}
          onReset={onReset}
        />
      </header>

      <main id="main" className="page" tabIndex={-1}>
        <p className="banner" role="note">{banner}</p>
        {loadError ? <p className="alert" role="alert">Server unreachable: {loadError}. Start it with <code>npm start -w server</code>.</p> : null}
        <p className="sr-only" role="status">{announce}</p>

        {tab === "scan" ? <ScanTab info={info} fixtures={fixtures} run={run} onRun={onScan} busy={busy} error={error} /> : null}
        {tab === "diagram" ? <DiagramTab diagram={fixtures?.diagram} /> : null}
        {tab === "about" ? <AboutTab /> : null}
        {tab === "talk" ? <TalkTrackTab /> : null}
      </main>

      <footer className="page-foot muted small">
        mcp-scanner-lab · Tester tier · categories from the PingOne Privilege AI Gateway guardrails · loopback only, zero outbound calls · the scanner reports, the Privilege gateway enforces (see the AI-DEMO2 Attack Lab)
      </footer>
    </div>
  );
}
