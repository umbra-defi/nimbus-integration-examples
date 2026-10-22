import type { ReactElement } from "react";

/** Renders the notice shown while a flow runs, whose privacy work stops if the tab closes. */
export function KeepTabOpen({ what }: { readonly what: string }): ReactElement {
  return (
    <p className="notice">
      Keep this tab open until the {what} finishes. The privacy work runs on
      your device, so closing the tab stops it.
    </p>
  );
}
