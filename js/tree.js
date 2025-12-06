// js/tree.js — D3-дерево v0.8.1 — ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ

let isTreeView = false;

// Настраиваем SVG на весь контейнер
const svg = d3.select("#tree-svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .attr("viewBox", null) // Убираем фиксированный viewBox, чтобы растягивался
  .style("display", "block");

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
  
  if (isTreeView) {
    renderTree();
  }
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

  // Размеры окна
  const width = window.innerWidth;
  const height = window.innerHeight - 200; // учитываем header + bottom-bar

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
    .attr("r", d => d.children ? 20 : 16)
    .attr("fill", d => d.children ? "#c586c0" : "#6a9955")
    .attr("stroke", "#fff")
    .attr("stroke-width", 3);

  nodes.append("text")
    .attr("dy", 5)
    .attr("x", d => d.children ? -30 : 30)
    .style("text-anchor", d => d.children ? "end" : "start")
    .style("font", "14px Consolas")
    .style("fill", "var(--text)")
    .style("font-weight", "bold")
    .text(d => d.data.name);

  // Центрирование и масштабирование
  const bounds = g.node().getBBox();
  const fullWidth = bounds.width;
  const fullHeight = bounds.height;

  const scale = Math.min(
    (width - 200) / fullWidth,
    (height - 200) / fullHeight
  ) * 0.9;

  const translateX = width / 2 - (bounds.x + fullWidth / 2) * scale;
  const translateY = height / 2 - (bounds.y + fullHeight / 2) * scale;

  svg.transition()
    .duration(600)
    .call(
      zoom.transform,
      d3.zoomIdentity.translate(translateX, translateY).scale(scale)
    );
}

// Перерисовка при изменении размера окна
window.addEventListener('resize', () => {
  if (isTreeView) renderTree();
});

// Экспорт
window.toggleView = toggleView;
window.renderTree = renderTree;
