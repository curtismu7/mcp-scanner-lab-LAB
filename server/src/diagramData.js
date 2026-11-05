// The scanner lab diagram is diagram-studio/1 DATA (server/diagrams/*.json), loaded by name and
// checked with the studio's own validator copy. Nothing here builds nodes or edges by hand.
import fs from 'node:fs';
import { validateDiagram } from './diagramStudioValidate.js';

const DIR = new URL('../diagrams/', import.meta.url);
export const DIAGRAM_NAMES = ['mcp-scanner-lab'];

export function loadDiagram(name) {
  const doc = JSON.parse(fs.readFileSync(new URL(`${name}.json`, DIR), 'utf8'));
  const problems = validateDiagram(doc);
  if (problems.length) throw new Error(`diagram ${name} is not valid diagram-studio/1: ${problems.join('; ')}`);
  return doc;
}

const DOCS = Object.fromEntries(DIAGRAM_NAMES.map((n) => [n, loadDiagram(n)]));
export const rawDiagram = (name = 'mcp-scanner-lab') => DOCS[name];

export function buildDiagram(name = 'mcp-scanner-lab') {
  const d = DOCS[name] || DOCS['mcp-scanner-lab'];
  return {
    title: d.title,
    intro: d.lede,
    groups: d.groups,
    nodes: d.nodes.map((n) => ({ id: n.id, label: n.label, kind: n.group, role: d.groups[n.group]?.color ?? 'grey', x: n.x, y: n.y })),
    edges: d.edges.map((e) => ({ from: e.source, to: e.target, dashed: !!e.dashed })),
    steps: d.steps.map((s) => {
      const e = d.edges[Number(s.edges[0])];
      return { from: e.source, to: e.target, dashed: !!e.dashed, label: s.title, what: s.what, why: s.why ?? null };
    }),
  };
}
