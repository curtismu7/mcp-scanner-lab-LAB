// About tab: what each category means, where a defense can sit, and the honest limits.
import React from "react";

const ROWS = [
  ["Tool Poisoning", "A malicious MCP server hides instructions in tool descriptions, inputSchema defaults, resource content or prompt text. An agent ingests all of it as trusted context before calling anything.", "At ingest: scan the metadata before the agent reads it (this lab), or treat every tool result as untrusted data."],
  ["Schema Violation", "A tool call whose arguments do not match the tool's declared inputSchema: a string where a number is required, a missing required argument, an argument the schema does not define.", "At dispatch: validate arguments against the schema before the tool runs (gateway or client side — both work; the gateway is the enforceable spot)."],
  ["Tool Abuse", "A schema-VALID call used for a hostile purpose: a cross-owner account id, a limits-override flag, a smuggled [SYSTEM: …] directive in a free-text field. The metadata is clean; the intent is not.", "At policy: authorization on tool + arguments (who may touch whose account), not just scope-on-token."],
  ["Inter-Agent Abuse", "One agent impersonates or over-reaches against another: an Agent Card claiming orchestrator/admin authority, or instructing the delegating agent to disable its safety checks.", "At the wire: authenticated delegation (signed bearer, act chain, audience binding) plus metadata scanning of the card."],
];

export default function AboutTab() {
  return (
    <section className="card" aria-label="About the four categories">
      <h3>The four Tool &amp; Agent Safety categories</h3>
      <p className="muted small">
        These four are the Tool &amp; Agent Safety classification of <strong>Ping&apos;s AI Gateway guardrails
        (PingOne Privilege)</strong> — the same categories the Privilege gateway detects and enforces on live agent
        traffic (<code>tool_abuse</code>, <code>tool_poisoning</code>, <code>schema_violation</code>,
        <code> inter_agent_abuse</code>). This lab replays each category against demo data so you can study the
        attack shape before you watch the gateway enforce it; the AI-DEMO2 Attack Lab runs the enforcement leg live.
      </p>
      <table className="claims">
        <thead><tr><th>Category</th><th>The threat</th><th>Where a defense sits</th></tr></thead>
        <tbody>
          {ROWS.map(([name, threat, defense]) => (
            <tr key={name}><th scope="row">{name}</th><td>{threat}</td><td>{defense}</td></tr>
          ))}
        </tbody>
      </table>
      <h4>Honest limits</h4>
      <p className="muted small">
        The checks are heuristic (keyword and shape based). They catch the known poisoning shapes, obvious schema
        mismatches and the authority-claim phrasings; a novel phrasing can slip past, and an unusually worded
        legitimate tool could trip a flag. This lab <strong>reports and never blocks</strong> — nothing here is a
        policy decision, and no enforcement happens anywhere in this app. <strong>Where Ping enforces:</strong> the
        PingOne Privilege AI Gateway evaluates tool calls against policy (deny, HITL/step-up) and its guardrails
        classify exactly these categories on live traffic — the AI-DEMO2 Attack Lab shows those verdicts (DENY /
        428 / 400 / 401) for the same attacks this lab detects.
      </p>
    </section>
  );
}
