export function createInitialState(manifest) {
  return {
    choices: Object.fromEntries(manifest.categories.map((category) => [category.id, "none"])),
    presetId: null,
  };
}

export function selectChoice(state, manifest, categoryId, itemId) {
  const category = manifest.categories.find((entry) => entry.id === categoryId);
  if (!category || !category.items.some((item) => item.id === itemId)) {
    return state;
  }

  return {
    choices: { ...state.choices, [categoryId]: itemId },
    presetId: null,
  };
}

export function applyPreset(state, manifest, presetId) {
  const preset = manifest.presets.find((entry) => entry.id === presetId);
  if (!preset) {
    return state;
  }

  return {
    choices: { ...preset.choices },
    presetId,
  };
}

export function resetState(manifest) {
  return createInitialState(manifest);
}

export function countCombinations(manifest) {
  return manifest.categories.reduce((total, category) => total * category.items.length, 1);
}

export function getLookSummary(state, manifest) {
  const preset = manifest.presets.find((entry) => entry.id === state.presetId);
  if (preset) {
    return `${preset.name}: ${preset.caption}`;
  }

  const names = manifest.categories
    .map((category) => category.items.find((item) => item.id === state.choices[category.id]))
    .filter((item) => item && item.file)
    .map((item) => item.name);

  return names.length ? `Your own edition: ${names.join(", ")}.` : "Plain portrait selected.";
}

function initialize(manifest) {
  const interactive = document.getElementById("interactive");
  const status = document.getElementById("status");
  const base = document.getElementById("base");
  const baseError = document.getElementById("base-error");
  const retryButton = document.getElementById("retry-portrait");
  const assetError = document.getElementById("asset-error");
  const configError = document.getElementById("config-error");
  const failedAssets = new Set();
  let state = createInitialState(manifest);
  let baseFailed = false;

  function updateAssetError() {
    const hasMissingChoice = manifest.categories.some((category) => {
      const selected = category.items.find((item) => item.id === state.choices[category.id]);
      return selected?.file && failedAssets.has(selected.file);
    });
    const message = hasMissingChoice
      ? "One styling piece could not load. The other available pieces are still shown."
      : "";

    if (assetError.textContent !== message) {
      assetError.textContent = message;
    }
    assetError.hidden = !message;
  }

  function render(announce = false) {
    const selectedNames = [];

    for (const category of manifest.categories) {
      const selected = category.items.find((item) => item.id === state.choices[category.id]);
      const group = document.getElementById(`${category.id}-layer`);
      group.replaceChildren();

      if (selected?.file) {
        selectedNames.push(selected.name);
        if (!failedAssets.has(selected.file)) {
          const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
          const rules = manifest.rendering[category.id];
          image.setAttribute("href", selected.file);
          image.setAttribute("width", String(manifest.canvas.width));
          image.setAttribute("height", String(manifest.canvas.height));

          if (rules.translateY) {
            image.setAttribute("transform", `translate(0 ${rules.translateY})`);
          }
          if (rules.opacity) {
            image.setAttribute("opacity", String(rules.opacity));
          }
          image.addEventListener("error", () => {
            failedAssets.add(selected.file);
            image.remove();
            updateAssetError();
          }, { once: true });
          group.append(image);
        }
      }
    }

    document.querySelectorAll("[data-category]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(state.choices[button.dataset.category] === button.dataset.item),
      );
    });
    document.querySelectorAll("[data-preset]").forEach((button) => {
      button.setAttribute("aria-pressed", String(state.presetId === button.dataset.preset));
    });

    const preset = manifest.presets.find((entry) => entry.id === state.presetId);
    document.getElementById("look-title").textContent =
      preset?.name || (selectedNames.length ? "Your own edition." : "Simply Dog.");
    document.getElementById("look-caption").textContent =
      preset?.caption || (selectedNames.length
        ? "A look entirely of your choosing."
        : "The muse, before the dressing table.");
    document.getElementById("portrait-title").textContent =
      selectedNames.length ? `Dog, styled with ${selectedNames.join(", ")}.` : "Dog, unadorned";
    updateAssetError();

    if (announce) {
      status.textContent = getLookSummary(state, manifest);
    }
  }

  function showBaseError() {
    if (baseFailed) {
      return;
    }
    baseFailed = true;
    const shouldMoveFocus = interactive.contains(document.activeElement);
    interactive.hidden = true;
    baseError.hidden = false;

    if (shouldMoveFocus) {
      baseError.focus();
    }
  }

  function retryBaseImage() {
    baseFailed = false;
    baseError.hidden = true;
    const retryUrl = new URL(manifest.base, window.location.href);
    retryUrl.searchParams.set("retry", String(Date.now()));
    base.setAttribute("href", retryUrl.href);

    const probe = new Image();
    probe.addEventListener("error", showBaseError, { once: true });
    probe.addEventListener("load", () => {
      baseFailed = false;
      baseError.hidden = true;
      interactive.hidden = false;
    }, { once: true });
    probe.src = retryUrl.href;
  }

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state = selectChoice(state, manifest, button.dataset.category, button.dataset.item);
      render(true);
    });
  });
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      state = applyPreset(state, manifest, button.dataset.preset);
      render(true);
    });
  });
  document.getElementById("reset").addEventListener("click", () => {
    state = resetState(manifest);
    render(true);
  });
  retryButton.addEventListener("click", retryBaseImage);
  base.addEventListener("error", showBaseError);
  base.addEventListener("load", () => {
    baseFailed = false;
    baseError.hidden = true;
    interactive.hidden = false;
  });

  interactive.hidden = false;
  render();

  const baseProbe = new Image();
  baseProbe.addEventListener("error", showBaseError, { once: true });
  baseProbe.src = manifest.base;
  if (baseProbe.complete && baseProbe.naturalWidth === 0) {
    showBaseError();
  }

  configError.hidden = true;
}

if (typeof document !== "undefined") {
  fetch("atelier-manifest.json", { cache: "no-cache" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Atelier manifest request failed: ${response.status}`);
      }
      return response.json();
    })
    .then(initialize)
    .catch((error) => {
      console.error("Atelier initialization failed.", error);
      document.getElementById("config-error").hidden = false;
    });
}
