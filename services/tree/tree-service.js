import { t } from '../../ui/localization.js';

export class TreeService {
  constructor({ svgSelector = '#tree-svg', inspectorSelector = '#tree-inspector', onUpdateParam, onRemoveNode, onAddChild }) {
    this.svgSelector = svgSelector;
    this.inspectorSelector = inspectorSelector;
    this.onUpdateParam = onUpdateParam;
    this.onRemoveNode = onRemoveNode;
    this.onAddChild = onAddChild;
    this.svg = null;
    this.g = null;
    this.width = 1200;
    this.height = 720;
    this.selectedNode = null;
  }

  init() {
    if (!window.d3) throw new Error('D3 is not loaded');
    this.svg = window.d3.select(this.svgSelector);
    this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
    this.svg.selectAll('*').remove();
    this.g = this.svg.append('g').attr('transform', 'translate(36,22)');
  }

  render(model) {
    this.model = model;
    if (!this.svg) this.init();

    this.g.selectAll('*').remove();
    if (!model.length) {
      this.renderInspector(null);
      return;
    }

    const root = window.d3.hierarchy({ name: 'Root Event', children: model.map(node => this.toTreeNode(node)) });
    window.d3.tree().size([this.height - 60, this.width - 250])(root);

    this.g
      .selectAll('.tree-link')
      .data(root.links())
      .join('path')
      .attr('class', 'tree-link')
      .attr('d', window.d3.linkHorizontal().x(d => d.y).y(d => d.x));

    const nodes = this.g
      .selectAll('.tree-node')
      .data(root.descendants())
      .join('g')
      .attr('class', d => `tree-node ${this.selectedNode?.id === d.data.id ? 'selected' : ''}`)
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .on('click', (_, d) => {
        if (!d.data.nodeRef) return;
        this.selectedNode = d.data.nodeRef;
        this.render(model);
        this.renderInspector(this.selectedNode);
      });

    nodes.append('circle').attr('r', 8);
    nodes.append('text')
      .attr('x', d => (d.children ? -12 : 12))
      .attr('text-anchor', d => (d.children ? 'end' : 'start'))
      .attr('dy', '0.32em')
      .text(d => d.data.name);

    this.renderInspector(this.selectedNode);
  }

  toTreeNode(node) {
    if (node.type === 'rng') {
      return {
        id: node.id,
        nodeRef: node,
        name: `RNG ${Math.round((node.params.chance ?? 0.5) * 100)}%`,
        children: [
          { name: 'Success', children: node.children.success.map(child => this.toTreeNode(child)) },
          { name: 'Failure', children: node.children.failure.map(child => this.toTreeNode(child)) }
        ].filter(branch => branch.children.length)
      };
    }

    if (node.type === 'spawn') return { id: node.id, nodeRef: node, name: `Item: ${node.params.item || 'unset'}` };
    if (node.type === 'creature') return { id: node.id, nodeRef: node, name: `Creature: ${node.params.creature || 'unset'}` };
    if (node.type === 'affliction') return { id: node.id, nodeRef: node, name: `Affliction: ${node.params.affliction || 'unset'}` };
    return { id: node.id, nodeRef: node, name: node.type };
  }

  renderInspector(node) {
    const inspector = document.querySelector(this.inspectorSelector);
    if (!inspector) return;

    if (!node) {
      inspector.innerHTML = `<h4>${t('treeEditor')}</h4><p>${t('selectTreeNode')}</p>`;
      return;
    }

    const params = Object.entries(node.params)
      .map(([key, value]) => `<label>${key}<input data-tree-param="${key}" value="${value ?? ''}" /></label>`)
      .join('');

    const branchActions = node.type === 'rng'
      ? `<div class="tree-editor-actions">
          <button data-tree-add="success:rng">${t('addSuccess')} RNG</button>
          <button data-tree-add="success:spawn">${t('addSuccess')} Item</button>
          <button data-tree-add="failure:rng">${t('addFailure')} RNG</button>
          <button data-tree-add="failure:spawn">${t('addFailure')} Item</button>
        </div>`
      : '';

    inspector.innerHTML = `
      <h4>${t('treeEditor')}</h4>
      <div class="tree-editor-meta">${t('nodeType')}: <strong>${node.type}</strong> · #${node.id}</div>
      <div class="tree-editor-fields">${params}</div>
      <div class="tree-editor-actions">
        <button data-tree-remove="1" class="danger">${t('removeNode')}</button>
      </div>
      ${branchActions}
    `;

    inspector.querySelectorAll('[data-tree-param]').forEach(input => {
      input.addEventListener('change', event => this.onUpdateParam(node.id, event.target.dataset.treeParam, event.target.value));
    });

    inspector.querySelector('[data-tree-remove]')?.addEventListener('click', () => this.onRemoveNode(node.id));

    inspector.querySelectorAll('[data-tree-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [branch, type] = btn.dataset.treeAdd.split(':');
        this.onAddChild(node.id, branch, type || 'rng');
      });
    });
  }
}
