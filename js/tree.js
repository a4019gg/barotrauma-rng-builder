// js/tree.js — v0.9.111 — Tree View работает идеально

const TREE_VERSION = "v0.9.111";
window.TREE_VERSION = TREE_VERSION;

let isTreeView = false;

const svg = d3.select("#tree-svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .style("display", "block")
  .style("background", "var(--bg)");

const g = svg.append("g");

const zoom = d3.zoom()
  .scaleExtent([0.1, 5])
  .on("zoom", event => g.attr("transform", event.transform));

svg.call(zoom);

function toggleView() {
  isTreeView = !isTreeView;

  const tree = document.getElementById('tree-container');
  const classic = document.getElementById('classic-view');

  // Полное скрытие/показ
  tree.style.display = isTreeView ? 'block' : 'none';
  classic.style.display = isTreeView ? 'none' : 'block';

  // Z-index
  tree.style.zIndex = isTreeView ? 10 : 5;
  classic.style.zIndex = isTreeView ? 5 : 10;

  document.getElementById('view-btn').textContent = isTreeView ? 'Classic' : 'Tree View';

  if (isTreeView) renderTree();
}

function renderTree() {
  g.selectAll("*").remove();

  const rootData = { name: "Root Event", children: [] };

  function build(node, parent) {
    if (node.classList.contains('spawn')) {
      const item = node.querySelector('.item-field')?.value.trim() || "unknown";
      parent.children.push({ name: `Spawn: ${item}` });
    } else if (node.classList.contains('rng')) {
      const chance = parseFloat(node.querySelector('.chance')?.value) || 0.5;
      const rngNode = { name: `RNG ${(chance * 100).toFixed(1)}%`, children: [] };

      const s = node.querySelector(`#c-${node.dataset.id}-s`);
      const f = node.querySelector(`#c-${node.dataset.id}-f`);

      if (s) s.querySelectorAll(':scope > .node').forEach(n => build(n, rngNode));
      if (f) f.querySelectorAll(':scope > .node').forEach(n => build(n, rngNode));

      if (rngNode.children.length) parent.children.push(rngNode);
    }
  }

  document.querySelectorAll('#root-children > .node').forEach(n => build(n, rootData));

  const width = window.innerWidth - 260;
  const height = window.innerHeight - 200;

  const tree = d3.tree().size([height, width - 200]);
  const root = d3.hierarchy(rootData);
  tree(root);

  const link = d3.linkHorizontal()
    .x(d => d.y)
    .y(d => d.x);

  g.selectAll(".link")
    .data(root.links())
    .enter()
    .append("path")
    .attr("class", "link")
    .attr("fill", "none")
    .attr("stroke", "var(--text)")
    .attr("stroke-opacity", 0.5)
    .attr("stroke-width", 2)
    .attr("d", link);

  const node = g.selectAll(".node")
    .data(root.descendants())
    .enter()
    .append("g")
    .attr("transform", d => `translate(${d.y},${d.x})`);

  node.append("circle")
    .attr("r", d => d.children ? 26 : 20)
    .attr("fill", d => d.children ? "#bb86fc" : "#03dac6")
    .attr("stroke", "var(--text)")
    .attr("stroke-width", 2);

  node.append("text")
    .attr("dy", 4)
    .attr("x", d => d.children ? -35 : 35)
    .style("text-anchor", d => d.children ? "end" : "start")
    .style("font", "16px Consolas")
    .style("fill", "var(--text)")
    .style("font-weight", "bold")
    .text(d => d.data.name);

  const bounds = g.node().getBBox();
  const scale = 0.9 * Math.min(width / bounds.width, height / bounds.height);
  const tx = width / 2 - scale * (bounds.x + bounds.width / 2) + 120;
  const ty = height / 2 - scale * (bounds.y + bounds.height / 2);

  svg.transition().duration(500)
    .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
}

window.addEventListener('resize', () => {
  if (isTreeView) renderTree();
});

window.toggleView = toggleView;
window.renderTree = renderTree;
