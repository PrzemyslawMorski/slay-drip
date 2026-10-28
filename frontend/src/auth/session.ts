// The access token lives in memory only (security guide, sections 9 and 11). Reloading the page signs the person out.
export interface Session {
  accessToken: string;
  expiresAt: number;
}

let current: Session | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getSessionSnapshot(): Session | null {
  return current;
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setSession(session: Session | null): void {
  current = session;
  notify();
}

// Returns the token only while it is still valid. An expired token ends the session.
export function accessTokenOrNull(): string | null {
  if (current === null) {
    return null;
  }
  if (Date.now() >= current.expiresAt) {
    setSession(null);
    return null;
  }
  return current.accessToken;
}
