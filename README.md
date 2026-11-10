# Dog's Couture Atelier

A standalone, static styling experience for Dog, an illustrated cat. Choose from 54 combinations of eyeshadow, finishing touch, drape, and jewels, or start from one of three complete looks.

The portrait and accessories are AI-created artwork. The styling is digital fiction; no cosmetics or costumes are applied to Dog. The page has no accounts, uploads, analytics, backend, or live AI generation.

## Run locally

No dependency installation or build step is required. With Node.js 20 or newer, run the checks:

```sh
npm test
```

To preview the site, serve this directory over HTTP:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Artwork

The eight aligned WebP layers are losslessly encoded at their original 1024 by 1536 dimensions. Their URLs, alignment transforms, eye-protection masks, category choices, and presets are listed in `atelier-manifest.json`.
