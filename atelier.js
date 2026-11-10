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
  const effects = document.getElementById("effects-layer");
  const motionToggle = document.getElementById("motion");
  const motionNote = document.getElementById("motion-note");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const failedAssets = new Set();
  const pendingActions = new Set();
  let state = createInitialState(manifest);
  let perfumeId = manifest.perfumes[0].id;
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

  function cancelEffects() {
    for (const action of pendingActions) {
      clearTimeout(action);
    }
    pendingActions.clear();
    effects.replaceChildren();
    document.querySelectorAll("#composition .arrival").forEach((group) => {
      group.setAttribute("class", "arrival");
    });
  }

  function schedule(action, delay) {
    const timer = setTimeout(() => {
      pendingActions.delete(timer);
      action();
    }, delay);
    pendingActions.add(timer);
  }

  function motionEnabled() {
    return motionToggle.checked && !reducedMotion.matches;
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
          const wrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
          const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
          const rules = { ...manifest.rendering[category.id], ...selected };
          wrapper.setAttribute("class", "arrival");
          wrapper.setAttribute("data-arrival", category.id);
          image.setAttribute("href", selected.file);
          image.setAttribute("width", String(manifest.canvas.width));
          image.setAttribute("height", String(manifest.canvas.height));

          if (rules.translateY !== undefined) {
            image.setAttribute("transform", `translate(0 ${rules.translateY})`);
          }
          if (rules.opacity !== undefined) {
            image.setAttribute("opacity", String(rules.opacity));
          }
          if (rules.filter) {
            image.style.filter = rules.filter;
          } else if (rules.hue !== undefined) {
            image.style.filter = `hue-rotate(${rules.hue}deg)`;
          }
          image.addEventListener("error", () => {
            failedAssets.add(selected.file);
            wrapper.remove();
            updateAssetError();
          }, { once: true });
          wrapper.append(image);
          group.append(wrapper);
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

  function addBrush() {
    if (!motionEnabled()) {
      return;
    }
    const brush = document.createElementNS("http://www.w3.org/2000/svg", "g");
    brush.setAttribute("class", "fx-brush");
    const handle = document.createElementNS("http://www.w3.org/2000/svg", "path");
    handle.setAttribute("d", "M280 420l70-85 12 10-70 85z");
    handle.setAttribute("fill", "#c9a262");
    const bristles = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    bristles.setAttribute("cx", "281");
    bristles.setAttribute("cy", "423");
    bristles.setAttribute("rx", "24");
    bristles.setAttribute("ry", "12");
    bristles.setAttribute("fill", "#e4bdd5");
    bristles.setAttribute("transform", "rotate(-35 281 423)");
    brush.append(handle, bristles);
    effects.append(brush);
    schedule(() => brush.remove(), 750);
  }

  function addSparkle() {
    if (!motionEnabled()) {
      status.textContent = "Sparkle is paused while motion is off.";
      return;
    }
    const points = [
      [455, 820], [482, 785], [515, 805], [550, 780], [580, 830],
      [470, 875], [530, 865], [555, 910], [500, 930], [445, 900],
    ];
    points.forEach(([x, y], index) => {
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const size = 5 + (index % 4) * 3;
      const star = document.createElementNS("http://www.w3.org/2000/svg", "path");
      group.setAttribute("transform", `translate(${x} ${y})`);
      star.setAttribute(
        "d",
        `M0 ${-size} L${size * 0.25} ${-size * 0.25} L${size} 0 L${size * 0.25} ${size * 0.25} L0 ${size} L${-size * 0.25} ${size * 0.25} L${-size} 0 L${-size * 0.25} ${-size * 0.25} Z`,
      );
      star.setAttribute("class", "fx-star");
      star.setAttribute("fill", index % 2 ? "#fff1d1" : "#f0ca7b");
      star.style.animationDelay = `${index * 25}ms`;
      group.append(star);
      effects.append(group);
    });
    schedule(() => effects.replaceChildren(), 2000);
    status.textContent = "A little sparkle around the jewels.";
  }

  function arrive(categoryId) {
    if (!motionEnabled()) {
      return;
    }
    const group = document.querySelector(`#${categoryId}-layer [data-arrival]`);
    if (!group) {
      return;
    }
    const animationClass = {
      eyes: "paint-on",
      finish: "finish-on",
      shawl: "drape-on",
      jewelry: "jewel-on",
    }[categoryId];
    if (animationClass) {
      group.setAttribute("class", `arrival ${animationClass}`);
    }
    if (categoryId === "eyes") {
      addBrush();
    }
  }

  function spritz() {
    cancelEffects();
    const scent = manifest.perfumes.find((item) => item.id === perfumeId);
    if (!motionEnabled()) {
      status.textContent = `${scent.description} Motion is off.`;
      return;
    }
    for (let index = 0; index < 22; index += 1) {
      const x = 780 + (index * 29 % 160);
      const y = 960 + (index * 47 % 300);
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const mist = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      group.setAttribute("transform", `translate(${x} ${y})`);
      mist.setAttribute("r", String(12 + index % 5 * 9));
      mist.setAttribute("fill", scent.color);
      mist.setAttribute("class", "fx-mist");
      mist.setAttribute("filter", "url(#mist-soft)");
      mist.style.animationDelay = `${index * 18}ms`;
      group.append(mist);
      effects.append(group);
    }
    schedule(() => effects.replaceChildren(), 2200);
    status.textContent = `${scent.description} Perfume flourish playing.`;
  }

  function replay() {
    cancelEffects();
    if (!motionEnabled()) {
      status.textContent = "Your complete look is shown. Motion is off.";
      return;
    }
    const activeCategories = manifest.categories.filter((category) => {
      const selected = category.items.find((item) => item.id === state.choices[category.id]);
      return selected?.file && !failedAssets.has(selected.file);
    });
    if (!activeCategories.length) {
      status.textContent = "Choose a styling piece first, then replay her entrance.";
      return;
    }
    activeCategories.forEach((category, index) => {
      schedule(() => arrive(category.id), index * 350);
    });
    schedule(spritz, activeCategories.length * 350 + 1800);
    status.textContent = "Replaying the styling, then a perfume flourish.";
  }

  function showBaseError() {
    if (baseFailed) {
      return;
    }
    cancelEffects();
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
      cancelEffects();
      state = selectChoice(state, manifest, button.dataset.category, button.dataset.item);
      render(true);
      arrive(button.dataset.category);
    });
  });
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      cancelEffects();
      state = applyPreset(state, manifest, button.dataset.preset);
      render(true);
      replay();
    });
  });
  document.querySelectorAll("[data-perfume]").forEach((button) => {
    button.addEventListener("click", () => {
      cancelEffects();
      perfumeId = button.dataset.perfume;
      document.querySelectorAll("[data-perfume]").forEach((option) => {
        option.setAttribute("aria-pressed", String(option.dataset.perfume === perfumeId));
      });
      const scent = manifest.perfumes.find((item) => item.id === perfumeId);
      document.getElementById("scent-note").textContent = scent.description;
      status.textContent = scent.description;
    });
  });
  document.getElementById("surprise").addEventListener("click", () => {
    cancelEffects();
    const choices = { ...state.choices };
    for (const category of manifest.categories) {
      const options = category.items.filter((item) => item.file);
      choices[category.id] = options[Math.floor(Math.random() * options.length)].id;
    }
    state = { choices, presetId: null };
    render(true);
    replay();
  });
  document.getElementById("replay").addEventListener("click", replay);
  document.getElementById("sparkle").addEventListener("click", () => {
    cancelEffects();
    addSparkle();
  });
  document.getElementById("spritz").addEventListener("click", spritz);
  document.getElementById("reset").addEventListener("click", () => {
    cancelEffects();
    state = resetState(manifest);
    perfumeId = manifest.perfumes[0].id;
    document.querySelectorAll("[data-perfume]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.perfume === perfumeId));
    });
    document.getElementById("scent-note").textContent = manifest.perfumes[0].description;
    render(true);
  });
  retryButton.addEventListener("click", retryBaseImage);
  base.addEventListener("error", showBaseError);
  base.addEventListener("load", () => {
    baseFailed = false;
    baseError.hidden = true;
    interactive.hidden = false;
  });
  motionToggle.addEventListener("change", () => {
    cancelEffects();
    motionNote.textContent = motionToggle.checked
      ? "Brief flourishes, only when you ask."
      : "Motion is off. The final look appears immediately.";
  });
  function updateMotionPreference() {
    cancelEffects();
    motionToggle.disabled = reducedMotion.matches;
    if (reducedMotion.matches) {
      motionToggle.checked = false;
      motionNote.textContent = "Reduced motion is on. Every finished look still works.";
    } else {
      motionNote.textContent = motionToggle.checked
        ? "Brief flourishes, only when you ask."
        : "Motion is off. The final look appears immediately.";
    }
  }
  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", updateMotionPreference);
  } else {
    reducedMotion.addListener(updateMotionPreference);
  }

  interactive.hidden = false;
  updateMotionPreference();
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
