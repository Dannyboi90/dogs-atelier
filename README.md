# Dog's Couture Atelier

A standalone, static styling experience for Dog, an illustrated cat. Choose from 336 combinations of eyeshadow, finishing touch, drape, and jewels, or start from one of six complete looks.

The portrait and accessories are AI-created artwork. The styling and three optional perfume flourishes are digital fiction; no cosmetics, perfume, or costumes are applied to Dog. Animation is optional, brief, and disabled when the visitor prefers reduced motion. The page has no accounts, uploads, analytics, backend, or live AI generation.

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

## Artwork and styling

The seventeen aligned WebP artwork layers are losslessly encoded at their original 1024 by 1536 dimensions. Their URLs, item-specific alignment transforms, eye-protection masks, color treatments, category choices, and presets are listed in `atelier-manifest.json`. Dedicated colorway layers preserve the original fabric and makeup texture without recoloring the portrait.
