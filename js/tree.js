// js/tree.js — v0.9.99 — Tree View с snap, сеткой и полной поддержкой настроек

const TREE_VERSION = "v0.9.99";
window.TREE_VERSION = TREE_VERSION;

let isTreeView = false;
let snapEnabled = localStorage.getItem('snapToGrid') === 'true';

// SVG — 100% размера
const svg = d3.select("#tree-svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .style("display", "block")
  .style("background", "var(--bg)");

const g = svg.append("g");

// Зум и панорамирование
const zoom = d3.zoom()
  .scaleExtent([0.1, 5])
  .on("zoom", (event) => g.attr("transform", event.transform));

svg.call(zoom);

function toggleView() {
  isTreeView = !isTreeView;
  const treeContainer = document.getElementById('tree-container');
  const classicView = document.getElementById('classic-view');
  
  treeContainer.classList.toggle('hidden', !isTreeView);
  classicView.classList.toggle('hidden', isTreeView);
  
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

      const successCont = node.querySelector(`#c-${node.dataset.id}-s`);
      const failureCont = node.querySelector(`#c-${node.dataset.id}-f`);

      if (successCont) successCont.querySelectorAll(':scope > .node').forEach(n => build(n, rngNode));
      if (failureCont) failureCont.querySelectorAll(':scope > .node').forEach(n => build(n, rngNode));

      if (rngNode.children.length > 0) parent.children.push(rngNode);
    }
  }

  document.querySelectorAll('#root-children > .node').forEach(n => build(n, rootData));

  const width = window.innerWidth - 250; // левая панель
  const height = window.innerHeight - 200; // шапки

  const treeLayout = d3.tree().size([height - 100, width - 400]);
  const root = d3.hierarchy(rootData);
  treeLayout(root);

  // Связи
  g.selectAll(".link")
    .data(root.links())
    .enter()
    .append("path")
    .attr("class", "link")
    .attr("d", d3.linkHorizontal()
      .x(d => d.y)
      .y(d => d.x));

  // Узлы
  const nodes = g.selectAll(".node")
    .data(root.descendants())
    .enter()
    .append("g")
    .attr("transform", d => `translate(${d.y},${d.x})`);

  nodes.append("circle")
    .attr("r", d => d.children ? 24 : 20)
    .attr("fill", d => d.children ? "#c586c0" : "#6a9955")
    .attr("stroke", "#fff")
    .attr("stroke-width", 3);

  nodes.append("text")
    .attr("dy", 6)
    .attr("x", d => d.children ? -40 : 40)
    .style("text-anchor", d => d.children ? "end" : "start")
    .style("font", "16px Consolas")
    .style("fill", "var(--text)")
    .style("font-weight", "bold")
    .text(d => d.data.name);

  // Центрирование
  const bounds = g.node().getBBox();
  const scale = Math.min(
    (width - 200) / bounds.width,
    (height - 200) / bounds.height
  ) * 0.9;

  const translateX = width / 2 - (bounds.x + bounds.width / 2) * scale + 120;
  const translateY = height / 2 - (bounds.y + bounds.height / 2) * scale + 50;

  svg.transition()
    .duration(600)
    .call(
      zoom.transform,
      d3.zoomIdentity.translate(translateX, translateY).scale(scale)
    );
}

// Snap to grid — перехватываем drag (заглушка, будет в будущем)
window.toggleSnap = function(enabled) {
  snapEnabled = enabled;
  localStorage.setItem('snapToGrid', enabled);
};

// Ресайз
window.addEventListener('resize', () => {
  if (isTreeView) renderTree();
});

window.toggleView = toggleView;
window.renderTree = renderTree;
