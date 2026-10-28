import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { en } from '../strings/en';
import {
  completeSignIn,
  getSession,
  oidcConfig,
  signOut,
  startSignIn,
  subscribeSession,
} from './oidc';

// Current session, or null when signed out. Components use it to show sign-in state.
export function useSession() {
  return useSyncExternalStore(subscribeSession, getSession);
}

export function AuthPanel() {
  const session = useSession();
  const [failed, setFailed] = useState(false);
  const callbackHandled = useRef(false);

  useEffect(() => {
    // Strict Mode runs effects twice. The ref keeps the callback from being exchanged twice.
    if (callbackHandled.current) return;
    if (window.location.pathname !== new URL(oidcConfig.redirectUri).pathname) return;
    callbackHandled.current = true;
    completeSignIn(window.location.search)
      .catch(() => setFailed(true))
      .finally(() => window.history.replaceState(null, '', '/'));
  }, []);

  if (session) {
    return (
      <div className="button-row">
        <p role="status">{en.auth.signedIn}</p>
        <button type="button" className="button" onClick={signOut}>
          {en.auth.signOut}
        </button>
      </div>
    );
  }

  return (
    <div className="button-row" role="group" aria-label={en.auth.groupLabel}>
      <button
        type="button"
        className="button"
        onClick={() => startSignIn('login').catch(() => setFailed(true))}
      >
        {en.auth.signIn}
      </button>
      <button
        type="button"
        className="button"
        onClick={() => startSignIn('register').catch(() => setFailed(true))}
      >
        {en.auth.register}
      </button>
      {failed && <p role="alert">{en.auth.failed}</p>}
    </div>
  );
}
