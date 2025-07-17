package handlers

import (
	"context"
	"net/http"
	"time"

	"pmorski-slay/main/lambda/models"

	"github.com/aws/aws-lambda-go/events"
)

type HealthHandler struct{}

func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

func (h *HealthHandler) HealthCheck(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	response := models.HealthResponse{
		Status:    "healthy",
		Timestamp: time.Now().UTC(),
		Version:   "1.0.0",
	}

	return createSuccessResponse(http.StatusOK, response), nil
}
