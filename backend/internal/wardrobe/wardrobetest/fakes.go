// Package wardrobetest holds hand-written in-memory fakes for the wardrobe ports (ADR-0007, BE-27).
package wardrobetest

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"

	"slaydrip/backend/internal/wardrobe"
)

// Repository is an in-memory wardrobe.Repository.
type Repository struct {
	mu       sync.Mutex
	consents map[string]wardrobe.Consent
	items    map[uuid.UUID]wardrobe.Item
}

// NewRepository returns an empty in-memory repository.
func NewRepository() *Repository {
	return &Repository{
		consents: map[string]wardrobe.Consent{},
		items:    map[uuid.UUID]wardrobe.Item{},
	}
}

// Consent implements wardrobe.Repository.
func (r *Repository) Consent(_ context.Context, owner string) (wardrobe.Consent, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.consents[owner], nil
}

// SetConsent implements wardrobe.Repository. Revoking removes the owner's items.
func (r *Repository) SetConsent(_ context.Context, owner string, granted bool, at time.Time) ([]wardrobe.Item, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if granted {
		when := at
		r.consents[owner] = wardrobe.Consent{Granted: true, GrantedAt: &when}
		return nil, nil
	}
	r.consents[owner] = wardrobe.Consent{}
	var removed []wardrobe.Item
	for id, item := range r.items {
		if item.Owner == owner {
			removed = append(removed, item)
			delete(r.items, id)
		}
	}
	return removed, nil
}

// InsertItem implements wardrobe.Repository.
func (r *Repository) InsertItem(_ context.Context, item wardrobe.Item) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.items[item.ID] = item
	return nil
}

// ListItems implements wardrobe.Repository.
func (r *Repository) ListItems(_ context.Context, owner string) ([]wardrobe.Item, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	var out []wardrobe.Item
	for _, item := range r.items {
		if item.Owner == owner {
			out = append(out, item)
		}
	}
	return out, nil
}

// Item implements wardrobe.Repository.
func (r *Repository) Item(_ context.Context, owner string, id uuid.UUID) (wardrobe.Item, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	item, ok := r.items[id]
	if !ok || item.Owner != owner {
		return wardrobe.Item{}, wardrobe.ErrNotFound
	}
	return item, nil
}

// DeleteItem implements wardrobe.Repository.
func (r *Repository) DeleteItem(ctx context.Context, owner string, id uuid.UUID) (wardrobe.Item, error) {
	item, err := r.Item(ctx, owner, id)
	if err != nil {
		return wardrobe.Item{}, err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.items, id)
	return item, nil
}

// Blobs is an in-memory wardrobe.Blobs.
type Blobs struct {
	mu    sync.Mutex
	data  map[string][]byte
	types map[string]string
	// FailDelete makes Delete return an error, to test best-effort cleanup.
	FailDelete bool
}

// NewBlobs returns an empty in-memory blob store.
func NewBlobs() *Blobs {
	return &Blobs{data: map[string][]byte{}, types: map[string]string{}}
}

// Put implements wardrobe.Blobs.
func (b *Blobs) Put(_ context.Context, key string, data []byte, contentType string) error {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.data[key] = append([]byte(nil), data...)
	b.types[key] = contentType
	return nil
}

// Get implements wardrobe.Blobs.
func (b *Blobs) Get(_ context.Context, key string) ([]byte, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	data, ok := b.data[key]
	if !ok {
		return nil, wardrobe.ErrNotFound
	}
	return append([]byte(nil), data...), nil
}

// Delete implements wardrobe.Blobs. Deleting a missing key is not an error.
func (b *Blobs) Delete(_ context.Context, key string) error {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.FailDelete {
		return errors.New("delete failed")
	}
	delete(b.data, key)
	delete(b.types, key)
	return nil
}

// Len returns how many photos the store holds.
func (b *Blobs) Len() int {
	b.mu.Lock()
	defer b.mu.Unlock()
	return len(b.data)
}
