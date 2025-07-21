package handlers

import (
        "context"
        "encoding/json"
        "fmt"
        "net/http"

        "pmorski-slay/main/models"

        "github.com/aws/aws-lambda-go/events"
)

type ItemsHandler struct {
        db models.DB
}

func NewItemsHandler(db models.DB) *ItemsHandler {
        return &ItemsHandler{db: db}
}

func (h *ItemsHandler) GetItems(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
        if resp := requireAPIKey(request); resp != nil {
                return *resp, nil
        }
        items, err := h.db.GetAllItems(ctx)
	if err != nil {
		return createErrorResponse(http.StatusInternalServerError, "Failed to retrieve items", "DATABASE_ERROR", err.Error()), nil
	}

	response := models.SuccessResponse{
		Message: "Items retrieved successfully",
		Data:    items,
	}

	return createSuccessResponse(http.StatusOK, response), nil
}

func (h *ItemsHandler) GetItemByID(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
        if resp := requireAPIKey(request); resp != nil {
                return *resp, nil
        }
        id := request.PathParameters["id"]
	if id == "" {
		return createErrorResponse(http.StatusBadRequest, "Item ID is required", "MISSING_ID", "Please provide a valid item ID"), nil
	}

	item, err := h.db.GetItemByID(ctx, id)
	if err != nil {
		return createErrorResponse(http.StatusInternalServerError, "Failed to retrieve item", "DATABASE_ERROR", err.Error()), nil
	}

	if item == nil {
		return createErrorResponse(http.StatusNotFound, "Item not found", "NOT_FOUND", fmt.Sprintf("Item with ID %s could not be found", id)), nil
	}

	response := models.SuccessResponse{
		Message: "Item retrieved successfully",
		Data:    item,
	}

	return createSuccessResponse(http.StatusOK, response), nil
}

func (h *ItemsHandler) CreateItem(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
        if resp := requireAPIKey(request); resp != nil {
                return *resp, nil
        }
        var item models.Item
	if err := json.Unmarshal([]byte(request.Body), &item); err != nil {
		return createErrorResponse(http.StatusBadRequest, "Invalid request data", "VALIDATION_ERROR", err.Error()), nil
	}

	// Validate required fields
	if item.ID == "" || item.Name == "" || item.Category == "" || item.ImageURL == "" {
		return createErrorResponse(http.StatusBadRequest, "Missing required fields", "MISSING_FIELDS", "All fields (id, name, category, imageUrl) are required"), nil
	}

	// Check if item already exists
	exists, err := h.db.ItemExists(ctx, item.ID)
	if err != nil {
		return createErrorResponse(http.StatusInternalServerError, "Failed to check item existence", "DATABASE_ERROR", err.Error()), nil
	}
	if exists {
		return createErrorResponse(http.StatusConflict, "Item already exists", "DUPLICATE_ID", fmt.Sprintf("Item with ID %s already exists", item.ID)), nil
	}

	// Create item
	if err := h.db.CreateItem(ctx, &item); err != nil {
		return createErrorResponse(http.StatusInternalServerError, "Failed to create item", "DATABASE_ERROR", err.Error()), nil
	}

	response := models.SuccessResponse{
		Message: "Item created successfully",
		Data:    item,
	}

	return createSuccessResponse(http.StatusCreated, response), nil
}
