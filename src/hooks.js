import { useState, useEffect } from 'react';

// ── usePersistentFormState ────────────────────────────────────────────────────
// React hook that mirrors useState() but persists the value to sessionStorage
// under the given key. Survives accidental tab-aways and component unmounts
// within the same browser tab (sessionStorage clears when the tab is closed).
//
// USAGE:
//   const [title, setTitle, clearTitle] = usePersistentFormState("event:title", "");
//   ...
//   onSubmit: do work, then clearTitle() to reset the field for next entry.
//
// The third return value is a cleaner that resets state to initialValue and
// removes the sessionStorage entry — call it after successful form submission.
//
// Lives in its own file (not Shared.jsx) because Vite Fast Refresh requires
// files to export EITHER hooks OR components, not both mixed together.
export function usePersistentFormState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored);
    } catch (e) { /* fall through */ }
    return initialValue;
  });

  // Persist on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* sessionStorage may be unavailable in some contexts */ }
  }, [key, value]);

  const clear = () => {
    setValue(initialValue);
    try { sessionStorage.removeItem(key); } catch (e) {}
  };

  return [value, setValue, clear];
}
