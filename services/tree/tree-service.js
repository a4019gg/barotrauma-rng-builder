import { t } from '../../ui/localization.js';
import { createIcon } from '../../ui/icon-component.js';
import { getThemeState } from '../../ui/theme-manager.js';

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

function chanceClass(value, enabled) {
  if (!enabled) return '';
  if (value < 0.2) return 'chance-low';
  if (value < 0.5) return 'chance-mid';
  return 'chance-high';
}

export class TreeService {
  constructor({ svgSelector = '#tree-svg', inspectorSelector = '#tree-inspector', onUpdateParam, onRemoveNode, onAddChild, onMoveNode }) {
    this.svgSelector = svgSelector;
    this.inspectorSelector = inspectorSelector;
    this.onUpdateParam = onUpdateParam;
    this.onRemoveNode = onRemoveNode;
    this.onAddChild = onAddChild;
    this.onMoveNode = onMoveNode;
    this.svg = null;
    this.g = null;
    this.zoomLayer = null;
    this.zoom = null;
    this.width = 2600;
    this.height = 1800;
    this.selectedNodeId = null;
    this.collapsed = new Set();
    this.manualPositions = new Map();
    this.draggingId = null;
    this.dropTarget = null;
    this.minimapEl = null;
    this.treeSettings = {
      displayPercentOnLinks: true,
      displayPercentNearNodes: false,
      dragDropEnabled: true,
      snapToGrid: true,
      showGrid: true,
      gridSize: 24,
      showMinimap: true
    };
  }

  init() {
    if (!window.d3) throw new Error('D3 is not loaded');

    this.svg = window.d3.select(this.svgSelector);
    this.svg.selectAll('*').remove();
    this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);

    this.zoomLayer = this.svg.append('g').attr('class', 'tree-zoom-layer');
    this.g = this.zoomLayer.append('g').attr('transform', 'translate(90,80)');

    this.zoom = window.d3.zoom()
      .scaleExtent([0.2, 2.2])
      .on('zoom', event => {
        this.zoomLayer.attr('transform', event.transform);
      });

    this.svg.call(this.zoom);
    this.svg.call(this.zoom.transform, window.d3.zoomIdentity.translate(20, 20).scale(1));
    this.svg.on('dblclick.zoom', null);

    this.ensureMiniMapContainer();
  }

  ensureMiniMapContainer() {
    const container = this.svg?.node()?.closest('#tree-container');
    if (!container) return;
    let minimap = container.querySelector('.tree-minimap');
    if (!minimap) {
      minimap = document.createElement('div');
      minimap.className = 'tree-minimap';
      minimap.innerHTML = '<svg></svg>';
      container.appendChild(minimap);
    }
    this.minimapEl = minimap;
  }

  setTreeSetting(key, value) {
    this.treeSettings[key] = value;
    localStorage.setItem(`tree.${key}`, JSON.stringify(value));
    this.render(this.model || []);
  }

  loadSettings() {
    Object.keys(this.treeSettings).forEach(key => {
      const raw = localStorage.getItem(`tree.${key}`);
      if (raw == null) return;
      try {
        this.treeSettings[key] = JSON.parse(raw);
      } catch (_) {
        this.treeSettings[key] = raw;
      }
    });
  }

  toggleCollapse(nodeId) {
    if (this.collapsed.has(nodeId)) this.collapsed.delete(nodeId);
    else this.collapsed.add(nodeId);
    this.render(this.model || []);
  }

  autoLayout() {
    this.manualPositions.clear();
    this.render(this.model || []);
  }

  getNodeCoords(treeNode) {
    const manual = this.manualPositions.get(treeNode.data.id);
    if (manual) return manual;
    return { x: treeNode.x, y: treeNode.y };
  }

  render(model) {
    this.model = model;
    if (!this.svg) {
      this.loadSettings();
      this.init();
    }

    this.g.selectAll('*').remove();
    this.svg.classed('show-grid', !!this.treeSettings.showGrid);
    this.svg.style('--tree-grid-size', `${Math.max(8, Number(this.treeSettings.gridSize) || 24)}px`);

    if (!model.length) {
      this.g.append('text').attr('class', 'tree-empty').attr('x', 40).attr('y', 42).text(t('selectTreeNode'));
      this.renderInspector(null);
      this.renderMinimap([]);
      return;
    }

    const root = window.d3.hierarchy({
      name: 'Root Event',
      type: 'root',
      id: 'root',
      children: model.map(node => this.toTreeNode(node))
    });

    window.d3.tree().nodeSize([130, 360])(root);

    const links = root.links();
    const visibleNodes = root.descendants();

    this.g.selectAll('.tree-link')
      .data(links)
      .join('path')
      .attr('class', d => {
        const cls = ['tree-link'];
        if (d.target.data.branchType === 'success') cls.push('link-success');
        if (d.target.data.branchType === 'failure') cls.push('link-failure');
        return cls.join(' ');
      })
      .attr('d', d => {
        const s = this.getNodeCoords(d.source);
        const tNode = this.getNodeCoords(d.target);
        return window.d3.linkHorizontal().x(p => p.y).y(p => p.x)({ source: s, target: tNode });
      });

    if (this.treeSettings.displayPercentOnLinks) {
      const labels = this.g.selectAll('.tree-link-percent').data(links.filter(link => typeof link.target.data.probability === 'number')).join('text')
        .attr('class', d => `tree-link-percent ${chanceClass(d.target.data.probability, getThemeState().chanceColorCoding)}`)
        .attr('x', d => (this.getNodeCoords(d.source).y + this.getNodeCoords(d.target).y) / 2)
        .attr('y', d => (this.getNodeCoords(d.source).x + this.getNodeCoords(d.target).x) / 2 - 6)
        .attr('text-anchor', 'middle')
        .text(d => `${Math.round(d.target.data.probability * 100)}%`);
      labels.raise();
    }

    const nodes = this.g.selectAll('.tree-node')
      .data(visibleNodes)
      .join('g')
      .attr('class', d => {
        const classes = ['tree-node', `node-${d.data.type || 'label'}`];
        if (d.data.nodeRef && this.selectedNodeId === d.data.id) classes.push('selected');
        if (this.dropTarget?.id === d.data.id) classes.push('drop-target');
        return classes.join(' ');
      })
      .attr('transform', d => {
        const pos = this.getNodeCoords(d);
        return `translate(${pos.y},${pos.x})`;
      });

    nodes.each((d, idx, list) => {
      const group = window.d3.select(list[idx]);
      if (d.data.type === 'branch') return this.renderBranchTag(group, d);
      if (d.data.type === 'root') return this.renderRootNode(group, d);
      this.renderEditableNode(group, d);
    });

    this.installDrag(nodes);
    this.renderInspector(this.findNodeById(this.selectedNodeId));
    this.renderMinimap(visibleNodes, links);
  }

  installDrag(nodes) {
    const drag = window.d3.drag()
      .on('start', (event, d) => {
        if (!this.treeSettings.dragDropEnabled || !d.data.nodeRef) return;
        this.draggingId = d.data.id;
        window.d3.select(event.sourceEvent.target.closest('.tree-node')).classed('dragging', true);
      })
      .on('drag', (event, d) => {
        if (!this.treeSettings.dragDropEnabled || !d.data.nodeRef) return;
        const grid = Math.max(8, Number(this.treeSettings.gridSize) || 24);
        let x = d.x + event.dy;
        let y = d.y + event.dx;
        if (this.treeSettings.snapToGrid) {
          x = Math.round(x / grid) * grid;
          y = Math.round(y / grid) * grid;
        }
        this.manualPositions.set(d.data.id, { x, y });
        window.d3.select(event.sourceEvent.target.closest('.tree-node')).attr('transform', `translate(${y},${x})`);

        const hit = this.findDropTarget(event.sourceEvent.clientX, event.sourceEvent.clientY, d.data.id);
        this.dropTarget = hit;
        this.g.selectAll('.tree-node').classed('drop-target', nd => this.dropTarget?.id === nd.data.id);
      })
      .on('end', (event, d) => {
        if (!this.treeSettings.dragDropEnabled || !d.data.nodeRef) return;
        window.d3.select(event.sourceEvent.target.closest('.tree-node')).classed('dragging', false);
        const hit = this.findDropTarget(event.sourceEvent.clientX, event.sourceEvent.clientY, d.data.id);
        if (hit && this.onMoveNode) {
          this.onMoveNode(d.data.id, hit.id, hit.branch);
        }
        this.dropTarget = null;
        this.draggingId = null;
      });

    nodes.filter(d => d.data.type !== 'root' && d.data.type !== 'branch').call(drag);
  }

  findDropTarget(clientX, clientY, draggingId) {
    const elements = [...document.querySelectorAll('.tree-node.node-rng')];
    const hitEl = elements.find(el => {
      const r = el.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    });
    if (!hitEl) return null;
    const data = window.d3.select(hitEl).datum();
    if (!data?.data?.nodeRef || data.data.id === draggingId) return null;
    const rect = hitEl.getBoundingClientRect();
    const branch = clientY < rect.top + rect.height / 2 ? 'success' : 'failure';
    return { id: data.data.id, branch };
  }

  renderRootNode(group, d) {
    const width = 230;
    const height = 52;

    group.append('rect').attr('class', 'tree-card tree-card-root').attr('x', -width / 2).attr('y', -height / 2).attr('rx', 10).attr('ry', 10).attr('width', width).attr('height', height);
    group.append('text').attr('class', 'tree-root-title').attr('text-anchor', 'middle').attr('dy', '0.35em').text(d.data.name);
  }

  renderBranchTag(group, d) {
    const width = 132;
    const height = 36;
    const success = d.data.branchType === 'success';

    group.append('rect').attr('class', `tree-branch-card ${success ? 'branch-success' : 'branch-failure'}`).attr('x', -width / 2).attr('y', -height / 2).attr('rx', 18).attr('ry', 18).attr('width', width).attr('height', height);
    group.append('text').attr('class', 'tree-branch-label').attr('text-anchor', 'middle').attr('dy', '0.35em').text(success ? 'Success' : 'Failure');
  }

  renderEditableNode(group, d) {
    const node = d.data.nodeRef;
    const width = 320;
    const height = 108;
    const collapsed = this.collapsed.has(node.id);

    group.append('rect').attr('class', 'tree-card').attr('x', -width / 2).attr('y', -height / 2).attr('rx', 12).attr('ry', 12).attr('width', width).attr('height', height)
      .on('click', () => {
        this.selectedNodeId = node.id;
        this.render(this.model);
      });

    if (this.treeSettings.displayPercentNearNodes && typeof d.data.probability === 'number') {
      group.append('text')
        .attr('class', `tree-node-percent ${chanceClass(d.data.probability, getThemeState().chanceColorCoding)}`)
        .attr('x', 0)
        .attr('y', -height / 2 - 8)
        .attr('text-anchor', 'middle')
        .text(`${Math.round(d.data.probability * 100)}%`);
    }

    const fo = group.append('foreignObject').attr('x', -width / 2 + 8).attr('y', -height / 2 + 8).attr('width', width - 16).attr('height', height - 16);
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

    const rightBtns = document.createElement('div');
    rightBtns.className = 'tree-head-actions';

    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'icon-btn';
    collapseBtn.title = collapsed ? t('expandSubtree') : t('collapseSubtree');
    collapseBtn.append(createIcon(collapsed ? 'plus-square' : 'minus-square'));
    collapseBtn.addEventListener('click', event => {
      event.stopPropagation();
      this.toggleCollapse(node.id);
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

    rightBtns.append(collapseBtn, removeBtn);
    header.append(title, rightBtns);

    const controls = document.createElement('div');
    controls.className = 'tree-inline-controls';
    this.buildInlineEditors(node).forEach(ctrl => controls.appendChild(ctrl));

    const actions = document.createElement('div');
    actions.className = 'tree-inline-actions';
    if (node.type === 'rng' && !collapsed) {
      ['success', 'failure'].forEach(branch => {
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

    if (node.type === 'rng') return [makeInput({ key: 'chance', label: 'chance', type: 'number', step: '0.01', value: toNumberOr(node.params.chance, 0.5) })];
    if (node.type === 'spawn') return [makeInput({ key: 'amount', label: 'amount', type: 'number', step: '1', value: toNumberOr(node.params.amount, 1) }), makeInput({ key: 'quality', label: 'quality', type: 'number', step: '1', value: toNumberOr(node.params.quality, 0) })];
    if (node.type === 'creature') return [makeInput({ key: 'count', label: 'count', type: 'number', step: '1', value: toNumberOr(node.params.count, 1) })];
    if (node.type === 'affliction') return [makeInput({ key: 'strength', label: 'strength', type: 'number', step: '0.1', value: toNumberOr(node.params.strength, 1) })];
    return [];
  }

  toTreeNode(node, branchType = null, probability = 1) {
    if (node.type === 'rng') {
      const chance = toNumberOr(node.params.chance, 0.5);
      const collapsed = this.collapsed.has(node.id);
      const successBranch = {
        type: 'branch',
        id: `${node.id}-success`,
        name: 'Success',
        branchType: 'success',
        probability: probability * chance,
        children: collapsed ? [] : node.children.success.map(child => this.toTreeNode(child, 'success', probability * chance))
      };
      const failureBranch = {
        type: 'branch',
        id: `${node.id}-failure`,
        name: 'Failure',
        branchType: 'failure',
        probability: probability * (1 - chance),
        children: collapsed ? [] : node.children.failure.map(child => this.toTreeNode(child, 'failure', probability * (1 - chance)))
      };

      return {
        id: node.id,
        type: node.type,
        nodeRef: node,
        branchType,
        probability,
        name: `RNG ${Math.round(chance * 100)}%`,
        children: [successBranch, failureBranch].filter(branch => branch.children.length)
      };
    }

    const labels = {
      spawn: `Item ${node.params.item || 'unset'}`,
      creature: `Creature ${node.params.creature || 'unset'}`,
      affliction: `Affliction ${node.params.affliction || 'unset'}`
    };
    return { id: node.id, type: node.type, nodeRef: node, branchType, probability, name: labels[node.type] || node.type };
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

  renderTreeSettings() {
    const wrapper = document.createElement('div');
    wrapper.className = 'tree-settings-section';
    wrapper.innerHTML = `
      <h5>${t('treeSettings')}</h5>
      <label><input type="checkbox" data-setting="displayPercentOnLinks" ${this.treeSettings.displayPercentOnLinks ? 'checked' : ''}/> ${t('showPercentOnLinks')}</label>
      <label><input type="checkbox" data-setting="displayPercentNearNodes" ${this.treeSettings.displayPercentNearNodes ? 'checked' : ''}/> ${t('showPercentNearNodes')}</label>
      <label><input type="checkbox" data-setting="dragDropEnabled" ${this.treeSettings.dragDropEnabled ? 'checked' : ''}/> ${t('enableDragDrop')}</label>
      <label><input type="checkbox" data-setting="snapToGrid" ${this.treeSettings.snapToGrid ? 'checked' : ''}/> ${t('snapToGrid')}</label>
      <label><input type="checkbox" data-setting="showGrid" ${this.treeSettings.showGrid ? 'checked' : ''}/> ${t('showTreeGrid')}</label>
      <label><input type="checkbox" data-setting="showMinimap" ${this.treeSettings.showMinimap ? 'checked' : ''}/> ${t('showMinimap')}</label>
      <label>${t('gridSize')} <input type="number" min="8" max="120" step="2" data-setting="gridSize" value="${this.treeSettings.gridSize}"></label>
      <button type="button" class="icon-btn" data-tree-action="auto-layout"></button>
    `;

    const autoBtn = wrapper.querySelector('[data-tree-action="auto-layout"]');
    autoBtn.append(createIcon('compass'), ` ${t('autoLayout')}`);
    autoBtn.addEventListener('click', () => this.autoLayout());

    wrapper.querySelectorAll('[data-setting]').forEach(el => {
      const key = el.dataset.setting;
      el.addEventListener('change', event => {
        const value = event.target.type === 'checkbox' ? event.target.checked : Number(event.target.value);
        this.setTreeSetting(key, value);
      });
    });

    return wrapper;
  }

  renderInspector(node) {
    const inspector = document.querySelector(this.inspectorSelector);
    if (!inspector) return;
    inspector.innerHTML = '';

    const base = document.createElement('div');
    base.innerHTML = `
      <h4>${t('treeEditor')}</h4>
      ${node ? `<div class="tree-editor-meta">${t('nodeType')}: <strong>${node.type}</strong> · #${node.id}</div>` : `<p>${t('selectTreeNode')}</p>`}
      <p class="tree-inspector-hint">Pan: drag · Zoom: mouse wheel · Drop to RNG card (top=success, bottom=failure)</p>
    `;
    inspector.appendChild(base);
    inspector.appendChild(this.renderTreeSettings());
  }

  renderMinimap(nodes = [], links = []) {
    if (!this.minimapEl) return;
    this.minimapEl.style.display = this.treeSettings.showMinimap ? 'block' : 'none';
    if (!this.treeSettings.showMinimap) return;

    const svg = this.minimapEl.querySelector('svg');
    if (!svg) return;
    const width = 180;
    const height = 120;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const xs = nodes.map(d => this.getNodeCoords(d).y);
    const ys = nodes.map(d => this.getNodeCoords(d).x);
    const minX = Math.min(...xs, 0);
    const maxX = Math.max(...xs, 1);
    const minY = Math.min(...ys, 0);
    const maxY = Math.max(...ys, 1);
    const scaleX = x => ((x - minX) / Math.max(1, maxX - minX)) * (width - 10) + 5;
    const scaleY = y => ((y - minY) / Math.max(1, maxY - minY)) * (height - 10) + 5;

    svg.innerHTML = links.map(link => {
      const s = this.getNodeCoords(link.source);
      const tNode = this.getNodeCoords(link.target);
      return `<line x1="${scaleX(s.y)}" y1="${scaleY(s.x)}" x2="${scaleX(tNode.y)}" y2="${scaleY(tNode.x)}" />`;
    }).join('') + nodes.map(d => {
      const p = this.getNodeCoords(d);
      return `<circle cx="${scaleX(p.y)}" cy="${scaleY(p.x)}" r="2.5" />`;
    }).join('');
  }
}
