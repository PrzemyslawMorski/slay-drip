package main

import (
	"context"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"

	"pmorski-slay/main/lambda/handlers"
)

var healthHandler *handlers.HealthHandler

func init() {
	healthHandler = handlers.NewHealthHandler()
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return healthHandler.HealthCheck(ctx, request)
}

func main() {
	lambda.Start(handler)
}
