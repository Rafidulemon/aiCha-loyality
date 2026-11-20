'use client';

import { useEffect, type ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { fetcher, isApiError, setSignedOutHandler } from './client';
import { signInPathFor } from './session';

/** Where to send someone whose session has ended: each app has its own sign-in (see signInPathFor). */
function toSignIn() {
  const path = window.location.pathname;
  if (path.startsWith('/auth/')) return;
  window.location.assign(`${signInPathFor(path)}?next=${encodeURIComponent(path)}`);
}

/**
 * Data loading for every app: one fetcher, sensible retries, and a single rule for a signed-out session (401), for reads and
 * for writes alike: go to the sign-in screen. A 4xx other than that is the screen's to handle, so it is not retried.
 */
export function ApiProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    setSignedOutHandler(toSignIn);
    return () => setSignedOutHandler(undefined);
  }, []);

  return (
    <SWRConfig
      value={{
        fetcher,
        dedupingInterval: 2000,
        errorRetryCount: 2,
        shouldRetryOnError: (e) => !isApiError(e) || e.status === 0 || e.status >= 500,
      }}
    >
      {children}
    </SWRConfig>
  );
}
