// Command api serves the Slay Drip REST API. It runs as a single container on
// Scaleway Serverless Containers and listens on $PORT (default 8080).
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"pmorski-slay/main/config"
	"pmorski-slay/main/handlers"
	"pmorski-slay/main/models"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("unable to load configuration: %v", err)
	}

	log.Printf("Starting API for environment: %s", cfg.Environment)
	log.Printf("Log level: %s", cfg.GetLogLevel())
	log.Printf("Debug enabled: %t", cfg.ShouldEnableDebug())

	ctx := context.Background()

	store, err := models.NewStore(ctx, cfg.GetDatabaseURL())
	if err != nil {
		log.Fatalf("unable to connect to database: %v", err)
	}
	defer store.Close()

	if err := store.Migrate(ctx); err != nil {
		log.Fatalf("unable to migrate database: %v", err)
	}

	items := handlers.NewItemsHandler(store)
	outfits := handlers.NewOutfitsHandler(store)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/items", items.GetItems)
	mux.HandleFunc("POST /api/v1/items", items.CreateItem)
	mux.HandleFunc("GET /api/v1/items/{id}", items.GetItemByID)
	mux.HandleFunc("GET /api/v1/outfits", outfits.GetOutfits)
	mux.HandleFunc("POST /api/v1/outfits", outfits.CreateOutfit)
	mux.HandleFunc("GET /api/v1/outfits/{id}", outfits.GetOutfitByID)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           handlers.WithCORS(mux),
		ReadHeaderTimeout: 10 * time.Second,
	}

	log.Printf("Listening on :%s", port)
	log.Fatal(server.ListenAndServe())
}
