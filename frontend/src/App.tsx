import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { en } from './strings/en';
import { getAgeConfirmed } from './storage/localDb';
import { completeSignIn } from './auth/oidc';
import { getSessionSnapshot, subscribeSession } from './auth/session';
import { deviceWardrobeStore } from './wardrobe/localStore';
import { accountWardrobeStore } from './wardrobe/remoteStore';
import { AgeGate } from './components/AgeGate';
import { AuthControls } from './components/AuthControls';
import { OutfitBuilder } from './components/OutfitBuilder';
import { OutfitsScreen } from './components/OutfitsScreen';
import { WardrobeScreen } from './components/WardrobeScreen';

type Phase = 'loading' | 'age' | 'underage' | 'adult';

type View =
  { screen: 'wardrobe' } | { screen: 'outfits' } | { screen: 'builder'; outfitId?: string };

const CALLBACK_PATH = '/auth/callback';

export function App() {
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot);
  const [phase, setPhase] = useState<Phase>('loading');
  const [view, setView] = useState<View>({ screen: 'wardrobe' });
  const [callbackPending, setCallbackPending] = useState(
    () => window.location.pathname === CALLBACK_PATH,
  );
  const [signInFailed, setSignInFailed] = useState(false);
  // Strict Mode runs effects twice. The authorization code may be used only once.
  const callbackStarted = useRef(false);

  useEffect(() => {
    getAgeConfirmed()
      .then((confirmed) => setPhase(confirmed ? 'adult' : 'age'))
      .catch(() => setPhase('age'));
  }, []);

  useEffect(() => {
    if (!callbackPending || callbackStarted.current) {
      return;
    }
    callbackStarted.current = true;
    const callbackUrl = new URL(window.location.href);
    window.history.replaceState(null, '', '/');
    completeSignIn(callbackUrl)
      .catch(() => setSignInFailed(true))
      .finally(() => setCallbackPending(false));
  }, [callbackPending]);

  const showWardrobe = () => setView({ screen: 'wardrobe' });
  const showOutfits = () => setView({ screen: 'outfits' });

  // Outfits are device-only for now, so a signed-in person always sees the wardrobe.
  const signedIn = session !== null;
  const shownView: View = signedIn ? { screen: 'wardrobe' } : view;

  return (
    <div className="app">
      <header className="app-header">
        <p className="app-name">{en.app.name}</p>
        {phase === 'adult' && !callbackPending && <AuthControls signedIn={signedIn} />}
      </header>
      <main className="app-main">
        {callbackPending && (
          <p role="status" className="notice">
            {en.auth.signingIn}
          </p>
        )}
        {signInFailed && (
          <p role="alert" className="error">
            {en.auth.signInFailed}
          </p>
        )}
        {phase === 'age' && (
          <AgeGate onAdult={() => setPhase('adult')} onUnderage={() => setPhase('underage')} />
        )}
        {phase === 'underage' && (
          <section aria-labelledby="underage-heading">
            <h1 id="underage-heading">{en.underage.heading}</h1>
            <p>{en.underage.body}</p>
          </section>
        )}
        {phase === 'adult' && !callbackPending && shownView.screen === 'wardrobe' && (
          <WardrobeScreen
            key={signedIn ? 'account' : 'device'}
            store={signedIn ? accountWardrobeStore : deviceWardrobeStore}
            onOpenOutfits={signedIn ? undefined : showOutfits}
            onCreateOutfit={signedIn ? undefined : () => setView({ screen: 'builder' })}
          />
        )}
        {phase === 'adult' && !callbackPending && shownView.screen === 'outfits' && (
          <OutfitsScreen
            onOpenWardrobe={showWardrobe}
            onCreateOutfit={() => setView({ screen: 'builder' })}
            onEditOutfit={(outfitId) => setView({ screen: 'builder', outfitId })}
          />
        )}
        {phase === 'adult' && !callbackPending && shownView.screen === 'builder' && (
          <OutfitBuilder outfitId={shownView.outfitId} onDone={showOutfits} />
        )}
      </main>
    </div>
  );
}
