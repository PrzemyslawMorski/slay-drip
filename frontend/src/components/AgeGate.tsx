import { en } from '../strings/en';
import { confirmAdultAge } from '../storage/localDb';

interface AgeGateProps {
  onAdult: () => void;
  onUnderage: () => void;
}

// Client-side only in this slice (ADR-0001 requires a server check once a server exists).
// Nothing is stored when the user says they are under 18.
export function AgeGate({ onAdult, onUnderage }: AgeGateProps) {
  async function handleAdult() {
    await confirmAdultAge();
    onAdult();
  }

  return (
    <section aria-labelledby="age-heading" className="panel">
      <h1 id="age-heading">{en.age.heading}</h1>
      <p>{en.age.intro}</p>
      <div className="button-row">
        <button type="button" className="button button-primary" onClick={handleAdult}>
          {en.age.adult}
        </button>
        <button type="button" className="button" onClick={onUnderage}>
          {en.age.underage}
        </button>
      </div>
    </section>
  );
}
