// js/tree.js — v0.9.200 — ПОДДЕРЖКА CREATURE, AFFLICTION, ИТОГОВЫЕ ШАНСЫ

const TREE_VERSION = "v0.9.200";
window.TREE_VERSION = TREE_VERSION;

let isTreeView = false;

const svg = d3.select("#tree-svg");
const g = svg.append("g");

const zoom = d3.zoom()
  .scaleExtent([0.2, 4])
  .on("zoom", event => g.attr("transform", event.transform));

svg.call(zoom);

function toggleView() {
  isTreeView = !isTreeView;

  document.getElementById('classic-view').style.display = isTreeView ? 'none' : 'block';
  document.getElementById('tree-container').style.display = isTreeView ? 'block' : 'none';

  document.getElementById('view-btn').textContent = isTreeView ? (L.classicView || 'Классический') : (L.treeView || 'Режим древа');

  if (isTreeView) renderTree();
}

// Построение данных для дерева
function buildTreeData(node = document.getElementById('root-children')) {
  const children = [];

  node.querySelectorAll(':scope > .node').forEach(n => {
    let name = '';
    let chance = 1;

    if (n.dataset.type === 'rng') {
      chance = parseFloat(n.querySelector('.chance')?.value) || 0.5;
      name = `${L.rngAction || 'ГСЧ-событие'} ${(chance * 100).toFixed(1)}%`;
      const s = n.querySelector(`#c-${n.dataset.id}-s`);
      const f = n.querySelector(`#c-${n.dataset.id}-f`);
      const sChildren = s ? buildTreeData(s) : [];
      const fChildren = f ? buildTreeData(f) : [];
      children.push({ name, children: [...sChildren, ...fChildren] });
    } else if (n.dataset.type === 'spawn') {
      const item = n.querySelector('.item-field')?.value || 'unknown';
      name = `${L.spawnItem || 'Спавн предмета'}: ${item}`;
      children.push({ name, chance: chance });
    } else if (n.dataset.type === 'creature') {
      const creature = n.querySelector('.creature-field')?.value || 'crawler';
      const count = n.querySelector('.count-field')?.value || '1';
      name = `${L.spawnCreature || 'Спавн существа'}: ${creature} x${count}`;
      children.push({ name, chance: chance });
    } else if (n.dataset.type === 'affliction') {
      const aff = n.querySelector('.aff-field')?.value || 'bleeding';
      const strength = n.querySelector('.strength-field')?.value || '15';
      name = `${L.applyAffliction || 'Применить аффикшен'}: ${aff} (${strength})`;
      children.push({ name, chance: chance });
    }
  });

  return children;
}

function renderTree() {
  g.selectAll("*").remove();

  const rootData = { name: L.rootLabel || "Корневое событие", children: buildTreeData() };

  const width = document.getElementById('editor-area').clientWidth - 40;
  const height = document.getElementById('editor-area').clientHeight - 40;

  const treeLayout = d3.tree().size([height, width - 200]);
  const root = d3.hierarchy(rootData);
  treeLayout(root);

  const link = d3.linkHorizontal()
    .x(d => d.y)
    .y(d => d.x);

  // Связи
  g.selectAll(".link")
    .data(root.links())
    .enter()
    .append("path")
    .attr("class", "link")
    .attr("fill", "none")
    .attr("stroke", "#666")
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 2)
    .attr("d", link);

  // Ноды
  const nodeGroup = g.selectAll(".node")
    .data(root.descendants())
    .enter()
    .append("g")
    .attr("transform", d => `translate(${d.y},${d.x})`);

  nodeGroup.append("circle")
    .attr("r", d => d.children ? 30 : 24)
    .attr("fill", d => d.children ? "#bb86fc" : "#03dac6")
    .attr("stroke", "#ddd")
    .attr("stroke-width", 2);

  nodeGroup.append("text")
    .attr("dy", 5)
    .attr("x", d => d.children ? -40 : 40)
    .style("text-anchor", d => d.children ? "end" : "start")
    .style("font", "16px Consolas")
    .style("fill", "#ddd")
    .style("font-weight", "bold")
    .text(d => d.data.name);

  // Центрирование
  const bounds = g.node().getBBox();
  const scale = 0.9 * Math.min(width / bounds.width, height / bounds.height);
  const tx = width / 2 - scale * (bounds.x + bounds.width / 2) + 100;
  const ty = height / 2 - scale * (bounds.y + bounds.height / 2);

  svg.transition()
    .duration(500)
    .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
}

window.addEventListener('resize', () => {
  if (isTreeView) renderTree();
});

window.toggleView = toggleView;
window.renderTree = renderTree;
