package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"pmorski-slay/main/models"
)

type OutfitsHandler struct {
	store *models.Store
}

func NewOutfitsHandler(store *models.Store) *OutfitsHandler {
	return &OutfitsHandler{store: store}
}

func (h *OutfitsHandler) GetOutfits(w http.ResponseWriter, r *http.Request) {
	outfits, err := h.store.GetAllOutfits(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to retrieve outfits", "DATABASE_ERROR", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, models.SuccessResponse{
		Message: "Outfits retrieved successfully",
		Data:    outfits,
	})
}

func (h *OutfitsHandler) GetOutfitByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "Outfit ID is required", "MISSING_ID", "Please provide a valid outfit ID")
		return
	}

	outfit, err := h.store.GetOutfitByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to retrieve outfit", "DATABASE_ERROR", err.Error())
		return
	}

	if outfit == nil {
		writeError(w, http.StatusNotFound, "Outfit not found", "NOT_FOUND", fmt.Sprintf("Outfit with ID %s could not be found", id))
		return
	}

	writeJSON(w, http.StatusOK, models.SuccessResponse{
		Message: "Outfit retrieved successfully",
		Data:    outfit,
	})
}

func (h *OutfitsHandler) CreateOutfit(w http.ResponseWriter, r *http.Request) {
	var outfit models.Outfit
	if err := json.NewDecoder(r.Body).Decode(&outfit); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request data", "VALIDATION_ERROR", err.Error())
		return
	}

	// Validate required fields
	if outfit.ID == "" || outfit.Name == "" || len(outfit.ItemIDs) == 0 {
		writeError(w, http.StatusBadRequest, "Missing required fields", "MISSING_FIELDS", "All fields (id, name, itemIds) are required and itemIds cannot be empty")
		return
	}

	// Validate that all referenced items exist
	for _, itemID := range outfit.ItemIDs {
		exists, err := h.store.ItemExists(r.Context(), itemID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to validate item reference", "DATABASE_ERROR", err.Error())
			return
		}
		if !exists {
			writeError(w, http.StatusBadRequest, "Invalid item reference", "INVALID_ITEM_ID", fmt.Sprintf("Item with ID %s does not exist", itemID))
			return
		}
	}

	if err := h.store.CreateOutfit(r.Context(), &outfit); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create outfit", "DATABASE_ERROR", err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, models.SuccessResponse{
		Message: "Outfit created successfully",
		Data:    outfit,
	})
}
