package models

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type DynamoDBClient struct {
        client    *dynamodb.Client
        tableName string
}

// ensure DynamoDBClient implements DB
var _ DB = (*DynamoDBClient)(nil)

func NewDynamoDBClient(client *dynamodb.Client, tableName string) *DynamoDBClient {
	return &DynamoDBClient{
		client:    client,
		tableName: tableName,
	}
}

// Item operations
func (d *DynamoDBClient) GetAllItems(ctx context.Context) ([]Item, error) {
	result, err := d.client.Scan(ctx, &dynamodb.ScanInput{
		TableName:        aws.String(d.tableName),
		FilterExpression: aws.String("begins_with(#pk, :prefix)"),
		ExpressionAttributeNames: map[string]string{
			"#pk": "pk",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":prefix": &types.AttributeValueMemberS{Value: "ITEM#"},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to scan items: %w", err)
	}

	var items []Item
	for _, item := range result.Items {
		var itemObj Item
		if err := attributevalue.UnmarshalMap(item, &itemObj); err != nil {
			return nil, fmt.Errorf("failed to unmarshal item: %w", err)
		}
		items = append(items, itemObj)
	}

	return items, nil
}

func (d *DynamoDBClient) GetItemByID(ctx context.Context, id string) (*Item, error) {
	result, err := d.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(d.tableName),
		Key: map[string]types.AttributeValue{
			"pk": &types.AttributeValueMemberS{Value: fmt.Sprintf("ITEM#%s", id)},
			"sk": &types.AttributeValueMemberS{Value: fmt.Sprintf("ITEM#%s", id)},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get item: %w", err)
	}

	if result.Item == nil {
		return nil, nil
	}

	var item Item
	if err := attributevalue.UnmarshalMap(result.Item, &item); err != nil {
		return nil, fmt.Errorf("failed to unmarshal item: %w", err)
	}

	return &item, nil
}

func (d *DynamoDBClient) CreateItem(ctx context.Context, item *Item) error {
	now := time.Now().UTC().Format(time.RFC3339)
	item.Created = now
	item.Updated = now

	av, err := attributevalue.MarshalMap(item)
	if err != nil {
		return fmt.Errorf("failed to marshal item: %w", err)
	}

	av["pk"] = &types.AttributeValueMemberS{Value: fmt.Sprintf("ITEM#%s", item.ID)}
	av["sk"] = &types.AttributeValueMemberS{Value: fmt.Sprintf("ITEM#%s", item.ID)}
	av["category"] = &types.AttributeValueMemberS{Value: item.Category}

	_, err = d.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(d.tableName),
		Item:                av,
		ConditionExpression: aws.String("attribute_not_exists(pk)"),
	})
	if err != nil {
		return fmt.Errorf("failed to create item: %w", err)
	}

	return nil
}

func (d *DynamoDBClient) UpdateItem(ctx context.Context, item *Item) error {
	now := time.Now().UTC().Format(time.RFC3339)
	item.Updated = now

	av, err := attributevalue.MarshalMap(item)
	if err != nil {
		return fmt.Errorf("failed to marshal item: %w", err)
	}

	av["pk"] = &types.AttributeValueMemberS{Value: fmt.Sprintf("ITEM#%s", item.ID)}
	av["sk"] = &types.AttributeValueMemberS{Value: fmt.Sprintf("ITEM#%s", item.ID)}
	av["category"] = &types.AttributeValueMemberS{Value: item.Category}

	_, err = d.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(d.tableName),
		Item:      av,
	})
	if err != nil {
		return fmt.Errorf("failed to update item: %w", err)
	}

	return nil
}

func (d *DynamoDBClient) DeleteItem(ctx context.Context, id string) error {
	_, err := d.client.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(d.tableName),
		Key: map[string]types.AttributeValue{
			"pk": &types.AttributeValueMemberS{Value: fmt.Sprintf("ITEM#%s", id)},
			"sk": &types.AttributeValueMemberS{Value: fmt.Sprintf("ITEM#%s", id)},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to delete item: %w", err)
	}

	return nil
}

// Outfit operations
func (d *DynamoDBClient) GetAllOutfits(ctx context.Context) ([]Outfit, error) {
	result, err := d.client.Scan(ctx, &dynamodb.ScanInput{
		TableName:        aws.String(d.tableName),
		FilterExpression: aws.String("begins_with(#pk, :prefix)"),
		ExpressionAttributeNames: map[string]string{
			"#pk": "pk",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":prefix": &types.AttributeValueMemberS{Value: "OUTFIT#"},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to scan outfits: %w", err)
	}

	var outfits []Outfit
	for _, item := range result.Items {
		var outfitObj Outfit
		if err := attributevalue.UnmarshalMap(item, &outfitObj); err != nil {
			return nil, fmt.Errorf("failed to unmarshal outfit: %w", err)
		}
		outfits = append(outfits, outfitObj)
	}

	return outfits, nil
}

func (d *DynamoDBClient) GetOutfitByID(ctx context.Context, id string) (*Outfit, error) {
	result, err := d.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(d.tableName),
		Key: map[string]types.AttributeValue{
			"pk": &types.AttributeValueMemberS{Value: fmt.Sprintf("OUTFIT#%s", id)},
			"sk": &types.AttributeValueMemberS{Value: fmt.Sprintf("OUTFIT#%s", id)},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get outfit: %w", err)
	}

	if result.Item == nil {
		return nil, nil
	}

	var outfit Outfit
	if err := attributevalue.UnmarshalMap(result.Item, &outfit); err != nil {
		return nil, fmt.Errorf("failed to unmarshal outfit: %w", err)
	}

	return &outfit, nil
}

func (d *DynamoDBClient) CreateOutfit(ctx context.Context, outfit *Outfit) error {
	now := time.Now().UTC().Format(time.RFC3339)
	outfit.Created = now
	outfit.Updated = now

	av, err := attributevalue.MarshalMap(outfit)
	if err != nil {
		return fmt.Errorf("failed to marshal outfit: %w", err)
	}

	av["pk"] = &types.AttributeValueMemberS{Value: fmt.Sprintf("OUTFIT#%s", outfit.ID)}
	av["sk"] = &types.AttributeValueMemberS{Value: fmt.Sprintf("OUTFIT#%s", outfit.ID)}

	_, err = d.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(d.tableName),
		Item:                av,
		ConditionExpression: aws.String("attribute_not_exists(pk)"),
	})
	if err != nil {
		return fmt.Errorf("failed to create outfit: %w", err)
	}

	return nil
}

func (d *DynamoDBClient) UpdateOutfit(ctx context.Context, outfit *Outfit) error {
	now := time.Now().UTC().Format(time.RFC3339)
	outfit.Updated = now

	av, err := attributevalue.MarshalMap(outfit)
	if err != nil {
		return fmt.Errorf("failed to marshal outfit: %w", err)
	}

	av["pk"] = &types.AttributeValueMemberS{Value: fmt.Sprintf("OUTFIT#%s", outfit.ID)}
	av["sk"] = &types.AttributeValueMemberS{Value: fmt.Sprintf("OUTFIT#%s", outfit.ID)}

	_, err = d.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(d.tableName),
		Item:      av,
	})
	if err != nil {
		return fmt.Errorf("failed to update outfit: %w", err)
	}

	return nil
}

func (d *DynamoDBClient) DeleteOutfit(ctx context.Context, id string) error {
	_, err := d.client.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(d.tableName),
		Key: map[string]types.AttributeValue{
			"pk": &types.AttributeValueMemberS{Value: fmt.Sprintf("OUTFIT#%s", id)},
			"sk": &types.AttributeValueMemberS{Value: fmt.Sprintf("OUTFIT#%s", id)},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to delete outfit: %w", err)
	}

	return nil
}

// Helper methods
func (d *DynamoDBClient) ItemExists(ctx context.Context, id string) (bool, error) {
	result, err := d.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(d.tableName),
		Key: map[string]types.AttributeValue{
			"pk": &types.AttributeValueMemberS{Value: fmt.Sprintf("ITEM#%s", id)},
			"sk": &types.AttributeValueMemberS{Value: fmt.Sprintf("ITEM#%s", id)},
		},
	})
	if err != nil {
		return false, fmt.Errorf("failed to check item existence: %w", err)
	}

	return result.Item != nil, nil
}

func (d *DynamoDBClient) OutfitExists(ctx context.Context, id string) (bool, error) {
	result, err := d.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(d.tableName),
		Key: map[string]types.AttributeValue{
			"pk": &types.AttributeValueMemberS{Value: fmt.Sprintf("OUTFIT#%s", id)},
			"sk": &types.AttributeValueMemberS{Value: fmt.Sprintf("OUTFIT#%s", id)},
		},
	})
	if err != nil {
		return false, fmt.Errorf("failed to check outfit existence: %w", err)
	}

	return result.Item != nil, nil
}

// Initialize with sample data
func (d *DynamoDBClient) InitializeSampleData(ctx context.Context) error {
	// Check if data already exists
	items, err := d.GetAllItems(ctx)
	if err == nil && len(items) > 0 {
		return nil // Data already exists
	}

	// Create sample items
	sampleItems := []Item{
		{
			ID:       "1",
			Name:     "White T-Shirt",
			Category: "Top",
			ImageURL: "https://via.placeholder.com/150",
		},
		{
			ID:       "2",
			Name:     "Blue Jeans",
			Category: "Bottom",
			ImageURL: "https://via.placeholder.com/150",
		},
		{
			ID:       "3",
			Name:     "Black Sneakers",
			Category: "Shoes",
			ImageURL: "https://via.placeholder.com/150",
		},
	}

	// Create sample outfits
	sampleOutfits := []Outfit{
		{
			ID:      "1",
			Name:    "Casual Look",
			ItemIDs: []string{"1", "2", "3"},
		},
	}

	// Write sample data
	for _, item := range sampleItems {
		if err := d.CreateItem(ctx, &item); err != nil {
			return fmt.Errorf("failed to create sample item %s: %w", item.ID, err)
		}
	}

	for _, outfit := range sampleOutfits {
		if err := d.CreateOutfit(ctx, &outfit); err != nil {
			return fmt.Errorf("failed to create sample outfit %s: %w", outfit.ID, err)
		}
	}

	return nil
}
