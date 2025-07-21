package handlers_test

import (
    "context"
    "encoding/json"
    "net/http"
    "os"
    "testing"

    "pmorski-slay/main/handlers"
    "pmorski-slay/main/models"
    "github.com/aws/aws-lambda-go/events"
)

func TestItemAndOutfitFlow(t *testing.T) {
    os.Setenv("API_KEY", "testkey")
    db := models.NewMemoryDB()
    items := handlers.NewItemsHandler(db)
    outfits := handlers.NewOutfitsHandler(db)

    // Create item
    item := models.Item{ID: "i1", Name: "Shirt", Category: "Top", ImageURL: "url"}
    body, _ := json.Marshal(item)
    resp, _ := items.CreateItem(context.Background(), events.APIGatewayProxyRequest{
        Headers: map[string]string{"x-api-key": "testkey"},
        Body:    string(body),
    })
    if resp.StatusCode != http.StatusCreated {
        t.Fatalf("expected 201, got %d", resp.StatusCode)
    }

    // Create outfit with the item
    outfit := models.Outfit{ID: "o1", Name: "Look", ItemIDs: []string{"i1"}}
    body, _ = json.Marshal(outfit)
    resp, _ = outfits.CreateOutfit(context.Background(), events.APIGatewayProxyRequest{
        Headers: map[string]string{"x-api-key": "testkey"},
        Body:    string(body),
    })
    if resp.StatusCode != http.StatusCreated {
        t.Fatalf("expected 201, got %d", resp.StatusCode)
    }

    // Fetch outfits
    resp, _ = outfits.GetOutfits(context.Background(), events.APIGatewayProxyRequest{
        Headers: map[string]string{"x-api-key": "testkey"},
    })
    if resp.StatusCode != http.StatusOK {
        t.Fatalf("expected 200, got %d", resp.StatusCode)
    }
}

func TestUnauthorized(t *testing.T) {
    os.Setenv("API_KEY", "secret")
    db := models.NewMemoryDB()
    items := handlers.NewItemsHandler(db)

    resp, _ := items.GetItems(context.Background(), events.APIGatewayProxyRequest{})
    if resp.StatusCode != http.StatusUnauthorized {
        t.Fatalf("expected 401, got %d", resp.StatusCode)
    }
}

