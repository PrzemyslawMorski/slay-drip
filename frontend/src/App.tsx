import { useEffect, useState } from 'react';
import { en } from './strings/en';
import { getAgeConfirmed } from './storage/localDb';
import { AgeGate } from './components/AgeGate';
import { WardrobeScreen } from './components/WardrobeScreen';

type Phase = 'loading' | 'age' | 'underage' | 'adult';

export function App() {
  const [phase, setPhase] = useState<Phase>('loading');

  useEffect(() => {
    getAgeConfirmed()
      .then((confirmed) => setPhase(confirmed ? 'adult' : 'age'))
      .catch(() => setPhase('age'));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <p className="app-name">{en.app.name}</p>
      </header>
      <main className="app-main">
        {phase === 'age' && (
          <AgeGate onAdult={() => setPhase('adult')} onUnderage={() => setPhase('underage')} />
        )}
        {phase === 'underage' && (
          <section aria-labelledby="underage-heading">
            <h1 id="underage-heading">{en.underage.heading}</h1>
            <p>{en.underage.body}</p>
          </section>
        )}
        {phase === 'adult' && <WardrobeScreen />}
      </main>
    </div>
  );
}
