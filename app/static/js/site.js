"use strict";

document.documentElement.classList.add("js");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

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

const revealElements = document.querySelectorAll(".reveal, .image-reveal, [data-3d-reveal]");
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
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let frame = 0;
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
    return peak * 0.98 + ridge * 0.24;
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
    terrainFill.addColorStop(0, "rgba(196, 139, 75, 0.12)");
    terrainFill.addColorStop(0.55, "rgba(113, 71, 43, 0.055)");
    terrainFill.addColorStop(1, "rgba(9, 11, 13, 0.015)");
    context.fillStyle = terrainFill;
    context.fill();

    const [peakX, peakY] = project(0.32, -0.2, surfaceHeight(0.32, -0.2));
    const peakLight = context.createRadialGradient(peakX, peakY, 1, peakX, peakY, Math.min(width, height) * 0.24);
    peakLight.addColorStop(0, "rgba(236, 197, 132, 0.12)");
    peakLight.addColorStop(1, "rgba(236, 197, 132, 0)");
    context.fillStyle = peakLight;
    context.fillRect(0, 0, width, height);

    for (let row = 0; row < rows; row += 1) {
      const distance = Math.abs(row / (rows - 1) - 0.5) * 2;
      context.beginPath();
      points[row].forEach(([x, y], index) => index === 0 ? context.moveTo(x, y) : context.lineTo(x, y));
      context.lineWidth = row % 4 === 0 ? 1.05 : 0.68;
      context.strokeStyle = `rgba(220, 180, 116, ${0.48 - distance * 0.16})`;
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
      context.strokeStyle = ring % 2 === 0 ? "rgba(236, 197, 132, 0.48)" : "rgba(194, 139, 75, 0.39)";
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
      context.strokeStyle = column % 5 === 0 ? "rgba(231, 198, 145, 0.35)" : "rgba(194, 139, 75, 0.22)";
      context.stroke();
    }

    context.beginPath();
    context.arc(peakX, peakY, 2.4, 0, Math.PI * 2);
    context.fillStyle = "rgba(239, 207, 151, 0.82)";
    context.fill();
  }

  function animate() {
    frame = 0;
    yaw += (targetYaw - yaw) * 0.11;
    pitch += (targetPitch - pitch) * 0.11;
    render();
    if (Math.abs(targetYaw - yaw) + Math.abs(targetPitch - pitch) > 0.002) {
      frame = window.requestAnimationFrame(animate);
    }
  }

  function setPointer(x, y) {
    targetYaw = -0.48 + x * 0.34;
    targetPitch = 0.94 - y * 0.18;
    if (!frame) frame = window.requestAnimationFrame(animate);
  }

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
  } else {
    window.addEventListener("resize", resize, { passive: true });
  }
  resize();
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
    const strength = element.classList.contains("button") ? 8 : element.classList.contains("nav-contact") ? 4 : 5;
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
        element.classList.add("is-tilted");
        frame = 0;
      });
    }, { passive: true });
    element.addEventListener("pointerleave", () => {
      element.style.setProperty("--tilt-x", "0deg");
      element.style.setProperty("--tilt-y", "0deg");
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
