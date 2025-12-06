// tree.js — горизонтальная визуализация дерева

let isTreeView = false;
const svg = d3.select("#tree-svg");
let width = window.innerWidth - 480;
let height = window.innerHeight - 200;

const g = svg.append("g");
const zoom = d3.zoom()
  .scaleExtent([0.1, 4])
  .on("zoom", (e) => g.attr("transform", e.transform));
svg.call(zoom);

function toggleView() {
  isTreeView = !isTreeView;
  document.getElementById('classic-view').classList.toggle('hidden', isTreeView);
  document.getElementById('tree-container').classList.toggle('hidden', !isTreeView);
  document.getElementById('view-btn').textContent = isTreeView ? 'Classic' : 'Tree View';
  if (isTreeView) renderTree();
}

function renderTree() {
  g.selectAll("*").remove();

  const rootData = { name: "Root Event", children: [] };

  function build(node, parent) {
    if (node.classList.contains('spawn')) {
      const item = node.querySelector('.item-field').value || "unknown";
      parent.children.push({ name: `Spawn: ${item}` });
    } else if (node.classList.contains('rng')) {
      const chance = parseFloat(node.querySelector('.chance').value) || 0.5;
      const rngNode = { name: `RNG ${(chance*100).toFixed(1)}%`, children: [] };

      const successCont = node.querySelector(`#c-${node.dataset.id}-s`);
      const failureCont = node.querySelector(`#c-${node.dataset.id}-f`);

      successCont && successCont.querySelectorAll(':scope > .node').forEach(n => build(n, rngNode));
      failureCont && failureCont.querySelectorAll(':scope > .node').forEach(n => build(n, rngNode));

      if (rngNode.children.length > 0) parent.children.push(rngNode);
    }
  }

  document.querySelectorAll('#root-children > .node').forEach(n => build(n, rootData));

  const treeLayout = d3.tree().size([height - 100, width - 200]);
  const root = d3.hierarchy(rootData);
  treeLayout(root);

  // Связи
  g.selectAll(".link")
    .data(root.links())
    .enter().append("path")
    .attr("class", "link")
    .attr("d", d3.linkHorizontal()
      .x(d => d.y)
      .y(d => d.x));

  // Узлы
  const nodes = g.selectAll(".node")
    .data(root.descendants())
    .enter().append("g")
    .attr("transform", d => `translate(${d.y},${d.x})`);

  nodes.append("circle")
    .attr("r", d => d.children ? 18 : 14)
    .attr("fill", d => d.children ? "#c586c0" : "#6a9955")
    .attr("stroke", "#fff")
    .attr("stroke-width", 2);

  nodes.append("text")
    .attr("dy", 4)
    .attr("x", d => d.children ? -25 : 25)
    .style("text-anchor", d => d.children ? "end" : "start")
    .style("font", "12px Consolas")
    .style("fill", "var(--text)")
    .text(d => d.data.name);

  // Центрируем
  const bounds = g.node().getBBox();
  const scale = Math.min((width - 100) / bounds.width, (height - 100) / bounds.height) * 0.9;
  const translate = [
    width / 2 - (bounds.x + bounds.width / 2) * scale,
    height / 2 - (bounds.y + bounds.height / 2) * scale
  ];
  svg.transition().duration(500).call(
    zoom.transform,
    d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
  );
}

window.toggleView = toggleView;
window.renderTree = renderTree;

// Адаптация под ресайз
window.addEventListener('resize', () => {
  width = window.innerWidth - 480;
  height = window.innerHeight - 200;
  if (isTreeView) renderTree();
});
