//go:build integration

package storage

import (
	"testing"

	"github.com/stretchr/testify/require"

	"slaydrip/backend/internal/testenv"
	"slaydrip/backend/internal/wardrobe"
	"slaydrip/backend/internal/wardrobe/blobcontract"
)

// TestS3AgainstObjectStorage needs the compose stack running (docker compose up -d) and the
// bucket created by scripts/dev/s3-smoke.sh. See docs/local-development.md.
func TestS3AgainstObjectStorage(t *testing.T) {
	blobs, err := NewS3(Config{
		Endpoint:       testenv.Get(t, "S3_ENDPOINT"),
		Region:         testenv.Get(t, "S3_REGION"),
		Bucket:         testenv.Get(t, "S3_BUCKET"),
		ForcePathStyle: testenv.Bool(t, "S3_FORCE_PATH_STYLE"),
		AccessKey:      testenv.Get(t, "S3_ACCESS_KEY"),
		SecretKey:      testenv.Get(t, "S3_SECRET_KEY"),
	})
	require.NoError(t, err)

	blobcontract.Run(t, func(*testing.T) wardrobe.Blobs { return blobs })
}
