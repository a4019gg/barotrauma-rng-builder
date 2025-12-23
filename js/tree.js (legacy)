// js/tree.js — v0.9.403 — TREE VIEW НА D3.JS (ФИКС viewBox)

window.TREE_VERSION = "v0.9.403";

class TreeView {
  constructor() {
    this.svg = d3.select("#tree-svg");
    this.width = 800;
    this.height = 600;
    this.root = null;
    this.i = 0;
    this.duration = 750;
    this.tree = d3.tree();
    this.diagonal = d3.linkHorizontal();

    this.init();
  }

  init() {
    this.updateDimensions();
    window.addEventListener('resize', () => this.updateDimensions());

    const btn = document.getElementById('view-btn');
    if (btn) {
      btn.addEventListener('click', () => this.toggle());
    }
  }

  updateDimensions() {
    const container = document.getElementById('tree-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      // Контейнер ещё не видим — отложим
      requestAnimationFrame(() => this.updateDimensions());
      return;
    }

    this.width = rect.width - 40;
    this.height = rect.height - 40;

    // Минимальные размеры, чтобы избежать negative viewBox
    this.width = Math.max(this.width, 800);
    this.height = Math.max(this.height, 600);

    this.svg.attr("viewBox", [0, 0, this.width, this.height]);
    this.tree.size([this.height, this.width - 200]);

    if (this.root) this.update(this.root);
  }

  toggle() {
    const container = document.getElementById('tree-container');
    const classic = document.getElementById('classic-view');
    const btn = document.getElementById('view-btn');

    if (!container || !classic || !btn) return;

    if (container.style.display === 'block') {
      container.style.display = 'none';
      classic.style.display = 'block';
      btn.textContent = loc('treeView');
    } else {
      container.style.display = 'block';
      classic.style.display = 'none';
      btn.textContent = loc('classicView');
      this.render(); // Рендерим при открытии
    }
  }

  render() {
    const model = window.editorState.events[window.editorState.currentEventIndex].model;
    if (model.length === 0) {
      this.svg.selectAll("*").remove();
      return;
    }

    const rootData = {
      name: loc('rootLabel'),
      children: model
    };

    this.root = d3.hierarchy(rootData, d => {
      if (d.type === 'rng' && d.children) {
        return [
          { name: loc('successLabel'), children: d.children.success || [] },
          { name: loc('failureLabel'), children: d.children.failure || [] }
        ].filter(branch => branch.children.length > 0);
      }
      return [];
    });

    this.root.x0 = this.height / 2;
    this.root.y0 = 0;

    this.root.descendants().forEach((d, i) => {
      d.id = i;
      d._children = d.children;
      if (d.depth && d.data.type !== 'rng') d.children = null;
    });

    this.update(this.root);
  }

  update(source) {
    const nodes = this.root.descendants();
    const links = this.root.links();

    nodes.forEach(d => d.y = d.depth * 180);

    const node = this.svg.selectAll('g.node')
      .data(nodes, d => d.id || (d.id = ++this.i));

    const nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr('transform', () => `translate(${source.y0},${source.x0})`)
      .on('click', (event, d) => this.click(d));

    nodeEnter.append('circle')
      .attr('r', 1e-6)
      .style('fill', d => d._children ? '#007acc' : '#fff')
      .style('stroke', '#007acc')
      .style('stroke-width', 2);

    nodeEnter.append('text')
      .attr('dy', '.35em')
      .attr('x', d => d.children || d._children ? -13 : 13)
      .attr('text-anchor', d => d.children || d._children ? 'end' : 'start')
      .text(d => this.nodeText(d))
      .style('fill-opacity', 1e-6);

    const nodeUpdate = nodeEnter.merge(node);

    nodeUpdate.transition()
      .duration(this.duration)
      .attr('transform', d => `translate(${d.y},${d.x})`);

    nodeUpdate.select('circle')
      .attr('r', 8)
      .style('fill', d => d._children ? '#007acc' : '#fff')
      .attr('cursor', 'pointer');

    nodeUpdate.select('text')
      .style('fill-opacity', 1);

    const nodeExit = node.exit().transition()
      .duration(this.duration)
      .attr('transform', () => `translate(${source.y},${source.x})`)
      .remove();

    nodeExit.select('circle')
      .attr('r', 1e-6);

    nodeExit.select('text')
      .style('fill-opacity', 1e-6);

    const link = this.svg.selectAll('path.link')
      .data(links, d => d.target.id);

    const linkEnter = link.enter().insert('path', 'g')
      .attr('class', 'link')
      .attr('d', () => {
        const o = { x: source.x0, y: source.y0 };
        return this.diagonal({ source: o, target: o });
      });

    linkEnter.merge(link).transition()
      .duration(this.duration)
      .attr('d', d => this.diagonal(d))
      .style('fill', 'none')
      .style('stroke', '#555')
      .style('stroke-width', 2);

    link.exit().transition()
      .duration(this.duration)
      .attr('d', () => {
        const o = { x: source.x, y: source.y };
        return this.diagonal({ source: o, target: o });
      })
      .remove();

    nodes.forEach(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  nodeText(d) {
    if (d.depth === 0) return loc('rootLabel');
    if (d.data.name) return d.data.name;
    if (d.data.type === 'rng') return loc('rngAction');
    if (d.data.type === 'spawn') return loc('spawnItem') + ': ' + (d.data.params?.item || '');
    if (d.data.type === 'creature') return loc('spawnCreature') + ': ' + (d.data.params?.creature || '');
    if (d.data.type === 'affliction') return loc('applyAffliction') + ': ' + (d.data.params?.affliction || '');
    return 'Unknown';
  }

  click(d) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else {
      d.children = d._children;
      d._children = null;
    }
    this.update(d);
  }

  diagonal(d) {
    return d3.linkHorizontal()
      .x(d => d.y)
      .y(d => d.x)(d);
  }
}

// Глобальный экземпляр
const treeView = new TreeView();
window.treeView = treeView;

// Рендер при изменении модели (временная связь)
window.updateAll = () => {
  if (document.getElementById('tree-container').style.display === 'block') {
    treeView.render();
  }
};
