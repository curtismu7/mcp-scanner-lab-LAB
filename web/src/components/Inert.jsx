// Rendered-inert blocks for anything a caller pasted or the server returned
// (hostile metadata is the point of this lab): text nodes only, never markup.
import React from "react";

export function Inert({ value, label }) {
  return (
    <div className="inert-wrap">
      {label ? <span className="small muted">{label}</span> : null}
      <pre className="inert inert--block">{String(value ?? "")}</pre>
    </div>
  );
}

export default Inert;
