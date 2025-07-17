package main

import (
	"context"
	"log"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"

	"pmorski-slay/main/handlers"
	"pmorski-slay/main/models"
)

var itemsHandler *handlers.ItemsHandler

func init() {
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		log.Fatalf("unable to load SDK config: %v", err)
	}

	client := dynamodb.NewFromConfig(cfg)

	// Get table name from environment variable with fallback
	tableName := os.Getenv("DYNAMODB_TABLE_NAME")
	if tableName == "" {
		log.Fatal("DYNAMODB_TABLE_NAME environment variable is required")
	}

	db := models.NewDynamoDBClient(client, tableName)
	itemsHandler = handlers.NewItemsHandler(db)
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return itemsHandler.CreateItem(ctx, request)
}

func main() {
	lambda.Start(handler)
}
