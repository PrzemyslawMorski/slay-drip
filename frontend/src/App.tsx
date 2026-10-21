import { useEffect, useState } from 'react';
import { en } from './strings/en';
import { getAgeConfirmed } from './storage/localDb';
import { AgeGate } from './components/AgeGate';
import { OutfitBuilder } from './components/OutfitBuilder';
import { OutfitsScreen } from './components/OutfitsScreen';
import { WardrobeScreen } from './components/WardrobeScreen';

type Phase = 'loading' | 'age' | 'underage' | 'adult';

type View = { screen: 'wardrobe' } | { screen: 'outfits' } | { screen: 'builder'; outfitId?: string };

export function App() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [view, setView] = useState<View>({ screen: 'wardrobe' });

  useEffect(() => {
    getAgeConfirmed()
      .then((confirmed) => setPhase(confirmed ? 'adult' : 'age'))
      .catch(() => setPhase('age'));
  }, []);

  const showWardrobe = () => setView({ screen: 'wardrobe' });
  const showOutfits = () => setView({ screen: 'outfits' });

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
        {phase === 'adult' && view.screen === 'wardrobe' && (
          <WardrobeScreen
            onOpenOutfits={showOutfits}
            onCreateOutfit={() => setView({ screen: 'builder' })}
          />
        )}
        {phase === 'adult' && view.screen === 'outfits' && (
          <OutfitsScreen
            onOpenWardrobe={showWardrobe}
            onCreateOutfit={() => setView({ screen: 'builder' })}
            onEditOutfit={(outfitId) => setView({ screen: 'builder', outfitId })}
          />
        )}
        {phase === 'adult' && view.screen === 'builder' && (
          <OutfitBuilder outfitId={view.outfitId} onDone={showOutfits} />
        )}
      </main>
    </div>
  );
}
