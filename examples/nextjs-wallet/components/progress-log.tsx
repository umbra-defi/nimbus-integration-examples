import type { ReactElement } from "react";

import type { ProgressLine } from "../lib/progress";

/**
 * Renders a flow's progress as steps, one per stage its `onProgress` reported, with a working step
 * after the last while the flow still runs.
 */
export function ProgressLog({
  lines,
  running,
}: {
  readonly lines: readonly ProgressLine[];
  readonly running: boolean;
}): ReactElement | null {
  if (lines.length === 0 && !running) {
    return null;
  }
  return (
    <ol className="steps" aria-label="Progress">
      {lines.map((line, index) => (
        <li key={`${String(index)}-${line.stage}`} className="step done">
          <span className="step-mark" aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path d="M4 8.5l2.5 2.5L12 5.5" />
            </svg>
          </span>
          <span className="step-text">{line.message}</span>
        </li>
      ))}
      {running ? (
        <li className="step working">
          <span className="step-mark" aria-hidden="true">
            <span className="spinner" />
          </span>
          <span className="step-text">
            {lines.length === 0 ? "Starting…" : "Working on the next step…"}
          </span>
        </li>
      ) : null}
    </ol>
  );
}
