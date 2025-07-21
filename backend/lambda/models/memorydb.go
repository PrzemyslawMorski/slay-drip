package models

import (
    "context"
    "sync"
)

// MemoryDB is a simple in-memory DB for tests

type MemoryDB struct {
    mu      sync.Mutex
    items   map[string]Item
    outfits map[string]Outfit
}

func NewMemoryDB() *MemoryDB {
    return &MemoryDB{
        items:   make(map[string]Item),
        outfits: make(map[string]Outfit),
    }
}

// Item operations
func (m *MemoryDB) GetAllItems(ctx context.Context) ([]Item, error) {
    m.mu.Lock(); defer m.mu.Unlock()
    res := make([]Item, 0, len(m.items))
    for _, v := range m.items {
        res = append(res, v)
    }
    return res, nil
}

func (m *MemoryDB) GetItemByID(ctx context.Context, id string) (*Item, error) {
    m.mu.Lock(); defer m.mu.Unlock()
    it, ok := m.items[id]
    if !ok {
        return nil, nil
    }
    cpy := it
    return &cpy, nil
}

func (m *MemoryDB) CreateItem(ctx context.Context, item *Item) error {
    m.mu.Lock(); defer m.mu.Unlock()
    m.items[item.ID] = *item
    return nil
}

func (m *MemoryDB) UpdateItem(ctx context.Context, item *Item) error {
    return m.CreateItem(ctx, item)
}

func (m *MemoryDB) DeleteItem(ctx context.Context, id string) error {
    m.mu.Lock(); defer m.mu.Unlock()
    delete(m.items, id)
    return nil
}

func (m *MemoryDB) ItemExists(ctx context.Context, id string) (bool, error) {
    m.mu.Lock(); defer m.mu.Unlock()
    _, ok := m.items[id]
    return ok, nil
}

// Outfit operations
func (m *MemoryDB) GetAllOutfits(ctx context.Context) ([]Outfit, error) {
    m.mu.Lock(); defer m.mu.Unlock()
    res := make([]Outfit, 0, len(m.outfits))
    for _, v := range m.outfits {
        res = append(res, v)
    }
    return res, nil
}

func (m *MemoryDB) GetOutfitByID(ctx context.Context, id string) (*Outfit, error) {
    m.mu.Lock(); defer m.mu.Unlock()
    o, ok := m.outfits[id]
    if !ok {
        return nil, nil
    }
    cpy := o
    return &cpy, nil
}

func (m *MemoryDB) CreateOutfit(ctx context.Context, outfit *Outfit) error {
    m.mu.Lock(); defer m.mu.Unlock()
    m.outfits[outfit.ID] = *outfit
    return nil
}

func (m *MemoryDB) UpdateOutfit(ctx context.Context, outfit *Outfit) error {
    return m.CreateOutfit(ctx, outfit)
}

func (m *MemoryDB) DeleteOutfit(ctx context.Context, id string) error {
    m.mu.Lock(); defer m.mu.Unlock()
    delete(m.outfits, id)
    return nil
}

func (m *MemoryDB) OutfitExists(ctx context.Context, id string) (bool, error) {
    m.mu.Lock(); defer m.mu.Unlock()
    _, ok := m.outfits[id]
    return ok, nil
}

func (m *MemoryDB) InitializeSampleData(ctx context.Context) error {
    return nil
}

