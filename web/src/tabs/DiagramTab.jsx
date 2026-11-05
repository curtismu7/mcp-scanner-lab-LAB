// The scanner lab diagram, rendered from diagram-studio/1 data (never hand-built).
// Movable boxes, Simulate (step walk), Reset (restores positions), speed control.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ReactFlow, Background, Controls, useNodesState, useEdgesState } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const ROLE_COLORS = { red: "#b42318", dark: "#0b2537", grey: "#6b7280", blue: "#175cd3", green: "#067647", amber: "#b54708" };

function StepWalk({ steps, speed, onStep }) {
  const [i, setI] = useState(-1);
  useEffect(() => { if (i >= 0 && i < steps.length) { onStep?.(i); const t = setTimeout(() => setI((v) => v + 1), speed); return () => clearTimeout(t); } }, [i, steps.length, speed, onStep]);
  const step = i >= 0 && i < steps.length ? steps[i] : null;
  return (
    <div className="stepwalk">
      <div className="actions">
        <button type="button" className="btn small" onClick={() => setI(0)} data-testid="diagram-simulate">Simulate</button>
        <button type="button" className="btn small" onClick={() => setI(-1)} data-testid="diagram-stop">Stop</button>
        <span className="small muted">{step ? `Step ${i + 1}/${steps.length}: ${step.label}` : `${steps.length} steps`}</span>
      </div>
      {step ? (
        <div className="stepwalk__detail" data-testid="diagram-step">
          <strong>{step.label}</strong>
          <p className="small">{step.what}</p>
          {step.why ? <p className="small muted">Why: {step.why}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export default function DiagramTab({ diagram }) {
  const initial = useMemo(() => (diagram?.nodes || []).map((n) => ({
    id: n.id, position: { x: n.x || 0, y: n.y || 0 }, data: { label: n.label },
    style: { background: "var(--surface-2)", color: "var(--text)", border: `2px solid ${ROLE_COLORS[n.role] || ROLE_COLORS.grey}`, borderRadius: 8, padding: 8, fontSize: 12, maxWidth: 200 },
  })), [diagram]);
  const flowEdges = useMemo(() => (diagram?.edges || []).map((e, i) => ({
    id: `e${i}`, source: e.from, target: e.to, animated: !!e.dashed,
    style: { stroke: "var(--border)" }, label: diagram.steps?.find((s) => Number(s.edges?.[0]) === i)?.label, labelStyle: { fontSize: 11 },
  })), [diagram]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);
  const [speed, setSpeed] = useState(2500);

  const reset = useCallback(() => setNodes(initial), [initial]);

  // Simulate highlights the step's edge by re-animating everything along the walk.
  const onStep = useCallback((i) => {
    const step = diagram.steps?.[i];
    if (!step) return;
    setEdges((es) => es.map((e) => ({ ...e, animated: e.id === `e${step.edges[0]}` || diagram.edges[Number(step.edges[0])]?.dashed === true ? true : !!diagram.edges[Number(e.id.slice(1))]?.dashed, style: { stroke: e.id === `e${step.edges[0]}` ? ROLE_COLORS.amber : "var(--border)" } })));
  }, [diagram, setEdges]);

  if (!diagram) return null;
  return (
    <section className="card" aria-label="Diagram">
      <h3>How the pieces fit</h3>
      <p className="muted small">{diagram.intro}</p>
      <div className="controls">
        <label className="small">Speed
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Simulation speed">
            <option value={4000}>Slow</option>
            <option value={2500}>Normal</option>
            <option value={1200}>Fast</option>
          </select>
        </label>
        <button type="button" className="btn small" onClick={reset} data-testid="diagram-reset">Reset</button>
      </div>
      <div style={{ height: 380, border: "1px solid var(--border)", borderRadius: 8 }}>
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView proOptions={{ hideAttribution: true }}>
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <StepWalk steps={diagram.steps || []} speed={speed} onStep={onStep} />
      <ul className="small muted" style={{ columns: 2 }}>
        {Object.entries(diagram.groups || {}).map(([k, g]) => (
          <li key={k}><span style={{ color: ROLE_COLORS[g.color] }}>■</span> {g.label}</li>
        ))}
      </ul>
    </section>
  );
}
