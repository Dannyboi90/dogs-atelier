# Shared site chrome

The header, footer, font and colors used by every part of catnamed.dog:

- `catnamed.dog` (this is the original copy, in `public/site-chrome/`)
- `studio.catnamed.dog`, the Atelier (copy in `dogs-atelier/site-chrome/`)
- `room.catnamed.dog`, Dog's Room (copy in `dogs-room/site-chrome/`)

The three sites live in separate repositories, so each keeps its own copy of
this folder. **Keep the copies identical.** To change the header or footer,
edit the original here, then copy the whole folder into the other two
repositories in the same round of pull requests.

## Files

| File | What it is |
|---|---|
| `site-chrome.css` | Styles for the skip link, header and footer, plus the shared colors and the Inter font. Every name starts with `cnd-` so it never clashes with a page's own styles. |
| `inter-latin-wght-normal.woff2` | Inter variable font, Latin characters, from Fontsource 5.3.0. Served from the site itself; no font service is contacted. |
| `OFL.txt` | Inter's license (SIL Open Font License 1.1). Keep it next to the font. |
| `snippet.html` | The header and footer markup to paste into a page. |

## Using it on a page

1. Link the stylesheet in the page's `<head>`, before the page's own styles:
   `<link rel="stylesheet" href="site-chrome/site-chrome.css">`
2. Paste the skip link and header from `snippet.html` as the first things in
   `<body>`, and the footer as the last thing before the scripts.
3. Point the skip link at the page's main content (`id` on `<main>`).
4. Add `aria-current="page"` to the link for the site you are on, and remove
   it from the others.

## Navigation

| Label | Address |
|---|---|
| About | `https://catnamed.dog/#about` |
| Meet Dog | `https://catnamed.dog/dog/` |
| Atelier | `https://studio.catnamed.dog/` |
| Dog's Room (button style) | `https://room.catnamed.dog/` |
