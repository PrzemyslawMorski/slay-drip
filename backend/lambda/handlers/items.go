package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"pmorski-slay/main/models"
)

type ItemsHandler struct {
	store *models.Store
}

func NewItemsHandler(store *models.Store) *ItemsHandler {
	return &ItemsHandler{store: store}
}

func (h *ItemsHandler) GetItems(w http.ResponseWriter, r *http.Request) {
	items, err := h.store.GetAllItems(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to retrieve items", "DATABASE_ERROR", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, models.SuccessResponse{
		Message: "Items retrieved successfully",
		Data:    items,
	})
}

func (h *ItemsHandler) GetItemByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "Item ID is required", "MISSING_ID", "Please provide a valid item ID")
		return
	}

	item, err := h.store.GetItemByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to retrieve item", "DATABASE_ERROR", err.Error())
		return
	}

	if item == nil {
		writeError(w, http.StatusNotFound, "Item not found", "NOT_FOUND", fmt.Sprintf("Item with ID %s could not be found", id))
		return
	}

	writeJSON(w, http.StatusOK, models.SuccessResponse{
		Message: "Item retrieved successfully",
		Data:    item,
	})
}

func (h *ItemsHandler) CreateItem(w http.ResponseWriter, r *http.Request) {
	var item models.Item
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request data", "VALIDATION_ERROR", err.Error())
		return
	}

	// Validate required fields
	if item.ID == "" || item.Name == "" || item.Category == "" || item.ImageURL == "" {
		writeError(w, http.StatusBadRequest, "Missing required fields", "MISSING_FIELDS", "All fields (id, name, category, imageUrl) are required")
		return
	}

	// Check if item already exists
	exists, err := h.store.ItemExists(r.Context(), item.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to check item existence", "DATABASE_ERROR", err.Error())
		return
	}
	if exists {
		writeError(w, http.StatusConflict, "Item already exists", "DUPLICATE_ID", fmt.Sprintf("Item with ID %s already exists", item.ID))
		return
	}

	if err := h.store.CreateItem(r.Context(), &item); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create item", "DATABASE_ERROR", err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, models.SuccessResponse{
		Message: "Item created successfully",
		Data:    item,
	})
}
