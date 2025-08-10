package main

import (
	"context"
	"log"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"

	"pmorski-slay/main/config"
	"pmorski-slay/main/handlers"
	"pmorski-slay/main/models"
)

var itemsHandler *handlers.ItemsHandler

func init() {
	// Load environment configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("unable to load configuration: %v", err)
	}

	// Log environment information
	log.Printf("Initializing Lambda function for environment: %s", cfg.Environment)
	log.Printf("DynamoDB table: %s", cfg.GetTableName())
	log.Printf("Log level: %s", cfg.GetLogLevel())
	log.Printf("Debug enabled: %t", cfg.ShouldEnableDebug())

	// Load AWS SDK configuration
	awsCfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		log.Fatalf("unable to load SDK config: %v", err)
	}

	client := dynamodb.NewFromConfig(awsCfg)

	// Use configuration for table name
	tableName := cfg.GetTableName()
	db := models.NewDynamoDBClient(client, tableName)
	itemsHandler = handlers.NewItemsHandler(db)
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return itemsHandler.GetItems(ctx, request)
}

func main() {
	lambda.Start(handler)
}
