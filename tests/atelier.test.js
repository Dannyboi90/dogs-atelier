import assert from "node:assert/strict";
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

test("the collection has 54 independent combinations and eight artwork files", async () => {
  assert.equal(countCombinations(manifest), 54);
  const artworkFiles = [
    manifest.base,
    ...manifest.categories.flatMap((category) =>
      category.items.map((item) => item.file).filter(Boolean),
    ),
  ];
  assert.equal(new Set(artworkFiles).size, 8);

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
});

test("the browser tab icon is a local asset", async () => {
  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="favicon\.svg">/);
  assert.ok((await readFile(new URL("favicon.svg", root), "utf8")).includes("<svg"));
});

test("small-screen focus releases the sticky portrait while controls are focused", () => {
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*?\.atelier:focus-within \.portrait-panel\s*\{[^}]*position: relative/);
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
