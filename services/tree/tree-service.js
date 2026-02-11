import { t } from '../../ui/localization.js';
import { createIcon } from '../../ui/icon-component.js';

const NODE_META = {
  rng: { icon: 'sliders-horizontal', label: 'RNG' },
  spawn: { icon: 'box', label: 'Item' },
  creature: { icon: 'hashtag', label: 'Creature' },
  affliction: { icon: 'alert-triangle', label: 'Affliction' }
};

const ADDABLE_TYPES = ['rng', 'spawn', 'creature', 'affliction'];

function toNumberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export class TreeService {
  constructor({ svgSelector = '#tree-svg', inspectorSelector = '#tree-inspector', onUpdateParam, onRemoveNode, onAddChild }) {
    this.svgSelector = svgSelector;
    this.inspectorSelector = inspectorSelector;
    this.onUpdateParam = onUpdateParam;
    this.onRemoveNode = onRemoveNode;
    this.onAddChild = onAddChild;
    this.svg = null;
    this.g = null;
    this.zoomLayer = null;
    this.zoom = null;
    this.width = 2200;
    this.height = 1500;
    this.selectedNodeId = null;
  }

  init() {
    if (!window.d3) throw new Error('D3 is not loaded');

    this.svg = window.d3.select(this.svgSelector);
    this.svg.selectAll('*').remove();
    this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);

    this.zoomLayer = this.svg.append('g').attr('class', 'tree-zoom-layer');
    this.g = this.zoomLayer.append('g').attr('transform', 'translate(90,80)');

    this.zoom = window.d3.zoom()
      .scaleExtent([0.35, 1.8])
      .on('zoom', event => {
        this.zoomLayer.attr('transform', event.transform);
      });

    this.svg.call(this.zoom);
    this.svg.call(this.zoom.transform, window.d3.zoomIdentity.translate(20, 20).scale(1));

    this.svg.on('dblclick.zoom', null);
  }

  render(model) {
    this.model = model;
    if (!this.svg) this.init();

    this.g.selectAll('*').remove();

    if (!model.length) {
      this.g.append('text')
        .attr('class', 'tree-empty')
        .attr('x', 40)
        .attr('y', 42)
        .text(t('selectTreeNode'));
      this.renderInspector(null);
      return;
    }

    const root = window.d3.hierarchy({
      name: 'Root Event',
      type: 'root',
      children: model.map(node => this.toTreeNode(node))
    });

    window.d3.tree().nodeSize([130, 360])(root);

    this.g
      .selectAll('.tree-link')
      .data(root.links())
      .join('path')
      .attr('class', d => {
        const branch = d.target.data.branchType;
        if (branch === 'success') return 'tree-link link-success';
        if (branch === 'failure') return 'tree-link link-failure';
        return 'tree-link';
      })
      .attr('d', window.d3.linkHorizontal().x(d => d.y).y(d => d.x));

    const nodes = this.g
      .selectAll('.tree-node')
      .data(root.descendants())
      .join('g')
      .attr('class', d => {
        const classes = ['tree-node', `node-${d.data.type || 'label'}`];
        if (d.data.nodeRef && this.selectedNodeId === d.data.id) classes.push('selected');
        return classes.join(' ');
      })
      .attr('transform', d => `translate(${d.y},${d.x})`);

    nodes.each((d, idx, list) => {
      const group = window.d3.select(list[idx]);
      if (d.data.type === 'branch') {
        this.renderBranchTag(group, d);
        return;
      }
      if (d.data.type === 'root') {
        this.renderRootNode(group, d);
        return;
      }
      this.renderEditableNode(group, d);
    });

    this.renderInspector(this.findNodeById(this.selectedNodeId));
  }

  renderRootNode(group, d) {
    const width = 230;
    const height = 52;

    group.append('rect')
      .attr('class', 'tree-card tree-card-root')
      .attr('x', -width / 2)
      .attr('y', -height / 2)
      .attr('rx', 10)
      .attr('ry', 10)
      .attr('width', width)
      .attr('height', height);

    group.append('text')
      .attr('class', 'tree-root-title')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .text(d.data.name);
  }

  renderBranchTag(group, d) {
    const width = 132;
    const height = 36;
    const success = d.data.branchType === 'success';

    group.append('rect')
      .attr('class', `tree-branch-card ${success ? 'branch-success' : 'branch-failure'}`)
      .attr('x', -width / 2)
      .attr('y', -height / 2)
      .attr('rx', 18)
      .attr('ry', 18)
      .attr('width', width)
      .attr('height', height);

    group.append('text')
      .attr('class', 'tree-branch-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .text(success ? 'Success' : 'Failure');
  }

  renderEditableNode(group, d) {
    const node = d.data.nodeRef;
    const width = 320;
    const height = 98;

    group.append('rect')
      .attr('class', 'tree-card')
      .attr('x', -width / 2)
      .attr('y', -height / 2)
      .attr('rx', 12)
      .attr('ry', 12)
      .attr('width', width)
      .attr('height', height)
      .on('click', () => {
        this.selectedNodeId = node.id;
        this.render(this.model);
      });

    const fo = group.append('foreignObject')
      .attr('x', -width / 2 + 8)
      .attr('y', -height / 2 + 8)
      .attr('width', width - 16)
      .attr('height', height - 16);

    const wrapper = document.createElement('div');
    wrapper.className = 'tree-node-fo';
    if (this.selectedNodeId === node.id) wrapper.classList.add('selected');

    const header = document.createElement('div');
    header.className = 'tree-node-head';

    const title = document.createElement('button');
    title.className = 'icon-btn node-title';
    title.type = 'button';
    title.title = `${NODE_META[node.type]?.label || node.type} #${node.id}`;
    title.append(createIcon(NODE_META[node.type]?.icon || 'tag'));
    title.append(` ${NODE_META[node.type]?.label || node.type}`);
    title.addEventListener('click', () => {
      this.selectedNodeId = node.id;
      this.render(this.model);
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'icon-btn remove-btn';
    removeBtn.type = 'button';
    removeBtn.title = t('removeNode');
    removeBtn.append(createIcon('trash'));
    removeBtn.addEventListener('click', event => {
      event.stopPropagation();
      this.onRemoveNode(node.id);
    });

    header.append(title, removeBtn);

    const controls = document.createElement('div');
    controls.className = 'tree-inline-controls';

    this.buildInlineEditors(node).forEach(ctrl => controls.appendChild(ctrl));

    const actions = document.createElement('div');
    actions.className = 'tree-inline-actions';
    if (node.type === 'rng') {
      const branchHint = d.data.branchType || 'success';
      const branches = branchHint === 'failure' ? ['failure', 'success'] : ['success', 'failure'];

      branches.forEach(branch => {
        ADDABLE_TYPES.forEach(type => {
          const btn = document.createElement('button');
          btn.className = `icon-btn add-btn add-${branch}`;
          btn.type = 'button';
          btn.title = `${branch === 'success' ? t('addSuccess') : t('addFailure')} ${NODE_META[type].label}`;
          btn.append(createIcon(NODE_META[type].icon));
          btn.addEventListener('click', event => {
            event.stopPropagation();
            this.onAddChild(node.id, branch, type);
          });
          actions.appendChild(btn);
        });
      });
    }

    wrapper.append(header, controls);
    if (actions.childElementCount) wrapper.appendChild(actions);

    fo.node().appendChild(wrapper);
  }

  buildInlineEditors(node) {
    const isSelected = this.selectedNodeId === node.id;
    const makeInput = ({ key, label, type = 'text', step = '1', value }) => {
      const row = document.createElement('label');
      row.className = 'tree-field';
      row.title = label;

      const caption = document.createElement('span');
      caption.textContent = label;

      const input = document.createElement('input');
      input.type = type;
      input.step = step;
      input.value = value ?? '';
      input.disabled = !isSelected;
      input.addEventListener('change', event => this.onUpdateParam(node.id, key, event.target.value));

      row.append(caption, input);
      return row;
    };

    if (node.type === 'rng') {
      return [
        makeInput({ key: 'chance', label: 'chance', type: 'number', step: '0.01', value: toNumberOr(node.params.chance, 0.5) })
      ];
    }

    if (node.type === 'spawn') {
      return [
        makeInput({ key: 'amount', label: 'amount', type: 'number', step: '1', value: toNumberOr(node.params.amount, 1) }),
        makeInput({ key: 'quality', label: 'quality', type: 'number', step: '1', value: toNumberOr(node.params.quality, 0) })
      ];
    }

    if (node.type === 'creature') {
      return [makeInput({ key: 'count', label: 'count', type: 'number', step: '1', value: toNumberOr(node.params.count, 1) })];
    }

    if (node.type === 'affliction') {
      return [makeInput({ key: 'strength', label: 'strength', type: 'number', step: '0.1', value: toNumberOr(node.params.strength, 1) })];
    }

    return [];
  }

  toTreeNode(node) {
    if (node.type === 'rng') {
      const successBranch = {
        type: 'branch',
        name: 'Success',
        branchType: 'success',
        children: node.children.success.map(child => this.toTreeNode(child, 'success'))
      };
      const failureBranch = {
        type: 'branch',
        name: 'Failure',
        branchType: 'failure',
        children: node.children.failure.map(child => this.toTreeNode(child, 'failure'))
      };

      return {
        id: node.id,
        type: node.type,
        nodeRef: node,
        branchType: null,
        name: `RNG ${Math.round((node.params.chance ?? 0.5) * 100)}%`,
        children: [successBranch, failureBranch].filter(branch => branch.children.length)
      };
    }

    if (node.type === 'spawn') {
      return { id: node.id, type: node.type, nodeRef: node, name: `Item ${node.params.item || 'unset'}` };
    }

    if (node.type === 'creature') {
      return { id: node.id, type: node.type, nodeRef: node, name: `Creature ${node.params.creature || 'unset'}` };
    }

    if (node.type === 'affliction') {
      return { id: node.id, type: node.type, nodeRef: node, name: `Affliction ${node.params.affliction || 'unset'}` };
    }

    return { id: node.id, type: node.type, nodeRef: node, name: node.type };
  }

  findNodeById(id) {
    if (!id) return null;
    let found = null;
    const walk = nodes => {
      nodes.forEach(node => {
        if (node.id === id) {
          found = node;
          return;
        }
        if (node.children?.success?.length) walk(node.children.success);
        if (node.children?.failure?.length) walk(node.children.failure);
      });
    };
    walk(this.model || []);
    return found;
  }

  renderInspector(node) {
    const inspector = document.querySelector(this.inspectorSelector);
    if (!inspector) return;

    if (!node) {
      inspector.innerHTML = `
        <h4>${t('treeEditor')}</h4>
        <p>${t('selectTreeNode')}</p>
        <p class="tree-inspector-hint">Pan: drag · Zoom: mouse wheel</p>
      `;
      return;
    }

    const isRng = node.type === 'rng';
    inspector.innerHTML = `
      <h4>${t('treeEditor')}</h4>
      <div class="tree-editor-meta">${t('nodeType')}: <strong>${node.type}</strong> · #${node.id}</div>
      <p class="tree-inspector-hint">Editing is inline on the node card.</p>
      ${isRng ? '<p class="tree-inspector-hint">Use colored icon rows to add children for Success/Failure.</p>' : ''}
    `;
  }
}
