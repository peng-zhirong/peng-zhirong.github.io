(() => {
  "use strict";

  const svg = document.getElementById("lattice-animation");
  const model = window.RibbonModel;
  if (!svg || !model) return;
  const chinese = document.documentElement.lang.startsWith("zh");
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let paused = motionPreference.matches;
  let elapsed = paused ? 20000 : model.initialTime;
  let inView = true;
  let frameRequest = null;
  let previousTime = null;
  let previousPaint = 0;

  svg.insertAdjacentHTML("beforeend", model.markup(elapsed, chinese));
  const layers = [...svg.querySelectorAll("[data-layer]")].map((element, index) => {
    const net = svg.querySelector(`#lattice-net-${index}`);
    return {
      element, net, frame: element.querySelector("[data-frame]"),
      uses: Object.fromEntries(["bonds", "edgeBonds", "atoms", "edgeAtoms"].map(kind => [kind, [...net.querySelectorAll(`[data-kind="${kind}"]`)]]))
    };
  });
  const dimension = svg.querySelector("#lattice-dimension");
  const widthLine = dimension.querySelector(".lattice-width-line");
  const underlay = dimension.querySelector(".lattice-width-underlay");
  const widthLabel = dimension.querySelector(".lattice-width-label");
  const edgeLine = dimension.querySelector(".lattice-edge-callout");
  const edgeLabel = dimension.querySelector(".lattice-edge-label");

  function render() {
    const frame = model.frameAt(elapsed);
    layers.forEach((layer, index) => {
      const state = frame.layers[index];
      layer.element.setAttribute("opacity", state.opacity.toFixed(4));
      layer.element.setAttribute("visibility", state.opacity > 0 ? "visible" : "hidden");
      if (state.opacity === 0) return;
      layer.frame.setAttribute("transform", model.transform(state.zoom));
      layer.net.setAttribute("transform", `translate(${state.shift.x} ${state.shift.y})`);
      Object.entries(layer.uses).forEach(([kind, elements]) => {
        elements.forEach((element, group) => element.setAttribute("opacity", state[kind][group].toFixed(4)));
      });
    });
    const marker = frame.marker;
    dimension.setAttribute("transform", model.transform(marker.zoom));
    widthLine.setAttribute("d", marker.widthPath);
    underlay.setAttribute("d", marker.widthPath);
    widthLabel.setAttribute("x", marker.widthLabel.x);
    widthLabel.setAttribute("y", marker.widthLabel.y + 9);
    edgeLine.setAttribute("d", marker.edgePath);
    edgeLabel.setAttribute("x", marker.edgeLabel.x);
    edgeLabel.setAttribute("y", marker.edgeLabel.y);
  }

  const button = document.getElementById("animation-toggle");
  const updateButton = () => {
    button.querySelector("span").textContent = chinese ? (paused ? "播放" : "暂停") : (paused ? "Play" : "Pause");
    button.setAttribute("aria-label", chinese ? (paused ? "播放宽度动画" : "暂停宽度动画") : (paused ? "Play width animation" : "Pause width animation"));
    button.querySelector("path").setAttribute("d", paused ? "M4 3l8 5-8 5Z" : "M5 3v10M11 3v10");
  };
  const stop = () => {
    if (frameRequest !== null) cancelAnimationFrame(frameRequest);
    frameRequest = null;
    previousTime = null;
  };
  function tick(time) {
    if (previousTime !== null) elapsed += time - previousTime;
    previousTime = time;
    if (time - previousPaint >= 1000 / 30) {
      render();
      previousPaint = time;
    }
    frameRequest = requestAnimationFrame(tick);
  }
  const resume = () => {
    if (paused || document.hidden || !inView || frameRequest !== null) return;
    previousTime = null;
    frameRequest = requestAnimationFrame(tick);
  };
  button.addEventListener("click", () => {
    paused = !paused;
    updateButton();
    if (paused) stop();
    else resume();
  });
  motionPreference.addEventListener("change", event => {
    paused = event.matches;
    updateButton();
    if (paused) stop();
    else resume();
  });
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : resume());
  window.addEventListener("pagehide", stop);
  window.addEventListener("pageshow", resume);
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (inView) resume();
      else stop();
    }, { rootMargin: "60px" });
    observer.observe(svg.closest(".lattice-panel"));
  }
  updateButton();
  svg.removeAttribute("hidden");
  document.getElementById("lattice-fallback").hidden = true;
  button.hidden = false;
  resume();
})();
