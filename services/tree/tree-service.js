import { t } from '../../ui/localization.js';
import { createIcon } from '../../ui/icon-component.js';
import { getThemeState, onThemeChange } from '../../ui/theme-manager.js';
import { formatChanceForInput } from '../../ui/chance-utils.js';

const NODE_META = {
  rng: { icon: 'sliders-horizontal', label: 'RNG' },
  spawn: { icon: 'box', label: 'Item' },
  creature: { icon: 'hashtag', label: 'Creature' },
  affliction: { icon: 'alert-triangle', label: 'Affliction' }
};

const ADDABLE_TYPES = ['rng', 'spawn', 'creature', 'affliction'];
const NODE_SIZE = { width: 320, height: 108 };
const BRANCH_SIZE = { width: 132, height: 36 };
const REMOVE_CONFIRM_TIMEOUT_MS = 7000;
const AFFIX_ICON_SIZE = 18;

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function parseSourceRect(src) {
  const parts = Array.isArray(src) ? src : String(src || '').split(',').map(part => Number(part.trim()));
  if (parts.length !== 4 || parts.some(v => !Number.isFinite(v))) return null;
  const [x, y, w, h] = parts;
  if (w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

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
    this.themeUnsubscribe = null;
    this.dragFrame = null;
    this.deleteConfirmState = { id: null, until: 0 };
    this.idOptions = { spawn: [], creature: [], affliction: [] };
    this.afflictionMetaById = new Map();
    this.treeSettings = {
      displayPercent: 'links',
      autoChanceMode: 'off',
      dragEnabled: true,
      snapToGrid: true,
      autoLayout: true,
      showGrid: true,
      gridSize: 24,
      showMinimap: true,
      colorMinimap: true,
      showIntermediateNodes: true,
      debugBounds: false
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
    if (!this.themeUnsubscribe) {
      this.themeUnsubscribe = onThemeChange(() => this.render(this.model || []));
    }
    this.loadIdentifierOptions();
  }

  async loadIdentifierOptions() {
    const datasets = [
      ['spawn', 'data/items.json'],
      ['creature', 'data/creatures.json'],
      ['affliction', 'data/afflictions.json']
    ];
    await Promise.all(datasets.map(async ([key, path]) => {
      try {
        const response = await fetch(path);
        const data = await response.json();
        const entries = Array.isArray(data) ? data : [];
        this.idOptions[key] = entries.map(entry => String(entry.id || '')).filter(Boolean).slice(0, 2000);
        if (key === 'affliction') {
          this.afflictionMetaById = new Map(entries.map(entry => [String(entry.id || '').toLowerCase(), entry]));
        }
      } catch (_) {
        this.idOptions[key] = [];
      }
    }));
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

    const oldLink = localStorage.getItem('tree.displayPercentOnLinks');
    const oldNode = localStorage.getItem('tree.displayPercentNearNodes');
    if (oldLink != null || oldNode != null) {
      const showLinks = oldLink == null ? true : JSON.parse(oldLink);
      const showNodes = oldNode == null ? false : JSON.parse(oldNode);
      if (showLinks && showNodes) this.treeSettings.displayPercent = 'both';
      else if (showNodes) this.treeSettings.displayPercent = 'nodes';
      else if (showLinks) this.treeSettings.displayPercent = 'links';
      else this.treeSettings.displayPercent = 'hidden';
    }

    const dragDropEnabled = localStorage.getItem('tree.dragDropEnabled');
    if (dragDropEnabled != null) this.treeSettings.dragEnabled = JSON.parse(dragDropEnabled);
    const colorMinimapBranches = localStorage.getItem('tree.colorMinimapBranches');
    if (colorMinimapBranches != null) this.treeSettings.colorMinimap = JSON.parse(colorMinimapBranches);
    const showBranchNodes = localStorage.getItem('tree.showBranchNodes');
    if (showBranchNodes != null) this.treeSettings.showIntermediateNodes = JSON.parse(showBranchNodes);

    if (!['hidden', 'links', 'nodes', 'both'].includes(this.treeSettings.displayPercent)) this.treeSettings.displayPercent = 'links';
    if (!['off', 'root-split', 'branch-split'].includes(this.treeSettings.autoChanceMode)) this.treeSettings.autoChanceMode = 'off';
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

  centerOnNode(nodeId) {
    const nodeEl = this.g?.selectAll('.tree-node').filter(d => d.data.id === nodeId).node();
    if (!nodeEl || !this.svg || !this.zoom) return;
    const d = window.d3.select(nodeEl).datum();
    const p = this.getNodeCoords(d);
    const svgEl = this.svg.node();
    const w = svgEl.clientWidth || 900;
    const h = svgEl.clientHeight || 600;
    const current = window.d3.zoomTransform(svgEl);
    const tx = w / 2 - p.y * current.k;
    const ty = h / 2 - p.x * current.k;
    this.svg.transition().duration(300).call(this.zoom.transform, window.d3.zoomIdentity.translate(tx, ty).scale(current.k));
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

    const rootChildren = this.applyAutoChance(model, 1, 0).map(entry => this.toTreeNode(entry.node, null, entry.probability, 1));
    const root = window.d3.hierarchy({
      name: 'Root Event',
      type: 'root',
      id: 'root',
      children: rootChildren
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
      .attr('d', d => this.buildLinkPath(d));

    const showLinkPercent = this.treeSettings.displayPercent === 'links' || this.treeSettings.displayPercent === 'both';
    const percentStylingEnabled = this.treeSettings.displayPercent !== 'hidden';

    if (showLinkPercent) {
      const labels = this.g.selectAll('.tree-link-percent').data(links.filter(link => typeof link.target.data.probability === 'number')).join('text')
        .attr('class', d => `tree-link-percent ${chanceClass(d.target.data.probability, percentStylingEnabled && getThemeState().chanceColorCoding)}`)
        .attr('x', d => this.getLinkMidPoint(d).y)
        .attr('y', d => this.getLinkMidPoint(d).x - 6)
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
    this.updateCanvasSize(visibleNodes);
    this.renderInspector(this.findNodeById(this.selectedNodeId));
    this.renderMinimap(visibleNodes, links);
  }

  installDrag(nodes) {
    const drag = window.d3.drag()
      .on('start', (event, d) => {
        if (!this.treeSettings.dragEnabled || !d.data.nodeRef) return;
        const sourceNode = event.sourceEvent?.target;
        if (sourceNode?.closest('input, button, select, option, textarea, datalist, label')) return;
        this.draggingId = d.data.id;
        d.__dragOrigin = { x: event.x, y: event.y };
        d.__dragBasePositions = new Map(d.descendants().map(desc => {
          const pos = this.getNodeCoords(desc);
          return [desc.data.id, { x: pos.x, y: pos.y }];
        }));
        this.svg.classed('is-dragging-tree', true);
        window.d3.select(event.sourceEvent.target.closest('.tree-node')).classed('dragging', true);
      })
      .on('drag', (event, d) => {
        if (!this.treeSettings.dragEnabled || !d.data.nodeRef || this.draggingId !== d.data.id) return;
        const origin = d.__dragOrigin || { x: event.x, y: event.y };
        let deltaX = event.y - origin.y;
        let deltaY = event.x - origin.x;

        const grid = Math.max(8, Number(this.treeSettings.gridSize) || 24);
        const baseRoot = d.__dragBasePositions?.get(d.data.id) || this.getNodeCoords(d);
        if (this.treeSettings.snapToGrid) {
          const snappedRootX = Math.round((baseRoot.x + deltaX) / grid) * grid;
          const snappedRootY = Math.round((baseRoot.y + deltaY) / grid) * grid;
          deltaX = snappedRootX - baseRoot.x;
          deltaY = snappedRootY - baseRoot.y;
        }

        (d.__dragBasePositions || new Map()).forEach((basePos, nodeId) => {
          this.manualPositions.set(nodeId, {
            x: basePos.x + deltaX,
            y: basePos.y + deltaY
          });
        });

        this.refreshGeometry();

        const hit = this.findDropTarget(event.sourceEvent.clientX, event.sourceEvent.clientY, d.data.id);
        this.dropTarget = hit;
        this.g.selectAll('.tree-node').classed('drop-target', nd => this.dropTarget?.id === nd.data.id);
      })
      .on('end', (event, d) => {
        if (!this.treeSettings.dragEnabled || !d.data.nodeRef || this.draggingId !== d.data.id) return;
        window.d3.select(event.sourceEvent.target.closest('.tree-node')).classed('dragging', false);
        this.svg.classed('is-dragging-tree', false);
        const hit = this.findDropTarget(event.sourceEvent.clientX, event.sourceEvent.clientY, d.data.id);
        if (hit && this.onMoveNode) {
          if (this.treeSettings.autoLayout) this.manualPositions.clear();
          this.onMoveNode(d.data.id, hit.id, hit.branch);
        }
        this.dropTarget = null;
        this.draggingId = null;
        delete d.__dragOrigin;
        delete d.__dragBasePositions;
      });

    nodes.filter(d => d.data.type !== 'root' && d.data.type !== 'branch').call(drag);
  }

  getNodeHalfWidth(type) {
    if (type === 'branch') return BRANCH_SIZE.width / 2;
    if (type === 'root') return 230 / 2;
    return NODE_SIZE.width / 2;
  }

  buildLinkPath(link) {
    const s = this.getNodeCoords(link.source);
    const tNode = this.getNodeCoords(link.target);
    const sourceShift = this.getNodeHalfWidth(link.source.data.type);
    const targetShift = this.getNodeHalfWidth(link.target.data.type);
    const source = { x: s.x, y: s.y + sourceShift };
    const target = { x: tNode.x, y: tNode.y - targetShift };
    return window.d3.linkHorizontal().x(p => p.y).y(p => p.x)({ source, target });
  }

  getLinkMidPoint(link) {
    const s = this.getNodeCoords(link.source);
    const tNode = this.getNodeCoords(link.target);
    return { x: (s.x + tNode.x) / 2, y: (s.y + tNode.y) / 2 };
  }

  updateCanvasSize(nodes) {
    if (!nodes?.length || !this.svg) return;
    const xs = nodes.map(d => this.getNodeCoords(d).y);
    const ys = nodes.map(d => this.getNodeCoords(d).x);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    this.width = Math.max(2200, spanX + 900);
    this.height = Math.max(1500, spanY + 600);
    this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
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
    if (this.isTreeDescendant(draggingId, data.data.id)) return null;
    const rect = hitEl.getBoundingClientRect();
    const branch = clientY < rect.top + rect.height / 2 ? 'success' : 'failure';
    return { id: data.data.id, branch };
  }

  isTreeDescendant(parentId, candidateId) {
    if (!parentId || !candidateId || parentId === candidateId) return false;
    const root = this.findNodeById(parentId);
    if (!root || root.type !== 'rng') return false;
    const walk = list => list.some(child => child.id === candidateId || (child.type === 'rng' && (walk(child.children.success) || walk(child.children.failure))));
    return walk(root.children.success) || walk(root.children.failure);
  }

  renderRootNode(group, d) {
    const width = 230;
    const height = 52;

    group.append('rect').attr('class', 'tree-card tree-card-root').attr('x', -width / 2).attr('y', -height / 2).attr('rx', 10).attr('ry', 10).attr('width', width).attr('height', height);
    group.append('text').attr('class', 'tree-root-title').attr('text-anchor', 'middle').attr('dy', '0.35em').text(d.data.name);
  }

  renderBranchTag(group, d) {
    const width = BRANCH_SIZE.width;
    const height = BRANCH_SIZE.height;
    const success = d.data.branchType === 'success';

    group.append('rect').attr('class', `tree-branch-card ${success ? 'branch-success' : 'branch-failure'}`).attr('x', -width / 2).attr('y', -height / 2).attr('rx', 18).attr('ry', 18).attr('width', width).attr('height', height);
    group.append('text').attr('class', 'tree-branch-label').attr('text-anchor', 'middle').attr('dy', '0.35em').text(success ? 'Success' : 'Failure');
  }

  renderEditableNode(group, d) {
    const node = d.data.nodeRef;
    const width = NODE_SIZE.width;
    const height = NODE_SIZE.height;
    const collapsed = this.collapsed.has(node.id);

    group.append('rect').attr('class', 'tree-card').attr('x', -width / 2).attr('y', -height / 2).attr('rx', 12).attr('ry', 12).attr('width', width).attr('height', height)
      .on('click', () => {
        this.selectedNodeId = node.id;
        this.render(this.model);
      });

    const showNodePercent = this.treeSettings.displayPercent === 'nodes' || this.treeSettings.displayPercent === 'both';
    const percentStylingEnabled = this.treeSettings.displayPercent !== 'hidden';
    if (showNodePercent && typeof d.data.probability === 'number') {
      group.append('text')
        .attr('class', `tree-node-percent ${chanceClass(d.data.probability, percentStylingEnabled && getThemeState().chanceColorCoding)}`)
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
    const defaultIcon = createIcon(NODE_META[node.type]?.icon || 'tag');
    title.append(defaultIcon);
    if (node.type === 'affliction') {
      const fxIcon = this.createAfflictionNodeIcon(node);
      if (fxIcon) title.replaceChild(fxIcon, defaultIcon);
    }
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
    const pendingDelete = this.deleteConfirmState.id === node.id && this.deleteConfirmState.until > Date.now();
    removeBtn.append(createIcon(pendingDelete ? 'alert-triangle' : 'trash'));
    removeBtn.addEventListener('click', event => {
      event.stopPropagation();
      if (!pendingDelete) {
        this.deleteConfirmState = { id: node.id, until: Date.now() + REMOVE_CONFIRM_TIMEOUT_MS };
        this.render(this.model);
        setTimeout(() => {
          if (this.deleteConfirmState.id === node.id && this.deleteConfirmState.until <= Date.now()) {
            this.deleteConfirmState = { id: null, until: 0 };
            this.render(this.model);
          }
        }, REMOVE_CONFIRM_TIMEOUT_MS + 50);
        return;
      }
      this.deleteConfirmState = { id: null, until: 0 };
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
    const makeInput = ({ key, label, type = 'text', step = '1', value, inputMode = null }) => {
      const row = document.createElement('label');
      row.className = 'tree-field';
      row.title = label;

      const caption = document.createElement('span');
      caption.textContent = label;

      const input = document.createElement('input');
      input.type = type;
      if (type === 'number') input.step = step;
      if (inputMode) input.inputMode = inputMode;
      input.value = value ?? '';
      input.disabled = !isSelected;
      input.addEventListener('change', event => this.onUpdateParam(node.id, key, event.target.value));

      row.append(caption, input);
      return row;
    };

    const makeIdInput = ({ key, label, type }) => {
      const row = document.createElement('label');
      row.className = 'tree-field';
      const caption = document.createElement('span');
      caption.textContent = label;
      const input = document.createElement('input');
      const listId = `tree-datalist-${type}-${node.id}`;
      input.setAttribute('list', listId);
      input.value = node.params[key] ?? '';
      input.disabled = !isSelected;
      input.addEventListener('change', event => this.onUpdateParam(node.id, key, event.target.value));
      const datalist = document.createElement('datalist');
      datalist.id = listId;
      (this.idOptions[type] || []).slice(0, 250).forEach(optionValue => {
        const option = document.createElement('option');
        option.value = optionValue;
        datalist.appendChild(option);
      });
      row.append(caption, input, datalist);
      return row;
    };

    if (node.type === 'rng') return [makeInput({ key: 'chance', label: 'chance', type: 'text', inputMode: 'decimal', value: formatChanceForInput(toNumberOr(node.params.chance, 0.5)) })];
    if (node.type === 'spawn') return [makeIdInput({ key: 'item', label: 'id', type: 'spawn' }), makeInput({ key: 'amount', label: 'amount', type: 'number', step: '1', value: toNumberOr(node.params.amount, 1) }), makeInput({ key: 'quality', label: 'quality', type: 'number', step: '1', value: toNumberOr(node.params.quality, 0) })];
    if (node.type === 'creature') return [makeIdInput({ key: 'creature', label: 'id', type: 'creature' }), makeInput({ key: 'count', label: 'count', type: 'number', step: '1', value: toNumberOr(node.params.count, 1) })];
    if (node.type === 'affliction') return [makeIdInput({ key: 'affliction', label: 'id', type: 'affliction' }), makeInput({ key: 'strength', label: 'strength', type: 'number', step: '0.1', value: toNumberOr(node.params.strength, 1) })];
    return [];
  }

  createAfflictionNodeIcon(node) {
    const afflictionId = String(node.params.affliction || '').toLowerCase();
    const entry = this.afflictionMetaById.get(afflictionId);
    const iconData = entry?.icon;
    if (!iconData?.texture || !iconData?.sourcerect) return null;

    const rect = parseSourceRect(iconData.sourcerect);
    if (!rect) return null;

    const intensity = clamp01(toNumberOr(node.params.strength, 0) / Math.max(1, toNumberOr(entry?.maxstrength, 100)));
    const canvas = document.createElement('canvas');
    canvas.width = AFFIX_ICON_SIZE;
    canvas.height = AFFIX_ICON_SIZE;
    canvas.className = 'tree-affliction-icon';

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    const img = new Image();
    img.src = iconData.texture;
    img.onload = () => {
      ctx.clearRect(0, 0, AFFIX_ICON_SIZE, AFFIX_ICON_SIZE);
      ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, AFFIX_ICON_SIZE, AFFIX_ICON_SIZE);

      const tint = this.resolveAfflictionTint(iconData, intensity);
      if (tint) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, AFFIX_ICON_SIZE, AFFIX_ICON_SIZE);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.35;
        ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, AFFIX_ICON_SIZE, AFFIX_ICON_SIZE);
        ctx.globalAlpha = 1;
      }
    };

    return canvas;
  }

  resolveAfflictionTint(iconData, intensity) {
    const role = String(iconData.fixedColorKey || iconData.role || iconData.type || 'neutral').toLowerCase();
    const palettes = {
      buff: ['rgb(95, 177, 123)', 'rgb(111, 223, 149)', 'rgb(155, 241, 176)'],
      debuff: ['rgb(205, 103, 124)', 'rgb(230, 124, 149)', 'rgb(249, 166, 185)'],
      damage: ['rgb(203, 89, 89)', 'rgb(231, 116, 116)', 'rgb(250, 151, 151)'],
      mental: ['rgb(137, 102, 215)', 'rgb(166, 128, 241)', 'rgb(197, 164, 255)'],
      electric: ['rgb(97, 146, 232)', 'rgb(121, 173, 247)', 'rgb(168, 206, 255)'],
      status: ['rgb(124, 167, 214)', 'rgb(154, 194, 237)', 'rgb(194, 218, 250)'],
      neutral: ['rgb(123, 156, 186)', 'rgb(153, 186, 217)', 'rgb(188, 213, 236)']
    };
    const [low, mid, high] = palettes[role] || palettes.neutral;
    if (intensity <= 0.5) return this.mixRgb(low, mid, intensity / 0.5);
    return this.mixRgb(mid, high, (intensity - 0.5) / 0.5);
  }

  mixRgb(a, b, t) {
    const parse = color => color.replace(/[^\d,]/g, '').split(',').map(Number).slice(0, 3);
    const [ar, ag, ab] = parse(a);
    const [br, bg, bb] = parse(b);
    return `rgb(${Math.round(ar + (br - ar) * t)}, ${Math.round(ag + (bg - ag) * t)}, ${Math.round(ab + (bb - ab) * t)})`;
  }

  toTreeNode(node, branchType = null, probability = 1, depth = 0) {
    if (node.type === 'rng') {
      const chance = toNumberOr(node.params.chance, 0.5);
      const collapsed = this.collapsed.has(node.id);
      const successBranch = {
        type: 'branch',
        id: `${node.id}-success`,
        name: 'Success',
        branchType: 'success',
        probability: probability * chance,
        children: collapsed ? [] : this.applyAutoChance(node.children.success, probability * chance, depth).map(child => this.toTreeNode(child.node, 'success', child.probability, depth + 1))
      };
      const failureBranch = {
        type: 'branch',
        id: `${node.id}-failure`,
        name: 'Failure',
        branchType: 'failure',
        probability: probability * (1 - chance),
        children: collapsed ? [] : this.applyAutoChance(node.children.failure, probability * (1 - chance), depth).map(child => this.toTreeNode(child.node, 'failure', child.probability, depth + 1))
      };

      const branchChildren = this.treeSettings.showIntermediateNodes ? [successBranch, failureBranch].filter(branch => branch.children.length) : [
        ...successBranch.children.map(child => ({ ...child, branchType: 'success' })),
        ...failureBranch.children.map(child => ({ ...child, branchType: 'failure' }))
      ];
      return {
        id: node.id,
        type: node.type,
        nodeRef: node,
        branchType,
        probability,
        name: `RNG ${Math.round(chance * 100)}%`,
        children: branchChildren
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
      <section class="tree-settings-group">
        <h6>${t('treeSettingsBasic')}</h6>
        <div class="tree-setting-row tree-setting-row-stack">
          <span>${t('displayPercent')}</span>
          <div class="tree-segmented" data-setting="displayPercent">
            <label><input type="radio" name="tree-display-percent" value="hidden" ${this.treeSettings.displayPercent === 'hidden' ? 'checked' : ''}/> ${t('displayHidden')}</label>
            <label><input type="radio" name="tree-display-percent" value="links" ${this.treeSettings.displayPercent === 'links' ? 'checked' : ''}/> ${t('displayLinks')}</label>
            <label><input type="radio" name="tree-display-percent" value="nodes" ${this.treeSettings.displayPercent === 'nodes' ? 'checked' : ''}/> ${t('displayNodes')}</label>
            <label><input type="radio" name="tree-display-percent" value="both" ${this.treeSettings.displayPercent === 'both' ? 'checked' : ''}/> ${t('displayBoth')}</label>
          </div>
        </div>
        <div class="tree-setting-row tree-setting-row-stack">
          <span>${t('autoChanceMode')}</span>
          <select data-setting="autoChanceMode">
            <option value="off" ${this.treeSettings.autoChanceMode === 'off' ? 'selected' : ''}>${t('autoChanceOff')}</option>
            <option value="root-split" ${this.treeSettings.autoChanceMode === 'root-split' ? 'selected' : ''}>${t('autoChanceRoot')}</option>
            <option value="branch-split" ${this.treeSettings.autoChanceMode === 'branch-split' ? 'selected' : ''}>${t('autoChanceBranch')}</option>
          </select>
        </div>
        <label class="tree-setting-row"><span>${t('enableDragDrop')}</span><input type="checkbox" data-setting="dragEnabled" ${this.treeSettings.dragEnabled ? 'checked' : ''}/></label>
        <label class="tree-setting-row tree-setting-dependent" data-disable-if="!dragEnabled"><span>${t('snapToGrid')}</span><input type="checkbox" data-setting="snapToGrid" ${this.treeSettings.snapToGrid ? 'checked' : ''}/></label>
        <label class="tree-setting-row"><span>${t('autoLayout')}</span><input type="checkbox" data-setting="autoLayout" ${this.treeSettings.autoLayout ? 'checked' : ''}/></label>
        <button type="button" class="icon-btn" data-tree-action="auto-layout"></button>
      </section>

      <section class="tree-settings-group">
        <h6>${t('treeSettingsVisual')}</h6>
        <label class="tree-setting-row"><span>${t('showTreeGrid')}</span><input type="checkbox" data-setting="showGrid" ${this.treeSettings.showGrid ? 'checked' : ''}/></label>
        <label class="tree-setting-row tree-setting-dependent" data-disable-if="!showGrid"><span>${t('gridSize')}</span><input type="number" min="8" max="120" step="2" data-setting="gridSize" value="${this.treeSettings.gridSize}"></label>
        <label class="tree-setting-row"><span>${t('showMinimap')}</span><input type="checkbox" data-setting="showMinimap" ${this.treeSettings.showMinimap ? 'checked' : ''}/></label>
        <label class="tree-setting-row"><span>${t('colorMinimapBranches')}</span><input type="checkbox" data-setting="colorMinimap" ${this.treeSettings.colorMinimap ? 'checked' : ''}/></label>
      </section>

      <details class="tree-settings-group tree-settings-advanced">
        <summary>${t('treeSettingsAdvanced')}</summary>
        <label class="tree-setting-row"><span>${t('showBranchNodes')}</span><input type="checkbox" data-setting="showIntermediateNodes" ${this.treeSettings.showIntermediateNodes ? 'checked' : ''}/></label>
        <label class="tree-setting-row"><span>${t('showDebugBounds')}</span><input type="checkbox" data-setting="debugBounds" ${this.treeSettings.debugBounds ? 'checked' : ''}/></label>
      </details>
    `;

    const autoBtn = wrapper.querySelector('[data-tree-action="auto-layout"]');
    autoBtn.append(createIcon('compass'), ` ${t('autoLayout')}`);
    autoBtn.addEventListener('click', () => this.autoLayout());

    wrapper.querySelectorAll('[data-setting]').forEach(el => {
      const key = el.dataset.setting;
      el.addEventListener('change', event => {
        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        if (target.type === 'number') value = Number(target.value);
        this.setTreeSetting(key, value);
        this.applySettingsDependencies(wrapper);
      });
    });

    this.applySettingsDependencies(wrapper);

    return wrapper;
  }

  applySettingsDependencies(wrapper) {
    const disableByExpr = {
      '!dragEnabled': !this.treeSettings.dragEnabled,
      '!showGrid': !this.treeSettings.showGrid
    };
    wrapper.querySelectorAll('.tree-setting-dependent').forEach(row => {
      const expr = row.dataset.disableIf;
      const disabled = !!disableByExpr[expr];
      row.classList.toggle('is-disabled', disabled);
      row.querySelectorAll('input, select, button').forEach(control => {
        control.disabled = disabled;
      });
    });
  }

  applyAutoChance(children, parentProbability, depth) {
    if (!children.length) return [];
    if (this.treeSettings.autoChanceMode === 'off') {
      return children.map(child => ({ node: child, probability: parentProbability }));
    }

    if (this.treeSettings.autoChanceMode === 'root-split' && depth > 0) {
      return children.map(child => ({ node: child, probability: parentProbability }));
    }

    const perChild = parentProbability / children.length;
    return children.map(child => ({ node: child, probability: perChild }));
  }

  refreshGeometry() {
    if (this.dragFrame) cancelAnimationFrame(this.dragFrame);
    this.dragFrame = requestAnimationFrame(() => {
      this.g.selectAll('.tree-node').attr('transform', nodeData => {
        const pos = this.getNodeCoords(nodeData);
        return `translate(${pos.y},${pos.x})`;
      });
      this.g.selectAll('.tree-link').attr('d', link => this.buildLinkPath(link));
      this.g.selectAll('.tree-link-percent')
        .attr('x', link => this.getLinkMidPoint(link).y)
        .attr('y', link => this.getLinkMidPoint(link).x - 6);
      this.renderMinimap(this.g.selectAll('.tree-node').data(), this.g.selectAll('.tree-link').data());
      this.dragFrame = null;
    });
  }

  renderInspector(node) {
    const inspector = document.querySelector(this.inspectorSelector);
    if (!inspector) return;
    inspector.innerHTML = '';

    const base = document.createElement('div');
    base.innerHTML = `
      <h4>${t('treeEditor')}</h4>
      ${node ? `<div class="tree-editor-meta">${t('nodeType')}: <strong>${node.type}</strong> · #${node.id}</div>` : `<p>${t('selectTreeNode')}</p>`}
      <p class="tree-inspector-hint">Pan: drag · Zoom: mouse wheel · Minimap click: jump to node · Drop to RNG card (top=success, bottom=failure)</p>
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
      const classes = this.treeSettings.colorMinimap
        ? `${link.target.data.branchType === 'success' ? 'mm-success' : ''} ${link.target.data.branchType === 'failure' ? 'mm-failure' : ''}`.trim()
        : '';
      return `<line class="${classes}" x1="${scaleX(s.y)}" y1="${scaleY(s.x)}" x2="${scaleX(tNode.y)}" y2="${scaleY(tNode.x)}" />`;
    }).join('') + nodes.map(d => {
      const p = this.getNodeCoords(d);
      return `<circle data-node-id="${d.data.id}" cx="${scaleX(p.y)}" cy="${scaleY(p.x)}" r="2.5" />`;
    }).join('');

    svg.querySelectorAll('circle[data-node-id]').forEach(circle => {
      circle.addEventListener('click', () => {
        const nodeId = circle.getAttribute('data-node-id');
        this.selectedNodeId = Number.isFinite(Number(nodeId)) ? Number(nodeId) : nodeId;
        this.centerOnNode(this.selectedNodeId);
        this.render(this.model || []);
      });
    });
  }
}
