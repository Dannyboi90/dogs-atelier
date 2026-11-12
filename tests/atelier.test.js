import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applyPreset,
  countCombinations,
  createInitialState,
  getLookSummary,
  resetState,
  selectChoice,
} from "../atelier.js";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("atelier-manifest.json", root), "utf8"));
const html = await readFile(new URL("index.html", root), "utf8");
const css = await readFile(new URL("atelier.css", root), "utf8");
const discoCss = await readFile(new URL("disco.css", root), "utf8");
const discoJs = await readFile(new URL("disco.js", root), "utf8");

test("the collection has 336 independent combinations and all artwork files", async () => {
  assert.equal(countCombinations(manifest), 336);
  const artworkFiles = [
    manifest.base,
    ...manifest.categories.flatMap((category) =>
      category.items.map((item) => item.file).filter(Boolean),
    ),
  ];
  assert.equal(new Set(artworkFiles).size, 17);

  for (const path of artworkFiles) {
    const image = await readFile(new URL(path, root));
    assert.ok(image.length > 0, `${path} should exist`);
  }
});

test("every combination can be selected without changing another category", () => {
  for (const eyes of manifest.categories[0].items) {
    for (const finish of manifest.categories[1].items) {
      for (const shawl of manifest.categories[2].items) {
        for (const jewelry of manifest.categories[3].items) {
          let state = createInitialState(manifest);
          state = selectChoice(state, manifest, "eyes", eyes.id);
          state = selectChoice(state, manifest, "finish", finish.id);
          state = selectChoice(state, manifest, "shawl", shawl.id);
          state = selectChoice(state, manifest, "jewelry", jewelry.id);
          assert.deepEqual(state.choices, {
            eyes: eyes.id,
            finish: finish.id,
            shawl: shawl.id,
            jewelry: jewelry.id,
          });
          assert.equal(state.presetId, null);
        }
      }
    }
  }
});

test("each preset is complete and a category selection clears its preset", () => {
  assert.equal(manifest.presets.length, 6);
  for (const preset of manifest.presets) {
    const state = applyPreset(createInitialState(manifest), manifest, preset.id);
    assert.deepEqual(state.choices, preset.choices);
    assert.equal(state.presetId, preset.id);

    const updated = selectChoice(state, manifest, "finish", "rose");
    assert.equal(updated.presetId, null);
    assert.equal(updated.choices.eyes, preset.choices.eyes);
    assert.equal(updated.choices.shawl, preset.choices.shawl);
    assert.equal(updated.choices.jewelry, preset.choices.jewelry);
  }
});

test("makeup colorways use dedicated, swatch-matched artwork", () => {
  const eyes = manifest.categories.find((category) => category.id === "eyes");
  const disco = eyes.items.find((item) => item.id === "disco");
  const gold = eyes.items.find((item) => item.id === "gold");
  const electricRose = eyes.items.find((item) => item.id === "pink");
  const copper = eyes.items.find((item) => item.id === "copper");
  const silver = eyes.items.find((item) => item.id === "ice");

  assert.equal(disco.file, "images/atelier/eyeshadow-disco.webp");
  assert.equal(disco.translateY, -125);
  assert.equal(gold.file, "images/atelier/eyeshadow-gold.webp");
  assert.equal(gold.translateY, -45);
  assert.equal(electricRose.file, "images/atelier/eyeshadow-pink.webp");
  assert.equal(electricRose.color, "#db64b6");
  assert.equal(copper.file, "images/atelier/eyeshadow-copper.webp");
  assert.equal(copper.color, "#c28a54");
  assert.equal(silver.file, "images/atelier/eyeshadow-ice.webp");
  assert.equal(silver.color, "#c1c8d5");
  assert.ok([electricRose, copper, silver].every((item) => !item.hue && !item.filter));
});

test("velvet colorways keep fabric texture in dedicated, swatch-matched artwork", () => {
  const shawl = manifest.categories.find((category) => category.id === "shawl");
  const recolors = shawl.items.filter((item) => ["rose", "ruby", "amber", "silver"].includes(item.id));

  assert.equal(recolors.length, 4);
  assert.deepEqual(recolors.map((item) => item.file), [
    "images/atelier/shawl-fuchsia.webp",
    "images/atelier/shawl-ruby.webp",
    "images/atelier/shawl-amber.webp",
    "images/atelier/shawl-silver.webp",
  ]);
  assert.ok(recolors.every((item) => item.color && !item.filter));
});

test("option labels and swatches match the manifest", () => {
  const options = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
    .map(([, attributes, content]) => ({
      category: attributes.match(/\bdata-category="([^"]+)"/)?.[1],
      item: attributes.match(/\bdata-item="([^"]+)"/)?.[1],
      name: content.match(/<span>([^<]*)<\/span>/)?.[1]?.replaceAll("&amp;", "&"),
      color: content.match(/--chip:\s*([^";]+)/)?.[1],
    }))
    .filter((option) => option.category);

  assert.equal(options.length, manifest.categories.reduce((total, category) => total + category.items.length, 0));

  for (const category of manifest.categories) {
    for (const item of category.items) {
      const option = options.find((entry) => entry.category === category.id && entry.item === item.id);
      assert.ok(option, `Missing ${category.id}/${item.id} control`);
      assert.equal(option.name, item.name, `${category.id}/${item.id} label`);
      assert.equal(option.color, item.color ?? "transparent", `${category.id}/${item.id} swatch`);
    }
  }
});

test("imaginary perfumes are independent from styling combinations", () => {
  assert.equal(manifest.perfumes.length, 3);
  assert.deepEqual(manifest.perfumes.map((perfume) => perfume.id), ["rose", "moon", "gold"]);
  assert.equal(countCombinations(manifest), 336);
});

test("reset returns to a plain portrait and invalid choices do not mutate state", () => {
  const styled = applyPreset(createInitialState(manifest), manifest, "sapphire");
  const reset = resetState(manifest);
  assert.deepEqual(reset.choices, { eyes: "none", finish: "none", shawl: "none", jewelry: "none" });
  assert.equal(reset.presetId, null);
  assert.equal(getLookSummary(reset, manifest), "Plain portrait selected.");
  assert.equal(selectChoice(styled, manifest, "unknown", "blue"), styled);
  assert.equal(applyPreset(styled, manifest, "unknown"), styled);
});

test("the no-JavaScript page keeps the plain portrait and hides controls", () => {
  assert.match(html, /<main id="main" tabindex="-1">/);
  assert.match(html, /<image id="base" href="images\/atelier\/dog-base\.webp"/);
  assert.match(html, /<div id="interactive" hidden>/);
  assert.match(html, /<noscript>/);
  assert.match(html, /Digital styling fiction\. No cosmetics or costumes applied to Dog\./);
  assert.match(html, /336 imaginative combinations/);
  assert.match(html, /<g id="effects-layer" aria-hidden="true" pointer-events="none">/);
});

test("the browser tab icon is a local asset", async () => {
  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="favicon\.svg">/);
  assert.ok((await readFile(new URL("favicon.svg", root), "utf8")).includes("<svg"));
});

test("small-screen focus releases the sticky portrait while controls are focused", () => {
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*?\.atelier:focus-within \.portrait-panel\s*\{[^}]*position: relative/);
});

test("short, opt-in effects honor reduced motion", () => {
  assert.match(html, /id="motion" type="checkbox" checked/);
  assert.match(html, /id="sparkle"/);
  assert.match(html, /id="spritz"/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@keyframes paint-on/);
  assert.match(css, /@keyframes drape-on/);
  assert.match(css, /@keyframes jewel-on/);
});

test("the manifest preserves original canvas dimensions and rendering alignment", () => {
  assert.deepEqual(manifest.canvas, { width: 1024, height: 1536 });
  assert.deepEqual(manifest.eyeProtection, [
    { cx: 410, cy: 485, rx: 58, ry: 48 },
    { cx: 620, cy: 485, rx: 58, ry: 48 },
  ]);
  assert.deepEqual(manifest.rendering.eyes, {
    mask: "protect-eyes",
    opacity: 0.9,
    translateY: -25,
  });
  assert.deepEqual(manifest.rendering.finish, {
    mask: "protect-eyes",
    translateY: -110,
    opacity: 0.3,
  });
  assert.equal(manifest.rendering.jewelry.translateY, -140);
  assert.ok(manifest.categories.flatMap((category) => category.items).every(
    (item) => item.file === null || item.file.endsWith(".webp"),
  ));
});

test("the Disco Diva player uses the selected self-hosted song and supplied transcript", async () => {
  const audio = await readFile(new URL("assets/disco/her-name-is-dog.mp3", root));
  const transcript = await readFile(new URL("assets/disco/lyrics.txt", root), "utf8");

  assert.equal(
    createHash("sha256").update(audio).digest("hex"),
    "2246c0d30e0c01399e56af4ff04c80cf570734c0135b0e31bd0e45b9f740b415",
  );
  assert.match(html, /<audio[\s\S]*?controls[\s\S]*?preload="metadata"[\s\S]*?src="assets\/disco\/her-name-is-dog\.mp3"/);
  assert.doesNotMatch(html, /<audio[^>]*\bautoplay\b/);
  assert.equal([...html.matchAll(/<audio\b/g)].length, 1);
  assert.match(html, /href="assets\/disco\/lyrics\.txt">Read the lyrics and spoken passages<\/a>/);
  assert.match(transcript, /^\[Spoken intro, low and glamorous\]/);
  assert.match(transcript, /\[Final musical hit\]\s*$/);
});

test("Disco Diva visuals stay decorative, bounded, and motion-aware", async () => {
  const mirrorBall = await readFile(new URL("assets/disco/mirror-ball.webp", root));

  assert.ok(mirrorBall.length > 0 && mirrorBall.length < 200_000);
  assert.match(html, /<div class="disco-visuals" id="disco-visuals" aria-hidden="true">/);
  assert.match(html, /id="disco-effects" type="checkbox" aria-describedby="disco-effects-note"/);
  assert.doesNotMatch(html, /id="disco-effects"[^>]*checked/);
  assert.match(html, /id="disco-intensity"/);
  assert.match(html, /id="disco-stop"/);
  assert.match(discoCss, /mix-blend-mode:\s*screen/);
  assert.match(discoCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(discoJs, /addEventListener\("playing"/);
  assert.match(discoJs, /addEventListener\("waiting"/);
  assert.match(discoJs, /addEventListener\("seeking"/);
  assert.match(discoJs, /addEventListener\("ended"/);
  assert.match(discoJs, /addEventListener\("error"/);
  assert.match(discoJs, /addEventListener\("visibilitychange"/);
  assert.match(discoJs, /window\.innerWidth < 600 \? 30 : 65/);
  assert.match(discoJs, /ResizeObserver/);
  assert.match(discoJs, /eventController\.abort\(\)/);
  assert.doesNotMatch(discoJs, /setInterval|setTimeout/);
});
