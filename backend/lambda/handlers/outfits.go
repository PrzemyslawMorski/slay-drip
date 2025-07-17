package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"pmorski-slay/main/lambda/models"

	"github.com/aws/aws-lambda-go/events"
)

type OutfitsHandler struct {
	db *models.DynamoDBClient
}

func NewOutfitsHandler(db *models.DynamoDBClient) *OutfitsHandler {
	return &OutfitsHandler{db: db}
}

func (h *OutfitsHandler) GetOutfits(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	outfits, err := h.db.GetAllOutfits(ctx)
	if err != nil {
		return createErrorResponse(http.StatusInternalServerError, "Failed to retrieve outfits", "DATABASE_ERROR", err.Error()), nil
	}

	response := models.SuccessResponse{
		Message: "Outfits retrieved successfully",
		Data:    outfits,
	}

	return createSuccessResponse(http.StatusOK, response), nil
}

func (h *OutfitsHandler) GetOutfitByID(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	id := request.PathParameters["id"]
	if id == "" {
		return createErrorResponse(http.StatusBadRequest, "Outfit ID is required", "MISSING_ID", "Please provide a valid outfit ID"), nil
	}

	outfit, err := h.db.GetOutfitByID(ctx, id)
	if err != nil {
		return createErrorResponse(http.StatusInternalServerError, "Failed to retrieve outfit", "DATABASE_ERROR", err.Error()), nil
	}

	if outfit == nil {
		return createErrorResponse(http.StatusNotFound, "Outfit not found", "NOT_FOUND", fmt.Sprintf("Outfit with ID %s could not be found", id)), nil
	}

	response := models.SuccessResponse{
		Message: "Outfit retrieved successfully",
		Data:    outfit,
	}

	return createSuccessResponse(http.StatusOK, response), nil
}

func (h *OutfitsHandler) CreateOutfit(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	var outfit models.Outfit
	if err := json.Unmarshal([]byte(request.Body), &outfit); err != nil {
		return createErrorResponse(http.StatusBadRequest, "Invalid request data", "VALIDATION_ERROR", err.Error()), nil
	}

	// Validate required fields
	if outfit.ID == "" || outfit.Name == "" || len(outfit.ItemIDs) == 0 {
		return createErrorResponse(http.StatusBadRequest, "Missing required fields", "MISSING_FIELDS", "All fields (id, name, itemIds) are required and itemIds cannot be empty"), nil
	}

	// Validate that all referenced items exist
	for _, itemID := range outfit.ItemIDs {
		exists, err := h.db.ItemExists(ctx, itemID)
		if err != nil {
			return createErrorResponse(http.StatusInternalServerError, "Failed to validate item reference", "DATABASE_ERROR", err.Error()), nil
		}
		if !exists {
			return createErrorResponse(http.StatusBadRequest, "Invalid item reference", "INVALID_ITEM_ID", fmt.Sprintf("Item with ID %s does not exist", itemID)), nil
		}
	}

	// Create outfit
	if err := h.db.CreateOutfit(ctx, &outfit); err != nil {
		return createErrorResponse(http.StatusInternalServerError, "Failed to create outfit", "DATABASE_ERROR", err.Error()), nil
	}

	response := models.SuccessResponse{
		Message: "Outfit created successfully",
		Data:    outfit,
	}

	return createSuccessResponse(http.StatusCreated, response), nil
}
