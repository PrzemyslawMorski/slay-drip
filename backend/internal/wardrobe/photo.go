package wardrobe

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"net/http"

	"golang.org/x/image/webp"
)

// MaxPhotoBytes is the upload limit for one photo (S1-01: 10 MB).
const MaxPhotoBytes = 10 << 20

// maxDimension and maxPixels bound the decoded size, so a small file cannot expand
// into a huge bitmap.
const (
	maxDimension = 6000
	maxPixels    = 36_000_000
)

// ErrUnsupportedPhoto means the bytes are not a JPEG, PNG or WebP image within the bounds.
var ErrUnsupportedPhoto = errors.New("unsupported photo")

// ErrPhotoTooLarge means the upload is over MaxPhotoBytes.
var ErrPhotoTooLarge = errors.New("photo too large")

// SanitisedPhoto is a photo that was decoded and encoded again. Re-encoding drops EXIF,
// GPS and device metadata, which ADR-0004 and the security guide require.
type SanitisedPhoto struct {
	Data        []byte
	ContentType string
}

// SanitisePhoto checks the bytes, not the file name, and returns a re-encoded copy.
// JPEG stays JPEG. PNG and WebP become PNG, which keeps transparency.
func SanitisePhoto(raw []byte) (SanitisedPhoto, error) {
	if len(raw) > MaxPhotoBytes {
		return SanitisedPhoto{}, ErrPhotoTooLarge
	}
	sniffed := http.DetectContentType(raw[:min(len(raw), 512)])

	cfg, _, err := image.DecodeConfig(bytes.NewReader(raw))
	if err != nil {
		return SanitisedPhoto{}, ErrUnsupportedPhoto
	}
	if cfg.Width <= 0 || cfg.Height <= 0 || cfg.Width > maxDimension || cfg.Height > maxDimension ||
		cfg.Width*cfg.Height > maxPixels {
		return SanitisedPhoto{}, ErrUnsupportedPhoto
	}

	switch sniffed {
	case "image/jpeg":
		img, err := jpeg.Decode(bytes.NewReader(raw))
		if err != nil {
			return SanitisedPhoto{}, ErrUnsupportedPhoto
		}
		var buf bytes.Buffer
		if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 90}); err != nil {
			return SanitisedPhoto{}, fmt.Errorf("encode jpeg: %w", err)
		}
		return SanitisedPhoto{Data: buf.Bytes(), ContentType: "image/jpeg"}, nil
	case "image/png":
		img, err := png.Decode(bytes.NewReader(raw))
		if err != nil {
			return SanitisedPhoto{}, ErrUnsupportedPhoto
		}
		return encodePNG(img)
	case "image/webp":
		img, err := webp.Decode(bytes.NewReader(raw))
		if err != nil {
			return SanitisedPhoto{}, ErrUnsupportedPhoto
		}
		return encodePNG(img)
	default:
		return SanitisedPhoto{}, ErrUnsupportedPhoto
	}
}

func encodePNG(img image.Image) (SanitisedPhoto, error) {
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return SanitisedPhoto{}, fmt.Errorf("encode png: %w", err)
	}
	return SanitisedPhoto{Data: buf.Bytes(), ContentType: "image/png"}, nil
}
