(function (scope, factory) {
  const model = factory();
  if (typeof module === "object" && module.exports) module.exports = model;
  else scope.RibbonModel = model;
})(typeof window === "object" ? window : globalThis, () => {
  "use strict";

  const side = 17;
  const duration = 24000;
  const narrowingDuration = 20000;
  const initialTime = 0;
  const round = value => Math.round(value * 1000) / 1000;
  const smooth = value => {
    value = Math.max(0, Math.min(1, value));
    return value * value * (3 - 2 * value);
  };
  const project = (x, y) => ({ x: round(x + .42 * y), y: round(-.23 * x + .70 * y) });
  const atomOpacity = (level, halfWidth) => smooth((halfWidth - level + 3) / 9);
  const edgeOpacity = (group, halfWidth) => smooth(3 - group.neighbors.reduce((sum, level) => sum + atomOpacity(level, halfWidth), 0));
  const nodes = new Map();
  const bonds = new Map();
  const rowHeight = Math.sqrt(3) * side;

  for (let column = -16; column <= 16; column += 1) {
    for (let row = -5; row <= 5; row += 1) {
      const cx = column * side * 1.5;
      const cy = (row + (column % 2 === 0 ? 0 : .5)) * rowHeight;
      const vertices = Array.from({ length: 6 }, (_, index) => {
        const angle = index * Math.PI / 3;
        const x = round(cx + side * Math.cos(angle));
        const y = round(cy + side * Math.sin(angle));
        return { x, y, key: `${x},${y}` };
      });
      vertices.forEach((point, index) => {
        const other = vertices[(index + 1) % 6];
        if (Math.abs(point.y) > 122 || Math.abs(point.x) > 410) return;
        nodes.set(point.key, point);
        if (Math.abs(other.y) <= 122 && Math.abs(other.x) <= 410) bonds.set([point.key, other.key].sort().join("|"), [point, other]);
      });
    }
  }
  nodes.forEach(node => { node.neighbors = []; });
  bonds.forEach(([a, b]) => {
    nodes.get(a.key).neighbors.push(b.key);
    nodes.get(b.key).neighbors.push(a.key);
  });
  nodes.forEach(node => {
    node.profile = {
      level: Math.abs(node.y),
      neighbors: node.neighbors.map(key => Math.abs(nodes.get(key).y)).sort((a, b) => a - b)
    };
  });

  const atomGroups = [];
  const profiles = new Map();
  nodes.forEach(node => {
    const adjacent = node.neighbors.map(key => nodes.get(key).profile);
    const key = JSON.stringify([node.profile, ...adjacent.map(profile => JSON.stringify(profile)).sort()]);
    if (!profiles.has(key)) {
      profiles.set(key, atomGroups.length);
      atomGroups.push({ ...node.profile, adjacent, nodes: [] });
    }
    node.group = profiles.get(key);
    atomGroups[node.group].nodes.push(project(node.x, node.y));
  });
  const bondProfiles = new Map();
  const bondGroups = [];
  bonds.forEach(([a, b]) => {
    const groups = [nodes.get(a.key).group, nodes.get(b.key).group].sort((x, y) => x - y);
    const key = groups.join(",");
    if (!bondProfiles.has(key)) {
      bondProfiles.set(key, bondGroups.length);
      bondGroups.push({ groups, level: Math.max(Math.abs(a.y), Math.abs(b.y)), bonds: [] });
    }
    bondGroups[bondProfiles.get(key)].bonds.push([project(a.x, a.y), project(b.x, b.y)]);
  });

  function frameAt(elapsed) {
    const phase = ((elapsed % duration) + duration) % duration;
    const progress = phase < narrowingDuration ? smooth(phase / narrowingDuration) : 1 - smooth((phase - narrowingDuration) / (duration - narrowingDuration));
    const shift = (elapsed / duration * side * 3) % (side * 3);
    const layers = [0].map(() => {
      const halfWidth = 104 - 54 * progress;
      const atomWeights = atomGroups.map(group => atomOpacity(group.level, halfWidth));
      // The inner connecting row completes each armchair edge between its outer dimers.
      const edges = atomGroups.map(group => Math.max(
        edgeOpacity(group, halfWidth),
        ...group.adjacent.map(neighbor => atomOpacity(neighbor.level, halfWidth) * edgeOpacity(neighbor, halfWidth))
      ));
      return {
        opacity: 1,
        zoom: .90 + .20 * progress,
        shift: project(-shift, 0), halfWidth,
        atoms: atomWeights,
        edgeAtoms: atomWeights.map((alpha, index) => alpha * edges[index]),
        bonds: bondGroups.map(group => atomOpacity(group.level, halfWidth)),
        edgeBonds: bondGroups.map(group => atomOpacity(group.level, halfWidth) * Math.min(...group.groups.map(index => edges[index])))
      };
    });
    const markerProgress = progress;
    const halfWidth = 104 - 54 * markerProgress;
    const top = project(180, -halfWidth), bottom = project(180, halfWidth);
    const tick = width => { const a = project(160, width), b = project(186, width); return `M${a.x} ${a.y}L${b.x} ${b.y}`; };
    const edge = project(-70, -halfWidth + 3);
    const edgeLabel = { x: round(edge.x - 52), y: round(edge.y - 39) };
    return {
      layers,
      marker: {
        zoom: .90 + .20 * markerProgress,
        widthPath: `${tick(-halfWidth)}M${top.x} ${top.y}L${bottom.x} ${bottom.y}${tick(halfWidth)}`,
        edgePath: `M${edgeLabel.x} ${edgeLabel.y + 7}H${round(edge.x - 15)}L${edge.x} ${round(edge.y - 4)}`,
        edgeLabel,
        widthLabel: project(202, -2)
      }
    };
  }

  const transform = zoom => `translate(282 187) scale(${zoom.toFixed(5)})`;
  const circle = (point, radius) => `<circle cx="${point.x}" cy="${point.y}" r="${radius}"/>`;
  function markup(elapsed = initialTime, chinese = false) {
    const frame = frameAt(elapsed);
    const definitions = [];
    atomGroups.forEach((group, index) => {
      definitions.push(`<g id="atoms-${index}" class="lattice-atoms">${group.nodes.map(point => circle(point, 1.9)).join("")}</g>`);
      definitions.push(`<g id="edge-atoms-${index}"><g class="lattice-edge-halo">${group.nodes.map(point => circle(point, 5.1)).join("")}</g><g class="lattice-edge-atoms">${group.nodes.map(point => circle(point, 3.05)).join("")}</g></g>`);
    });
    bondGroups.forEach((group, index) => {
      const d = group.bonds.map(([a, b]) => `M${a.x} ${a.y}L${b.x} ${b.y}`).join("");
      definitions.push(`<path id="bonds-${index}" class="lattice-bonds" d="${d}"/><path id="edge-bonds-${index}" class="lattice-edge-bonds" d="${d}"/>`);
    });
    const masks = {
      length: [[0,0],[5,20],[16,180],[27,255],[73,255],[84,180],[95,20],[100,0]],
      core: [[0,0],[10,0],[21,255],[79,255],[90,0],[100,0]],
      soft: [[0,0],[4,0],[10,255],[21,0],[79,0],[90,255],[96,0],[100,0]],
      far: [[0,255],[4,255],[10,0],[90,0],[96,255],[100,255]]
    };
    Object.entries(masks).forEach(([name, stops]) => {
      definitions.push(`<linearGradient id="lattice-${name}-gradient" gradientUnits="userSpaceOnUse" gradientTransform="matrix(1 -.23 .42 .70 0 0)" x1="-258" y1="0" x2="258" y2="0">${stops.map(([offset,value]) => `<stop offset="${offset}%" stop-color="rgb(${value},${value},${value})"/>`).join("")}</linearGradient>`);
      definitions.push(`<mask id="lattice-${name}" maskUnits="userSpaceOnUse" x="-430" y="-240" width="860" height="480"><rect x="-430" y="-240" width="860" height="480" fill="url(#lattice-${name}-gradient)"/></mask>`);
    });
    for (const [name, sigma] of [["soft",1.1],["far",3.4]]) definitions.push(`<filter id="lattice-blur-${name}" filterUnits="userSpaceOnUse" x="-440" y="-250" width="880" height="500" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${sigma}"/></filter>`);
    frame.layers.forEach((layer, index) => {
      const uses = [];
      ["bonds", "edgeBonds", "atoms", "edgeAtoms"].forEach(kind => {
        const idPrefix = { bonds: "bonds", edgeBonds: "edge-bonds", atoms: "atoms", edgeAtoms: "edge-atoms" }[kind];
        layer[kind].forEach((alpha, group) => uses.push(`<use href="#${idPrefix}-${group}" data-kind="${kind}" opacity="${alpha.toFixed(4)}"/>`));
      });
      definitions.push(`<g id="lattice-net-${index}" transform="translate(${layer.shift.x} ${layer.shift.y})">${uses.join("")}</g>`);
    });
    const layers = frame.layers.map((layer, index) => `<g data-layer="${index}" opacity="${layer.opacity.toFixed(4)}" visibility="${layer.opacity > 0 ? "visible" : "hidden"}" aria-hidden="true"><g data-frame="" transform="${transform(layer.zoom)}"><g mask="url(#lattice-length)">${["far","soft","core"].map(focus => `<use href="#lattice-net-${index}" mask="url(#lattice-${focus})"${focus !== "core" ? ` filter="url(#lattice-blur-${focus})"` : ""}/>`).join("")}</g></g></g>`).join("");
    const marker = frame.marker;
    return `<defs>${definitions.join("")}</defs>${layers}<g id="lattice-dimension" transform="${transform(marker.zoom)}" aria-hidden="true"><path class="lattice-width-underlay" d="${marker.widthPath}"/><path class="lattice-width-line" d="${marker.widthPath}"/><text class="lattice-width-label" x="${marker.widthLabel.x}" y="${marker.widthLabel.y + 9}">W</text><path class="lattice-edge-callout" d="${marker.edgePath}"/><text class="lattice-edge-label" x="${marker.edgeLabel.x}" y="${marker.edgeLabel.y}">${chinese ? "边缘" : "EDGE"}</text></g>`;
  }

  return Object.freeze({ atomGroups, bondGroups, duration, initialTime, frameAt, markup, transform, project });
});
