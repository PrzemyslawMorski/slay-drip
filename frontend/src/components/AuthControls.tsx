import { startSignIn } from '../auth/oidc';
import { setSession } from '../auth/session';
import { en } from '../strings/en';

interface AuthControlsProps {
  signedIn: boolean;
}

// Sign-in and registration both redirect to the identity provider (ADR-0010). Signing out only clears the in-memory session.
export function AuthControls({ signedIn }: AuthControlsProps) {
  if (signedIn) {
    return (
      <div className="button-row auth-controls">
        <p className="auth-status">{en.auth.signedIn}</p>
        <button type="button" className="button" onClick={() => setSession(null)}>
          {en.auth.signOut}
        </button>
      </div>
    );
  }
  return (
    <div className="button-row auth-controls">
      <button type="button" className="button" onClick={() => void startSignIn('login')}>
        {en.auth.signIn}
      </button>
      <button type="button" className="button" onClick={() => void startSignIn('register')}>
        {en.auth.createAccount}
      </button>
    </div>
  );
}
