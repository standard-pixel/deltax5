"use strict";

document.documentElement.classList.add("js");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

const siteHeader = document.querySelector("[data-header]");
if (siteHeader) {
  const updateHeaderSurface = () => {
    siteHeader.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  updateHeaderSurface();
  window.addEventListener("scroll", updateHeaderSurface, { passive: true });
}

// This branded intro runs after Flask has served the page; it cannot cover Render's earlier cold-start screen.
const siteLoader = document.querySelector("[data-site-loader]");
if (siteLoader) {
  let alreadyShown = false;
  try { alreadyShown = sessionStorage.getItem("deltax5-intro-shown") === "1"; } catch (_error) { /* storage is optional */ }
  if (alreadyShown) {
    siteLoader.setAttribute("hidden", "");
  } else {
    const loaderStarted = performance.now();
    let closing = false;
    siteLoader.classList.add("is-active");
    const closeLoader = () => {
      if (closing) return;
      closing = true;
      const minimumTime = reducedMotion ? 160 : 980;
      const remaining = Math.max(0, minimumTime - (performance.now() - loaderStarted));
      window.setTimeout(() => {
        siteLoader.classList.remove("is-active");
        window.setTimeout(() => siteLoader.setAttribute("hidden", ""), 480);
        try { sessionStorage.setItem("deltax5-intro-shown", "1"); } catch (_error) { /* storage is optional */ }
      }, remaining);
    };
    window.addEventListener("load", closeLoader, { once: true });
    window.setTimeout(closeLoader, 3200);
  }
}

const menuButton = document.querySelector("[data-menu-toggle]");
const primaryNav = document.querySelector("[data-primary-nav]");

if (menuButton && primaryNav) {
  const closeMenu = () => {
    menuButton.setAttribute("aria-expanded", "false");
    primaryNav.classList.remove("is-open");
  };

  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    primaryNav.classList.toggle("is-open", !isOpen);
    if (!isOpen) primaryNav.querySelector("a")?.focus({ preventScroll: true });
  });

  primaryNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
      closeMenu();
      menuButton.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (!primaryNav.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
}

const filterGroup = document.querySelector("[data-project-filters]");
const projectCards = [...document.querySelectorAll("[data-project-card]")];

if (filterGroup && projectCards.length) {
  filterGroup.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    const filter = button.dataset.filter;
    filterGroup.querySelectorAll("[data-filter]").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    projectCards.forEach((card) => {
      card.hidden = filter !== "all" && card.dataset.category !== filter;
    });
  });
}

const revealElements = document.querySelectorAll(".reveal, .image-reveal, [data-3d-reveal], [data-reveal-stagger]");
if (reducedMotion || !("IntersectionObserver" in window)) {
  revealElements.forEach((element) => element.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -32px 0px" });
  revealElements.forEach((element) => revealObserver.observe(element));
}

function createTerrain(canvas, visual) {
  const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!context) return null;

  visual.classList.add("has-3d");
  const ambientMotion = !reducedMotion && !coarsePointer;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let frame = 0;
  let lastFrame = 0;
  let ambientTime = 0;
  let inView = true;
  let yaw = -0.48;
  let pitch = 0.94;
  let targetYaw = yaw;
  let targetPitch = pitch;
  const columns = coarsePointer ? 18 : 25;
  const rows = coarsePointer ? 15 : 19;
  const camera = 5.2;

  const surfaceHeight = (x, y) => {
    const peak = Math.exp(-(((x - 0.32) ** 2) * 1.25 + ((y + 0.2) ** 2) * 1.6) / 0.58);
    const ridge = Math.sin(x * 2.15 + y * 0.42) * Math.cos(y * 2.25 - x * 0.3);
    const drift = ambientMotion ? Math.sin(x * 1.55 + y * 0.8 + ambientTime * 0.22) * 0.006 : 0;
    return peak * 0.98 + ridge * 0.24 + drift;
  };

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    pixelRatio = Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.25 : 1.6);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    render();
  }

  function project(x, y, z) {
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const rotatedX = x * cosYaw - y * sinYaw;
    const rotatedY = x * sinYaw + y * cosYaw;
    const screenY = rotatedY * cosPitch - z * sinPitch;
    const depth = rotatedY * sinPitch + z * cosPitch;
    const perspective = camera / Math.max(2.5, camera - depth);
    const scale = Math.min(width * 0.225, height * 0.37);
    return [width * 0.54 + rotatedX * scale * perspective, height * 0.52 + screenY * scale * perspective];
  }

  function render() {
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);
    const points = Array.from({ length: rows }, (_, row) =>
      Array.from({ length: columns }, (_, column) => {
        const x = (column / (columns - 1) - 0.5) * 4.2;
        const y = (row / (rows - 1) - 0.5) * 3.5;
        return project(x, y, surfaceHeight(x, y));
      }),
    );

    const perimeter = [
      ...points[0],
      ...points.slice(1).map((row) => row[columns - 1]),
      ...points[rows - 1].slice(0, -1).reverse(),
      ...points.slice(1, -1).reverse().map((row) => row[0]),
    ];
    context.beginPath();
    perimeter.forEach(([x, y], index) => index === 0 ? context.moveTo(x, y) : context.lineTo(x, y));
    context.closePath();
    const terrainFill = context.createLinearGradient(0, height * 0.28, 0, height * 0.88);
    terrainFill.addColorStop(0, "rgba(0, 123, 167, 0.16)");
    terrainFill.addColorStop(0.55, "rgba(0, 54, 82, 0.065)");
    terrainFill.addColorStop(1, "rgba(4, 6, 10, 0.015)");
    context.fillStyle = terrainFill;
    context.fill();

    const [peakX, peakY] = project(0.32, -0.2, surfaceHeight(0.32, -0.2));
    const peakLight = context.createRadialGradient(peakX, peakY, 1, peakX, peakY, Math.min(width, height) * 0.24);
    peakLight.addColorStop(0, "rgba(255, 45, 149, 0.15)");
    peakLight.addColorStop(1, "rgba(0, 123, 167, 0)");
    context.fillStyle = peakLight;
    context.fillRect(0, 0, width, height);

    for (let row = 0; row < rows; row += 1) {
      const distance = Math.abs(row / (rows - 1) - 0.5) * 2;
      context.beginPath();
      points[row].forEach(([x, y], index) => index === 0 ? context.moveTo(x, y) : context.lineTo(x, y));
      context.lineWidth = row % 4 === 0 ? 1.05 : 0.68;
      const contourAlpha = 0.48 - distance * 0.16;
      context.strokeStyle = row % 7 === 0
        ? `rgba(255, 45, 149, ${contourAlpha.toFixed(2)})`
        : `rgba(52, 201, 255, ${contourAlpha.toFixed(2)})`;
      context.stroke();
    }

    for (let ring = 0; ring < 7; ring += 1) {
      const radius = 0.24 + ring * 0.2;
      context.beginPath();
      for (let step = 0; step <= 96; step += 1) {
        const angle = (step / 96) * Math.PI * 2;
        const x = 0.32 + Math.cos(angle) * radius * 1.18;
        const y = -0.2 + Math.sin(angle) * radius * 0.84;
        const [screenX, screenY] = project(x, y, surfaceHeight(x, y) + 0.012);
        if (step === 0) context.moveTo(screenX, screenY);
        else context.lineTo(screenX, screenY);
      }
      context.closePath();
      context.lineWidth = ring === 0 ? 1.18 : 0.82;
      context.strokeStyle = ring % 2 === 0 ? "rgba(255, 45, 149, 0.52)" : "rgba(52, 201, 255, 0.44)";
      context.stroke();
    }

    for (let column = 0; column < columns; column += 1) {
      context.beginPath();
      for (let row = 0; row < rows; row += 1) {
        const [x, y] = points[row][column];
        if (row === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.lineWidth = column % 5 === 0 ? 0.9 : 0.58;
      context.strokeStyle = column % 5 === 0 ? "rgba(52, 201, 255, 0.38)" : "rgba(0, 123, 167, 0.28)";
      context.stroke();
    }

    context.beginPath();
    context.arc(peakX, peakY, 2.4, 0, Math.PI * 2);
    context.fillStyle = "rgba(235, 249, 255, 0.9)";
    context.fill();
  }

  function animate(timestamp) {
    frame = 0;
    const delta = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.05) : 0;
    lastFrame = timestamp;
    if (ambientMotion) ambientTime += delta;
    const ambientYaw = ambientMotion ? Math.sin(ambientTime * 0.17) * 0.008 : 0;
    const ambientPitch = ambientMotion ? Math.sin(ambientTime * 0.13 + 1.2) * 0.004 : 0;
    yaw += (targetYaw + ambientYaw - yaw) * 0.07;
    pitch += (targetPitch + ambientPitch - pitch) * 0.07;
    render();
    if (ambientMotion && inView && document.visibilityState !== "hidden") {
      frame = window.requestAnimationFrame(animate);
    }
  }

  function requestFrame() {
    if (!frame && inView && document.visibilityState !== "hidden") {
      frame = window.requestAnimationFrame(animate);
    }
  }

  function setPointer(x, y) {
    targetYaw = -0.48 + x * 0.34;
    targetPitch = 0.94 - y * 0.18;
    requestFrame();
  }

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
  } else {
    window.addEventListener("resize", resize, { passive: true });
  }
  if ("IntersectionObserver" in window) {
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) {
        lastFrame = 0;
        requestFrame();
      } else if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
        lastFrame = 0;
      }
    }, { rootMargin: "100px 0px" });
    visibilityObserver.observe(canvas);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
    } else {
      requestFrame();
    }
  });
  resize();
  requestFrame();
  return { setPointer };
}

const topography = document.querySelector("[data-topography]");
if (topography) {
  const visual = topography.querySelector(".hero__visual");
  const glass = topography.querySelector(".hero__glass");
  const canvas = topography.querySelector("[data-topography-canvas]");
  const terrain = canvas && visual ? createTerrain(canvas, visual) : null;

  if (!reducedMotion && !coarsePointer && visual) {
    topography.addEventListener("pointermove", (event) => {
      const bounds = topography.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      topography.style.setProperty("--mx", `${(x * 12).toFixed(1)}px`);
      topography.style.setProperty("--my", `${(y * 12).toFixed(1)}px`);
      visual.style.setProperty("--tilt-x", `${(-y * 2.2).toFixed(2)}deg`);
      visual.style.setProperty("--tilt-y", `${(x * 2.6).toFixed(2)}deg`);
      terrain?.setPointer(x, y);
      if (glass) {
        const glassBounds = glass.getBoundingClientRect();
        const gx = Math.max(0, Math.min(100, ((event.clientX - glassBounds.left) / glassBounds.width) * 100));
        const gy = Math.max(0, Math.min(100, ((event.clientY - glassBounds.top) / glassBounds.height) * 100));
        glass.style.setProperty("--glass-x", `${gx.toFixed(1)}%`);
        glass.style.setProperty("--glass-y", `${gy.toFixed(1)}%`);
        glass.style.setProperty("--glass-rx", `${(-y * 5).toFixed(2)}deg`);
        glass.style.setProperty("--glass-ry", `${(x * 7).toFixed(2)}deg`);
      }
    }, { passive: true });

    topography.addEventListener("pointerleave", () => {
      topography.style.setProperty("--mx", "0px");
      topography.style.setProperty("--my", "0px");
      visual.style.setProperty("--tilt-x", "0deg");
      visual.style.setProperty("--tilt-y", "0deg");
      terrain?.setPointer(0, 0);
      if (glass) {
        glass.style.setProperty("--glass-rx", "0deg");
        glass.style.setProperty("--glass-ry", "0deg");
        glass.style.setProperty("--glass-x", "50%");
        glass.style.setProperty("--glass-y", "50%");
      }
    }, { passive: true });
  }
}

if (!reducedMotion && !coarsePointer) {
  document.querySelectorAll(".magnetic").forEach((element) => {
    let frame = 0;
    const strength = element.classList.contains("magnetic--nav") ? 3.5 : element.classList.contains("button") ? 8 : 5;
    element.addEventListener("pointermove", (event) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const bounds = element.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        element.style.setProperty("--mag-spot-x", `${((x + 0.5) * 100).toFixed(1)}%`);
        element.style.setProperty("--mag-spot-y", `${((y + 0.5) * 100).toFixed(1)}%`);
        element.style.setProperty("--mag-glow", "0.18");
        element.style.transform = `translate3d(${(x * strength * 2).toFixed(1)}px, ${(y * strength * 2).toFixed(1)}px, 0)`;
        frame = 0;
      });
    }, { passive: true });
    element.addEventListener("pointerleave", () => {
      element.style.setProperty("--mag-glow", "0");
      element.style.transform = "translate3d(0, 0, 0)";
    }, { passive: true });
  });

  document.querySelectorAll("[data-tilt]").forEach((element) => {
    let frame = 0;
    const strength = Number(element.dataset.tilt) || 2;
    element.addEventListener("pointermove", (event) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const bounds = element.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        element.style.setProperty("--tilt-x", `${(-y * strength * 2).toFixed(2)}deg`);
        element.style.setProperty("--tilt-y", `${(x * strength * 2).toFixed(2)}deg`);
        element.style.setProperty("--tilt-spot-x", `${((x + 0.5) * 100).toFixed(1)}%`);
        element.style.setProperty("--tilt-spot-y", `${((y + 0.5) * 100).toFixed(1)}%`);
        const depthLayer = element.querySelector(".project-card__media img, .project-card__placeholder, .work-empty__mark");
        if (depthLayer) {
          depthLayer.style.setProperty("--depth-x", `${(x * 10).toFixed(1)}px`);
          depthLayer.style.setProperty("--depth-y", `${(y * 8).toFixed(1)}px`);
        }
        element.classList.add("is-tilted");
        frame = 0;
      });
    }, { passive: true });
    element.addEventListener("pointerleave", () => {
      element.style.setProperty("--tilt-x", "0deg");
      element.style.setProperty("--tilt-y", "0deg");
      const depthLayer = element.querySelector(".project-card__media img, .project-card__placeholder, .work-empty__mark");
      if (depthLayer) {
        depthLayer.style.setProperty("--depth-x", "0px");
        depthLayer.style.setProperty("--depth-y", "0px");
      }
      element.classList.remove("is-tilted");
    }, { passive: true });
  });
}

document.querySelectorAll("[data-video-frame]").forEach((frame) => {
  const button = frame.querySelector(".video-play");
  const id = frame.dataset.videoId;
  if (!button || !/^[A-Za-z0-9_-]{11}$/.test(id || "")) return;
  button.addEventListener("click", () => {
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1`;
    iframe.title = button.getAttribute("aria-label") || "Project video";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allowFullscreen = true;
    frame.replaceChildren(iframe);
  }, { once: true });
});
