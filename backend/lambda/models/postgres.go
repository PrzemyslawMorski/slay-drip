package models

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// schema is applied on startup. It is idempotent so it is safe on every cold start.
const schema = `
CREATE TABLE IF NOT EXISTS items (
	id        TEXT PRIMARY KEY,
	name      TEXT NOT NULL,
	category  TEXT NOT NULL,
	image_url TEXT NOT NULL,
	created   TEXT NOT NULL,
	updated   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outfits (
	id       TEXT PRIMARY KEY,
	name     TEXT NOT NULL,
	item_ids TEXT[] NOT NULL,
	created  TEXT NOT NULL,
	updated  TEXT NOT NULL
);
`

// Store persists items and outfits in a PostgreSQL-compatible database
// (Scaleway Serverless SQL Database).
type Store struct {
	pool *pgxpool.Pool
}

// NewStore opens a connection pool and verifies the database is reachable.
func NewStore(ctx context.Context, databaseURL string) (*Store, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to reach database: %w", err)
	}

	return &Store{pool: pool}, nil
}

// Close releases all pooled connections.
func (s *Store) Close() {
	s.pool.Close()
}

// Migrate creates the tables if they do not exist.
func (s *Store) Migrate(ctx context.Context) error {
	if _, err := s.pool.Exec(ctx, schema); err != nil {
		return fmt.Errorf("failed to apply schema: %w", err)
	}
	return nil
}

// Item operations

func (s *Store) GetAllItems(ctx context.Context) ([]Item, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, name, category, image_url, created, updated FROM items ORDER BY created`)
	if err != nil {
		return nil, fmt.Errorf("failed to list items: %w", err)
	}

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[Item])
	if err != nil {
		return nil, fmt.Errorf("failed to read items: %w", err)
	}

	return items, nil
}

func (s *Store) GetItemByID(ctx context.Context, id string) (*Item, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, name, category, image_url, created, updated FROM items WHERE id = $1`, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get item: %w", err)
	}

	item, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[Item])
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to read item: %w", err)
	}

	return &item, nil
}

func (s *Store) CreateItem(ctx context.Context, item *Item) error {
	now := time.Now().UTC().Format(time.RFC3339)
	item.Created = now
	item.Updated = now

	_, err := s.pool.Exec(ctx,
		`INSERT INTO items (id, name, category, image_url, created, updated) VALUES ($1, $2, $3, $4, $5, $6)`,
		item.ID, item.Name, item.Category, item.ImageURL, item.Created, item.Updated,
	)
	if err != nil {
		return fmt.Errorf("failed to create item: %w", err)
	}

	return nil
}

func (s *Store) UpdateItem(ctx context.Context, item *Item) error {
	item.Updated = time.Now().UTC().Format(time.RFC3339)

	_, err := s.pool.Exec(ctx, `
		INSERT INTO items (id, name, category, image_url, created, updated)
		VALUES ($1, $2, $3, $4, $5, $5)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			category = EXCLUDED.category,
			image_url = EXCLUDED.image_url,
			updated = EXCLUDED.updated`,
		item.ID, item.Name, item.Category, item.ImageURL, item.Updated,
	)
	if err != nil {
		return fmt.Errorf("failed to update item: %w", err)
	}

	return nil
}

func (s *Store) DeleteItem(ctx context.Context, id string) error {
	if _, err := s.pool.Exec(ctx, `DELETE FROM items WHERE id = $1`, id); err != nil {
		return fmt.Errorf("failed to delete item: %w", err)
	}
	return nil
}

// Outfit operations

func (s *Store) GetAllOutfits(ctx context.Context) ([]Outfit, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, name, item_ids, created, updated FROM outfits ORDER BY created`)
	if err != nil {
		return nil, fmt.Errorf("failed to list outfits: %w", err)
	}

	outfits, err := pgx.CollectRows(rows, pgx.RowToStructByName[Outfit])
	if err != nil {
		return nil, fmt.Errorf("failed to read outfits: %w", err)
	}

	return outfits, nil
}

func (s *Store) GetOutfitByID(ctx context.Context, id string) (*Outfit, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, name, item_ids, created, updated FROM outfits WHERE id = $1`, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get outfit: %w", err)
	}

	outfit, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[Outfit])
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to read outfit: %w", err)
	}

	return &outfit, nil
}

func (s *Store) CreateOutfit(ctx context.Context, outfit *Outfit) error {
	now := time.Now().UTC().Format(time.RFC3339)
	outfit.Created = now
	outfit.Updated = now

	_, err := s.pool.Exec(ctx,
		`INSERT INTO outfits (id, name, item_ids, created, updated) VALUES ($1, $2, $3, $4, $5)`,
		outfit.ID, outfit.Name, outfit.ItemIDs, outfit.Created, outfit.Updated,
	)
	if err != nil {
		return fmt.Errorf("failed to create outfit: %w", err)
	}

	return nil
}

func (s *Store) UpdateOutfit(ctx context.Context, outfit *Outfit) error {
	outfit.Updated = time.Now().UTC().Format(time.RFC3339)

	_, err := s.pool.Exec(ctx, `
		INSERT INTO outfits (id, name, item_ids, created, updated)
		VALUES ($1, $2, $3, $4, $4)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			item_ids = EXCLUDED.item_ids,
			updated = EXCLUDED.updated`,
		outfit.ID, outfit.Name, outfit.ItemIDs, outfit.Updated,
	)
	if err != nil {
		return fmt.Errorf("failed to update outfit: %w", err)
	}

	return nil
}

func (s *Store) DeleteOutfit(ctx context.Context, id string) error {
	if _, err := s.pool.Exec(ctx, `DELETE FROM outfits WHERE id = $1`, id); err != nil {
		return fmt.Errorf("failed to delete outfit: %w", err)
	}
	return nil
}

// Helper methods

func (s *Store) ItemExists(ctx context.Context, id string) (bool, error) {
	var exists bool
	if err := s.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM items WHERE id = $1)`, id).Scan(&exists); err != nil {
		return false, fmt.Errorf("failed to check item existence: %w", err)
	}
	return exists, nil
}

func (s *Store) OutfitExists(ctx context.Context, id string) (bool, error) {
	var exists bool
	if err := s.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM outfits WHERE id = $1)`, id).Scan(&exists); err != nil {
		return false, fmt.Errorf("failed to check outfit existence: %w", err)
	}
	return exists, nil
}

// InitializeSampleData seeds the database with sample items and outfits when it is empty.
func (s *Store) InitializeSampleData(ctx context.Context) error {
	items, err := s.GetAllItems(ctx)
	if err == nil && len(items) > 0 {
		return nil // Data already exists
	}

	sampleItems := []Item{
		{ID: "1", Name: "White T-Shirt", Category: "Top", ImageURL: "https://via.placeholder.com/150"},
		{ID: "2", Name: "Blue Jeans", Category: "Bottom", ImageURL: "https://via.placeholder.com/150"},
		{ID: "3", Name: "Black Sneakers", Category: "Shoes", ImageURL: "https://via.placeholder.com/150"},
	}

	sampleOutfits := []Outfit{
		{ID: "1", Name: "Casual Look", ItemIDs: []string{"1", "2", "3"}},
	}

	for i := range sampleItems {
		if err := s.CreateItem(ctx, &sampleItems[i]); err != nil {
			return fmt.Errorf("failed to create sample item %s: %w", sampleItems[i].ID, err)
		}
	}

	for i := range sampleOutfits {
		if err := s.CreateOutfit(ctx, &sampleOutfits[i]); err != nil {
			return fmt.Errorf("failed to create sample outfit %s: %w", sampleOutfits[i].ID, err)
		}
	}

	return nil
}
