// js/tree.js — РАБОЧИЙ НА ВЕСЬ ЭКРАН v0.8.1

let isTreeView = false;
const svg = d3.select("#tree-svg")
  .attr("preserveAspectRatio", "xMidYMid meet")
  .attr("viewBox", "0 0 1000 1000"); // теперь масштабируется

const g = svg.append("g");
const zoom = d3.zoom()
  .scaleExtent([0.1, 5])
  .on("zoom", e => g.attr("transform", e.transform));
svg.call(zoom);

function toggleView() {
  isTreeView = !isTreeView;
  const tree = document.getElementById('tree-container');
  const classic = document.getElementById('classic-view');
  tree.classList.toggle('hidden', !isTreeView);
  classic.classList.toggle('hidden', isTreeView);
  document.getElementById('view-btn').textContent = isTreeView ? 'Classic' : 'Tree View';
  if (isTreeView) renderTree();
}

function renderTree() {
  g.selectAll("*").remove();

  const rootData = { name: "Root Event", children: [] };

  function build(node, parent) {
    if (node.classList.contains('spawn')) {
      const item = node.querySelector('.item-field').value.trim() || "unknown";
      parent.children.push({ name: `Spawn: ${item}` });
    } else if (node.classList.contains('rng')) {
      const chance = parseFloat(node.querySelector('.chance').value) || 0.5;
      const rngNode = { name: `RNG ${(chance * 100).toFixed(1)}%`, children: [] };
      const successCont = node.querySelector(`#c-${node.dataset.id}-s`);
      const failureCont = node.querySelector(`#c-${node.dataset.id}-f`);
      successCont && successCont.querySelectorAll(':scope > .node').forEach(n => build(n, rngNode));
      failureCont && failureCont.querySelectorAll(':scope > .node').forEach(n => build(n, rngNode));
      if (rngNode.children.length > 0) parent.children.push(rngNode);
    }
  }

  document.querySelectorAll('#root-children > .node').forEach(n => build(n, rootData));

  const width = window.innerWidth;
  const height = window.innerHeight;

  const treeLayout = d3.tree().size([height - 200, width - 400]);
  const root = d3.hierarchy(rootData);
  treeLayout(root);

  g.selectAll(".link")
    .data(root.links())
    .enter().append("path")
    .attr("class", "link")
    .attr("d", d3.linkHorizontal().x(d => d.y).y(d => d.x));

  const nodes = g.selectAll(".node")
    .data(root.descendants())
    .enter().append("g")
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

  // Центрирование
  const bounds = g.node().getBBox();
  const scale = Math.min((width - 200) / bounds.width, (height - 200) / bounds.height) * 0.8;
  const tx = width / 2 - (bounds.x + bounds.width / 2) * scale;
  const ty = height / 2 - (bounds.y + bounds.height / 2) * scale;

  svg.transition().duration(600).call(
    zoom.transform,
    d3.zoomIdentity.translate(tx, ty).scale(scale)
  );
}

window.toggleView = toggleView;
window.renderTree = renderTree;

window.addEventListener('resize', () => {
  if (isTreeView) renderTree();
});
