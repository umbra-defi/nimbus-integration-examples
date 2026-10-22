import type { ReactElement } from "react";

import type { ResultSummary } from "../lib/format";

/** The icon path for each tone: a check, a clock, or an exclamation mark. */
const TONE_ICONS = {
  done: "M4 8.5l2.5 2.5L12 5.5",
  stopped: "M8 4.5v4.5M8 11.5v.01",
  waiting: "M8 4.5V8l2.5 1.5",
} as const;

/**
 * Renders a flow's result: what it means for the user, with the SDK's `kind` beside it and its own
 * text folded away when there is any.
 */
export function ResultView({
  summary,
}: {
  readonly summary: ResultSummary;
}): ReactElement {
  return (
    <div className={`result ${summary.tone}`} role="status">
      <span className="result-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16">
          <path d={TONE_ICONS[summary.tone]} />
        </svg>
      </span>
      <div className="result-body">
        <p className="result-message">{summary.message}</p>
        <code className="result-code">{summary.code}</code>
        {summary.detail !== undefined && (
          <details className="result-detail">
            <summary>Technical detail</summary>
            <code>{summary.detail}</code>
          </details>
        )}
      </div>
    </div>
  );
}
