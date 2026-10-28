package wardrobe_test

import (
	"bytes"
	"encoding/binary"
	"hash/crc32"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"slaydrip/backend/internal/wardrobe"
)

const gpsMarker = "GPS-SECRET-51.5074"

func TestSanitisePhotoReencodesJPEGWithoutExif(t *testing.T) {
	t.Parallel()
	withExif := insertJPEGExif(t, encodeJPEG(t), []byte("Exif\x00\x00"+gpsMarker))

	got, err := wardrobe.SanitisePhoto(withExif)

	require.NoError(t, err)
	assert.Equal(t, "image/jpeg", got.ContentType)
	assert.NotContains(t, string(got.Data), gpsMarker)
	assert.NotContains(t, string(got.Data), "Exif\x00\x00")
	_, err = jpeg.Decode(bytes.NewReader(got.Data))
	require.NoError(t, err)
}

func TestSanitisePhotoReencodesPNGWithoutTextChunks(t *testing.T) {
	t.Parallel()
	withText := insertPNGText(t, encodePNG(t), "Comment", gpsMarker)

	got, err := wardrobe.SanitisePhoto(withText)

	require.NoError(t, err)
	assert.Equal(t, "image/png", got.ContentType)
	assert.NotContains(t, string(got.Data), gpsMarker)
	_, err = png.Decode(bytes.NewReader(got.Data))
	require.NoError(t, err)
}

func TestSanitisePhotoRejectsNonImagesByContent(t *testing.T) {
	t.Parallel()
	cases := map[string][]byte{
		"text named as a photo": []byte("this is a receipt, not a photo"),
		"pdf header":            []byte("%PDF-1.7\n%\xe2\xe3\xcf\xd3\n"),
		"empty":                 {},
		"truncated jpeg":        encodeJPEG(t)[:40],
	}
	for name, raw := range cases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			_, err := wardrobe.SanitisePhoto(raw)
			require.ErrorIs(t, err, wardrobe.ErrUnsupportedPhoto)
		})
	}
}

func TestSanitisePhotoRejectsOversizedDimensions(t *testing.T) {
	t.Parallel()
	// A small file whose header claims more width than the decoder may allocate.
	var buf bytes.Buffer
	require.NoError(t, png.Encode(&buf, image.NewGray(image.Rect(0, 0, 6001, 1))))

	_, err := wardrobe.SanitisePhoto(buf.Bytes())

	require.ErrorIs(t, err, wardrobe.ErrUnsupportedPhoto)
}

func TestSanitisePhotoRejectsOversizedFile(t *testing.T) {
	t.Parallel()
	raw := make([]byte, wardrobe.MaxPhotoBytes+1)

	_, err := wardrobe.SanitisePhoto(raw)

	require.ErrorIs(t, err, wardrobe.ErrPhotoTooLarge)
}

func encodeJPEG(t *testing.T) []byte {
	t.Helper()
	var buf bytes.Buffer
	require.NoError(t, jpeg.Encode(&buf, solid(), &jpeg.Options{Quality: 80}))
	return buf.Bytes()
}

func encodePNG(t *testing.T) []byte {
	t.Helper()
	var buf bytes.Buffer
	require.NoError(t, png.Encode(&buf, solid()))
	return buf.Bytes()
}

func solid() image.Image {
	img := image.NewRGBA(image.Rect(0, 0, 8, 8))
	for y := range 8 {
		for x := range 8 {
			img.Set(x, y, color.RGBA{R: 200, G: 120, B: 40, A: 255})
		}
	}
	return img
}

// insertJPEGExif puts an APP1 segment straight after the SOI marker.
func insertJPEGExif(t *testing.T, jpegBytes, payload []byte) []byte {
	t.Helper()
	segment := []byte{0xFF, 0xE1, 0, 0}
	binary.BigEndian.PutUint16(segment[2:], uint16(len(payload)+2)) //nolint:gosec // G115: fixture payloads are a few bytes
	out := append([]byte{0xFF, 0xD8}, segment...)
	out = append(out, payload...)
	return append(out, jpegBytes[2:]...)
}

// insertPNGText adds a tEXt chunk after the IHDR chunk.
func insertPNGText(t *testing.T, pngBytes []byte, key, value string) []byte {
	t.Helper()
	const ihdrEnd = 8 + 8 + 13 + 4
	data := append([]byte(key+"\x00"), value...)
	chunk := make([]byte, 8)
	binary.BigEndian.PutUint32(chunk, uint32(len(data))) //nolint:gosec // G115: fixture data is a few bytes
	copy(chunk[4:], "tEXt")
	chunk = append(chunk, data...)
	crc := make([]byte, 4)
	binary.BigEndian.PutUint32(crc, crc32.ChecksumIEEE(append([]byte("tEXt"), data...)))
	chunk = append(chunk, crc...)
	out := append([]byte{}, pngBytes[:ihdrEnd]...)
	out = append(out, chunk...)
	return append(out, pngBytes[ihdrEnd:]...)
}
