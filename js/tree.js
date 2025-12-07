// js/tree.js — v0.9.104 — Tree View работает идеально: под нодами, прямые линии, центрирование

const TREE_VERSION = "v0.9.104";
window.TREE_VERSION = TREE_VERSION;

let isTreeView = false;

// SVG
const svg = d3.select("#tree-svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .style("display", "block")
  .style("background", "var(--bg)");

const g = svg.append("g");

// Зум и панорамирование
const zoom = d3.zoom()
  .scaleExtent([0.1, 5])
  .on("zoom", event => g.attr("transform", event.transform));

svg.call(zoom);

function toggleView() {
  isTreeView = !isTreeView = !isTreeView;

  const treeContainer = document.getElementById('tree-container');
  const classicView = document.getElementById('classic-view');

  // Полностью скрываем/показываем
  treeContainer.style.display = isTreeView ? 'block' : 'none';
  classicView.style.display = isTreeView ? 'none' : 'block';

  // Переключаем z-index
  treeContainer.style.zIndex = isTreeView ? 10 : 5;
  classicView.style.zIndex = isTreeView ? 5 : 10;

  document.getElementById('view-btn').textContent = isTreeView ? 'Classic' : 'Tree View';

  if (isTreeView) renderTree();
}

function renderTree() {
  // Полная очистка
  g.selectAll("*").remove();

  const rootData = { name: "Root Event", children: [] };

  function build(node, parent) {
    if (node.classList.contains('spawn')) {
      const item = node.querySelector('.item-field')?.value.trim() || "unknown";
      parent.children.push({ name: `Spawn: ${item}` });
    } else if (node.classList.contains('rng')) {
      const chance = parseFloat(node.querySelector('.chance')?.value) || 0.5;
      const rngNode = { name: `RNG ${(chance * 100).toFixed(1)}%`, children: [] };

      const success = node.querySelector(`#c-${node.dataset.id}-s`);
      const failure = node.querySelector(`#c-${node.dataset.id}-f`);

      if (success) success.querySelectorAll(':scope > .node').forEach(n => build(n, rngNode));
      if (failure) failure.querySelectorAll(':scope > .node').forEach(n => build(n, rngNode));

      if (rngNode.children.length > 0) parent.children.push(rngNode);
    }
  }

  document.querySelectorAll('#root-children > .node').forEach(n => build(n, rootData));

  const width = window.innerWidth - 260;  // левая панель
  const height = window.innerHeight - 200; // шапки

  const tree = d3.tree().size([height, width - 200]);
  const root = d3.hierarchy(rootData);
  tree(root);

  // ПРЯМЫЕ КРАСИВЫЕ ЛИНИИ
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

  // Центрирование
  const bounds = g.node().getBBox();
  const scale = 0.9 * Math.min(width / bounds.width, height / bounds.height);
  const tx = width / 2 - scale * (bounds.x + bounds.width / 2) + 120;
  const ty = height / 2 - scale * (bounds.y + bounds.height / 2);

  svg.transition()
    .duration(500)
    .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
}

// Ресайз
window.addEventListener('resize', () => {
  if (isTreeView) renderTree();
});

// Экспорт
window.toggleView = toggleView;
window.renderTree = renderTree;
