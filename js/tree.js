// js/tree.js — v0.9.300 — РЕНДЕР ИЗ МОДЕЛИ ДАННЫХ, ЦВЕТОВЫЕ ВЕТКИ, DEBOUNCE

const TREE_VERSION = "v0.9.300";
window.TREE_VERSION = TREE_VERSION;

class TreeViewManager {
  constructor() {
    this.isTreeView = false;
    this.svg = d3.select("#tree-svg");
    this.g = this.svg.append("g");

    this.zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .on("zoom", event => this.g.attr("transform", event.transform));

    this.svg.call(this.zoom);

    // Debounce resize
    this.debounceResize = this.debounce(() => this.renderTree(), 150);
    window.addEventListener('resize', this.debounceResize);
  }

  debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  toggleView() {
    this.isTreeView = !this.isTreeView;

    document.getElementById('classic-view').style.display = this.isTreeView ? 'none' : 'block';
    document.getElementById('tree-container').style.display = this.isTreeView ? 'block' : 'none';

    document.getElementById('view-btn').textContent = this.isTreeView 
      ? loc('classicView', 'Классический') 
      : loc('treeView', 'Режим древа');

    if (this.isTreeView) this.renderTree();
  }

  // Построение структуры для D3 из модели
  buildTreeStructure(model) {
    const children = [];

    model.forEach(node => {
      const type = node.type;
      let name = '';

      if (type === 'rng') {
        const chance = node.params.chance ?? 0.5;
        name = `${loc('rngAction', 'ГСЧ-событие')} ${(chance * 100).toFixed(1)}%`;

        const successChildren = node.children?.success ? this.buildTreeStructure(node.children.success) : [];
        const failureChildren = node.children?.failure ? this.buildTreeStructure(node.children.failure) : [];

        if (successChildren.length > 0) {
          children.push({ name: loc('successLabel', 'Успех'), children: successChildren, branch: 'success' });
        }
        if (failureChildren.length > 0) {
          children.push({ name: loc('failureLabel', 'Провал'), children: failureChildren, branch: 'failure' });
        }
      } else if (type === 'spawn') {
        const item = node.params.item || 'unknown';
        name = `${loc('spawnItem', 'Спавн предмета')}: ${item}`;
        children.push({ name, branch: 'leaf' });
      } else if (type === 'creature') {
        const creature = node.params.creature || 'crawler';
        const count = node.params.count ?? 1;
        name = `${loc('spawnCreature', 'Спавн существа')}: ${creature} x${count}`;
        children.push({ name, branch: 'leaf' });
      } else if (type === 'affliction') {
        const aff = node.params.affliction || 'bleeding';
        const strength = node.params.strength ?? 15;
        name = `${loc('applyAffliction', 'Применить аффикшен')}: ${aff} (${strength})`;
        children.push({ name, branch: 'leaf' });
      }
    });

    return children;
  }

  renderTree() {
    if (!this.isTreeView) return;

    this.g.selectAll("*").remove();

    const model = window.editorState.events[window.editorState.currentEventIndex].model;

    const rootData = {
      name: loc('rootLabel', 'Корневое событие'),
      children: this.buildTreeStructure(model)
    };

    const width = document.getElementById('editor-area').clientWidth - 40;
    const height = document.getElementById('editor-area').clientHeight - 40;

    const treeLayout = d3.tree().size([height, width - 200]);
    const root = d3.hierarchy(rootData);
    treeLayout(root);

    const link = d3.linkHorizontal()
      .x(d => d.y)
      .y(d => d.x);

    // Связи с цветом по ветке
    this.g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", d => {
        if (d.target.data.branch === 'success') return '#6a9955'; // зелёный
        if (d.target.data.branch === 'failure') return '#f44747'; // красный
        return '#666';
      })
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2)
      .attr("d", link);

    // Ноды
    const nodeGroup = this.g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.y},${d.x})`);

    nodeGroup.append("circle")
      .attr("r", d => d.children && d.children.length > 0 ? 30 : 24)
      .attr("fill", d => d.children && d.children.length > 0 ? "#bb86fc" : "#03dac6")
      .attr("stroke", "#ddd")
      .attr("stroke-width", 2);

    nodeGroup.append("text")
      .attr("dy", 5)
      .attr("x", d => d.children && d.children.length > 0 ? -40 : 40)
      .style("text-anchor", d => d.children && d.children.length > 0 ? "end" : "start")
      .style("font", "16px Consolas")
      .style("fill", "#ddd")
      .style("font-weight", "bold")
      .text(d => d.data.name);

    // Центрирование
    const bounds = this.g.node().getBBox();
    const scale = 0.9 * Math.min(width / bounds.width, height / bounds.height);
    const tx = width / 2 - scale * (bounds.x + bounds.width / 2) + 100;
    const ty = height / 2 - scale * (bounds.y + bounds.height / 2);

    this.svg.transition()
      .duration(500)
      .call(this.zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  }

  destroy() {
    window.removeEventListener('resize', this.debounceResize);
  }
}

// Глобальный экземпляр
const treeViewManager = new TreeViewManager();

window.toggleView = () => treeViewManager.toggleView();
window.renderTree = () => treeViewManager.renderTree();
