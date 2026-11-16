import { useState, type KeyboardEvent, type PointerEvent } from 'react';
import { en } from '../strings/en';
import { useObjectUrls } from '../photos/useObjectUrls';
import type { WardrobeItem } from '../storage/localDb';

// A drag this far (px) turns into a slide change. Shorter drags snap back.
const SWIPE_THRESHOLD_PX = 50;

interface DragState {
  pointerId: number;
  startX: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface WardrobeCarouselProps {
  items: WardrobeItem[];
  onDelete: (item: WardrobeItem) => void;
}

export function WardrobeCarousel({ items, onDelete }: WardrobeCarouselProps) {
  const urls = useObjectUrls(items);
  const [requestedIndex, setRequestedIndex] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const total = items.length;
  const lastIndex = Math.max(total - 1, 0);
  // Deleting items can leave the stored index past the end, so clamp it when rendering.
  const current = clamp(requestedIndex, 0, lastIndex);

  function goTo(index: number) {
    setRequestedIndex(clamp(index, 0, lastIndex));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    // Only the primary button drags; a right click must not start a swipe.
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    setDrag({ pointerId: event.pointerId, startX: event.clientX });
    setDragOffset(0);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    let offset = event.clientX - drag.startX;
    // Resist dragging past the first or last item, so the edge feels solid.
    const pastStart = current === 0 && offset > 0;
    const pastEnd = current === lastIndex && offset < 0;
    if (pastStart || pastEnd) {
      offset *= 0.3;
    }
    setDragOffset(offset);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    // Read the release position, not the last rendered offset: a fast flick can end before a move is rendered.
    const releaseOffset = event.type === 'pointercancel' ? dragOffset : event.clientX - drag.startX;
    if (Math.abs(releaseOffset) >= SWIPE_THRESHOLD_PX) {
      // Dragging right shows the previous item, dragging left the next one.
      goTo(current + (releaseOffset < 0 ? 1 : -1));
    }
    setDrag(null);
    setDragOffset(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(current + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(current - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      goTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      goTo(lastIndex);
    }
  }

  const dragging = drag !== null;
  const trackTransform = `translate3d(calc(${-current * 100}% + ${dragOffset}px), 0, 0)`;

  return (
    <section
      className="carousel"
      aria-roledescription={en.carousel.roleDescription}
      aria-label={en.carousel.label}
    >
      <div
        className={dragging ? 'carousel-viewport is-dragging' : 'carousel-viewport'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <ul className="carousel-track" style={{ transform: trackTransform }}>
          {items.map((item, index) => {
            const active = index === current;
            return (
              <li
                key={item.id}
                className="carousel-slide"
                aria-roledescription={en.carousel.slideRoleDescription}
                aria-label={en.carousel.position(index + 1, total)}
                data-active={active}
                // Slides off screen are inert, so Tab and screen readers stay on the visible item.
                inert={!active}
              >
                <figure className="carousel-figure">
                  <img src={urls[index]} alt={en.wardrobe.itemAlt(item.number)} draggable={false} />
                  <figcaption className="carousel-caption">
                    <span className="carousel-name">{en.wardrobe.itemAlt(item.number)}</span>
                    <button
                      type="button"
                      className="button button-small button-ghost"
                      aria-label={en.wardrobe.deleteItemLabel(item.number)}
                      onClick={() => onDelete(item)}
                    >
                      {en.wardrobe.delete}
                    </button>
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="carousel-controls">
        <button
          type="button"
          className="button button-icon"
          aria-label={en.carousel.previous}
          onClick={() => goTo(current - 1)}
          onKeyDown={handleKeyDown}
          disabled={current === 0}
        >
          <span aria-hidden="true">&#8592;</span>
        </button>

        <div className="carousel-meta">
          <p className="carousel-position" aria-live="polite">
            {en.carousel.position(current + 1, total)}
          </p>
          <div className="carousel-progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${(current + 1) / total})` }} />
          </div>
        </div>

        <button
          type="button"
          className="button button-icon"
          aria-label={en.carousel.next}
          onClick={() => goTo(current + 1)}
          onKeyDown={handleKeyDown}
          disabled={current >= lastIndex}
        >
          <span aria-hidden="true">&#8594;</span>
        </button>
      </div>
    </section>
  );
}
