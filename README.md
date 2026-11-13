# Dog's Couture Atelier

A playful digital dressing table for Dog, a very fluffy cat with blue eyes and a certain attitude. Mix eyeshadow, a finishing touch, a silk drape and jewels (336 combinations), or start from one of six complete looks. Then, if the occasion calls for it, start the Disco Diva.

**Play it:** https://studio.catnamed.dog

Part of [catnamed.dog](https://catnamed.dog), alongside [Meet Dog](https://catnamed.dog/dog/) and [Dog's Room](https://room.catnamed.dog).

## Play

- **Choose each detail** at the dressing table: eyeshadow, finishing touch, drape and jewels.
- **Start from a look:** Sapphire evening, Lilac daydream, Absolutely no occasion, Disco Supernova, Golden hour diva or Ice queen.
- **Surprise me** picks a random combination; **Replay the look** plays her entrance again.
- **Disco Diva** is an optional music player with its own play, stop, volume, transcript and visual-effects controls. Nothing plays until you press play.

Every control is a real button or form control, so the keyboard works too.

## It's all imaginary

The portrait and every styling layer are AI-created artwork. The makeup, drapes, jewels and perfume flourishes are digital fiction: no cosmetics, perfume or costumes are ever applied to Dog. There are no accounts, uploads, analytics, backend or live AI generation, and nothing you choose is sent anywhere.

## Run it locally

No install or build step is needed. Serve the folder over HTTP (opening `index.html` directly won't load the styling collection):

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

To run the automated checks, with Node.js 20 or newer:

```sh
npm test
```

## How it was built

Dog's Couture Atelier was built by Daniel with the help of AI tools. Daniel set the direction, supplied the reference material and the song, made the creative decisions and published the site; the AI tools helped with code, artwork and testing.

| Tool | Role in the project |
| --- | --- |
| [GitHub Copilot](https://github.com/features/copilot) | Built the first version of the Atelier and the Disco Diva player |
| [Magnific](https://www.magnific.com) | Generated the mirror-ball artwork |
| [Claude](https://claude.ai) by [Anthropic](https://www.anthropic.com) | Moved the Atelier onto the shared catnamed.dog navigation, prepared it for GitHub Pages and wrote this README |
| [GitHub Pages](https://pages.github.com) | Hosts the live site |

## Code structure

Plain HTML, CSS and JavaScript. No framework, no build step, no runtime dependencies.

| File | What it does |
| --- | --- |
| `index.html` | The page, the dressing table controls and the Disco Diva player |
| `atelier.css` | Layout and styling for the Atelier |
| `atelier.js` | Loads the manifest, layers the artwork and runs the looks |
| `atelier-manifest.json` | Every artwork layer, its alignment, eye protection, color treatment, category and preset |
| `disco.css`, `disco.js` | The Disco Diva player and its effects |
| `tests/atelier.test.js` | Automated checks, run with `npm test` |
| `images/atelier/` | Dog's portrait and the 16 styling layers (WebP, 1024 by 1536) |
| `assets/disco/` | The song, its lyrics and the mirror ball |
| `site-chrome/` | The header, footer, font and colors shared by every catnamed.dog site. Keep it identical to the copy in the catnamed.dog repository. |
| `LICENSE` | MIT License for the code |
| `ASSETS-LICENSE.md` | Rights notice for the artwork, music and lyrics |
| `CNAME` | Tells GitHub Pages to serve the site at studio.catnamed.dog (do not delete) |
| `.nojekyll` | Tells GitHub Pages to publish the files exactly as they are |

### Artwork layers

The seventeen aligned WebP layers are losslessly encoded at their original 1024 by 1536 size. Dedicated colorway layers keep the original fabric and makeup texture without recoloring the portrait.

### Disco Diva

The player uses the supplied *Her Name Is Dog (The Main Event)* MP3 unchanged. The full 6.4 MB track is downloaded only when you press play or seek, then held in the browser so seeking stays reliable on any host. The mirror ball is a 768-pixel compressed copy of the original artwork and uses screen blending. The lyrics and spoken passages are in `assets/disco/lyrics.txt`.

## Hosting and deployment

- The repository and the website are both public.
- GitHub Pages serves the site from the root of the `main` branch at https://studio.catnamed.dog, with HTTPS enforced.
- DNS lives at Cloudflare: a `studio` CNAME record points to `dannyboi90.github.io`, set to DNS only (grey cloud).
- Every push to `main` goes live within a minute or two. There is no separate deploy step, so test locally first.
- Everything in the repository, including its full history, is public. Never commit anything private.

## Making changes

1. Pull first so your copy matches GitHub.
2. For anything bigger than a typo, create a branch, make the change, run `npm test` and check it in the browser.
3. Commit with a message that says what changed, push, and open a pull request.
4. Merge into `main` when it's ready. The site updates automatically.

## License

- **Code:** released under the [MIT License](LICENSE).
- **Artwork, music and lyrics:** © 2026 Daniel Nader, all rights reserved. See [ASSETS-LICENSE.md](ASSETS-LICENSE.md).
- **Inter font:** SIL Open Font License 1.1, see `site-chrome/OFL.txt`.

## Accessibility

- Every control has a name and works with the keyboard.
- With reduced motion turned on, the entrance animations and effects are turned off.
- Music never plays until you start it, and a transcript is available.
- The site follows your device's light or dark appearance.
