// Package storage implements wardrobe.Blobs on an S3-compatible service. Locally that is
// the SeaweedFS stand-in; in production it is Scaleway Object Storage (ADR-0005, ADR-0011).
package storage

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	"slaydrip/backend/internal/wardrobe"
)

// Config holds the S3 settings from docs/local-development.md. Secrets come from the
// environment and are never logged.
type Config struct {
	Endpoint       string // full URL, for example http://127.0.0.1:8333
	Region         string
	Bucket         string
	ForcePathStyle bool
	AccessKey      string
	SecretKey      string
}

// S3 is a wardrobe.Blobs backed by one bucket.
type S3 struct {
	client *minio.Client
	bucket string
}

// NewS3 connects to the endpoint. It does not create the bucket: the smoke script and
// the operator own bucket creation.
func NewS3(cfg Config) (*S3, error) {
	u, err := url.Parse(cfg.Endpoint)
	if err != nil || u.Host == "" {
		return nil, fmt.Errorf("S3_ENDPOINT must be an absolute URL")
	}
	lookup := minio.BucketLookupAuto
	if cfg.ForcePathStyle {
		lookup = minio.BucketLookupPath
	}
	client, err := minio.New(u.Host, &minio.Options{
		Creds:        credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure:       u.Scheme == "https",
		Region:       cfg.Region,
		BucketLookup: lookup,
	})
	if err != nil {
		return nil, fmt.Errorf("create S3 client: %w", err)
	}
	return &S3{client: client, bucket: cfg.Bucket}, nil
}

// Put implements wardrobe.Blobs.
func (s *S3) Put(ctx context.Context, key string, data []byte, contentType string) error {
	_, err := s.client.PutObject(ctx, s.bucket, key, bytes.NewReader(data), int64(len(data)),
		minio.PutObjectOptions{ContentType: contentType})
	if err != nil {
		return fmt.Errorf("put object: %w", err)
	}
	return nil
}

// Get implements wardrobe.Blobs. A missing key returns wardrobe.ErrNotFound.
func (s *S3) Get(ctx context.Context, key string) ([]byte, error) {
	obj, err := s.client.GetObject(ctx, s.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("get object: %w", err)
	}
	defer func() { _ = obj.Close() }()
	data, err := io.ReadAll(obj)
	if err != nil {
		if minio.ToErrorResponse(err).Code == "NoSuchKey" {
			return nil, wardrobe.ErrNotFound
		}
		return nil, fmt.Errorf("read object: %w", err)
	}
	return data, nil
}

// Delete implements wardrobe.Blobs. Deleting a missing key is not an error on S3.
func (s *S3) Delete(ctx context.Context, key string) error {
	if err := s.client.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{}); err != nil {
		if errors.Is(err, context.Canceled) {
			return err
		}
		return fmt.Errorf("remove object: %w", err)
	}
	return nil
}
