/**
 * The colour theme: following the system, or fixed light or dark, remembered in this browser.
 */

/** A theme choice; `system` follows the device's light or dark setting. */
export type ThemeChoice = "system" | "light" | "dark";

/** Where the choice is remembered. */
export const THEME_STORAGE_KEY = "umbra-example/theme";

/**
 * The script that applies the remembered choice before the page paints, so a dark page never
 * flashes light. It runs inline in the document's head, so it is written out as source.
 */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

/** Reads the remembered choice; `system` when none is, or storage cannot be read. */
export function readThemeChoice(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

/** Applies a choice to the page and remembers it; storage that refuses only loses the memory. */
export function applyThemeChoice(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = choice;
  }
  try {
    if (choice === "system") {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, choice);
    }
  } catch {
    // Storage is unavailable, as in a private window: the choice holds until the page reloads.
  }
}

/** Says whether the page is dark now: the fixed choice, or the system's when following it. */
export function isDarkNow(choice: ThemeChoice): boolean {
  if (choice !== "system") {
    return choice === "dark";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
