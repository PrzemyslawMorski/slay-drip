package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Item represents a clothing item.
type Item struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Category string `json:"category"`
	ImageURL string `json:"imageUrl"`
}

// Outfit represents a combination of clothing items.
type Outfit struct {
	ID      string   `json:"id"`
	Name    string   `json:"name"`
	ItemIDs []string `json:"itemIds"`
}

var items = []Item{
	{ID: "1", Name: "White T-Shirt", Category: "Top", ImageURL: "https://via.placeholder.com/150"},
	{ID: "2", Name: "Blue Jeans", Category: "Bottom", ImageURL: "https://via.placeholder.com/150"},
	{ID: "3", Name: "Black Sneakers", Category: "Shoes", ImageURL: "https://via.placeholder.com/150"},
}

var outfits = []Outfit{
	{ID: "1", Name: "Casual Look", ItemIDs: []string{"1", "2", "3"}},
}

func main() {
	r := gin.Default()

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Item routes
		v1.GET("/items", getItems)
		v1.GET("/items/:id", getItemByID)
		v1.POST("/items", createItem)

		// Outfit routes
		v1.GET("/outfits", getOutfits)
		v1.GET("/outfits/:id", getOutfitByID)
		v1.POST("/outfits", createOutfit)
	}

	r.Run(":8080")
}

func getItems(c *gin.Context) {
	c.JSON(http.StatusOK, items)
}

func getItemByID(c *gin.Context) {
	id := c.Param("id")
	for _, item := range items {
		if item.ID == id {
			c.JSON(http.StatusOK, item)
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"message": "Item not found"})
}

func createItem(c *gin.Context) {
	var newItem Item
	if err := c.ShouldBindJSON(&newItem); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	items = append(items, newItem)
	c.JSON(http.StatusCreated, newItem)
}

func getOutfits(c *gin.Context) {
	c.JSON(http.StatusOK, outfits)
}

func getOutfitByID(c *gin.Context) {
	id := c.Param("id")
	for _, outfit := range outfits {
		if outfit.ID == id {
			c.JSON(http.StatusOK, outfit)
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"message": "Outfit not found"})
}

func createOutfit(c *gin.Context) {
	var newOutfit Outfit
	if err := c.ShouldBindJSON(&newOutfit); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	outfits = append(outfits, newOutfit)
	c.JSON(http.StatusCreated, newOutfit)
}
