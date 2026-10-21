# Sample images for development

Development-only wardrobe images for the early vertical slices (capture, tagging, outfit generation). No real people or personal data.

## Contents

| Folder | Source | Licence | Count |
| --- | --- | --- | --- |
| `fashion-1k/` | [Humanbased-AI/Fashion-1K](https://huggingface.co/datasets/Humanbased-AI/Fashion-1K) (Hugging Face) | OpenRAIL (see below) | 30 of 1,000 outfit collages |
| `items/` | Cut from `fashion-1k/` by a segmentation script kept outside the repo (white-background removal, transparent PNG) | Same as source (OpenRAIL) | 136 individual items |
| `mannequin/mannequin-base.png` | Rendered by script, not a photograph | Project-owned, no third-party licence | 1 base figure |

`items/` files are named `<source>-<n>.png`, so `0001-05.png` is item 5 from `fashion-1k/0001.jpg`. Items are on transparent backgrounds at source resolution, and they include jewellery, bags, shoes, sunglasses and watches. Beauty items (perfume, lipstick, lip prints) and letter-only logos were removed. Some items still show brand logos from the source collage.

## Mannequin notes

- The base is a simple rendered figure on a plinth with a floor shadow, for layering outfits.
- A search for a CC0 full-length mannequin photo on a plain background found nothing usable. Wikimedia Commons results were unrelated, and Pexels and Pixabay pages could not be scraped for downloads. If a licensed photo is found later, replace the file and keep the same name.
- The shape is basic, so do not use it for fit or body-shape evaluation.

## Fashion-1K notes

- Human-free flat-lay and ghost-mannequin photos, about 1124 x 1124 px JPEG.
- Licence is tagged `openrail`, which is a use-restricted responsible-AI licence, not CC0 or CC BY. Read the full terms at [choosealicense.com/licenses/openrail](https://choosealicense.com/licenses/openrail/) before any use beyond internal development.
- The dataset card does not say whether the images are synthetic or photographed, or who the original sources are. Treat them as unverified provenance.
- Do not ship these images in product assets or the golden evaluation set without a licence check and a decision from the product owner (see `docs/requirements.md` open decisions on IP).

## Rules

- Do not add images with identifiable people, faces or visible logos.
- Do not replace this folder's contents with real user photos.
