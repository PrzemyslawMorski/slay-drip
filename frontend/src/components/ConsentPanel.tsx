import { en } from '../strings/en';

interface ConsentPanelProps {
  heading: string;
  body: string;
  onAgree: () => void;
  onDecline: () => void;
}

export function ConsentPanel({ heading, body, onAgree, onDecline }: ConsentPanelProps) {
  return (
    <section aria-labelledby="consent-heading" className="panel">
      <h2 id="consent-heading">{heading}</h2>
      <p>{body}</p>
      <div className="button-row">
        <button type="button" className="button button-primary" onClick={onAgree}>
          {en.consent.yes}
        </button>
        <button type="button" className="button" onClick={onDecline}>
          {en.consent.no}
        </button>
      </div>
    </section>
  );
}
