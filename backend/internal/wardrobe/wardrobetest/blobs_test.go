package wardrobetest_test

import (
	"testing"

	"slaydrip/backend/internal/wardrobe"
	"slaydrip/backend/internal/wardrobe/blobcontract"
	"slaydrip/backend/internal/wardrobe/wardrobetest"
)

func TestFakeBlobsPassContract(t *testing.T) {
	t.Parallel()
	blobcontract.Run(t, func(*testing.T) wardrobe.Blobs {
		return wardrobetest.NewBlobs()
	})
}
