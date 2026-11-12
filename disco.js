const audio = document.getElementById("disco-audio");
const effectsToggle = document.getElementById("disco-effects");
const intensity = document.getElementById("disco-intensity");
const stopButton = document.getElementById("disco-stop");
const status = document.getElementById("disco-status");
const effectsNote = document.getElementById("disco-effects-note");
const stage = document.querySelector(".portrait");
const visuals = document.getElementById("disco-visuals");
const canvas = document.getElementById("disco-confetti");

if (audio && effectsToggle && intensity && stopButton && status && stage && visuals && canvas) {
  const trackUrl = audio.getAttribute("src");
  const context = canvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const eventController = new AbortController();
  const colors = ["#ee89c4", "#c6b4ff", "#e9ca94", "#92a8ff"];
  let particles = [];
  let frame = 0;
  let lastFrameTime = 0;
  let nextGlitterTime = 0;
  let lastAccentSection = -1;
  let entered = false;
  let buffering = false;
  let stopPending = false;
  let preparingTrack = false;
  let trackReady = false;
  let preparationController;
  let trackObjectUrl;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;

  audio.volume = 0.35;

  function clearCanvas() {
    if (context) {
      context.clearRect(0, 0, width, height);
    }
  }

  function resizeStage() {
    const bounds = stage.getBoundingClientRect();
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = bounds.width;
    height = bounds.height;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    if (context) {
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }
    particles = [];
    clearCanvas();
  }

  function motionAllowed() {
    return effectsToggle.checked && !reducedMotion.matches;
  }

  function showActive() {
    return !audio.paused && !audio.ended && !audio.seeking && !buffering &&
      audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA &&
      motionAllowed() && !document.hidden;
  }

  function cancelFrame() {
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    lastFrameTime = 0;
    nextGlitterTime = 0;
  }

  function draw() {
    if (!context) {
      return;
    }
    clearCanvas();
    for (const particle of particles) {
      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.angle);
      context.globalAlpha = particle.opacity;
      context.fillStyle = particle.color;
      if (particle.star) {
        context.beginPath();
        for (let point = 0; point < 8; point += 1) {
          const radius = point % 2 ? particle.size * 0.3 : particle.size;
          const angle = point * Math.PI / 4;
          context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        context.closePath();
        context.fill();
      } else {
        context.fillRect(-particle.size / 2, -particle.size, particle.size, particle.size * 2);
      }
      context.restore();
    }
  }

  function burst(count) {
    const limit = window.innerWidth < 600 ? 30 : 65;
    const remaining = limit - particles.length;
    for (let index = 0; index < Math.min(count, remaining); index += 1) {
      particles.push({
        x: Math.random() * width,
        y: -8 - Math.random() * Math.min(height * 0.5, 120),
        speed: 28 + Math.random() * 42,
        drift: Math.random() * 18 - 9,
        size: 2 + Math.random() * 3.5,
        angle: Math.random() * Math.PI * 2,
        opacity: 0.45 + Math.random() * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        star: Math.random() < 0.24,
      });
    }
  }

  function tick(now) {
    frame = 0;
    if (!showActive()) {
      reconcile();
      return;
    }

    const elapsed = lastFrameTime ? Math.min((now - lastFrameTime) / 1000, 0.05) : 0;
    lastFrameTime = now;
    const section = Math.floor(audio.currentTime / 45);
    if (section !== lastAccentSection) {
      lastAccentSection = section;
      if (section > 0) {
        burst(intensity.value === "party" ? 9 : 4);
      }
    }
    if (now >= nextGlitterTime) {
      burst(intensity.value === "party" ? 3 : 1);
      nextGlitterTime = now + 1100;
    }

    particles = particles.filter((particle) => particle.y < height + 12);
    for (const particle of particles) {
      particle.y += particle.speed * elapsed;
      particle.x += particle.drift * elapsed;
      particle.angle += elapsed * 0.55;
    }
    draw();
    frame = requestAnimationFrame(tick);
  }

  function reconcile() {
    const active = showActive();
    stage.classList.toggle("disco-entered", entered && motionAllowed());
    stage.classList.toggle("disco-running", active);
    stage.classList.toggle("disco-paused", entered && motionAllowed() && !active);
    if (active && !frame) {
      lastFrameTime = 0;
      nextGlitterTime = 0;
      frame = requestAnimationFrame(tick);
    } else if (!active) {
      cancelFrame();
    }
    if (!motionAllowed()) {
      particles = [];
      clearCanvas();
    }
  }

  function resetShow() {
    entered = false;
    buffering = false;
    lastAccentSection = -1;
    particles = [];
    clearCanvas();
    reconcile();
  }

  function updateMotionPreference() {
    if (reducedMotion.matches) {
      effectsToggle.checked = false;
      effectsToggle.disabled = true;
      effectsNote.textContent =
        "Reduced motion is preferred, so visual effects are disabled. Music remains available.";
    } else {
      effectsToggle.disabled = false;
      effectsNote.textContent =
        "Visual effects are optional and off by default. Music plays independently.";
    }
    reconcile();
  }

  async function prepareTrack(targetTime, resumePlayback) {
    if (trackReady || preparingTrack || !trackUrl) {
      return;
    }

    preparingTrack = true;
    const controller = new AbortController();
    preparationController = controller;
    audio.pause();
    status.textContent = "Loading the complete track so playback and seeking work smoothly.";

    let nextObjectUrl;
    try {
      const response = await fetch(trackUrl, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Track request failed with status ${response.status}.`);
      }
      const trackBlob = await response.blob();
      if (controller.signal.aborted) {
        return;
      }

      nextObjectUrl = URL.createObjectURL(trackBlob);
      await new Promise((resolve, reject) => {
        const cleanup = () => {
          audio.removeEventListener("loadedmetadata", onLoaded);
          audio.removeEventListener("error", onError);
          controller.signal.removeEventListener("abort", onAbort);
        };
        const onLoaded = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error("The browser could not load the complete track."));
        };
        const onAbort = () => {
          cleanup();
          reject(new DOMException("Track preparation was cancelled.", "AbortError"));
        };

        audio.addEventListener("loadedmetadata", onLoaded, { once: true });
        audio.addEventListener("error", onError, { once: true });
        controller.signal.addEventListener("abort", onAbort, { once: true });
        audio.src = nextObjectUrl;
        audio.load();
        if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
          onLoaded();
        }
      });

      if (controller.signal.aborted) {
        return;
      }
      if (trackObjectUrl) {
        URL.revokeObjectURL(trackObjectUrl);
      }
      trackObjectUrl = nextObjectUrl;
      nextObjectUrl = undefined;
      trackReady = true;
      preparingTrack = false;
      preparationController = undefined;
      audio.currentTime = Math.min(Math.max(targetTime, 0), audio.duration);

      if (resumePlayback) {
        try {
          await audio.play();
        } catch (error) {
          status.textContent = "The track is ready. Press play to start.";
          console.error("Disco Diva playback could not start.", error);
        }
      } else {
        status.textContent = "The track is ready. Press play when you’re ready.";
      }
    } catch (error) {
      if (nextObjectUrl) {
        URL.revokeObjectURL(nextObjectUrl);
      }
      preparingTrack = false;
      preparationController = undefined;
      if (controller.signal.aborted || error.name === "AbortError") {
        return;
      }
      resetShow();
      status.textContent = "The track could not be prepared. Check your connection and try again.";
      console.error("Disco Diva track preparation failed.", error);
    }
  }

  audio.addEventListener("play", () => {
    if (preparingTrack) {
      audio.pause();
      return;
    }
    if (!trackReady) {
      void prepareTrack(audio.currentTime, true);
    }
  }, { signal: eventController.signal });

  audio.addEventListener("playing", () => {
    stopPending = false;
    buffering = false;
    if (!entered) {
      entered = true;
      lastAccentSection = Math.floor(audio.currentTime / 45);
      if (motionAllowed()) {
        burst(22);
      }
    }
    status.textContent = "The main event is playing.";
    reconcile();
  }, { signal: eventController.signal });

  audio.addEventListener("pause", () => {
    buffering = false;
    if (!audio.ended && !audio.error && !stopPending && !preparingTrack) {
      status.textContent = "Paused. Resume whenever you’re ready.";
    }
    reconcile();
    stopPending = false;
  }, { signal: eventController.signal });

  audio.addEventListener("waiting", () => {
    buffering = true;
    reconcile();
  }, { signal: eventController.signal });

  audio.addEventListener("stalled", () => {
    buffering = true;
    reconcile();
  }, { signal: eventController.signal });

  audio.addEventListener("canplay", () => {
    buffering = false;
    reconcile();
  }, { signal: eventController.signal });

  audio.addEventListener("ended", () => {
    resetShow();
    status.textContent = "The song has ended. Play again whenever you’re ready.";
  }, { signal: eventController.signal });

  audio.addEventListener("error", () => {
    if (preparingTrack) {
      return;
    }
    audio.pause();
    resetShow();
    status.textContent = "The song could not be loaded. Check your connection and try again.";
  }, { signal: eventController.signal });

  audio.addEventListener("seeking", () => {
    if (!trackReady) {
      void prepareTrack(audio.currentTime, !audio.paused);
      return;
    }
    particles = [];
    clearCanvas();
    lastAccentSection = Math.floor(audio.currentTime / 45);
    reconcile();
  }, { signal: eventController.signal });

  audio.addEventListener("seeked", () => {
    buffering = false;
    reconcile();
  }, { signal: eventController.signal });

  document.addEventListener("visibilitychange", reconcile, { signal: eventController.signal });

  effectsToggle.addEventListener("change", () => {
    if (!effectsToggle.checked) {
      particles = [];
      clearCanvas();
    }
    reconcile();
  }, { signal: eventController.signal });

  stopButton.addEventListener("click", () => {
    stopPending = true;
    preparationController?.abort();
    preparationController = undefined;
    preparingTrack = false;
    audio.pause();
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = 0;
    }
    resetShow();
    status.textContent = "Show stopped.";
  }, { signal: eventController.signal });

  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", updateMotionPreference, {
      signal: eventController.signal,
    });
  } else {
    reducedMotion.addListener(updateMotionPreference);
    eventController.signal.addEventListener("abort", () => {
      reducedMotion.removeListener(updateMotionPreference);
    }, { once: true });
  }

  let resizeObserver;
  if (typeof ResizeObserver === "function") {
    resizeObserver = new ResizeObserver(resizeStage);
    resizeObserver.observe(stage);
  } else {
    window.addEventListener("resize", resizeStage, { signal: eventController.signal });
  }
  resizeStage();
  updateMotionPreference();

  window.addEventListener("pagehide", () => {
    preparationController?.abort();
    audio.pause();
    resetShow();
    if (trackObjectUrl) {
      URL.revokeObjectURL(trackObjectUrl);
    }
    resizeObserver?.disconnect();
    eventController.abort();
  }, { once: true, signal: eventController.signal });
}
