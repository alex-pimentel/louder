import * as React from "react";

import { loadPreferences, savePreferences, type Preferences } from "../../lib/storage";

/**
 * Preferences backed by localStorage. Mirrors the vanilla `main.ts`
 * load/persist behavior.
 */
export function usePreferences(): [Preferences, (patch: Partial<Preferences>) => void] {
  const [preferences, setPreferences] = React.useState<Preferences>(() => loadPreferences());

  const update = React.useCallback((patch: Partial<Preferences>) => {
    setPreferences((previous) => {
      const next = { ...previous, ...patch };
      savePreferences(next);
      return next;
    });
  }, []);

  return [preferences, update];
}
