package db

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"slaydrip/backend/internal/wardrobe"
)

// Wardrobe implements wardrobe.Repository on PostgreSQL. Every query filters by owner (BE-42).
type Wardrobe struct {
	pool *pgxpool.Pool
}

// NewWardrobe returns the PostgreSQL wardrobe repository.
func NewWardrobe(pool *pgxpool.Pool) *Wardrobe {
	return &Wardrobe{pool: pool}
}

// Consent implements wardrobe.Repository.
func (w *Wardrobe) Consent(ctx context.Context, owner string) (wardrobe.Consent, error) {
	var c wardrobe.Consent
	err := w.pool.QueryRow(ctx,
		`SELECT granted, granted_at FROM consents WHERE owner_sub = $1 AND data_type = $2`,
		owner, wardrobe.DataTypeWardrobePhotos,
	).Scan(&c.Granted, &c.GrantedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return wardrobe.Consent{}, nil
	}
	if err != nil {
		return wardrobe.Consent{}, fmt.Errorf("query consent: %w", err)
	}
	if c.GrantedAt != nil {
		t := c.GrantedAt.UTC()
		c.GrantedAt = &t
	}
	return c, nil
}

// SetConsent implements wardrobe.Repository. Granting keeps the original grant time if
// consent was already on. Revoking deletes the owner's items in the same transaction.
func (w *Wardrobe) SetConsent(ctx context.Context, owner string, granted bool, at time.Time) ([]wardrobe.Item, error) {
	tx, err := w.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var removed []wardrobe.Item
	if !granted {
		removed, err = deleteOwnerItems(ctx, tx, owner)
		if err != nil {
			return nil, err
		}
	}

	if granted {
		_, err = tx.Exec(ctx, `
			INSERT INTO consents (owner_sub, data_type, granted, granted_at, updated_at)
			VALUES ($1, $2, true, $3, $3)
			ON CONFLICT (owner_sub, data_type) DO UPDATE
			SET granted = true,
			    granted_at = CASE WHEN consents.granted THEN consents.granted_at ELSE EXCLUDED.granted_at END,
			    updated_at = EXCLUDED.updated_at`,
			owner, wardrobe.DataTypeWardrobePhotos, at)
	} else {
		_, err = tx.Exec(ctx, `
			INSERT INTO consents (owner_sub, data_type, granted, granted_at, updated_at)
			VALUES ($1, $2, false, NULL, $3)
			ON CONFLICT (owner_sub, data_type) DO UPDATE
			SET granted = false, granted_at = NULL, updated_at = EXCLUDED.updated_at`,
			owner, wardrobe.DataTypeWardrobePhotos, at)
	}
	if err != nil {
		return nil, fmt.Errorf("write consent: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}
	return removed, nil
}

func deleteOwnerItems(ctx context.Context, tx pgx.Tx, owner string) ([]wardrobe.Item, error) {
	rows, err := tx.Query(ctx, `
		DELETE FROM wardrobe_items WHERE owner_sub = $1
		RETURNING id, owner_sub, s3_key, content_type, size_bytes, created_at`, owner)
	if err != nil {
		return nil, fmt.Errorf("delete items: %w", err)
	}
	items, err := pgx.CollectRows(rows, scanItem)
	if err != nil {
		return nil, fmt.Errorf("collect deleted items: %w", err)
	}
	return items, nil
}

// InsertItem implements wardrobe.Repository.
func (w *Wardrobe) InsertItem(ctx context.Context, item wardrobe.Item) error {
	_, err := w.pool.Exec(ctx, `
		INSERT INTO wardrobe_items (id, owner_sub, s3_key, content_type, size_bytes, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		item.ID, item.Owner, item.Key, item.ContentType, item.SizeBytes, item.CreatedAt)
	if err != nil {
		return fmt.Errorf("insert item: %w", err)
	}
	return nil
}

// ListItems implements wardrobe.Repository. Newest first.
func (w *Wardrobe) ListItems(ctx context.Context, owner string) ([]wardrobe.Item, error) {
	rows, err := w.pool.Query(ctx, `
		SELECT id, owner_sub, s3_key, content_type, size_bytes, created_at
		FROM wardrobe_items WHERE owner_sub = $1
		ORDER BY created_at DESC, id`, owner)
	if err != nil {
		return nil, fmt.Errorf("list items: %w", err)
	}
	items, err := pgx.CollectRows(rows, scanItem)
	if err != nil {
		return nil, fmt.Errorf("scan items: %w", err)
	}
	return items, nil
}

// Item implements wardrobe.Repository.
func (w *Wardrobe) Item(ctx context.Context, owner string, id uuid.UUID) (wardrobe.Item, error) {
	rows, err := w.pool.Query(ctx, `
		SELECT id, owner_sub, s3_key, content_type, size_bytes, created_at
		FROM wardrobe_items WHERE id = $1 AND owner_sub = $2`, id, owner)
	if err != nil {
		return wardrobe.Item{}, fmt.Errorf("query item: %w", err)
	}
	item, err := pgx.CollectOneRow(rows, scanItem)
	if errors.Is(err, pgx.ErrNoRows) {
		return wardrobe.Item{}, wardrobe.ErrNotFound
	}
	if err != nil {
		return wardrobe.Item{}, fmt.Errorf("scan item: %w", err)
	}
	return item, nil
}

// DeleteItem implements wardrobe.Repository.
func (w *Wardrobe) DeleteItem(ctx context.Context, owner string, id uuid.UUID) (wardrobe.Item, error) {
	rows, err := w.pool.Query(ctx, `
		DELETE FROM wardrobe_items WHERE id = $1 AND owner_sub = $2
		RETURNING id, owner_sub, s3_key, content_type, size_bytes, created_at`, id, owner)
	if err != nil {
		return wardrobe.Item{}, fmt.Errorf("delete item: %w", err)
	}
	item, err := pgx.CollectOneRow(rows, scanItem)
	if errors.Is(err, pgx.ErrNoRows) {
		return wardrobe.Item{}, wardrobe.ErrNotFound
	}
	if err != nil {
		return wardrobe.Item{}, fmt.Errorf("scan deleted item: %w", err)
	}
	return item, nil
}

func scanItem(row pgx.CollectableRow) (wardrobe.Item, error) {
	var item wardrobe.Item
	var createdAt time.Time
	err := row.Scan(&item.ID, &item.Owner, &item.Key, &item.ContentType, &item.SizeBytes, &createdAt)
	item.CreatedAt = createdAt.UTC()
	return item, err
}
