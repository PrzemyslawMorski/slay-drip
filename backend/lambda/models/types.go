package models

import (
        "context"
        "time"
)

// Item represents a clothing item in the wardrobe
// @openapi:component
type Item struct {
	// @openapi:property description="Unique identifier for the item"
	ID string `json:"id" dynamodbav:"id" example:"item-123"`

	// @openapi:property description="Name of the clothing item"
	Name string `json:"name" dynamodbav:"name" example:"White T-Shirt"`

	// @openapi:property description="Category of clothing"
	Category string `json:"category" dynamodbav:"category" example:"Top"`

	// @openapi:property description="URL to the item's image"
	ImageURL string `json:"imageUrl" dynamodbav:"image_url" example:"https://example.com/image.jpg"`

	// @openapi:property description="Creation timestamp"
	Created string `json:"created" dynamodbav:"created" example:"2024-01-15T10:30:00Z"`

	// @openapi:property description="Last update timestamp"
	Updated string `json:"updated" dynamodbav:"updated" example:"2024-01-15T10:30:00Z"`
}

// CreateItemRequest represents the request to create a new item
// @openapi:component
type CreateItemRequest struct {
	// @openapi:property required=true description="Name of the clothing item"
	Name string `json:"name" binding:"required" example:"Blue Jeans"`

	// @openapi:property required=true description="Category of clothing"
	Category string `json:"category" binding:"required" example:"Bottom"`

	// @openapi:property required=true description="URL to the item's image"
	ImageURL string `json:"imageUrl" binding:"required,url" example:"https://example.com/jeans.jpg"`
}

// Outfit represents a combination of clothing items
type Outfit struct {
	ID      string   `json:"id" db:"id"`
	Name    string   `json:"name" db:"name"`
	ItemIDs []string `json:"itemIds" db:"item_ids"`
	Created string   `json:"created" db:"created"`
	Updated string   `json:"updated" db:"updated"`
}

// ErrorResponse represents a standardized error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Code    string `json:"code,omitempty"`
	Details string `json:"details,omitempty"`
}

// SuccessResponse represents a standardized success response
type SuccessResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

// HealthResponse represents health check response
type HealthResponse struct {
        Status    string    `json:"status"`
        Timestamp time.Time `json:"timestamp"`
        Version   string    `json:"version"`
}

// DB defines the persistence layer used by handlers
type DB interface {
        // Item operations
        GetAllItems(ctx context.Context) ([]Item, error)
        GetItemByID(ctx context.Context, id string) (*Item, error)
        CreateItem(ctx context.Context, item *Item) error
        UpdateItem(ctx context.Context, item *Item) error
        DeleteItem(ctx context.Context, id string) error
        ItemExists(ctx context.Context, id string) (bool, error)

        // Outfit operations
        GetAllOutfits(ctx context.Context) ([]Outfit, error)
        GetOutfitByID(ctx context.Context, id string) (*Outfit, error)
        CreateOutfit(ctx context.Context, outfit *Outfit) error
        UpdateOutfit(ctx context.Context, outfit *Outfit) error
        DeleteOutfit(ctx context.Context, id string) error
        OutfitExists(ctx context.Context, id string) (bool, error)

        InitializeSampleData(ctx context.Context) error
}
