package handlers

import (
	"encoding/json"

	"pmorski-slay/main/lambda/models"

	"github.com/aws/aws-lambda-go/events"
)

func createSuccessResponse(statusCode int, data interface{}) events.APIGatewayProxyResponse {
	body, _ := json.Marshal(data)
	return events.APIGatewayProxyResponse{
		StatusCode: statusCode,
		Headers: map[string]string{
			"Content-Type":                 "application/json",
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
			"Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
		},
		Body: string(body),
	}
}

func createErrorResponse(statusCode int, message, code, details string) events.APIGatewayProxyResponse {
	errorResponse := models.ErrorResponse{
		Error:   message,
		Code:    code,
		Details: details,
	}

	body, _ := json.Marshal(errorResponse)
	return events.APIGatewayProxyResponse{
		StatusCode: statusCode,
		Headers: map[string]string{
			"Content-Type":                 "application/json",
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
			"Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
		},
		Body: string(body),
	}
}
